const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");

const {
  readJsonFile,
  writeJsonAtomic,
} = require("../lib/json-store");

const {
  normalizeStringArray,
  validateColdStartInsights,
  validateFeedbackReflection,
  validateReviewResult,
  validateNextMessageResult,
  validateUniversalCommunicationResult,
} = require("../lib/ai-validators");

const {
  buildReviewInsights,
} = require("../lib/review-insights");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dating-chat-guide-"));

try {
  const jsonPath = path.join(tempDir, "state.json");
  writeJsonAtomic(jsonPath, { ok: true, count: 2 });
  assert.deepEqual(readJsonFile(jsonPath, () => null), { ok: true, count: 2 });

  fs.writeFileSync(jsonPath, "{broken", "utf8");
  assert.deepEqual(readJsonFile(jsonPath, () => ({ recovered: true })), { recovered: true });
  assert(fs.readdirSync(tempDir).some((name) => name.includes(".corrupt-") && name.endsWith(".bak")));

  assert.deepEqual(normalizeStringArray([" a ", "a", "", 3, "b"], [], 5), ["a", "b"]);

  const review = validateReviewResult({
    summary: "  summary  ",
    riskScore: 99,
    scores: {
      pressure: 99,
      empathy: 8,
    },
    coldNodes: "bad type",
    profilePatch: {
      weaknesses: [" needy ", "needy"],
    },
  });
  assert.equal(review.summary, "summary");
  assert.equal(review.riskScore, 10);
  assert.equal(review.scores.pressure, 10);
  assert.equal(review.scores.empathy, 8);
  assert.equal(review.scores.boundary, 6);
  assert(Array.isArray(review.coldNodes));
  assert.deepEqual(review.profilePatch.weaknesses, ["needy"]);

  const next = validateNextMessageResult({
    recommended: "",
    alternatives: { steady: "  steady  " },
    doNotSend: ["x", "x", 1],
  });
  assert(next.recommended.length > 0);
  assert.equal(next.alternatives.steady, "steady");
  assert.deepEqual(next.doNotSend, ["x"]);

  const coldStart = validateColdStartInsights({
    summary: "",
    topIssues: [{ label: "连续追问", count: "2", advice: "先停一下" }],
    weeklyFocus: [" 降低压力 ", "降低压力"],
  });
  assert(coldStart.summary.length > 0);
  assert.equal(coldStart.topIssues[0].label, "连续追问");
  assert.equal(coldStart.topIssues[0].count, 2);
  assert.deepEqual(coldStart.weeklyFocus, ["降低压力"]);

  const reflection = validateFeedbackReflection({
    keepDoing: [" 给空间 ", "给空间"],
    adjustNextTime: "bad type",
  });
  assert.deepEqual(reflection.keepDoing, ["给空间"]);
  assert(Array.isArray(reflection.adjustNextTime));

  const universal = validateUniversalCommunicationResult({
    strategy: "先降压",
    safeReply: "",
    boundaryReply: " 请明天前同步进度 ",
    doNotSay: ["你怎么这么慢", "你怎么这么慢"],
  });
  assert(universal.safeReply.length > 0);
  assert.equal(universal.boundaryReply, "请明天前同步进度");
  assert.deepEqual(universal.doNotSay, ["你怎么这么慢"]);

  const insights = buildReviewInsights([
    {
      type: "ai-review",
      createdAt: "2026-05-01T10:00:00.000Z",
      riskScore: 8,
      userIssues: ["连续追问", "情绪上头"],
      trainingFocus: ["少追问，多回应感受"],
    },
    {
      type: "ai-review",
      createdAt: "2026-05-02T10:00:00.000Z",
      riskScore: 6,
      userIssues: ["连续追问", "边界感弱"],
      trainingFocus: ["给对方空间"],
    },
    {
      type: "ai-next-message",
      createdAt: "2026-05-03T10:00:00.000Z",
      summary: "not a review",
    },
  ], new Date("2026-05-04T00:00:00.000Z"));
  assert.equal(insights.totalReviews, 2);
  assert.equal(insights.topIssues[0].label, "连续追问");
  assert.equal(insights.topIssues[0].count, 2);
  assert.equal(insights.averageRisk, 7);
  assert(insights.weeklyFocus.length >= 2);

  console.log("Unit module checks passed");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
