function cleanText(value, fallback = "", maxLength = 1200) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, maxLength);
}

function uniqueStrings(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const value = item.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function normalizeStringArray(value, fallback = [], maxItems = 8, maxLength = 220) {
  const source = Array.isArray(value) ? value : fallback;
  return uniqueStrings(source.map((item) => cleanText(item, "", maxLength)).filter(Boolean)).slice(0, maxItems);
}

function validateProfilePatch(value) {
  const patch = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    summary: cleanText(patch.summary, "", 320),
    relationshipStage: cleanText(patch.relationshipStage, "", 80),
    weaknesses: normalizeStringArray(patch.weaknesses, [], 8),
    strengths: normalizeStringArray(patch.strengths, [], 8),
    facts: normalizeStringArray(patch.facts, [], 8),
    trainingPlan: normalizeStringArray(patch.trainingPlan, [], 8),
  };
}

function clampScore(value, fallback = 6) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(10, number));
}

function validateSixScores(value) {
  const scores = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    pressure: clampScore(scores.pressure, 6),
    empathy: clampScore(scores.empathy, 6),
    boundary: clampScore(scores.boundary, 6),
    naturalness: clampScore(scores.naturalness, 6),
    progress: clampScore(scores.progress, 6),
    emotionalStability: clampScore(scores.emotionalStability, 6),
  };
}

function validateReviewResult(value) {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const riskScore = Math.max(0, Math.min(10, Number(data.riskScore || 0)));
  return {
    summary: cleanText(data.summary, "AI 已完成复盘，但返回内容不完整。建议先暂停，不急着继续推进。", 420),
    conversationStage: cleanText(data.conversationStage, "未知", 80),
    riskScore,
    scores: validateSixScores(data.scores),
    coldNodes: normalizeStringArray(data.coldNodes, ["没有识别到足够清晰的变冷节点。"], 8),
    userIssues: normalizeStringArray(data.userIssues, ["返回内容不完整，建议重新提交更完整的上下文。"], 8),
    otherSignals: normalizeStringArray(data.otherSignals, [], 8),
    betterReplies: normalizeStringArray(data.betterReplies, ["先回应感受，再表达自己，不要连续追问。"], 8),
    nextMessage: cleanText(data.nextMessage, "我先不打扰你，你有空我们再聊。", 260),
    repairMessage: cleanText(data.repairMessage, "", 260),
    trainingFocus: normalizeStringArray(data.trainingFocus, ["少追问，多回应感受。", "对方冷淡时先降频。"], 6),
    profilePatch: validateProfilePatch(data.profilePatch),
  };
}

function validateNextMessageResult(value) {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const alternatives = data.alternatives && typeof data.alternatives === "object" ? data.alternatives : {};
  return {
    recommended: cleanText(data.recommended, "我先不打扰你，你有空我们再聊。", 260),
    alternatives: {
      steady: cleanText(alternatives.steady, "我理解，你先忙，晚点有空再说。", 260),
      light: cleanText(alternatives.light, "收到，那你先缓一缓。", 260),
      mature: cleanText(alternatives.mature, "我尊重你的节奏，不着急推进。", 260),
    },
    why: cleanText(data.why, "这句话降低压力，给对方空间，也保留了继续交流的余地。", 520),
    doNotSend: normalizeStringArray(data.doNotSend, ["不要质问为什么不回。", "不要连续补发长消息。"], 8),
    timing: cleanText(data.timing, "如果对方刚表达疲惫或冷淡，建议晚点再发。", 220),
    profilePatch: validateProfilePatch(data.profilePatch),
  };
}

function validateFeedbackReflection(value) {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    summary: cleanText(data.summary, "已记录这次反馈。下一次重点观察对方是否愿意继续展开。", 420),
    outcomeReason: cleanText(data.outcomeReason, "反馈样本还少，先继续记录真实反应。", 420),
    keepDoing: normalizeStringArray(data.keepDoing, ["保留低压力、尊重边界的表达。"], 5),
    adjustNextTime: normalizeStringArray(data.adjustNextTime, ["下次少追问，多给对方选择空间。"], 5),
    nextExperiment: cleanText(data.nextExperiment, "下一次只做一个小实验：先回应感受，再问一个轻问题。", 260),
    profilePatch: validateProfilePatch(data.profilePatch),
  };
}

function validateColdStartInsights(value) {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    summary: cleanText(data.summary, "现在还没有复盘记录，先按常见低情商聊天风险生成第一版训练画像。", 420),
    likelyWeaknesses: normalizeStringArray(data.likelyWeaknesses, ["容易急着推进或追问。", "对慢回容易焦虑。"], 6),
    likelyStrengths: normalizeStringArray(data.likelyStrengths, ["愿意主动训练和复盘。"], 5),
    firstWeekFocus: normalizeStringArray(data.firstWeekFocus, ["先练降压表达。", "每次聊天后记录对方反应。"], 5),
    starterRules: normalizeStringArray(data.starterRules, ["不连续追问。", "对方说忙就给空间。", "不把情绪直接丢给对方。"], 6),
    firstReviewPrompt: cleanText(data.firstReviewPrompt, "把最近一段真实聊天贴进 AI 深度复盘，至少包含你和对方各 2 句。", 260),
    topIssues: (Array.isArray(data.topIssues) ? data.topIssues : []).slice(0, 5).map((item) => ({
      label: cleanText(item && item.label, "冷启动风险", 80),
      count: Number(item && item.count) || 1,
      advice: cleanText(item && item.advice, "先用低压力替代表达练习。", 260),
    })),
    weeklyFocus: normalizeStringArray(data.weeklyFocus, ["先完成一次真实聊天复盘，系统会继续校准。"], 5),
    profilePatch: validateProfilePatch(data.profilePatch),
  };
}

module.exports = {
  cleanText,
  normalizeStringArray,
  validateColdStartInsights,
  validateFeedbackReflection,
  validateNextMessageResult,
  validateProfilePatch,
  validateReviewResult,
  validateSixScores,
};
