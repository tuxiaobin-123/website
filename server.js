const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const {
  readJsonFile,
  writeJsonAtomic,
} = require("./lib/json-store");
const {
  validateNextMessageResult,
  validateColdStartInsights,
  validateFeedbackReflection,
  validateReviewResult,
} = require("./lib/ai-validators");
const {
  buildReviewInsights,
} = require("./lib/review-insights");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const EXAMPLE_PROFILE_PATH = path.join(DATA_DIR, "profile.example.json");
const RELATIONSHIP_PATH = path.join(DATA_DIR, "relationship.json");
const TIMELINE_PATH = path.join(DATA_DIR, "timeline.json");
const LIBRARY_PATH = path.join(DATA_DIR, "language-library.json");
const FORBIDDEN_PATH = path.join(DATA_DIR, "forbidden-expressions.json");
const TRAINING_PROGRESS_PATH = path.join(DATA_DIR, "training-progress.json");
const TRAINING_DATA_PATH = path.join(ROOT, "assets", "training-data.json");

loadDotEnv(path.join(ROOT, ".env"));

// Set HOST=0.0.0.0 only behind platform HTTPS and PUBLIC_AUTH_* protection.
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8765);
const PUBLIC_AUTH_USER = process.env.PUBLIC_AUTH_USER || "";
const PUBLIC_AUTH_PASSWORD = process.env.PUBLIC_AUTH_PASSWORD || "";
const PUBLIC_AUTH_ENABLED = Boolean(PUBLIC_AUTH_USER && PUBLIC_AUTH_PASSWORD);
const AI_PROVIDER = (process.env.AI_PROVIDER || (process.env.DEEPSEEK_API_KEY ? "deepseek" : "openai")).toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
const MODEL = AI_PROVIDER === "deepseek" ? DEEPSEEK_MODEL : OPENAI_MODEL;

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROFILE_PATH)) {
    const example = fs.existsSync(EXAMPLE_PROFILE_PATH)
      ? fs.readFileSync(EXAMPLE_PROFILE_PATH, "utf8")
      : JSON.stringify(defaultProfile(), null, 2);
    fs.writeFileSync(PROFILE_PATH, example, "utf8");
  }
  if (!fs.existsSync(RELATIONSHIP_PATH)) {
    fs.writeFileSync(RELATIONSHIP_PATH, JSON.stringify(defaultRelationship(), null, 2), "utf8");
  }
  if (!fs.existsSync(TIMELINE_PATH)) {
    fs.writeFileSync(TIMELINE_PATH, JSON.stringify([], null, 2), "utf8");
  }
  if (!fs.existsSync(LIBRARY_PATH)) {
    fs.writeFileSync(LIBRARY_PATH, JSON.stringify(defaultLibrary(), null, 2), "utf8");
  }
  if (!fs.existsSync(FORBIDDEN_PATH)) {
    fs.writeFileSync(FORBIDDEN_PATH, JSON.stringify(defaultForbiddenExpressions(), null, 2), "utf8");
  }
  if (!fs.existsSync(TRAINING_PROGRESS_PATH)) {
    fs.writeFileSync(TRAINING_PROGRESS_PATH, JSON.stringify(defaultTrainingProgress(), null, 2), "utf8");
  }
}

function defaultProfile() {
  return {
    version: 1,
    updatedAt: null,
    summary: "还没有形成画像。完成几次 AI 复盘后，这里会总结你的常见沟通模式。",
    relationshipStage: "未知",
    weaknesses: [],
    strengths: [],
    facts: [],
    trainingPlan: [
      "先完成一次真实聊天复盘。",
      "再用下一句生成器生成三种不同语气。",
      "每次情绪上来时先用上头拦截器。"
    ],
    historyCount: 0
  };
}

function defaultRelationship() {
  return {
    name: "未命名对象",
    updatedAt: null,
    stage: "未知",
    personality: "",
    boundaries: [],
    likedTopics: [],
    lastContext: "",
    notes: ""
  };
}

function defaultLibrary() {
  return [
    { id: "seed-slow-reply", scene: "慢回", style: "稳重自然", text: "你先按自己的节奏来，我这边也处理点事，晚点有空再聊。", rating: "seed", createdAt: new Date().toISOString() },
    { id: "seed-tired", scene: "情绪支持", style: "温和关心", text: "听起来今天被消耗挺多，今晚先别急着振作，休息一下也合理。", rating: "seed", createdAt: new Date().toISOString() },
    { id: "seed-repair", scene: "修复", style: "成熟表达", text: "刚才那句话确实不合适，我没有照顾到你的感受。下次我会注意表达方式。", rating: "seed", createdAt: new Date().toISOString() }
  ];
}

function defaultForbiddenExpressions() {
  return [
    "你为什么不回我？",
    "你是不是不想理我？",
    "随便你",
    "我都这样了你还……",
    "你怎么这么……",
    "你不出来就是不给面子"
  ];
}

function defaultTrainingProgress() {
  return {
    version: 1,
    completedDates: [],
    completedDays: {},
    updatedAt: null
  };
}

function readProfile() {
  return readJsonFile(PROFILE_PATH, defaultProfile, (value) => value && typeof value === "object" && !Array.isArray(value));
}

function writeProfile(profile) {
  writeJsonAtomic(PROFILE_PATH, profile);
}

function readRelationship() {
  return readJsonFile(RELATIONSHIP_PATH, defaultRelationship, (value) => value && typeof value === "object" && !Array.isArray(value));
}

function writeRelationship(relationship) {
  writeJsonAtomic(RELATIONSHIP_PATH, relationship);
}

function readTimeline() {
  return readJsonFile(TIMELINE_PATH, () => [], Array.isArray);
}

function writeTimeline(items) {
  writeJsonAtomic(TIMELINE_PATH, items.slice(-80));
}

function addTimelineEntry(entry) {
  const items = readTimeline();
  const stored = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...entry
  };
  items.push(stored);
  writeTimeline(items);
  return stored;
}

function readLibrary() {
  return readJsonFile(LIBRARY_PATH, defaultLibrary, Array.isArray);
}

function writeLibrary(items) {
  writeJsonAtomic(LIBRARY_PATH, items.slice(-300));
}

function readForbiddenExpressions() {
  return readJsonFile(FORBIDDEN_PATH, defaultForbiddenExpressions, Array.isArray);
}

function writeForbiddenExpressions(items) {
  writeJsonAtomic(FORBIDDEN_PATH, uniqueStrings(items).slice(-200));
}

function readTrainingData() {
  return readJsonFile(TRAINING_DATA_PATH, () => ({
    tasks: [],
    phrasePacks: [],
    forbiddenSamples: [],
  }), (value) => value && typeof value === "object" && !Array.isArray(value));
}

function readTrainingProgress() {
  return readJsonFile(TRAINING_PROGRESS_PATH, defaultTrainingProgress, (value) => value && typeof value === "object" && !Array.isArray(value));
}

function writeTrainingProgress(progress) {
  writeJsonAtomic(TRAINING_PROGRESS_PATH, progress);
}

function dataFileStatus() {
  const files = [
    ["profile", PROFILE_PATH],
    ["relationship", RELATIONSHIP_PATH],
    ["timeline", TIMELINE_PATH],
    ["languageLibrary", LIBRARY_PATH],
    ["forbiddenExpressions", FORBIDDEN_PATH],
    ["trainingProgress", TRAINING_PROGRESS_PATH],
    ["trainingData", TRAINING_DATA_PATH],
  ];
  return files.map(([name, filePath]) => {
    const exists = fs.existsSync(filePath);
    const stat = exists ? fs.statSync(filePath) : null;
    return {
      name,
      exists,
      bytes: stat ? stat.size : 0,
      updatedAt: stat ? stat.mtime.toISOString() : null
    };
  });
}

function launchReadiness() {
  const files = dataFileStatus();
  const requiredFilesReady = files.every((file) => file.exists);
  const checks = [
    { key: "localOnly", label: "本机运行", ok: HOST === "127.0.0.1" },
    { key: "privateAuth", label: "公网访问已加登录保护", ok: HOST === "127.0.0.1" || PUBLIC_AUTH_ENABLED },
    { key: "aiConfigured", label: "AI 已连接", ok: providerConfigured() },
    { key: "dataFiles", label: "本地数据文件完整", ok: requiredFilesReady },
    { key: "trainingData", label: "训练语料可读取", ok: (readTrainingData().tasks || []).length >= 21 },
    { key: "privacy", label: "隐私边界已声明", ok: true },
    { key: "export", label: "本地数据可导出", ok: true }
  ];
  const passed = checks.filter((item) => item.ok).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    passed,
    total: checks.length,
    checks
  };
}

function exportPayload() {
  const timeline = readTimeline();
  return {
    exportedAt: new Date().toISOString(),
    app: "dating-chat-guide",
    privacy: {
      localOnly: HOST === "127.0.0.1",
      authEnabled: PUBLIC_AUTH_ENABLED,
      apiKeyExported: false,
      rawChatStoredByDefault: false,
      note: "此导出只包含本地训练状态、画像摘要、时间线摘要和语言库，不包含 .env 或 API Key。"
    },
    launchReadiness: launchReadiness(),
    profile: readProfile(),
    relationship: readRelationship(),
    timeline,
    insights: buildReviewInsights(timeline),
    trainingProgress: readTrainingProgress(),
    languageLibrary: readLibrary(),
    forbiddenExpressions: readForbiddenExpressions()
  };
}

function resetLocalData() {
  const profile = defaultProfile();
  const relationship = defaultRelationship();
  const progress = defaultTrainingProgress();
  writeProfile(profile);
  writeRelationship(relationship);
  writeTimeline([]);
  writeTrainingProgress(progress);
  writeLibrary(defaultLibrary());
  writeForbiddenExpressions(defaultForbiddenExpressions());
  return {
    profile,
    relationship,
    timeline: [],
    progress,
    insights: buildReviewInsights([])
  };
}

function latestColdStartInsights(timeline = readTimeline()) {
  const entry = [...timeline].reverse().find((item) => item && item.type === "cold-start-insights" && item.insights);
  return entry ? entry.insights : null;
}

function insightsPayload() {
  const timeline = readTimeline();
  const insights = buildReviewInsights(timeline);
  if (insights.empty) {
    const cached = latestColdStartInsights(timeline);
    if (cached) {
      return {
        ...insights,
        ...cached,
        totalReviews: 0,
        recentReviews: 0,
        averageRisk: 0,
        empty: false,
        coldStart: true,
        generatedAt: cached.generatedAt || insights.generatedAt
      };
    }
  }
  return insights;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function trainingPlan() {
  const tasks = readTrainingData().tasks || [];
  return tasks.slice(0, 21).map((task, index) => ({
    day: index + 1,
    title: task.title || `训练第 ${index + 1} 天`,
    body: task.body || "先回应感受，再表达自己。",
    example: task.example || "你先忙，晚点有空再聊。"
  }));
}

function progressPayload() {
  const progress = readTrainingProgress();
  const plan = trainingPlan();
  const key = todayKey();
  const start = new Date("2026-01-01T00:00:00.000Z").getTime();
  const dayIndex = plan.length ? Math.floor((Date.now() - start) / 86400000) % plan.length : 0;
  const completedDates = Array.isArray(progress.completedDates) ? progress.completedDates : [];
  return {
    plan,
    todayKey: key,
    todayIndex: dayIndex,
    todayTask: plan[dayIndex] || null,
    completedToday: Boolean(progress.completedDays && progress.completedDays[key]),
    completedCount: completedDates.length,
    recentDates: completedDates.slice(-14),
    updatedAt: progress.updatedAt || null
  };
}

function completeTrainingToday(note = "") {
  const progress = readTrainingProgress();
  const key = todayKey();
  const completedDates = Array.isArray(progress.completedDates) ? progress.completedDates : [];
  const completedDays = progress.completedDays && typeof progress.completedDays === "object" ? progress.completedDays : {};
  if (!completedDays[key]) completedDates.push(key);
  completedDays[key] = {
    completedAt: new Date().toISOString(),
    note: String(note || "").slice(0, 500)
  };
  const next = {
    ...progress,
    completedDates: uniqueStrings(completedDates).slice(-120),
    completedDays,
    updatedAt: new Date().toISOString()
  };
  writeTrainingProgress(next);
  return progressPayload();
}

function buildTrainingContext(input = {}) {
  const data = readTrainingData();
  const localLibrary = readLibrary().slice(-60);
  const localForbidden = readForbiddenExpressions().slice(-80);
  const scene = String(input.scene || input.tone || input.context || input.chatLog || "").slice(0, 300);
  const phrasePacks = [...(data.phrasePacks || []), ...localLibrary]
    .filter((item) => item && item.text)
    .slice(0, 36)
    .map((item) => ({
      scene: item.scene || "未分类",
      style: item.style || "自然",
      text: item.text
    }));
  const forbiddenSamples = [
    ...(data.forbiddenSamples || []).map((item) => item.text || item),
    ...localForbidden
  ].filter(Boolean).slice(0, 80);
  return {
    sceneHint: scene,
    phrasePacks,
    forbiddenSamples
  };
}

function mergeProfile(profile, patch) {
  if (!patch || typeof patch !== "object") return profile;

  const merged = { ...profile };
  if (typeof patch.summary === "string" && patch.summary.trim()) merged.summary = patch.summary.trim();
  if (typeof patch.relationshipStage === "string" && patch.relationshipStage.trim()) merged.relationshipStage = patch.relationshipStage.trim();

  for (const key of ["weaknesses", "strengths", "facts", "trainingPlan"]) {
    if (Array.isArray(patch[key])) {
      merged[key] = uniqueStrings([...(merged[key] || []), ...patch[key]]).slice(-12);
    }
  }

  merged.historyCount = Number(merged.historyCount || 0) + 1;
  merged.updatedAt = new Date().toISOString();
  writeProfile(merged);
  return merged;
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

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  if (raw.length > 80_000) {
    const error = new Error("请求内容太长。请缩短聊天记录后再试。");
    error.status = 413;
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("请求不是合法 JSON。");
    error.status = 400;
    throw error;
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(text)
  });
  res.end(text);
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function isAuthorized(req) {
  if (!PUBLIC_AUTH_ENABLED) return true;
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const index = decoded.indexOf(":");
  if (index === -1) return false;
  const user = decoded.slice(0, index);
  const password = decoded.slice(index + 1);
  return timingSafeEqualString(user, PUBLIC_AUTH_USER) && timingSafeEqualString(password, PUBLIC_AUTH_PASSWORD);
}

function requireAuth(req, res) {
  if (isAuthorized(req)) return true;
  res.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "WWW-Authenticate": 'Basic realm="Private AI Coach"'
  });
  res.end("Authentication required");
  return false;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
  }[ext] || "application/octet-stream";
}

function safeStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(ROOT, normalized);
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === "string") return responseJson.output_text;
  const parts = [];
  for (const item of responseJson.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function parseModelJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI 没有返回可解析的 JSON。");
  }
}

function buildInstructions() {
  return [
    "你是一个中文恋爱沟通个人教练，服务对象是一个只为自己本地使用的用户。",
    "目标是提升真实沟通能力：情绪稳定、尊重边界、清楚表达、不过度讨好、不操控。",
    "不要输出 PUA、操控、羞辱、威胁、冷暴力、隐私侵犯、性骚扰或逼迫对方的建议。",
    "不要鼓励用户纠缠明确拒绝的人。对方明确拒绝或保持距离时，建议体面后退。",
    "只返回 JSON，不要 Markdown，不要代码块。",
    "返回字段必须符合任务要求。所有文本用简体中文，直接、具体、可执行。"
  ].join("\n");
}

function providerConfigured() {
  if (AI_PROVIDER === "deepseek") {
    return Boolean(process.env.DEEPSEEK_API_KEY && !process.env.DEEPSEEK_API_KEY.includes("your-deepseek-key"));
  }
  return Boolean(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("your-openai-key") && !process.env.OPENAI_API_KEY.includes("sk-your-key"));
}

async function callAI({ task, input, profile, relationship }) {
  if (AI_PROVIDER === "deepseek") {
    return callDeepSeek({ task, input, profile, relationship });
  }
  return callOpenAI({ task, input, profile, relationship });
}

async function callOpenAI({ task, input, profile, relationship }) {
  if (!providerConfigured()) {
    const error = new Error("缺少 OPENAI_API_KEY。请在 .env 里填入你的 OpenAI API Key。");
    error.status = 503;
    error.code = "missing_api_key";
    throw error;
  }

  const body = {
    model: OPENAI_MODEL,
    instructions: buildInstructions(),
    input: buildPrompt(task, input, profile, relationship),
    temperature: 0.35,
    max_output_tokens: 2200,
    store: false
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || `OpenAI API 请求失败：HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload.error?.code || "openai_error";
    throw error;
  }

  const text = extractOutputText(payload);
  if (!text) throw new Error("AI 没有返回文本。");
  return parseModelJson(text);
}

async function callDeepSeek({ task, input, profile, relationship }) {
  if (!providerConfigured()) {
    const error = new Error("缺少 DEEPSEEK_API_KEY。请在 .env 里填入你的 DeepSeek API Key。");
    error.status = 503;
    error.code = "missing_api_key";
    throw error;
  }

  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: buildInstructions() },
      { role: "user", content: buildPrompt(task, input, profile, relationship) }
    ],
    temperature: 0.35,
    max_tokens: 2200,
    stream: false,
    response_format: { type: "json_object" }
  };

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || `DeepSeek API 请求失败：HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload.error?.code || "deepseek_error";
    throw error;
  }

  const text = payload.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("DeepSeek 没有返回文本。");
  return parseModelJson(text);
}

function buildPrompt(task, input, profile, relationship = defaultRelationship()) {
  const profileBlock = JSON.stringify(profile, null, 2);
  const relationshipBlock = JSON.stringify(relationship, null, 2);
  const inputBlock = JSON.stringify(input, null, 2);
  const trainingContextBlock = JSON.stringify(buildTrainingContext(input), null, 2);

  if (task === "review") {
    return [
      "任务：对真实聊天记录做深度复盘，并更新用户画像。",
      "当前用户画像：",
      profileBlock,
      "当前关系档案：",
      relationshipBlock,
      "用户输入：",
      inputBlock,
      "本地训练数据上下文：优先参考 phrasePacks 的自然表达，严格避开 forbiddenSamples。",
      trainingContextBlock,
      "请返回 JSON：",
      JSON.stringify({
        summary: "一句话总结这段聊天的问题和机会",
        conversationStage: "刚认识/熟悉期/好感期/暧昧期/需要后退/未知",
        riskScore: 0,
        scores: {
          pressure: 0,
          empathy: 0,
          boundary: 0,
          naturalness: 0,
          progress: 0,
          emotionalStability: 0
        },
        coldNodes: ["指出对方变冷或压力变大的具体节点"],
        userIssues: ["用户具体问题"],
        otherSignals: ["对方释放的兴趣、犹豫、边界或情绪信号"],
        betterReplies: ["把关键翻车句改成更成熟的版本"],
        nextMessage: "现在最建议发送的一句话，如果不建议继续发就写暂停/后退话术",
        repairMessage: "如果需要修复，给一句修复话术；不需要则为空字符串",
        trainingFocus: ["接下来最该练的 2-4 个动作"],
        profilePatch: {
          summary: "更新后的用户画像摘要",
          relationshipStage: "推断阶段",
          weaknesses: ["长期弱点"],
          strengths: ["已有优势"],
          facts: ["只保存抽象事实，不保存原始聊天"],
          trainingPlan: ["下一步训练计划"]
        }
      }, null, 2)
    ].join("\n");
  }

  if (task === "next-message") {
    return [
      "任务：根据上下文生成下一句，并更新用户画像。",
      "当前用户画像：",
      profileBlock,
      "当前关系档案：",
      relationshipBlock,
      "用户输入：",
      inputBlock,
      "本地训练数据上下文：优先参考 phrasePacks 的自然表达，严格避开 forbiddenSamples。",
      trainingContextBlock,
      "请返回 JSON：",
      JSON.stringify({
        recommended: "最推荐发送的一句话",
        alternatives: {
          steady: "稳重自然版",
          light: "轻松幽默版",
          mature: "成熟表达版"
        },
        why: "为什么这样说",
        doNotSend: ["不建议发送的表达"],
        timing: "现在发/晚点发/先别发，并说明原因",
        profilePatch: {
          summary: "更新后的画像摘要",
          relationshipStage: "推断阶段",
          weaknesses: ["如果暴露出弱点就写"],
          strengths: ["如果暴露出优势就写"],
          facts: ["只保存抽象事实"],
          trainingPlan: ["下一步训练计划"]
        }
      }, null, 2)
    ].join("\n");
  }

  if (task === "feedback-loop") {
    return [
      "任务：用户已经使用了一句 AI 建议，现在根据真实反馈做训练闭环分析。",
      "当前用户画像：",
      profileBlock,
      "当前关系档案：",
      relationshipBlock,
      "用户输入：",
      inputBlock,
      "请判断：这句建议是否有效、为什么有效或无效、下次应该保留什么、调整什么。",
      "不要编造对方感受；只能基于用户填写的对方反应和回复做低确定性分析。",
      "请返回 JSON：",
      JSON.stringify({
        summary: "一句话总结这次反馈的训练价值",
        outcomeReason: "为什么对方会这样反应，保持谨慎推断",
        keepDoing: ["下次可以继续保留的做法"],
        adjustNextTime: ["下次需要调整的做法"],
        nextExperiment: "下一次聊天只测试一个小动作",
        profilePatch: {
          summary: "更新后的画像摘要",
          relationshipStage: "如能推断则写，否则保持未知",
          weaknesses: ["从反馈里暴露的长期弱点"],
          strengths: ["从反馈里体现的优势"],
          facts: ["只保存抽象事实，不保存原始聊天"],
          trainingPlan: ["下一步训练计划"]
        }
      }, null, 2)
    ].join("\n");
  }

  if (task === "cold-start-insights") {
    return [
      "任务：现在没有真实复盘记录。请根据用户画像、关系档案和本地训练语料，生成第一版冷启动弱点画像。",
      "当前用户画像：",
      profileBlock,
      "当前关系档案：",
      relationshipBlock,
      "用户输入：",
      inputBlock,
      "本地训练数据上下文：",
      trainingContextBlock,
      "要求：明确告诉用户这是冷启动推断，不是真实统计；给出能立刻执行的第一周训练重点。",
      "请返回 JSON：",
      JSON.stringify({
        summary: "冷启动洞察摘要",
        likelyWeaknesses: ["可能的弱点"],
        likelyStrengths: ["可能的优势"],
        firstWeekFocus: ["第一周训练重点"],
        starterRules: ["开始聊天前先遵守的规则"],
        firstReviewPrompt: "引导用户第一次贴什么聊天记录来校准系统",
        topIssues: [
          { label: "冷启动风险标签", count: 1, advice: "具体训练建议" }
        ],
        weeklyFocus: ["本周训练重点"],
        profilePatch: {
          summary: "更新后的画像摘要",
          relationshipStage: "未知或推断阶段",
          weaknesses: ["冷启动弱点"],
          strengths: ["冷启动优势"],
          facts: ["只保存抽象事实"],
          trainingPlan: ["第一周训练计划"]
        }
      }, null, 2)
    ].join("\n");
  }

  throw new Error(`Unknown AI task: ${task}`);
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      provider: AI_PROVIDER,
      aiConfigured: providerConfigured(),
      model: MODEL,
      baseUrl: AI_PROVIDER === "deepseek" ? DEEPSEEK_BASE_URL : "https://api.openai.com/v1",
      profileExists: fs.existsSync(PROFILE_PATH)
    });
  }

  if (req.method === "GET" && pathname === "/api/system/status") {
    return sendJson(res, 200, {
      ok: true,
      provider: AI_PROVIDER,
      model: MODEL,
      host: HOST,
      aiConfigured: providerConfigured(),
      files: dataFileStatus(),
      privacy: {
        localOnly: HOST === "127.0.0.1",
        apiKeyInBrowser: false,
        authEnabled: PUBLIC_AUTH_ENABLED,
        rawChatStoredByDefault: false,
        exportIncludesApiKey: false
      },
      launchReadiness: launchReadiness()
    });
  }

  if (req.method === "GET" && pathname === "/api/export") {
    const payload = exportPayload();
    payload.insights = insightsPayload();
    return sendJson(res, 200, payload);
  }

  if (req.method === "POST" && pathname === "/api/data/reset") {
    const body = await readJson(req);
    if (body.confirm !== "RESET_LOCAL_DATA") {
      return sendJson(res, 400, { ok: false, error: "请输入 RESET_LOCAL_DATA 才能清空本地数据。" });
    }
    const state = resetLocalData();
    return sendJson(res, 200, { ok: true, resetAt: new Date().toISOString(), state, launchReadiness: launchReadiness() });
  }

  if (req.method === "GET" && pathname === "/api/profile") {
    return sendJson(res, 200, { ok: true, profile: readProfile() });
  }

  if (req.method === "GET" && pathname === "/api/relationship") {
    return sendJson(res, 200, { ok: true, relationship: readRelationship() });
  }

  if (req.method === "POST" && pathname === "/api/relationship") {
    const body = await readJson(req);
    const current = readRelationship();
    const relationship = {
      ...current,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : current.name,
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 3000) : current.notes,
      stage: typeof body.stage === "string" ? body.stage.trim().slice(0, 80) : current.stage,
      personality: typeof body.personality === "string" ? body.personality.trim().slice(0, 400) : current.personality,
      boundaries: Array.isArray(body.boundaries) ? uniqueStrings(body.boundaries).slice(0, 12) : current.boundaries,
      likedTopics: Array.isArray(body.likedTopics) ? uniqueStrings(body.likedTopics).slice(0, 12) : current.likedTopics,
      lastContext: typeof body.lastContext === "string" ? body.lastContext.trim().slice(0, 800) : current.lastContext,
      updatedAt: new Date().toISOString()
    };
    writeRelationship(relationship);
    return sendJson(res, 200, { ok: true, relationship });
  }

  if (req.method === "GET" && pathname === "/api/timeline") {
    return sendJson(res, 200, { ok: true, timeline: readTimeline().slice(-30).reverse() });
  }

  if (req.method === "GET" && pathname === "/api/insights") {
    const insights = insightsPayload();
    return sendJson(res, 200, { ok: true, insights, averageRisk: insights.averageRisk });
  }

  if (req.method === "GET" && pathname === "/api/progress") {
    return sendJson(res, 200, { ok: true, progress: progressPayload() });
  }

  if (req.method === "POST" && pathname === "/api/training/complete") {
    const body = await readJson(req);
    const progress = completeTrainingToday(body.note);
    addTimelineEntry({
      type: "training-complete",
      title: "21 天训练打卡",
      summary: progress.todayTask ? progress.todayTask.title : "完成今日训练",
      note: String(body.note || "").slice(0, 500)
    });
    return sendJson(res, 200, { ok: true, progress, timeline: readTimeline().slice(-30).reverse() });
  }

  if (req.method === "GET" && pathname === "/api/library") {
    return sendJson(res, 200, { ok: true, library: readLibrary().slice().reverse() });
  }

  if (req.method === "POST" && pathname === "/api/library") {
    const body = await readJson(req);
    if (!body.text || typeof body.text !== "string") {
      return sendJson(res, 400, { ok: false, error: "请提供 text 字段。" });
    }
    const items = readLibrary();
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      scene: String(body.scene || "未分类").slice(0, 40),
      style: String(body.style || "未标记").slice(0, 40),
      text: String(body.text).trim().slice(0, 500),
      rating: String(body.rating || "收藏").slice(0, 40),
      source: String(body.source || "manual").slice(0, 40),
      createdAt: new Date().toISOString()
    };
    items.push(item);
    writeLibrary(items);
    return sendJson(res, 200, { ok: true, item, library: readLibrary().slice().reverse() });
  }

  if (req.method === "GET" && pathname === "/api/forbidden") {
    return sendJson(res, 200, { ok: true, forbidden: readForbiddenExpressions() });
  }

  if (req.method === "POST" && pathname === "/api/forbidden") {
    const body = await readJson(req);
    if (!body.text || typeof body.text !== "string") {
      return sendJson(res, 400, { ok: false, error: "请提供 text 字段。" });
    }
    const items = readForbiddenExpressions();
    items.push(String(body.text).trim().slice(0, 200));
    writeForbiddenExpressions(items);
    return sendJson(res, 200, { ok: true, forbidden: readForbiddenExpressions() });
  }

  if (req.method === "POST" && pathname === "/api/feedback") {
    const body = await readJson(req);
    const profile = readProfile();
    const relationship = readRelationship();
    let reflection = null;
    let updatedProfile = profile;
    try {
      reflection = validateFeedbackReflection(await callAI({ task: "feedback-loop", input: body, profile, relationship }));
      updatedProfile = mergeProfile(profile, reflection.profilePatch);
    } catch (error) {
      reflection = {
        ...validateFeedbackReflection({}),
        aiError: error.message || String(error)
      };
    }
    const entry = addTimelineEntry({
      type: "feedback",
      title: "结果反馈",
      outcome: String(body.outcome || "未选择").slice(0, 80),
      note: String(body.note || "").slice(0, 1200),
      suggestedMessage: String(body.suggestedMessage || "").slice(0, 500),
      reply: String(body.reply || "").slice(0, 1200),
      aiReflection: reflection,
      relationshipName: relationship.name
    });
    return sendJson(res, 200, { ok: true, entry, reflection, profile: updatedProfile, timeline: readTimeline().slice(-30).reverse() });
  }

  if (req.method === "POST" && pathname === "/api/profile/reset") {
    const profile = defaultProfile();
    writeProfile(profile);
    return sendJson(res, 200, { ok: true, profile });
  }

  if (req.method === "POST" && pathname === "/api/ai/cold-start-insights") {
    const body = await readJson(req);
    const profile = readProfile();
    const relationship = readRelationship();
    const data = validateColdStartInsights(await callAI({
      task: "cold-start-insights",
      input: {
        ...body,
        trainingProgress: progressPayload(),
        recentTimeline: readTimeline().slice(-10)
      },
      profile,
      relationship
    }));
    const updatedProfile = mergeProfile(profile, data.profilePatch);
    const insights = {
      generatedAt: new Date().toISOString(),
      totalReviews: 0,
      recentReviews: 0,
      averageRisk: 0,
      topIssues: data.topIssues.length ? data.topIssues : data.likelyWeaknesses.slice(0, 5).map((label) => ({
        label,
        count: 1,
        advice: "先用冷启动训练重点做一周，再用真实复盘校准。"
      })),
      weeklyFocus: data.weeklyFocus.length ? data.weeklyFocus : data.firstWeekFocus,
      empty: false,
      coldStart: true,
      coldStartDetail: data
    };
    addTimelineEntry({
      type: "cold-start-insights",
      title: "AI 冷启动洞察",
      summary: data.summary,
      insights,
      relationshipName: relationship.name
    });
    return sendJson(res, 200, {
      ok: true,
      data,
      insights,
      profile: updatedProfile,
      timeline: readTimeline().slice(-30).reverse()
    });
  }

  if (req.method === "POST" && pathname === "/api/ai/review") {
    const body = await readJson(req);
    if (!body.chatLog || typeof body.chatLog !== "string") {
      return sendJson(res, 400, { ok: false, error: "请提供 chatLog 字段。" });
    }
    const profile = readProfile();
    const relationship = readRelationship();
    const data = validateReviewResult(await callAI({ task: "review", input: body, profile, relationship }));
    const updatedProfile = mergeProfile(profile, data.profilePatch);
    addTimelineEntry({
      type: "ai-review",
      title: "AI 深度复盘",
      stage: data.conversationStage || relationship.stage || "未知",
      riskScore: data.riskScore,
      scores: data.scores,
      summary: data.summary,
      coldNodes: data.coldNodes || [],
      userIssues: data.userIssues || [],
      betterReplies: data.betterReplies || [],
      nextMessage: data.nextMessage,
      trainingFocus: data.trainingFocus || [],
      relationshipName: relationship.name
    });
    const timeline = readTimeline();
    return sendJson(res, 200, {
      ok: true,
      data,
      profile: updatedProfile,
      timeline: timeline.slice(-30).reverse(),
      insights: buildReviewInsights(timeline)
    });
  }

  if (req.method === "POST" && pathname === "/api/ai/next-message") {
    const body = await readJson(req);
    if (!body.context || typeof body.context !== "string") {
      return sendJson(res, 400, { ok: false, error: "请提供 context 字段。" });
    }
    const profile = readProfile();
    const relationship = readRelationship();
    const data = validateNextMessageResult(await callAI({ task: "next-message", input: body, profile, relationship }));
    const updatedProfile = mergeProfile(profile, data.profilePatch);
    addTimelineEntry({
      type: "ai-next-message",
      title: "AI 下一句生成",
      summary: data.why,
      nextMessage: data.recommended,
      timing: data.timing,
      relationshipName: relationship.name
    });
    return sendJson(res, 200, { ok: true, data, profile: updatedProfile, timeline: readTimeline().slice(-30).reverse() });
  }

  return sendJson(res, 404, { ok: false, error: "API not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url.pathname);
    }

    const filePath = safeStaticPath(url.pathname);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return sendText(res, 404, "Not found");
    }
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-cache",
      "Content-Length": data.length
    });
    res.end(data);
  } catch (error) {
    sendJson(res, error.status || 500, {
      ok: false,
      code: error.code || "server_error",
      error: error.message || "服务器错误"
    });
  }
});

ensureDataDir();
server.listen(PORT, HOST, () => {
  console.log(`AI coach running at http://${HOST}:${PORT}/index.html`);
  console.log(`Provider: ${AI_PROVIDER}`);
  console.log(`AI configured: ${providerConfigured()}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Public auth enabled: ${PUBLIC_AUTH_ENABLED}`);
});
