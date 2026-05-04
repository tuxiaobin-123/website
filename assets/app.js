const searchInput = document.getElementById("searchInput");
const searchCount = document.getElementById("searchCount");
const searchableItems = Array.from(document.querySelectorAll(".searchable"));
const scenarioCards = Array.from(document.querySelectorAll(".scenario-card"));
const filterButtons = Array.from(document.querySelectorAll("#scenarioFilters .filter-btn"));
const storageKey = "datingChatGuideProgressV1";
let tasks = [];
let chatCoachScenarios = {};
let nextMessageBank = {};
let coachPersonaCopy = {};
let personaScenarioOpeners = {};
let challengeBank = [];
let phrasePacks = [];
let forbiddenSamples = [];

async function loadTrainingData() {
  const response = await fetch("assets/training-data.json", { cache: "no-store" });
  if (!response.ok) throw new Error("?????????HTTP " + response.status);
  const data = await response.json();
  tasks = Array.isArray(data.tasks) ? data.tasks : [];
  chatCoachScenarios = data.chatCoachScenarios || {};
  nextMessageBank = data.nextMessageBank || {};
  coachPersonaCopy = data.coachPersonaCopy || {};
  personaScenarioOpeners = data.personaScenarioOpeners || {};
  challengeBank = Array.isArray(data.challengeBank) ? data.challengeBank : [];
  phrasePacks = Array.isArray(data.phrasePacks) ? data.phrasePacks : [];
  forbiddenSamples = Array.isArray(data.forbiddenSamples) ? data.forbiddenSamples : [];
}

function populateSelect(id, entries, fallbackLabel) {
  const select = document.getElementById(id);
  if (!select || !entries.length) return;
  const previous = select.value;
  select.innerHTML = entries.map(([value, label]) =>
    "<option value=\"" + escapeHtml(value) + "\">" + escapeHtml(label || fallbackLabel || value) + "</option>"
  ).join("");
  if (entries.some(([value]) => value === previous)) select.value = previous;
}

function dataLabel(key, value) {
  return (value && value.label) || key;
}

function renderDataDrivenOptions() {
  populateSelect(
    "simScenario",
    Object.entries(chatCoachScenarios).map(([key, value]) => [key, dataLabel(key, value)])
  );
  populateSelect(
    "messageScene",
    Object.entries(nextMessageBank).map(([key, value]) => [key, dataLabel(key, value)])
  );
  populateSelect(
    "partnerScenario",
    Object.entries(personaScenarioOpeners).map(([key, value]) => [key, dataLabel(key, value)])
  );
}

function renderPhrasePacks() {
  const phraseBox = document.getElementById("phrasePackList");
  if (phraseBox) {
    phraseBox.innerHTML = phrasePacks.slice(0, 24).map((item) =>
      "<div class=\"talk-line\"><strong>" + escapeHtml(item.scene || "场景") + " · " + escapeHtml(item.style || "风格") + "</strong>" +
      "<p>" + escapeHtml(item.text || "") + "</p>" +
      "<p>" + escapeHtml(item.note || "") + "</p></div>"
    ).join("");
  }

  const forbiddenBox = document.getElementById("forbiddenSampleList");
  if (forbiddenBox) {
    forbiddenBox.innerHTML = "<strong>高风险表达样本</strong><ul>" +
      forbiddenSamples.slice(0, 50).map((item) => "<li>" + escapeHtml(item.text || item) + "</li>").join("") +
      "</ul>";
  }
}


function drawJourneyCanvas() {
  const canvas = document.getElementById("journeyCanvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const roundRect = (x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#243734");
  gradient.addColorStop(0.55, "#3f3a4f");
  gradient.addColorStop(1, "#6f4b3f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255, 250, 242, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 34; x < w; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 30; y < h; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 250, 242, 0.10)";
  roundRect(40, 42, 680, 416, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 250, 242, 0.18)";
  ctx.stroke();

  ctx.fillStyle = "#fffaf2";
  ctx.font = "700 30px Microsoft YaHei, Arial";
  ctx.textAlign = "left";
  ctx.fillText("聊天训练控制台", 76, 96);

  ctx.fillStyle = "rgba(255, 250, 242, 0.72)";
  ctx.font = "18px Microsoft YaHei, Arial";
  ctx.fillText("先稳住情绪，再决定下一句。", 76, 128);

  const cards = [
    { x: 76, y: 164, label: "压力感", value: "2/10", color: "#5ab7a8" },
    { x: 276, y: 164, label: "边界感", value: "8/10", color: "#f4a982" },
    { x: 476, y: 164, label: "自然度", value: "7/10", color: "#d4a64c" }
  ];

  cards.forEach((card) => {
    ctx.fillStyle = "rgba(255, 250, 242, 0.12)";
    roundRect(card.x, card.y, 168, 96, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 250, 242, 0.16)";
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 250, 242, 0.70)";
    ctx.font = "16px Microsoft YaHei, Arial";
    ctx.fillText(card.label, card.x + 18, card.y + 34);
    ctx.fillStyle = card.color;
    ctx.font = "700 28px Microsoft YaHei, Arial";
    ctx.fillText(card.value, card.x + 18, card.y + 72);
  });

  const nodes = [
    { x: 92, y: 338, label: "舒服" },
    { x: 230, y: 304, label: "熟悉" },
    { x: 374, y: 322, label: "好感" },
    { x: 516, y: 276, label: "暧昧" },
    { x: 648, y: 250, label: "线下" }
  ];

  ctx.strokeStyle = "rgba(90, 183, 168, 0.76)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(nodes[0].x, nodes[0].y);
  ctx.bezierCurveTo(180, 290, 260, 350, 374, 322);
  ctx.bezierCurveTo(470, 300, 544, 252, 648, 250);
  ctx.stroke();

  nodes.forEach((node, index) => {
    ctx.fillStyle = index === 0 ? "#5ab7a8" : index < 3 ? "#f4a982" : "#d4a64c";
    ctx.beginPath();
    ctx.arc(node.x, node.y, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#243734";
    ctx.font = "700 15px Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.label, node.x, node.y);
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255, 250, 242, 0.14)";
  roundRect(76, 390, 608, 42, 12);
  ctx.fill();
  ctx.fillStyle = "#d9fff7";
  ctx.font = "700 17px Microsoft YaHei, Arial";
  ctx.fillText("建议：用低压力表达推进，不用追问和试探换安全感。", 96, 417);
}

function applySearch() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;

  searchableItems.forEach((item) => {
    const matched = !query || item.textContent.toLowerCase().includes(query);
    item.classList.toggle("hidden-by-search", !matched);
    if (matched) visible += 1;
  });

  searchCount.textContent = query ? "找到 " + visible + " 个相关内容块" : "";
}

function filterScenarios(type) {
  scenarioCards.forEach((card) => {
    const types = (card.dataset.type || "").split(/\s+/);
    const matched = type === "all" || types.includes(type);
    card.classList.toggle("hidden-by-filter", !matched);
  });

  filterButtons.forEach((button) => {
    const active = button.dataset.filter === type;
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}


let taskOffset = 0;

function renderDailyTask() {
  const container = document.getElementById("dailyTask");
  const daySeed = Math.floor(Date.now() / 86400000);
  const task = tasks[(daySeed + taskOffset) % tasks.length];
  container.innerHTML =
    "<span class=\"tag\">今日训练</span>" +
    "<strong>" + task.title + "</strong>" +
    "<p>" + task.body + "</p>" +
    "<div class=\"talk-line\"><strong>示例：</strong>" + task.example + "</div>";
}

function loadProgress() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  document.querySelectorAll("[data-progress]").forEach((box) => {
    box.checked = Boolean(saved[box.dataset.progress]);
  });
}

function saveProgress() {
  const state = {};
  document.querySelectorAll("[data-progress]").forEach((box) => {
    state[box.dataset.progress] = box.checked;
  });
  localStorage.setItem(storageKey, JSON.stringify(state));
}


function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function analyzeMessageText(text) {
  const issues = [];
  let score = 100;

  const rules = [
    {
      name: "质问感",
      words: ["为什么不回", "怎么不回", "你到底", "你是不是不想", "忙到一句话", "什么意思"],
      penalty: 24,
      advice: "把“为什么/你到底”改成“我注意到/我感觉”，先说观察，不审问。"
    },
    {
      name: "攻击或冷嘲",
      words: ["随便你", "爱怎样怎样", "你怎么这么", "呵呵", "真服了", "有病"],
      penalty: 28,
      advice: "这类词会伤关系。情绪上来时先暂停，不要用攻击换回应。"
    },
    {
      name: "需求感过强",
      words: ["没有你不行", "求你", "我等你一天", "你不理我", "我这么喜欢你"],
      penalty: 18,
      advice: "表达喜欢可以，但不要把自己的焦虑变成对方的责任。"
    },
    {
      name: "越界风险",
      words: ["前任", "谈过几个", "密码", "定位", "给我看聊天记录"],
      penalty: 18,
      advice: "隐私问题需要信任基础，早期不要逼问。"
    }
  ];

  rules.forEach((rule) => {
    if (rule.words.some((word) => text.includes(word))) {
      score -= rule.penalty;
      issues.push(rule.name + "：" + rule.advice);
    }
  });

  if (text.length > 90) {
    score -= 16;
    issues.push("内容偏长：先删到一个重点。情绪越强，句子越要短。");
  }

  if ((text.match(/[？?]/g) || []).length >= 3) {
    score -= 14;
    issues.push("问题太密：连续追问会像审问，保留一个问题就够。");
  }

  if (!issues.length) {
    issues.push("风险较低：这句话可以再补一点具体生活感或对对方感受的回应。");
  }

  return { score: Math.max(0, score), issues };
}

function buildWeaknessProfile() {
  const input = document.getElementById("weaknessInput");
  const result = document.getElementById("profileResult");
  const text = input.value.trim();

  if (!text) {
    result.innerHTML = "<strong>还没有材料</strong><p>请先贴几句你真实想说或已经说过的话。</p>";
    return;
  }

  const analysis = analyzeMessageText(text);
  const metrics = [
    { label: "质问感", count: (text.match(/为什么不回|怎么不回|你到底|你是不是|什么意思|忙到一句话/g) || []).length, train: "把质问句改成观察句：我注意到最近聊天少了一点。" },
    { label: "攻击或冷嘲", count: (text.match(/随便你|爱怎样怎样|呵呵|真服了|你怎么这么|有病/g) || []).length, train: "情绪超过 7 分时先暂停，不用重话解决轻问题。" },
    { label: "需求感过强", count: (text.match(/我等你|求你|没有你不行|你不理我|我这么喜欢/g) || []).length, train: "表达喜欢时保留自己的生活重心，不把回应变成索取。" },
    { label: "问题过密", count: (text.match(/[？?]/g) || []).length >= 3 ? 1 : 0, train: "一次只问一个轻问题，然后补一点自己的状态。" },
    { label: "长消息倾向", count: text.length > 120 ? 1 : 0, train: "先删掉一半，只表达一个感受和一个希望。" }
  ];

  metrics.sort((a, b) => b.count - a.count);
  const main = metrics[0].count > 0 ? metrics[0] : { label: "基础风险较低", train: "继续练习具体赞赏、轻松分享和低压力邀约。" };
  const scoreWidth = Math.max(8, analysis.score);

  result.innerHTML =
    "<strong>你的主要画像：" + escapeHtml(main.label) + "</strong>" +
    "<div class=\"score-line\" style=\"--score-width:" + scoreWidth + "%\"><span></span></div>" +
    "<p>综合稳定度：" + analysis.score + "/100。分数越高，说明这段表达越少给对方压力。</p>" +
    "<ul>" + analysis.issues.map((issue) => "<li>" + escapeHtml(issue) + "</li>").join("") + "</ul>" +
    "<p><strong>本周训练重点：</strong>" + escapeHtml(main.train) + "</p>";
}

function calculateRelationshipTemperature() {
  const result = document.getElementById("relationResult");
  const checked = Array.from(document.querySelectorAll("#relationshipForm input:checked"));

  if (!checked.length) {
    result.innerHTML = "<strong>还没有信号</strong><p>请选择你们最近真实出现过的互动信号。</p>";
    return;
  }

  const raw = checked.reduce((sum, item) => sum + Number(item.value), 40);
  const score = Math.max(0, Math.min(100, raw));
  let label = "普通观察";
  let advice = "保持轻松联系，多看对方行动，不急着推进关系。";

  if (score < 28) {
    label = "需要后退";
    advice = "减少主动投入，停止追问和硬约，把注意力收回自己。";
  } else if (score < 48) {
    label = "偏冷";
    advice = "先不要表白或强邀约。用轻话题测试对方是否愿意展开。";
  } else if (score < 68) {
    label = "可继续了解";
    advice = "可以保持稳定聊天，适度分享生活，但不要每天强行聊很久。";
  } else if (score < 84) {
    label = "正在升温";
    advice = "适合低压力邀约，给具体方案，也允许对方拒绝。";
  } else {
    label = "暧昧信号较强";
    advice = "可以更明确表达好感，但仍要尊重她的节奏和边界。";
  }

  result.innerHTML =
    "<strong>关系温度：" + score + "/100，" + label + "</strong>" +
    "<div class=\"score-line\" style=\"--score-width:" + score + "%\"><span></span></div>" +
    "<p>" + advice + "</p>" +
    "<p><strong>下一步：</strong>不要只凭一句话判断，看一到两周的整体互动质量。</p>";
}


function generateNextMessage() {
  const scene = document.getElementById("messageScene").value;
  const tone = document.getElementById("messageTone").value;
  const context = document.getElementById("messageContext").value.trim();
  const result = document.getElementById("nextMessageResult");
  const pack = nextMessageBank[scene];
  const preferred = pack[tone];

  const contextNote = context
    ? "<p><strong>结合你的上下文：</strong>" + escapeHtml(context.slice(0, 90)) + (context.length > 90 ? "..." : "") + "</p>"
    : "<p><strong>提示：</strong>补充她刚才说的话，结果会更贴近真实场景。</p>";

  result.innerHTML =
    "<strong>推荐下一句</strong>" +
    "<div class=\"talk-line\">" + escapeHtml(preferred) + "</div>" +
    contextNote +
    "<ul>" +
    "<li><strong>稳重自然：</strong>" + escapeHtml(pack.steady) + "</li>" +
    "<li><strong>轻松幽默：</strong>" + escapeHtml(pack.light) + "</li>" +
    "<li><strong>成熟表达：</strong>" + escapeHtml(pack.mature) + "</li>" +
    "</ul>";
}

function interceptOverheat() {
  const text = document.getElementById("overheatNeed").value.trim();
  const need = document.querySelector("input[name='needType']:checked").value;
  const result = document.getElementById("interceptResult");

  if (!text) {
    result.innerHTML = "<strong>还没有原话</strong><p>先把你最想发的那句话写出来，再让系统拦截。</p>";
    return;
  }

  const analysis = analyzeMessageText(text);
  const needMap = {
    understood: {
      label: "你真正想要的可能是被理解",
      line: "我现在其实不是想吵，我是希望你能理解我刚才为什么会有点难受。"
    },
    valued: {
      label: "你真正想要的可能是被重视",
      line: "我有点在意，是因为我把这段关系看得比较认真。我想被认真对待，而不是用质问逼你回应。"
    },
    clarity: {
      label: "你真正想要的可能是确认关系",
      line: "我想确认一下我们现在的节奏和期待，但你不用马上给答案，我们可以冷静聊。"
    },
    space: {
      label: "你现在更需要先冷静",
      line: "我现在情绪有点上来，继续说可能会伤人。我先冷静二十分钟，之后再好好表达。"
    }
  };

  const picked = needMap[need];
  result.innerHTML =
    "<strong>" + picked.label + "。风险评分：" + analysis.score + "/100</strong>" +
    "<div class=\"talk-line\"><strong>先别发原话：</strong>" + escapeHtml(text.slice(0, 120)) + (text.length > 120 ? "..." : "") + "</div>" +
    "<div class=\"talk-line\"><strong>改写后：</strong>" + picked.line + "</div>" +
    "<p><strong>行动建议：</strong>如果分数低于 60，先暂停，不继续争，也不连续补发解释。</p>" +
    "<ul>" + analysis.issues.map((issue) => "<li>" + escapeHtml(issue) + "</li>").join("") + "</ul>";
}

const coachPersonaKey = "datingChatGuideCoachPersonaV1";
let challengeIndex = 0;


function currentCoachPersona() {
  return localStorage.getItem(coachPersonaKey) || "warm";
}

function saveCoachPersona() {
  const select = document.getElementById("coachPersona");
  const persona = select.value;
  localStorage.setItem(coachPersonaKey, persona);
  const copy = coachPersonaCopy[persona];
  document.getElementById("personaResult").innerHTML =
    "<strong>已切换为：" + copy.title + "</strong><p>" + copy.line + "</p>";
}

function loadCoachPersona() {
  const persona = currentCoachPersona();
  const select = document.getElementById("coachPersona");
  if (select) select.value = persona;
  const copy = coachPersonaCopy[persona];
  document.getElementById("personaResult").innerHTML =
    "<strong>当前：" + copy.title + "</strong><p>" + copy.line + "</p>";
}


function startPersonaSimulation() {
  const personality = document.getElementById("partnerPersonality").value;
  const scenario = document.getElementById("partnerScenario").value;
  const transcript = document.getElementById("personaSimTranscript");
  transcript.innerHTML = "";
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble her";
  bubble.textContent = personaScenarioOpeners[scenario][personality];
  transcript.appendChild(bubble);
  document.getElementById("personaSimFeedback").innerHTML =
    "<strong>模拟已开始</strong><p>根据她的性格回复。重点是别跳级、别逼问、先接住她给出的信号。</p>";
  document.getElementById("personaSimInput").value = "";
}

function personaReply(personality, scenario, score) {
  const replies = {
    slowWarm: {
      warm: "她：你这样说我会比较放松，可以继续聊聊。",
      neutral: "她：嗯，我明白你的意思。",
      cool: "她：我可能需要一点时间，不太想聊太快。"
    },
    outgoing: {
      warm: "她：这个接得还挺自然的，那我可以继续说。",
      neutral: "她：哈哈，也行吧。",
      cool: "她：这个有点尬，我们换个话题吧。"
    },
    boundary: {
      warm: "她：这样说可以，至少没有给我压力。",
      neutral: "她：我先听着，但节奏别太快。",
      cool: "她：这个让我有点压力，我先不聊这个。"
    },
    sensitive: {
      warm: "她：你能注意到我的感受，这点挺好的。",
      neutral: "她：嗯，我知道了。",
      cool: "她：这句话让我有点不舒服，我想先停一下。"
    }
  };

  const bucket = score >= 78 ? "warm" : score >= 55 ? "neutral" : "cool";
  return replies[personality][bucket];
}

function runPersonaSimulationTurn() {
  const input = document.getElementById("personaSimInput");
  const text = input.value.trim();
  const feedback = document.getElementById("personaSimFeedback");

  if (!text) {
    feedback.innerHTML = "<strong>还没有回复</strong><p>先输入你准备说的话。</p>";
    return;
  }

  const personality = document.getElementById("partnerPersonality").value;
  const difficulty = document.getElementById("partnerDifficulty").value;
  const scenario = document.getElementById("partnerScenario").value;
  const transcript = document.getElementById("personaSimTranscript");
  const analysis = analyzeMessageText(text);
  let adjustedScore = analysis.score;

  if (difficulty === "hard") adjustedScore -= 12;
  if (difficulty === "easy") adjustedScore += 8;
  if (personality === "boundary" && /为什么|必须|前任|定位|密码|出来/.test(text)) adjustedScore -= 12;
  if (personality === "sensitive" && /随便|呵呵|真服|你怎么/.test(text)) adjustedScore -= 16;
  adjustedScore = Math.max(0, Math.min(100, adjustedScore));

  const me = document.createElement("div");
  me.className = "chat-bubble me";
  me.textContent = "你：" + text;
  transcript.appendChild(me);

  const her = document.createElement("div");
  her.className = "chat-bubble her";
  her.textContent = personaReply(personality, scenario, adjustedScore);
  transcript.appendChild(her);
  transcript.scrollTop = transcript.scrollHeight;

  const coach = coachPersonaCopy[currentCoachPersona()];
  feedback.innerHTML =
    "<strong>" + coach.title + "评分：" + adjustedScore + "/100</strong>" +
    "<p>" + coach.line + "</p>" +
    "<ul>" + analysis.issues.map((issue) => "<li>" + escapeHtml(issue) + "</li>").join("") + "</ul>";
  input.value = "";
}

function runDeepChatReview() {
  const text = document.getElementById("deepReviewInput").value.trim();
  const result = document.getElementById("deepReviewResult");

  if (!text) {
    result.innerHTML = "<strong>还没有聊天记录</strong><p>请先粘贴一段真实聊天。</p>";
    return;
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const all = lines.join("\n");
  const analysis = analyzeMessageText(all);
  const coldIndex = lines.findIndex((line) => /哈哈|嗯嗯|哦|在忙|先不聊|下次吧|再说|不太方便|算了/.test(line));
  const pressureLines = lines.filter((line) => /为什么不回|怎么不回|你到底|你是不是|忙到一句话|随便你|呵呵|爱怎样怎样/.test(line));
  const emotionSignals = lines.filter((line) => /累|烦|不舒服|压力|难受|委屈|生气|焦虑/.test(line));
  const repairNeeded = pressureLines.length > 0 || analysis.score < 65;
  const coach = coachPersonaCopy[currentCoachPersona()];

  const findings = [
    "聊天轮次：" + lines.length + " 行；综合风险：" + analysis.score + "/100。",
    coldIndex >= 0 ? "可能的变冷节点：" + escapeHtml(lines[coldIndex]) : "没有明显冷掉节点，重点看对方是否持续投入。",
    pressureLines.length ? "高风险句：" + escapeHtml(pressureLines[0]) : "没有抓到强质问句。",
    emotionSignals.length ? "对方出现情绪信号，优先接感受。" : "情绪信号不明显，可以用生活分享延展。"
  ];

  const nextStep = repairNeeded
    ? "先发修复句：“我刚才有点急，那句话不太合适。你先按自己的节奏来，我晚点再好好表达。”"
    : "下一步用一个轻问题延续，不急着升温：“你最近有没有一个还不错的小瞬间？”";

  result.innerHTML =
    "<strong>" + coach.title + "深度复盘</strong>" +
    "<p>" + coach.line + "</p>" +
    "<ul>" + findings.map((item) => "<li>" + item + "</li>").join("") + "</ul>" +
    "<p><strong>建议下一步：</strong>" + nextStep + "</p>";
}


function renderChallenge() {
  const challenge = challengeBank[challengeIndex % challengeBank.length];
  document.getElementById("challengeQuestion").innerHTML =
    "<span class=\"tag\">第 " + ((challengeIndex % challengeBank.length) + 1) + " 题</span>" +
    "<strong>" + challenge.question + "</strong>";
  document.getElementById("challengeFeedback").innerHTML =
    "<strong>等待选择</strong><p>先选你最想发的一句。</p>";
  document.getElementById("challengeOptions").innerHTML = challenge.options.map((option, index) =>
    "<label><input type=\"radio\" name=\"challengeOption\" value=\"" + index + "\"><span>" + escapeHtml(option.text) + "</span></label>"
  ).join("");
  document.querySelectorAll("input[name='challengeOption']").forEach((input) => {
    input.addEventListener("change", answerChallenge);
  });
}

function answerChallenge(event) {
  const challenge = challengeBank[challengeIndex % challengeBank.length];
  const option = challenge.options[Number(event.target.value)];
  document.getElementById("challengeFeedback").innerHTML =
    "<strong>" + (option.ok ? "选对了" : "这句不建议发") + "</strong>" +
    "<p>" + escapeHtml(option.why) + "</p>";
}

function addChatBubble(text, who) {
  const transcript = document.getElementById("simTranscript");
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble " + who;
  bubble.textContent = text;
  transcript.appendChild(bubble);
  transcript.scrollTop = transcript.scrollHeight;
}

function resetSimulation() {
  const scenario = chatCoachScenarios[document.getElementById("simScenario").value];
  const transcript = document.getElementById("simTranscript");
  transcript.innerHTML = "";
  addChatBubble(scenario.start, "her");
  document.getElementById("simFeedback").innerHTML =
    "<strong>本场景重点</strong><p>" + scenario.tip + "</p>";
  document.getElementById("simInput").value = "";
}

function runSimulationTurn() {
  const input = document.getElementById("simInput");
  const text = input.value.trim();
  const scenario = chatCoachScenarios[document.getElementById("simScenario").value];

  if (!text) {
    document.getElementById("simFeedback").innerHTML = "<strong>还没有回复</strong><p>先输入你准备说的话。</p>";
    return;
  }

  const analysis = analyzeMessageText(text);
  addChatBubble("你：" + text, "me");

  const reply = analysis.score >= 78 ? scenario.warm : analysis.score >= 55 ? scenario.neutral : scenario.cool;
  addChatBubble(reply, "her");

  const level = analysis.score >= 78 ? "推进质量较好" : analysis.score >= 55 ? "可以继续，但建议减压" : "风险较高，建议先改写";
  document.getElementById("simFeedback").innerHTML =
    "<strong>" + level + "：" + analysis.score + "/100</strong>" +
    "<ul>" + analysis.issues.map((issue) => "<li>" + escapeHtml(issue) + "</li>").join("") + "</ul>" +
    "<p><strong>下一句方向：</strong>" + scenario.tip + "</p>";
  input.value = "";
}

function reviewChatLog() {
  const text = document.getElementById("chatLogInput").value.trim();
  const result = document.getElementById("reviewResult");

  if (!text) {
    result.innerHTML = "<strong>还没有聊天记录</strong><p>请贴一段真实聊天，再做复盘。</p>";
    return;
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const all = lines.join("\n");
  const analysis = analyzeMessageText(all);
  const questionCount = (all.match(/[？?]/g) || []).length;
  const longLines = lines.filter((line) => line.length > 55).length;
  const userPressureLines = lines.filter((line) => /为什么不回|怎么不回|你到底|忙到一句话|随便你|呵呵|爱怎样怎样/.test(line));
  const emotionLines = lines.filter((line) => /累|烦|难受|不舒服|压力|焦虑|生气|委屈/.test(line));

  const findings = [];
  findings.push("共 " + lines.length + " 行，问题句约 " + questionCount + " 个，长句 " + longLines + " 行。");
  if (userPressureLines.length) findings.push("发现高风险句：" + escapeHtml(userPressureLines[0]));
  if (emotionLines.length) findings.push("有情绪信号，优先回应感受，不要马上讲道理。");
  if (questionCount >= 4) findings.push("问题偏多，容易让对方感觉被审问。");
  if (longLines >= 2) findings.push("长消息偏多，建议每次只表达一个重点。");
  if (findings.length === 1 && analysis.score >= 80) findings.push("整体压力不高，可以继续练习具体赞赏和轻松分享。");

  const rewrite = userPressureLines.length
    ? "把高风险句改成：“我刚才有点着急了。你先按自己的节奏来，我晚点再和你好好聊。”"
    : "下一次尝试用“我刚好也有类似体验 + 一个轻问题”来延续话题。";

  result.innerHTML =
    "<strong>复盘评分：" + analysis.score + "/100</strong>" +
    "<ul>" + findings.map((item) => "<li>" + item + "</li>").join("") + "</ul>" +
    "<p><strong>建议改写：</strong>" + rewrite + "</p>";
}

function runEmergencyRewrite() {
  const text = document.getElementById("emergencyInput").value.trim();
  const result = document.getElementById("emergencyResult");

  if (!text) {
    result.innerHTML = "<strong>先输入原话</strong><p>把你现在最想发的那句话写进来。</p>";
    return;
  }

  const analysis = analyzeMessageText(text);
  result.innerHTML =
    "<strong>当前风险：" + analysis.score + "/100。分数越低，越不建议直接发送。</strong>" +
    "<div class=\"talk-line\"><strong>冷静版：</strong>“我刚才有点着急，先不急着下判断。你方便的时候我们再聊。”</div>" +
    "<div class=\"talk-line\"><strong>成熟表达版：</strong>“我真正想表达的是，我有点不安/受伤，因为我理解成自己没有被重视。但我不想用质问的方式和你说。”</div>" +
    "<div class=\"talk-line\"><strong>暂停沟通版：</strong>“我现在情绪有点上来，继续说可能会伤人。我先冷静二十分钟，之后再好好表达。”</div>" +
    "<ul>" + analysis.issues.map((issue) => "<li>" + escapeHtml(issue) + "</li>").join("") + "</ul>";
}

function evaluateMessage() {
  const input = document.getElementById("messageInput");
  const result = document.getElementById("messageResult");
  const text = input.value.trim();

  if (!text) {
    result.innerHTML = "<strong>还没有内容</strong><p>先输入你准备发的话。</p>";
    return;
  }

  const issues = [];
  let score = 100;

  const pressurePatterns = ["为什么不回", "怎么不回", "你是不是不想", "你到底", "必须", "马上", "立刻"];
  const attackPatterns = ["你怎么这么", "你有病", "随便你", "爱怎样怎样", "呵呵", "真服了"];
  const needyPatterns = ["没有你不行", "我等你一天", "你不理我", "我这么喜欢你", "求你"];
  const boundaryPatterns = ["谈过几个", "前任", "定位", "密码", "给我看聊天记录"];

  if (text.length > 90) {
    score -= 18;
    issues.push("内容偏长。情绪越强，越要短；先表达一个重点。");
  }

  if ((text.match(/[？?]/g) || []).length >= 3) {
    score -= 14;
    issues.push("问题太密集，容易像审问。删到一个问题。");
  }

  if (pressurePatterns.some((word) => text.includes(word))) {
    score -= 24;
    issues.push("有逼迫或质问感。改成描述观察，给对方空间。");
  }

  if (attackPatterns.some((word) => text.includes(word))) {
    score -= 28;
    issues.push("有攻击或冷嘲热讽。先暂停，别在上头时发送。");
  }

  if (needyPatterns.some((word) => text.includes(word))) {
    score -= 18;
    issues.push("需求感过强，容易给对方压力。表达喜欢可以，但不要索取回应。");
  }

  if (boundaryPatterns.some((word) => text.includes(word))) {
    score -= 18;
    issues.push("可能触碰隐私或边界。亲密问题需要足够信任。");
  }

  if (issues.length === 0) {
    issues.push("这句话风险较低。发送前再确认：是否真实、尊重、没有逼迫。");
  }

  score = Math.max(0, score);
  const level = score >= 80 ? "可以发送前再微调" : score >= 55 ? "建议改短、改轻" : "先别发，暂停二十分钟";
  const list = issues.map((issue) => "<li>" + issue + "</li>").join("");

  result.innerHTML =
    "<strong>风险评分：" + score + "/100，" + level + "</strong>" +
    "<ul>" + list + "</ul>" +
    "<p><strong>稳妥改写方向：</strong>先说自己的感受或状态，再给对方空间，避免质问和威胁。</p>";
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => filterScenarios(button.dataset.filter));
});

searchInput.addEventListener("input", applySearch);

document.getElementById("nextTask").addEventListener("click", () => {
  taskOffset += 1;
  renderDailyTask();
});

document.getElementById("evaluateBtn").addEventListener("click", evaluateMessage);
document.getElementById("simScenario").addEventListener("change", resetSimulation);
document.getElementById("simSend").addEventListener("click", runSimulationTurn);
document.getElementById("simReset").addEventListener("click", resetSimulation);
document.getElementById("reviewChatBtn").addEventListener("click", reviewChatLog);
document.getElementById("emergencyBtn").addEventListener("click", runEmergencyRewrite);
document.getElementById("buildProfileBtn").addEventListener("click", buildWeaknessProfile);
document.getElementById("calculateRelationBtn").addEventListener("click", calculateRelationshipTemperature);
document.getElementById("generateNextBtn").addEventListener("click", generateNextMessage);
document.getElementById("interceptBtn").addEventListener("click", interceptOverheat);
document.getElementById("savePersonaBtn").addEventListener("click", saveCoachPersona);
document.getElementById("startPersonaSimBtn").addEventListener("click", startPersonaSimulation);
document.getElementById("personaSimSend").addEventListener("click", runPersonaSimulationTurn);
document.getElementById("deepReviewBtn").addEventListener("click", runDeepChatReview);
document.getElementById("nextChallengeBtn").addEventListener("click", () => {
  challengeIndex += 1;
  renderChallenge();
});

document.querySelectorAll("[data-progress]").forEach((box) => {
  box.addEventListener("change", saveProgress);
});

document.getElementById("resetProgress").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  loadProgress();
});

async function initApp() {
  try {
    await loadTrainingData();
  } catch (error) {
    console.error(error);
    const target = document.getElementById("challengeFeedback") || document.getElementById("dailyTask");
    if (target) {
      target.innerHTML = "<strong>训练数据加载失败</strong><p>请确认 assets/training-data.json 可以正常访问，然后刷新页面。</p>";
    }
    return;
  }
  renderDataDrivenOptions();
  renderPhrasePacks();
  drawJourneyCanvas();
  loadCoachPersona();
  startPersonaSimulation();
  renderChallenge();
  resetSimulation();
  renderDailyTask();
  loadProgress();
  filterScenarios("all");

  window.addEventListener("resize", drawJourneyCanvas);
}

initApp();
