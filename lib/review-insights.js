function cleanText(value, maxLength = 180) {
  return (typeof value === "string" ? value.trim() : "").slice(0, maxLength);
}

function uniqueStrings(items, maxItems = 8) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const value = cleanText(item);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeIssueLabel(value) {
  const text = cleanText(value, 120);
  if (!text) return "";
  if (/追问|查岗|为什么不回|连发/.test(text)) return "连续追问";
  if (/上头|情绪|质问|攻击|阴阳|反击|破防/.test(text)) return "情绪上头";
  if (/边界|逼迫|控制|压力|不给空间|越界/.test(text)) return "边界感弱";
  if (/讨好|卑微|自我贬低|患得患失|需求感/.test(text)) return "过度讨好";
  if (/冷场|尬聊|查户口|没话题|只提问/.test(text)) return "话题延展弱";
  if (/邀约|推进|表白|太快|节奏/.test(text)) return "推进节奏不稳";
  if (/共情|感受|讲道理|安慰|回应/.test(text)) return "共情回应不足";
  return text.replace(/[，。！？；：,.!?;:]/g, "").slice(0, 18);
}

function reviewEntries(timeline) {
  return (Array.isArray(timeline) ? timeline : []).filter((entry) => entry && entry.type === "ai-review");
}

function isWithinDays(entry, now, days) {
  const createdAt = Date.parse(entry.createdAt || "");
  if (!Number.isFinite(createdAt)) return false;
  return now.getTime() - createdAt <= days * 24 * 60 * 60 * 1000;
}

function issueTrainingAdvice(label) {
  const advice = {
    "连续追问": "本周重点：每次最多连续问两个问题，第三句必须分享自己的状态或先收住。",
    "情绪上头": "本周重点：想质问前先暂停 20 分钟，把原话放进紧急模式改写。",
    "边界感弱": "本周重点：对方慢回、拒绝、说忙时，只回应一次并给空间。",
    "过度讨好": "本周重点：表达好感时保持平等，不用自我贬低换回应。",
    "话题延展弱": "本周重点：用“分享一点自己 + 问一个轻问题”替代查户口。",
    "推进节奏不稳": "本周重点：邀约要具体、低压力，并允许对方拒绝。",
    "共情回应不足": "本周重点：对方表达情绪时先接感受，再问原因或给建议。"
  };
  return advice[label] || `本周重点：复盘“${label}”出现的场景，准备一个低压力替代表达。`;
}

function buildReviewInsights(timeline, now = new Date()) {
  const allReviews = reviewEntries(timeline);
  const recentReviews = allReviews.filter((entry) => isWithinDays(entry, now, 7));
  const source = recentReviews.length ? recentReviews : allReviews;
  const counts = new Map();
  const focusPool = [];
  let riskTotal = 0;
  let riskCount = 0;

  for (const entry of source) {
    for (const issue of Array.isArray(entry.userIssues) ? entry.userIssues : []) {
      const label = normalizeIssueLabel(issue);
      if (!label) continue;
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    for (const focus of Array.isArray(entry.trainingFocus) ? entry.trainingFocus : []) {
      const value = cleanText(focus, 180);
      if (value) focusPool.push(value);
    }
    const risk = Number(entry.riskScore);
    if (Number.isFinite(risk)) {
      riskTotal += Math.max(0, Math.min(10, risk));
      riskCount += 1;
    }
  }

  const topIssues = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
    .slice(0, 5)
    .map(([label, count]) => ({
      label,
      count,
      advice: issueTrainingAdvice(label)
    }));

  const issueAdvice = topIssues.map((item) => item.advice);
  const weeklyFocus = uniqueStrings([...focusPool, ...issueAdvice], 5);
  const averageRisk = riskCount ? Math.round((riskTotal / riskCount) * 10) / 10 : 0;

  return {
    generatedAt: now.toISOString(),
    totalReviews: allReviews.length,
    recentReviews: recentReviews.length,
    averageRisk,
    topIssues,
    weeklyFocus: weeklyFocus.length ? weeklyFocus : ["先完成一次真实聊天复盘，系统会自动统计你的常见问题。"],
    empty: allReviews.length === 0
  };
}

module.exports = {
  buildReviewInsights,
  normalizeIssueLabel,
};
