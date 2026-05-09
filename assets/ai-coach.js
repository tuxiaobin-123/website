async function callAiEndpoint(path, body) {
  const options = body
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    : { method: "GET" };

  const response = await fetch(path, options);
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("本地 AI 后端没有正常返回 JSON。请用 start-ai-server.ps1 启动新版服务。");
  }
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "AI 请求失败。");
  }
  return payload;
}

let pendingFeedback = null;
let pendingFeedbackTimer = null;
let lastManipulationInput = "";

function renderAiError(container, error) {
  container.innerHTML =
    "<strong>暂时不能调用 AI</strong>" +
    "<p>" + escapeHtml(error.message || String(error)) + "</p>" +
    "<p><strong>处理方式：</strong>确认 .env 里已经配置 DeepSeek 或 OpenAI Key，然后运行 start-ai-server.ps1。</p>";
}

function scoreBar(label, value, reverse) {
  const score = Math.max(0, Math.min(10, Number(value || 0)));
  const display = reverse ? 10 - score : score;
  return "<div class=\"talk-line\"><strong>" + escapeHtml(label) + "：" + score + "/10</strong>" +
    "<div class=\"score-line\" style=\"--score-width:" + (display * 10) + "%\"><span></span></div></div>";
}

function renderSixDimensionScores(scores) {
  const box = document.getElementById("sixScoreResult");
  if (!box) return;
  const data = scores || {};
  box.innerHTML =
    scoreBar("压力感", data.pressure, true) +
    scoreBar("共情回应", data.empathy, false) +
    scoreBar("边界感", data.boundary, false) +
    scoreBar("自然度", data.naturalness, false) +
    scoreBar("推进质量", data.progress, false) +
    scoreBar("情绪稳定", data.emotionalStability, false);
}

function renderQuickNext(data) {
  document.getElementById("quickResult").innerHTML =
    "<strong>建议下一句</strong>" +
    "<div class=\"talk-line\">" + escapeHtml(data.recommended || "") + "</div>" +
    "<p><strong>原因：</strong>" + escapeHtml(data.why || "") + "</p>" +
    "<p><strong>时机：</strong>" + escapeHtml(data.timing || "") + "</p>";
}

function renderQuickReviewResult(data) {
  document.getElementById("quickResult").innerHTML =
    "<strong>快速判断：" + escapeHtml(data.summary || "已完成") + "</strong>" +
    "<p>风险：" + Number(data.riskScore || 0) + "/10；阶段：" + escapeHtml(data.conversationStage || "未知") + "</p>" +
    "<div class=\"talk-line\"><strong>下一句：</strong>" + escapeHtml(data.nextMessage || "先暂停，别急着继续发。") + "</div>" +
    (data.repairMessage ? "<div class=\"talk-line\"><strong>修复句：</strong>" + escapeHtml(data.repairMessage) + "</div>" : "");
}

function inferSmartRoute(text, mode) {
  if (mode && mode !== "auto") return mode;
  const source = String(text || "");
  const lineCount = source.split(/\n+/).filter((line) => line.trim()).length;
  const hasDialogue = /我[:：].*她[:：]|她[:：].*我[:：]/s.test(source);
  const hasOverheatSignal = /为什么|凭什么|不回|是不是|根本|呵呵|算了|删除|拉黑|等你|质问|上头|生气|难受|破防/.test(source);
  if (hasOverheatSignal) return "rescue";
  if (lineCount >= 4 || hasDialogue) return "review";
  return "next";
}

function renderSmartRouteReview(data, routeName) {
  const result = document.getElementById("smartRouteResult");
  result.innerHTML =
    "<strong>已自动分流到：" + escapeHtml(routeName) + "</strong>" +
    "<p>风险：" + Number(data.riskScore || 0) + "/10；阶段：" + escapeHtml(data.conversationStage || "未知") + "</p>" +
    "<div class=\"cover-result\"><strong>建议下一句</strong><p>" + escapeHtml(data.nextMessage || "先暂停，不要急着继续发。") + "</p></div>" +
    "<p>详细结果已经同步到 AI 教练区的紧急模式和 6 维评分。</p>";
}

function renderSmartRouteNext(data, routeName) {
  const result = document.getElementById("smartRouteResult");
  result.innerHTML =
    "<strong>已自动分流到：" + escapeHtml(routeName) + "</strong>" +
    "<div class=\"cover-result\"><strong>推荐发送</strong><p>" + escapeHtml(data.recommended || "") + "</p></div>" +
    "<p><strong>原因：</strong>" + escapeHtml(data.why || "") + "</p>" +
    "<p>详细结果已经同步到 AI 教练区的紧急模式。</p>";
}

function fillWorkbenchExample() {
  document.getElementById("workbenchInput").value = "她：今天有点累，先不太想聊天。\n我想发：你是不是不想理我？我等你半天了。";
}

async function runWorkbenchTrial() {
  fillWorkbenchExample();
  await runWorkbench();
}

function createPendingFeedback(source, suggestedMessage, context) {
  pendingFeedback = {
    source: source || "AI 建议",
    suggestedMessage: String(suggestedMessage || "").slice(0, 500),
    context: String(context || "").slice(0, 1200),
    createdAt: new Date().toISOString()
  };
  const prompt = document.getElementById("workbenchFeedbackPrompt");
  const reply = document.getElementById("workbenchFeedbackReply");
  if (!prompt) return;
  if (reply) reply.value = "";
  prompt.classList.add("is-visible");
  window.clearTimeout(pendingFeedbackTimer);
  pendingFeedbackTimer = window.setTimeout(() => {
    if (!pendingFeedback) return;
    prompt.classList.add("is-visible");
    const text = prompt.querySelector("span");
    if (text) text.textContent = "刚才那句如果你已经用了，对方怎么回？填一下，DeepSeek 会帮你做反馈闭环。";
  }, 45000);
}

async function runWorkbench() {
  const input = document.getElementById("workbenchInput");
  const text = input.value.trim();
  const reviewBox = document.getElementById("workbenchReviewResult");
  const nextBox = document.getElementById("workbenchNextResult");
  const rescueBox = document.getElementById("workbenchRescueResult");
  const feedback = document.getElementById("workbenchFeedbackPrompt");
  if (!text) {
    reviewBox.innerHTML = "<strong>复盘判断</strong><p>先贴当前聊天或你想发的原话。</p>";
    nextBox.innerHTML = "<strong>建议下一句</strong><p>等待输入。</p>";
    rescueBox.innerHTML = "<strong>上头急救版</strong><p>等待输入。</p>";
    return;
  }

  reviewBox.innerHTML = "<strong>复盘判断</strong><p>正在判断风险和阶段。</p>";
  nextBox.innerHTML = "<strong>建议下一句</strong><p>正在生成自然回复。</p>";
  rescueBox.innerHTML = "<strong>上头急救版</strong><p>正在生成降压版本。</p>";
  if (feedback) feedback.classList.remove("is-visible");

  try {
    const reviewPayload = await callAiEndpoint("/api/ai/review", { chatLog: text });
    const review = reviewPayload.data || {};
    reviewBox.innerHTML =
      "<strong>复盘判断</strong>" +
      "<p>风险：" + Number(review.riskScore || 0) + "/10；阶段：" + escapeHtml(review.conversationStage || "未知") + "</p>" +
      "<ul>" + (review.userIssues || []).slice(0, 3).map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
    renderSixDimensionScores(review.scores);
    renderProfile(reviewPayload.profile);
    renderTimeline(reviewPayload.timeline);
    if (reviewPayload.insights) renderReviewInsights(reviewPayload.insights);

    const nextPayload = await callAiEndpoint("/api/ai/next-message", { context: text, tone: "稳重自然" });
    nextBox.innerHTML =
      "<strong>建议下一句</strong>" +
      "<p>" + escapeHtml(nextPayload.data.recommended || "") + "</p>";

    const rescueContext = "我现在可能上头了。请拦截这句话，改成低压力、尊重边界、不会追问或情绪勒索的表达：\n" + text;
    const rescuePayload = await callAiEndpoint("/api/ai/next-message", { context: rescueContext, tone: "修复关系" });
    rescueBox.innerHTML =
      "<strong>上头急救版</strong>" +
      "<p>" + escapeHtml(rescuePayload.data.recommended || "") + "</p>";

    const quickInput = document.getElementById("quickInput");
    if (quickInput) quickInput.value = text;
    createPendingFeedback("每日聊天工作台", nextPayload.data.recommended || rescuePayload.data.recommended || "", text);
    if (feedback) feedback.classList.add("is-visible");
    saveToActiveSession("复盘", text, (review.nextMessage || "") + " | " + (nextPayload.data.recommended || ""));
    refreshTrendChart();
  } catch (error) {
    renderAiError(reviewBox, error);
    nextBox.innerHTML = "<strong>建议下一句</strong><p>本次生成失败，先不要急着发。</p>";
    rescueBox.innerHTML = "<strong>上头急救版</strong><p>先暂停 20 分钟，再回来处理。</p>";
  }
}

async function saveWorkbenchFeedback(outcome) {
  return savePendingFeedback(outcome);
}

async function savePendingFeedback(outcome) {
  const note = document.getElementById("workbenchInput").value.trim().slice(0, 500);
  const reply = document.getElementById("workbenchFeedbackReply");
  const replyText = reply ? reply.value.trim() : "";
  const result = document.getElementById("workbenchFeedbackPrompt");
  try {
    const payload = await callAiEndpoint("/api/feedback", {
      outcome,
      note: note ? "工作台反馈：" + note : "工作台反馈",
      reply: replyText,
      suggestedMessage: pendingFeedback ? pendingFeedback.suggestedMessage : "",
      source: pendingFeedback ? pendingFeedback.source : "工作台"
    });
    if (payload.timeline) renderTimeline(payload.timeline);
    if (payload.profile) renderProfile(payload.profile);
    if (payload.reflection) {
      const reviewBox = document.getElementById("workbenchReviewResult");
      reviewBox.innerHTML =
        "<strong>反馈已分析：" + escapeHtml(outcome) + "</strong>" +
        "<p>" + escapeHtml(payload.reflection.summary || "") + "</p>" +
        "<p><strong>下次实验：</strong>" + escapeHtml(payload.reflection.nextExperiment || "") + "</p>";
      result.classList.remove("is-visible");
    } else {
      result.classList.remove("is-visible");
    }
    pendingFeedback = null;
    window.clearTimeout(pendingFeedbackTimer);
  } catch (error) {
    renderAiError(document.getElementById("workbenchReviewResult"), error);
  }
}

async function routeSmartIntake() {
  const input = document.getElementById("homeSmartInput");
  const result = document.getElementById("smartRouteResult");
  const mode = document.getElementById("smartRouteMode").value;
  const text = input.value.trim();
  if (!text) {
    result.innerHTML = "<strong>还没有内容</strong><p>先贴她的话、你的原话，或一小段聊天记录。</p>";
    return;
  }

  const route = inferSmartRoute(text, mode);
  const routeName = route === "review" ? "聊天复盘" : route === "rescue" ? "上头急救" : "生成下一句";
  const quickInput = document.getElementById("quickInput");
  if (quickInput) quickInput.value = text;
  result.innerHTML = "<strong>正在处理</strong><p>已判断为“" + routeName + "”，正在调用 AI。</p>";

  try {
    if (route === "review") {
      const payload = await callAiEndpoint("/api/ai/review", { chatLog: text });
      renderQuickReviewResult(payload.data);
      renderSixDimensionScores(payload.data.scores);
      renderSmartRouteReview(payload.data, routeName);
      renderProfile(payload.profile);
      renderTimeline(payload.timeline);
      if (payload.insights) renderReviewInsights(payload.insights);
      return;
    }

    const context = route === "rescue"
      ? "我现在可能上头了。请拦截这句话，改成低压力、尊重边界、不会追问或情绪勒索的表达：\n" + text
      : text;
    const payload = await callAiEndpoint("/api/ai/next-message", { context, tone: route === "rescue" ? "修复关系" : "稳重自然" });
    renderQuickNext(payload.data);
    renderSmartRouteNext(payload.data, routeName);
    renderProfile(payload.profile);
    renderTimeline(payload.timeline);
    createPendingFeedback("智能分流：" + routeName, payload.data.recommended || "", text);
  } catch (error) {
    renderAiError(result, error);
  }
}

function renderProfile(profile) {
  const list = (items) => (items && items.length ? items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") : "<li>暂无</li>");
  document.getElementById("aiProfileContent").innerHTML =
    "<strong>" + escapeHtml(profile.summary || "暂无画像") + "</strong>" +
    "<p>关系阶段：" + escapeHtml(profile.relationshipStage || "未知") + "；累计 AI 更新：" + Number(profile.historyCount || 0) + " 次。</p>" +
    "<p><strong>常见弱点</strong></p><ul>" + list(profile.weaknesses) + "</ul>" +
    "<p><strong>已有优势</strong></p><ul>" + list(profile.strengths) + "</ul>" +
    "<p><strong>训练计划</strong></p><ul>" + list(profile.trainingPlan) + "</ul>";
}

async function refreshAiProfile() {
  const status = document.getElementById("aiStatus");
  try {
    const health = await callAiEndpoint("/api/health");
    status.className = health.aiConfigured ? "tag" : "tag warn";
    status.textContent = health.aiConfigured ? "AI 已配置：" + health.model : "AI 未配置：需要 OPENAI_API_KEY";
    const payload = await callAiEndpoint("/api/profile");
    renderProfile(payload.profile);
  } catch (error) {
    status.className = "tag danger";
    status.textContent = "AI 后端未连接";
    renderAiError(document.getElementById("aiProfileContent"), error);
  }
}

async function resetAiProfile() {
  const panel = document.getElementById("aiProfileContent");
  panel.innerHTML = "<strong>正在清空画像</strong><p>请稍等。</p>";
  try {
    const payload = await callAiEndpoint("/api/profile/reset", {});
    renderProfile(payload.profile);
  } catch (error) {
    renderAiError(panel, error);
  }
}

function sanitizeChatText() {
  const input = document.getElementById("aiReviewInput");
  let text = input.value;
  if (!text.trim()) {
    document.getElementById("aiReviewResult").innerHTML = "<strong>还没有内容</strong><p>先粘贴聊天记录，再一键脱敏。</p>";
    return;
  }

  text = text
    .replace(/1[3-9]\d{9}/g, "[手机号]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[邮箱]")
    .replace(/微信号?[:：]?\s*[A-Za-z0-9_-]{5,}/gi, "微信号：[已隐藏]")
    .replace(/(身份证|证件号)[:：]?\s*[\dXx]{15,18}/g, "$1：[已隐藏]")
    .replace(/(地址|住址|公司|学校)[:：]?\s*[^\n，。]{3,40}/g, "$1：[已隐藏]")
    .replace(/(我叫|她叫|他叫|名字是)[:：]?\s*[\u4e00-\u9fa5A-Za-z]{2,8}/g, "$1[已隐藏]");

  input.value = text;
  document.getElementById("aiReviewResult").innerHTML =
    "<strong>已脱敏</strong><p>已尝试隐藏手机号、邮箱、微信号、证件号、地址、学校、公司和姓名。发送前建议你再扫一眼。</p>";
}

function fillAiReviewExample() {
  document.getElementById("aiReviewInput").value = "我：你怎么又不回我？\n她：刚刚在忙。\n我：忙到一句话都没空吗？\n她：我觉得你有点急。";
}

async function runAiReviewTrial() {
  fillAiReviewExample();
  await runAiReview();
}

function renderRelationship(relationship) {
  document.getElementById("relationshipName").value = relationship.name || "";
  document.getElementById("relationshipNotes").value = relationship.notes || "";
  document.getElementById("relationshipResult").innerHTML =
    "<strong>当前档案：" + escapeHtml(relationship.name || "未命名对象") + "</strong>" +
    "<p>阶段：" + escapeHtml(relationship.stage || "未知") + "</p>" +
    "<p>" + escapeHtml(relationship.notes || "还没有备注。") + "</p>";
}

async function refreshRelationshipProfile() {
  try {
    const payload = await callAiEndpoint("/api/relationship");
    renderRelationship(payload.relationship);
  } catch (error) {
    renderAiError(document.getElementById("relationshipResult"), error);
  }
}

async function saveRelationshipProfile() {
  const name = document.getElementById("relationshipName").value.trim() || "未命名对象";
  const notes = document.getElementById("relationshipNotes").value.trim();
  const result = document.getElementById("relationshipResult");
  result.innerHTML = "<strong>正在保存</strong><p>请稍等。</p>";
  try {
    const payload = await callAiEndpoint("/api/relationship", { name, notes });
    renderRelationship(payload.relationship);
  } catch (error) {
    renderAiError(result, error);
  }
}

function renderTimeline(items) {
  const result = document.getElementById("timelineResult");
  if (!items || !items.length) {
    result.innerHTML = "<strong>暂无时间线</strong><p>完成 AI 复盘、下一句生成或结果反馈后，这里会自动记录摘要。</p>";
    return;
  }

  result.innerHTML = items.slice(0, 8).map((item) => {
    const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
    const detail = item.nextMessage || item.summary || item.note || item.outcome || "";
    return "<div class=\"talk-line\"><strong>" + escapeHtml(item.title || item.type || "记录") + "</strong>" +
      "<p>" + escapeHtml(date) + "</p>" +
      "<p>" + escapeHtml(String(detail).slice(0, 180)) + "</p></div>";
  }).join("");
}

async function refreshTimeline() {
  try {
    const payload = await callAiEndpoint("/api/timeline");
    renderTimeline(payload.timeline);
  } catch (error) {
    renderAiError(document.getElementById("timelineResult"), error);
  }
}

async function saveResultFeedback() {
  const outcome = document.getElementById("feedbackOutcome").value;
  const note = document.getElementById("feedbackNote").value.trim();
  const result = document.getElementById("feedbackResult");
  result.innerHTML = "<strong>正在保存反馈</strong><p>请稍等。</p>";
  try {
    const payload = await callAiEndpoint("/api/feedback", { outcome, note });
    result.innerHTML = "<strong>已保存反馈：" + escapeHtml(outcome) + "</strong><p>这条记录已经写入本地时间线。</p>";
    renderTimeline(payload.timeline);
    document.getElementById("feedbackNote").value = "";
  } catch (error) {
    renderAiError(result, error);
  }
}

function renderLanguageLibrary(items) {
  const box = document.getElementById("libraryList");
  if (!items || !items.length) {
    box.innerHTML = "<strong>暂无收藏</strong><p>先收藏一句你觉得自然、有效的话。</p>";
    return;
  }
  box.innerHTML = items.slice(0, 12).map((item) =>
    "<div class=\"talk-line\"><strong>" + escapeHtml(item.scene || "未分类") + " · " + escapeHtml(item.style || "未标记") + "</strong>" +
    "<p>" + escapeHtml(item.text || "") + "</p>" +
    "<p>" + escapeHtml(item.rating || "收藏") + "</p></div>"
  ).join("");
}

async function refreshLanguageLibrary() {
  try {
    const payload = await callAiEndpoint("/api/library");
    renderLanguageLibrary(payload.library);
  } catch (error) {
    renderAiError(document.getElementById("libraryList"), error);
  }
}

async function saveLibraryItem() {
  const scene = document.getElementById("libraryScene").value;
  const style = document.getElementById("libraryStyle").value;
  const text = document.getElementById("libraryText").value.trim();
  const result = document.getElementById("libraryResult");
  if (!text) {
    result.innerHTML = "<strong>还没有句子</strong><p>先输入一句要收藏的表达。</p>";
    return;
  }
  result.innerHTML = "<strong>正在收藏</strong><p>请稍等。</p>";
  try {
    const payload = await callAiEndpoint("/api/library", { scene, style, text, rating: "手动收藏", source: "manual" });
    result.innerHTML = "<strong>已收藏</strong><p>" + escapeHtml(text) + "</p>";
    document.getElementById("libraryText").value = "";
    renderLanguageLibrary(payload.library);
  } catch (error) {
    renderAiError(result, error);
  }
}

function renderForbiddenExpressions(items) {
  const box = document.getElementById("forbiddenList");
  if (!items || !items.length) {
    box.innerHTML = "<strong>暂无禁用表达</strong><p>建议先加入你容易上头时会发的话。</p>";
    return;
  }
  box.innerHTML = "<strong>禁用表达库</strong><ul>" + items.slice(-40).reverse().map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
}

async function refreshForbiddenExpressions() {
  try {
    const payload = await callAiEndpoint("/api/forbidden");
    renderForbiddenExpressions(payload.forbidden);
  } catch (error) {
    renderAiError(document.getElementById("forbiddenList"), error);
  }
}

async function saveForbiddenExpression() {
  const text = document.getElementById("forbiddenText").value.trim();
  if (!text) {
    document.getElementById("forbiddenList").innerHTML = "<strong>还没有内容</strong><p>先输入一句禁用表达。</p>";
    return;
  }
  try {
    const payload = await callAiEndpoint("/api/forbidden", { text });
    document.getElementById("forbiddenText").value = "";
    renderForbiddenExpressions(payload.forbidden);
  } catch (error) {
    renderAiError(document.getElementById("forbiddenList"), error);
  }
}

function renderAiReview(data) {
  const list = (items) => (items && items.length ? items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") : "<li>暂无</li>");
  renderSixDimensionScores(data.scores);
  document.getElementById("aiReviewResult").innerHTML =
    "<strong>复盘结论：" + escapeHtml(data.summary || "已完成") + "</strong>" +
    "<p>阶段：" + escapeHtml(data.conversationStage || "未知") + "；风险评分：" + Number(data.riskScore || 0) + "/100</p>" +
    "<p><strong>变冷节点</strong></p><ul>" + list(data.coldNodes) + "</ul>" +
    "<p><strong>你的问题</strong></p><ul>" + list(data.userIssues) + "</ul>" +
    "<p><strong>对方信号</strong></p><ul>" + list(data.otherSignals) + "</ul>" +
    "<p><strong>更好说法</strong></p><ul>" + list(data.betterReplies) + "</ul>" +
    "<div class=\"talk-line\"><strong>下一句：</strong>" + escapeHtml(data.nextMessage || "先暂停，不急着继续发。") + "</div>" +
    (data.repairMessage ? "<div class=\"talk-line\"><strong>修复句：</strong>" + escapeHtml(data.repairMessage) + "</div>" : "");
}

async function runAiReview() {
  const chatLog = document.getElementById("aiReviewInput").value.trim();
  const result = document.getElementById("aiReviewResult");
  if (!chatLog) {
    result.innerHTML = "<strong>还没有聊天记录</strong><p>先粘贴一段真实聊天。</p>";
    return;
  }
  result.innerHTML = "<strong>AI 正在复盘</strong><p>正在分析上下文、变冷节点和补救方式。</p>";
  try {
    const payload = await callAiEndpoint("/api/ai/review", { chatLog });
    renderAiReview(payload.data);
    renderProfile(payload.profile);
    renderTimeline(payload.timeline);
    if (payload.insights) renderReviewInsights(payload.insights);
    await refreshAiProfile();
  } catch (error) {
    renderAiError(result, error);
  }
}

async function runQuickReview() {
  const text = document.getElementById("quickInput").value.trim();
  const result = document.getElementById("quickResult");
  if (!text) {
    result.innerHTML = "<strong>还没有内容</strong><p>先贴当前聊天或你想发的原话。</p>";
    return;
  }
  result.innerHTML = "<strong>正在快速复盘</strong><p>先判断压力、边界和下一句。</p>";
  try {
    const payload = await callAiEndpoint("/api/ai/review", { chatLog: text });
    renderQuickReviewResult(payload.data);
    renderSixDimensionScores(payload.data.scores);
    renderProfile(payload.profile);
    renderTimeline(payload.timeline);
    if (payload.insights) renderReviewInsights(payload.insights);
  } catch (error) {
    renderAiError(result, error);
  }
}

async function runQuickNext() {
  const text = document.getElementById("quickInput").value.trim();
  const result = document.getElementById("quickResult");
  if (!text) {
    result.innerHTML = "<strong>还没有上下文</strong><p>先写她说了什么、你想发什么。</p>";
    return;
  }
  result.innerHTML = "<strong>正在生成下一句</strong><p>会参考本地话术库和禁用表达。</p>";
  try {
    const payload = await callAiEndpoint("/api/ai/next-message", { context: text, tone: "稳重自然" });
    renderQuickNext(payload.data);
    renderProfile(payload.profile);
    renderTimeline(payload.timeline);
    createPendingFeedback("快速下一句", payload.data.recommended || "", text);
  } catch (error) {
    renderAiError(result, error);
  }
}

async function runQuickRescue() {
  const text = document.getElementById("quickInput").value.trim();
  const result = document.getElementById("quickResult");
  if (!text) {
    result.innerHTML = "<strong>先写原话</strong><p>把你现在最想发的重话贴进来。</p>";
    return;
  }
  result.innerHTML = "<strong>正在拦截上头表达</strong><p>目标是降压、保边界、保留体面。</p>";
  try {
    const context = "我现在可能上头了。请拦截这句话，改成低压力、尊重边界、不会追问或情绪勒索的表达：\n" + text;
    const payload = await callAiEndpoint("/api/ai/next-message", { context, tone: "修复关系" });
    renderQuickNext(payload.data);
    renderProfile(payload.profile);
    renderTimeline(payload.timeline);
    createPendingFeedback("紧急救场", payload.data.recommended || "", text);
  } catch (error) {
    renderAiError(result, error);
  }
}

function fillAiNextExample() {
  document.getElementById("aiNextContext").value = "她：最近工作好累，可能没什么精力聊天。\n我想自然回应，不想显得追问或上头。";
  document.getElementById("aiNextTone").value = "稳重自然";
}

async function runAiNextTrial() {
  fillAiNextExample();
  await runAiNextMessage();
}

function renderAiNext(data) {
  const doNotSend = data.doNotSend && data.doNotSend.length
    ? data.doNotSend.map((item) => "<li>" + escapeHtml(item) + "</li>").join("")
    : "<li>暂无</li>";
  const alternatives = data.alternatives || {};
  document.getElementById("aiNextResult").innerHTML =
    "<strong>推荐下一句</strong>" +
    "<div class=\"talk-line\">" + escapeHtml(data.recommended || "") + "</div>" +
    "<p><strong>为什么：</strong>" + escapeHtml(data.why || "") + "</p>" +
    "<p><strong>发送时机：</strong>" + escapeHtml(data.timing || "") + "</p>" +
    "<ul>" +
    "<li><strong>稳重自然：</strong>" + escapeHtml(alternatives.steady || "") + "</li>" +
    "<li><strong>轻松幽默：</strong>" + escapeHtml(alternatives.light || "") + "</li>" +
    "<li><strong>成熟表达：</strong>" + escapeHtml(alternatives.mature || "") + "</li>" +
    "</ul>" +
    "<p><strong>别这样发</strong></p><ul>" + doNotSend + "</ul>";
}

async function runAiNextMessage() {
  const context = document.getElementById("aiNextContext").value.trim();
  const tone = document.getElementById("aiNextTone").value;
  const result = document.getElementById("aiNextResult");
  if (!context) {
    result.innerHTML = "<strong>还没有上下文</strong><p>请说明她刚才说了什么，以及你想达到什么目的。</p>";
    return;
  }
  result.innerHTML = "<strong>AI 正在生成</strong><p>正在结合你的画像和当前场景。</p>";
  try {
    const payload = await callAiEndpoint("/api/ai/next-message", { context, tone });
    renderAiNext(payload.data);
    renderProfile(payload.profile);
    renderTimeline(payload.timeline);
    createPendingFeedback("AI 下一句生成", payload.data.recommended || "", context);
    await refreshAiProfile();
  } catch (error) {
    renderAiError(result, error);
  }
}

function renderTrainingProgress(progress) {
  const taskBox = document.getElementById("todayTrainingTask");
  const report = document.getElementById("progressReport");
  if (!progress || !progress.todayTask) {
    taskBox.innerHTML = "<strong>暂无训练计划</strong><p>请确认 training-data.json 至少有 21 条每日训练。</p>";
    return;
  }
  const task = progress.todayTask;
  taskBox.innerHTML =
    "<span class=\"tag\">第 " + Number(task.day || 1) + " 天</span>" +
    "<strong>" + escapeHtml(task.title || "今日训练") + "</strong>" +
    "<p>" + escapeHtml(task.body || "") + "</p>" +
    "<div class=\"talk-line\"><strong>示例：</strong>" + escapeHtml(task.example || "") + "</div>";
  report.innerHTML =
    "<strong>" + (progress.completedToday ? "今天已完成" : "今天未打卡") + "</strong>" +
    "<p>累计完成：" + Number(progress.completedCount || 0) + " 天；最近记录：" + escapeHtml((progress.recentDates || []).join("、") || "暂无") + "</p>";
  renderHomeProgressDashboard(progress);
}

function renderHomeProgressDashboard(progress) {
  const ring = document.getElementById("homeProgressRing");
  const stats = document.getElementById("homeProgressStats");
  const hint = document.getElementById("homeProgressHint");
  if (!ring || !stats || !hint || !progress) return;
  const total = 21;
  const completed = Math.max(0, Math.min(total, Number(progress.completedCount || 0)));
  const percent = Math.round((completed / total) * 100);
  const task = progress.todayTask || {};
  ring.style.setProperty("--progress-angle", Math.round(percent * 3.6) + "deg");
  ring.textContent = percent + "%";
  stats.textContent = "累计完成 " + completed + "/" + total + " 天，第 " + Number(task.day || 1) + " 天：" + (task.title || "今日训练");
  hint.textContent = progress.completedToday
    ? "今天已经打卡。下一步可以做一次真实聊天复盘，把有效句沉淀进语言库。"
    : "今天还没打卡。先完成今日训练，再去紧急模式处理当前聊天。";
}

function renderReviewInsights(insights) {
  const data = insights || {};
  const issues = Array.isArray(data.topIssues) ? data.topIssues : [];
  const focus = Array.isArray(data.weeklyFocus) ? data.weeklyFocus : [];
  const issueItems = issues.length
    ? issues.map((item) => "<li><strong>" + escapeHtml(item.label || "问题") + "</strong>：" + Number(item.count || 0) + " 次；" + escapeHtml(item.advice || "") + "</li>").join("")
    : "<li>还没有足够的 AI 复盘记录。先完成 2 到 3 次真实聊天复盘。</li>";
  const focusItems = focus.length
    ? focus.map((item) => "<li>" + escapeHtml(item) + "</li>").join("")
    : "<li>先完成一次真实聊天复盘。</li>";

  const panel = document.getElementById("reviewInsightResult");
  if (panel) {
    const coldStart = data.coldStart ? "<span class=\"tag\">AI 冷启动洞察</span>" : "";
    const coldDetail = data.coldStartDetail
      ? "<p><strong>先生成第一版弱点画像：</strong>" + escapeHtml(data.coldStartDetail.summary || "") + "</p>"
      : "";
    panel.innerHTML =
      coldStart +
      "<strong>本周复盘洞察</strong>" +
      "<p>累计复盘：" + Number(data.totalReviews || 0) + " 次；近 7 天：" + Number(data.recentReviews || 0) + " 次；平均风险：" + Number(data.averageRisk || 0) + "/10。</p>" +
      coldDetail +
      "<p><strong>最常犯的 5 个错误</strong></p><ul>" + issueItems + "</ul>" +
      "<p><strong>本周训练重点</strong></p><ul>" + focusItems + "</ul>";
  }

  const digest = document.getElementById("homeInsightDigest");
  if (digest) {
    const list = digest.querySelector(".insight-list");
    if (list) {
      list.innerHTML = issues.length
        ? issues.map((item) => "<span class=\"insight-chip\">" + escapeHtml(item.label || "问题") + " x" + Number(item.count || 0) + "</span>").join("")
        : "<span class=\"insight-chip\">可先生成冷启动洞察</span><span class=\"insight-chip\">本周训练重点会自动生成</span>";
    }
  }
}

async function refreshReviewInsights() {
  const panel = document.getElementById("reviewInsightResult");
  if (panel) {
    panel.innerHTML = "<strong>正在刷新洞察</strong><p>读取本地 AI 复盘时间线。</p>";
  }
  try {
    const payload = await callAiEndpoint("/api/insights");
    if (payload.insights && payload.insights.empty) {
      await runColdStartInsights();
      return;
    }
    renderReviewInsights(payload.insights);
  } catch (error) {
    renderAiError(panel || document.getElementById("smartRouteResult"), error);
  }
}

async function runColdStartInsights() {
  const panel = document.getElementById("reviewInsightResult");
  if (panel) {
    panel.innerHTML = "<strong>AI 正在生成冷启动洞察</strong><p>没有复盘数据时，DeepSeek 会先根据画像、关系档案和训练计划生成第一版弱点画像。</p>";
  }
  try {
    const payload = await callAiEndpoint("/api/ai/cold-start-insights", {
      reason: "没有足够复盘记录，需要先生成第一版弱点画像。"
    });
    renderReviewInsights(payload.insights);
    if (payload.profile) renderProfile(payload.profile);
    if (payload.timeline) renderTimeline(payload.timeline);
  } catch (error) {
    renderAiError(panel || document.getElementById("smartRouteResult"), error);
  }
}

function fillUniversalExample() {
  document.getElementById("universalRelationType").value = "同事 / 上下级";
  document.getElementById("universalGoal").value = "催进度";
  document.getElementById("universalOtherState").value = "对方可能很忙，但我这边确实需要文件继续推进";
  document.getElementById("universalDraft").value = "你怎么还没发给我？我这边都等半天了。";
}

function renderUniversalCommunication(data) {
  const result = document.getElementById("universalResult");
  const doNotSay = Array.isArray(data.doNotSay) && data.doNotSay.length
    ? data.doNotSay.map((item) => "<li>" + escapeHtml(item) + "</li>").join("")
    : "<li>不要质问、讽刺、威胁或连续追问。</li>";
  result.innerHTML =
    "<strong>通用人际沟通策略</strong>" +
    "<p>" + escapeHtml(data.strategy || "先降低压力，再清楚表达目的。") + "</p>" +
    "<p><strong>关系风险：</strong>" + escapeHtml(data.relationRisk || "") + "</p>" +
    "<div class=\"talk-line\"><strong>稳妥版</strong><p>" + escapeHtml(data.safeReply || "") + "</p></div>" +
    "<div class=\"talk-line\"><strong>温和版</strong><p>" + escapeHtml(data.warmReply || "") + "</p></div>" +
    "<div class=\"talk-line\"><strong>清晰边界版</strong><p>" + escapeHtml(data.boundaryReply || "") + "</p></div>" +
    "<div class=\"talk-line\"><strong>一句话短版</strong><p>" + escapeHtml(data.shortReply || "") + "</p></div>" +
    "<p><strong>不建议说法</strong></p><ul>" + doNotSay + "</ul>" +
    "<p><strong>下一步：</strong>" + escapeHtml(data.nextStep || "") + "</p>";
}

async function runUniversalCommunication() {
  const relationType = document.getElementById("universalRelationType").value;
  const goal = document.getElementById("universalGoal").value;
  const otherState = document.getElementById("universalOtherState").value.trim();
  const message = document.getElementById("universalDraft").value.trim();
  const result = document.getElementById("universalResult");
  if (!message) {
    result.innerHTML = "<strong>还没有场景</strong><p>先写你原本想说的话，或描述现在卡住的关系场景。</p>";
    return;
  }
  result.innerHTML = "<strong>DeepSeek 正在处理</strong><p>正在按关系类型、沟通目的和对方状态生成合适表达。</p>";
  try {
    const payload = await callAiEndpoint("/api/ai/universal-communication", {
      relationType,
      goal,
      otherState,
      message
    });
    renderUniversalCommunication(payload.data);
    if (payload.profile) renderProfile(payload.profile);
    if (payload.timeline) renderTimeline(payload.timeline);
    createPendingFeedback("通用人际沟通：" + relationType + " / " + goal, payload.data.safeReply || "", message);
  } catch (error) {
    renderAiError(result, error);
  }
}

function fillManipulationExample() {
  document.getElementById("manipulationInput").value = "你要是真在乎我，就不会这么久不回。";
}

function renderManipulationCheck(data) {
  const result = document.getElementById("manipulationResult");
  const types = Array.isArray(data.manipulationTypes) ? data.manipulationTypes : [];
  const redFlags = Array.isArray(data.redFlags) ? data.redFlags : [];
  result.innerHTML =
    "<strong>操控表达识别器</strong>" +
    "<span class=\"risk-meter\">风险 " + Number(data.riskLevel || 0) + "/10</span>" +
    "<p>" + escapeHtml(data.summary || "") + "</p>" +
    "<p><strong>操控类型</strong></p><ul class=\"risk-list\">" + types.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>" +
    "<p><strong>危险点</strong></p><ul class=\"risk-list\">" + redFlags.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>" +
    "<p><strong>为什么不健康：</strong>" + escapeHtml(data.whyUnsafe || "") + "</p>" +
    "<div class=\"talk-line\"><strong>健康改写</strong><p>" + escapeHtml(data.saferRewrite || "") + "</p></div>" +
    "<p><strong>边界原则：</strong>" + escapeHtml(data.boundaryPrinciple || "") + "</p>";
}

async function runManipulationCheck() {
  const input = document.getElementById("manipulationInput");
  const text = input.value.trim();
  const result = document.getElementById("manipulationResult");
  if (!text) {
    result.innerHTML = "<strong>还没有内容</strong><p>先输入一句你想检测的表达。</p>";
    return;
  }
  lastManipulationInput = text;
  result.innerHTML = "<strong>DeepSeek 正在做安全检测</strong><p>只做识别、防御和健康改写，不生成操控话术。</p>";
  try {
    const payload = await callAiEndpoint("/api/ai/manipulation-check", { text });
    renderManipulationCheck(payload.data);
    if (payload.timeline) renderTimeline(payload.timeline);
  } catch (error) {
    renderAiError(result, error);
  }
}

async function saveManipulationForbidden() {
  const text = (lastManipulationInput || document.getElementById("manipulationInput").value || "").trim();
  const result = document.getElementById("manipulationResult");
  if (!text) {
    result.innerHTML = "<strong>还没有禁用表达</strong><p>先输入或检测一句危险表达。</p>";
    return;
  }
  try {
    const payload = await callAiEndpoint("/api/forbidden", { text });
    renderForbiddenExpressions(payload.forbidden);
    result.innerHTML += "<p><strong>已加入禁用表达库。</strong></p>";
  } catch (error) {
    renderAiError(result, error);
  }
}

function renderSystemStatus(status) {
  const box = document.getElementById("systemStatusResult");
  if (!box || !status) return;
  const readiness = status.launchReadiness || {};
  const checks = Array.isArray(readiness.checks) ? readiness.checks : [];
  const fileCount = Array.isArray(status.files) ? status.files.filter((file) => file.exists).length : 0;
  const fileTotal = Array.isArray(status.files) ? status.files.length : 0;
  const items = checks.map((item) =>
    "<div class=\"status-item\"><div><strong>" + escapeHtml(item.label || item.key || "检查项") + "</strong>" +
    "<span>" + (item.ok ? "正常" : "需要处理") + "</span></div>" +
    "<b class=\"status-pill" + (item.ok ? "" : " warn") + "\">" + (item.ok ? "OK" : "检查") + "</b></div>"
  ).join("");
  box.innerHTML =
    "<strong>落地评分：" + Number(readiness.score || 0) + "/100</strong>" +
    "<p>AI：" + (status.aiConfigured ? "已连接" : "未配置") + "；模型：" + escapeHtml(status.model || "未知") + "；数据文件：" + fileCount + "/" + fileTotal + "。</p>" +
    items;
}

async function refreshSystemStatus() {
  const box = document.getElementById("systemStatusResult");
  if (box) box.innerHTML = "<strong>正在系统自检</strong><p>读取本地服务和数据文件状态。</p>";
  try {
    const payload = await callAiEndpoint("/api/system/status");
    renderSystemStatus(payload);
  } catch (error) {
    renderAiError(box, error);
  }
}

async function exportLocalData() {
  const result = document.getElementById("dataOpsResult");
  result.innerHTML = "<strong>正在导出</strong><p>整理本地画像、训练进度、语言库和洞察。</p>";
  try {
    const payload = await callAiEndpoint("/api/export");
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dating-chat-guide-export-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    result.innerHTML = "<strong>已生成导出文件</strong><p>导出内容不包含 .env 或 API Key。</p>";
  } catch (error) {
    renderAiError(result, error);
  }
}

async function resetLocalData() {
  const result = document.getElementById("dataOpsResult");
  const confirmed = window.confirm("这会清空画像、关系档案、时间线、训练进度和语言库。建议先导出。继续吗？");
  if (!confirmed) return;
  const code = window.prompt("请输入 RESET_LOCAL_DATA 确认清空本地数据。");
  if (code !== "RESET_LOCAL_DATA") {
    result.innerHTML = "<strong>已取消</strong><p>确认文字不匹配，未清空任何数据。</p>";
    return;
  }
  result.innerHTML = "<strong>正在清空</strong><p>重置本地 JSON 数据文件。</p>";
  try {
    await callAiEndpoint("/api/data/reset", { confirm: "RESET_LOCAL_DATA" });
    result.innerHTML = "<strong>已清空本地数据</strong><p>画像、时间线、训练进度和语言库已恢复初始状态。</p>";
    await refreshAiProfile();
    await refreshRelationshipProfile();
    await refreshTimeline();
    await refreshLanguageLibrary();
    await refreshForbiddenExpressions();
    await refreshTrainingProgress();
    await refreshReviewInsights();
    await refreshSystemStatus();
  } catch (error) {
    renderAiError(result, error);
  }
}

async function refreshTrainingProgress() {
  try {
    const payload = await callAiEndpoint("/api/progress");
    renderTrainingProgress(payload.progress);
  } catch (error) {
    renderAiError(document.getElementById("progressReport"), error);
  }
}

async function completeTodayTraining() {
  const result = document.getElementById("progressReport");
  result.innerHTML = "<strong>正在打卡</strong><p>写入本地训练进度。</p>";
  try {
    const payload = await callAiEndpoint("/api/training/complete", { note: "完成今日训练" });
    renderTrainingProgress(payload.progress);
    if (payload.timeline) renderTimeline(payload.timeline);
  } catch (error) {
    renderAiError(result, error);
  }
}

// ── 情绪趋势图 ──────────────────────────────────────────────

function renderTrendChart(timeline) {
  const canvas = document.getElementById("trendChartCanvas");
  const msg = document.getElementById("trendChartMsg");
  if (!canvas) return;

  const reviews = (timeline || []).filter((item) => item.type === "ai-review" && item.scores);
  if (reviews.length < 2) {
    if (msg) msg.textContent = "完成 2 次以上 AI 深度复盘后，图表自动出现。当前记录：" + reviews.length + " 次。";
    return;
  }
  if (msg) msg.textContent = "共 " + reviews.length + " 次复盘记录，从旧到新排列。";

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || 600;
  const H = rect.height || 260;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const pad = { top: 20, right: 24, bottom: 36, left: 36 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const n = reviews.length;

  ctx.fillStyle = "#131320";
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = "#2a2a40";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 2) {
    const y = pad.top + cH - (i / 10) * cH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cW, y);
    ctx.stroke();
    ctx.fillStyle = "#666";
    ctx.font = `${11 * dpr / dpr}px sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(i, pad.left - 4, y + 4);
  }

  function cx(i) { return pad.left + (n === 1 ? cW / 2 : (i / (n - 1)) * cW); }
  function cy(v) { return pad.top + cH - (Math.max(0, Math.min(10, Number(v) || 0)) / 10) * cH; }

  function drawLine(values, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = cx(i), y = cy(v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    values.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(cx(i), cy(v), 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  const reversedReviews = reviews.slice().reverse();
  drawLine(reversedReviews.map((r) => r.riskScore || 0), "#e06c75");
  drawLine(reversedReviews.map((r) => (r.scores || {}).empathy || 0), "#98c379");
  drawLine(reversedReviews.map((r) => (r.scores || {}).emotionalStability || 0), "#61afef");

  // X labels
  ctx.fillStyle = "#666";
  ctx.textAlign = "center";
  ctx.font = "10px sans-serif";
  reversedReviews.forEach((item, i) => {
    const d = item.createdAt ? new Date(item.createdAt) : null;
    const label = d ? (d.getMonth() + 1) + "/" + d.getDate() : String(i + 1);
    ctx.fillText(label, cx(i), pad.top + cH + 18);
  });
}

async function refreshTrendChart() {
  try {
    const payload = await callAiEndpoint("/api/timeline");
    renderTrendChart(payload.timeline ? payload.timeline.slice().reverse() : []);
  } catch (e) {
    const msg = document.getElementById("trendChartMsg");
    if (msg) msg.textContent = "读取时间线失败：" + (e.message || String(e));
  }
}

// ── 多轮会话历史 ────────────────────────────────────────────

let activeSessionId = null;

function renderSessionList(sessions) {
  const box = document.getElementById("sessionListResult");
  if (!box) return;
  if (!sessions || !sessions.length) {
    box.innerHTML = "<strong>暂无会话</strong><p>点击「新建会话」开始记录，每个会话独立保存聊天上下文。</p>";
    return;
  }
  box.innerHTML = sessions.map((s) =>
    "<div class=\"talk-line\" style=\"display:flex;justify-content:space-between;align-items:flex-start;gap:8px\">" +
    "<div><strong>" + escapeHtml(s.name) + "</strong>" +
    "<p style=\"margin:2px 0;font-size:12px;color:#888\">" + new Date(s.updatedAt).toLocaleString() + " · " + (s.turnCount || 0) + " 轮</p></div>" +
    "<div style=\"display:flex;gap:6px;flex-shrink:0\">" +
    "<button class=\"action-btn\" onclick=\"loadSession('" + escapeHtml(s.id) + "')\" type=\"button\">载入</button>" +
    "<button class=\"action-btn\" onclick=\"deleteSessionById('" + escapeHtml(s.id) + "')\" type=\"button\">删除</button>" +
    "</div></div>"
  ).join("");
}

function renderActiveSession(session) {
  const banner = document.getElementById("activeSessionBanner");
  const nameEl = document.getElementById("activeSessionName");
  const turnsEl = document.getElementById("activeSessionTurns");
  if (!banner || !nameEl || !turnsEl) return;
  if (!session) {
    banner.style.display = "none";
    activeSessionId = null;
    return;
  }
  activeSessionId = session.id;
  banner.style.display = "";
  nameEl.textContent = session.name;
  const turns = (session.turns || []).slice(-5).reverse();
  turnsEl.innerHTML = turns.length
    ? turns.map((t) =>
        "<div style=\"border-bottom:1px solid #2a2a40;padding:6px 0;font-size:13px\">" +
        "<span class=\"tag\" style=\"font-size:11px\">" + escapeHtml(t.type || "记录") + "</span> " +
        escapeHtml(String(t.input || "").slice(0, 80)) +
        "</div>"
      ).join("")
    : "<p style=\"color:#888;font-size:13px\">会话为空，复盘后点击「保存到会话」写入。</p>";
}

async function refreshSessions() {
  try {
    const payload = await callAiEndpoint("/api/sessions");
    renderSessionList(payload.sessions);
  } catch (e) {
    const box = document.getElementById("sessionListResult");
    if (box) renderAiError(box, e);
  }
}

async function createNewSession() {
  const nameInput = document.getElementById("sessionNameInput");
  const name = nameInput ? nameInput.value.trim() : "";
  try {
    const payload = await callAiEndpoint("/api/sessions", { name: name || undefined });
    if (nameInput) nameInput.value = "";
    renderActiveSession(payload.session);
    await refreshSessions();
  } catch (e) {
    const box = document.getElementById("sessionListResult");
    if (box) renderAiError(box, e);
  }
}

async function loadSession(id) {
  try {
    const payload = await callAiEndpoint("/api/sessions/" + id);
    renderActiveSession(payload.session);
    const turns = payload.session.turns || [];
    if (turns.length) {
      const last = turns[turns.length - 1];
      const input = document.getElementById("workbenchInput");
      if (input && last.input) input.value = last.input;
    }
  } catch (e) {
    const box = document.getElementById("sessionListResult");
    if (box) renderAiError(box, e);
  }
}

async function deleteSessionById(id) {
  if (!window.confirm("确定删除这个会话吗？")) return;
  try {
    const payload = await callAiEndpoint("/api/sessions/" + id);
    await fetch("/api/sessions/" + id, { method: "DELETE" });
    if (activeSessionId === id) renderActiveSession(null);
    await refreshSessions();
  } catch (e) {
    await refreshSessions();
  }
}

async function saveToActiveSession(type, input, output) {
  if (!activeSessionId) return;
  try {
    const payload = await callAiEndpoint("/api/sessions/" + activeSessionId + "/turn", { type, input, output });
    renderActiveSession(payload.session);
  } catch (e) { /* silent */ }
}

function initAiCoach() {
  document.getElementById("workbenchAnalyzeBtn").addEventListener("click", runWorkbench);
  document.getElementById("workbenchExampleBtn").addEventListener("click", fillWorkbenchExample);
  document.getElementById("workbenchTrialBtn").addEventListener("click", runWorkbenchTrial);
  document.getElementById("workbenchFeedbackGoodBtn").addEventListener("click", () => saveWorkbenchFeedback("她展开了"));
  document.getElementById("workbenchFeedbackColdBtn").addEventListener("click", () => saveWorkbenchFeedback("她冷了"));
  document.getElementById("workbenchFeedbackSaveBtn").addEventListener("click", () => savePendingFeedback("已填写对方回复"));
  document.getElementById("smartRouteBtn").addEventListener("click", routeSmartIntake);
  document.getElementById("quickReviewBtn").addEventListener("click", runQuickReview);
  document.getElementById("quickNextBtn").addEventListener("click", runQuickNext);
  document.getElementById("quickRescueBtn").addEventListener("click", runQuickRescue);
  document.getElementById("aiReviewBtn").addEventListener("click", runAiReview);
  document.getElementById("aiReviewExampleBtn").addEventListener("click", fillAiReviewExample);
  document.getElementById("aiReviewTrialBtn").addEventListener("click", runAiReviewTrial);
  document.getElementById("privacySanitizeBtn").addEventListener("click", sanitizeChatText);
  document.getElementById("aiNextBtn").addEventListener("click", runAiNextMessage);
  document.getElementById("aiNextExampleBtn").addEventListener("click", fillAiNextExample);
  document.getElementById("aiNextTrialBtn").addEventListener("click", runAiNextTrial);
  document.getElementById("aiRefreshProfileBtn").addEventListener("click", refreshAiProfile);
  document.getElementById("aiResetProfileBtn").addEventListener("click", resetAiProfile);
  document.getElementById("saveRelationshipBtn").addEventListener("click", saveRelationshipProfile);
  document.getElementById("refreshTimelineBtn").addEventListener("click", refreshTimeline);
  document.getElementById("saveFeedbackBtn").addEventListener("click", saveResultFeedback);
  document.getElementById("saveLibraryItemBtn").addEventListener("click", saveLibraryItem);
  document.getElementById("refreshLibraryBtn").addEventListener("click", refreshLanguageLibrary);
  document.getElementById("saveForbiddenBtn").addEventListener("click", saveForbiddenExpression);
  document.getElementById("completeTrainingBtn").addEventListener("click", completeTodayTraining);
  document.getElementById("refreshProgressBtn").addEventListener("click", refreshTrainingProgress);
  document.getElementById("refreshReviewInsightsBtn").addEventListener("click", refreshReviewInsights);
  document.getElementById("coldStartInsightsBtn").addEventListener("click", runColdStartInsights);
  document.getElementById("universalExampleBtn").addEventListener("click", fillUniversalExample);
  document.getElementById("universalGenerateBtn").addEventListener("click", runUniversalCommunication);
  document.getElementById("manipulationExampleBtn").addEventListener("click", fillManipulationExample);
  document.getElementById("manipulationCheckBtn").addEventListener("click", runManipulationCheck);
  document.getElementById("manipulationSaveForbiddenBtn").addEventListener("click", saveManipulationForbidden);
  document.getElementById("refreshSystemStatusBtn").addEventListener("click", refreshSystemStatus);
  document.getElementById("exportLocalDataBtn").addEventListener("click", exportLocalData);
  document.getElementById("resetLocalDataBtn").addEventListener("click", resetLocalData);

  document.getElementById("createSessionBtn").addEventListener("click", createNewSession);
  document.getElementById("refreshSessionsBtn").addEventListener("click", refreshSessions);
  document.getElementById("clearActiveSessionBtn").addEventListener("click", () => renderActiveSession(null));
  document.getElementById("refreshTrendBtn").addEventListener("click", refreshTrendChart);

  refreshAiProfile();
  refreshRelationshipProfile();
  refreshTimeline();
  refreshLanguageLibrary();
  refreshForbiddenExpressions();
  refreshTrainingProgress();
  refreshReviewInsights();
  refreshSystemStatus();
  refreshSessions();
  refreshTrendChart();
}

initAiCoach();
