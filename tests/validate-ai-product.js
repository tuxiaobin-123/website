const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const stylesPath = path.join(root, "assets", "styles.css");
const appPath = path.join(root, "assets", "app.js");
const aiCoachPath = path.join(root, "assets", "ai-coach.js");
const trainingDataPath = path.join(root, "assets", "training-data.json");
const packagePath = path.join(root, "package.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const requiredFiles = [
  "server.js",
  "package.json",
  "Dockerfile",
  ".dockerignore",
  "DEPLOY.md",
  "start-ai-server.ps1",
  "restart-ai-server.ps1",
  ".env.example",
  path.join("assets", "styles.css"),
  path.join("assets", "app.js"),
  path.join("assets", "ai-coach.js"),
  path.join("assets", "training-data.json"),
  path.join("lib", "json-store.js"),
  path.join("lib", "ai-validators.js"),
  path.join("lib", "review-insights.js"),
  path.join("data", "profile.example.json"),
];

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`);
}

const requiredIds = [
  "aiCoach",
  "languageLibrary",
  "modernCover",
  "coverQuickStart",
  "coverMetrics",
  "homeSmartIntake",
  "homeSmartInput",
  "smartRouteMode",
  "smartRouteBtn",
  "smartRouteResult",
  "dailyWorkbench",
  "primaryWorkspace",
  "workbenchInput",
  "workbenchAnalyzeBtn",
  "workbenchExampleBtn",
  "workbenchTrialBtn",
  "workbenchReviewResult",
  "workbenchNextResult",
  "workbenchRescueResult",
  "workbenchFeedbackPrompt",
  "workbenchFeedbackReply",
  "workbenchFeedbackGoodBtn",
  "workbenchFeedbackColdBtn",
  "workbenchFeedbackSaveBtn",
  "sessionSidePanel",
  "workspaceStatusStrip",
  "workspaceCommandRail",
  "focusToday",
  "personalProgressDashboard",
  "homeProgressRing",
  "homeProgressStats",
  "homeProgressHint",
  "homeInsightDigest",
  "relationshipFlowPreview",
  "comfortPrinciples",
  "externalResourcePanel",
  "resourceSourceList",
  "universalCommunication",
  "universalRelationType",
  "universalGoal",
  "universalOtherState",
  "universalDraft",
  "universalExampleBtn",
  "universalGenerateBtn",
  "universalResult",
  "aiUseOrder",
  "reviewInsightPanel",
  "reviewInsightResult",
  "refreshReviewInsightsBtn",
  "coldStartInsightsBtn",
  "mobileActionDock",
  "aiStatus",
  "privacySanitizeBtn",
  "aiReviewInput",
  "aiReviewExampleBtn",
  "aiReviewTrialBtn",
  "aiReviewBtn",
  "aiReviewResult",
  "aiNextContext",
  "aiNextTone",
  "aiNextExampleBtn",
  "aiNextTrialBtn",
  "aiNextBtn",
  "aiNextResult",
  "quickMode",
  "quickInput",
  "quickReviewBtn",
  "quickNextBtn",
  "quickRescueBtn",
  "quickResult",
  "sixScorePanel",
  "trainingPlan21",
  "todayTrainingTask",
  "completeTrainingBtn",
  "refreshProgressBtn",
  "progressReport",
  "aiProfilePanel",
  "aiRefreshProfileBtn",
  "aiResetProfileBtn",
  "relationshipName",
  "relationshipNotes",
  "saveRelationshipBtn",
  "relationshipResult",
  "timelinePanel",
  "timelineResult",
  "refreshTimelineBtn",
  "feedbackOutcome",
  "feedbackNote",
  "saveFeedbackBtn",
  "feedbackResult",
  "libraryScene",
  "libraryStyle",
  "libraryText",
  "saveLibraryItemBtn",
  "libraryResult",
  "libraryList",
  "refreshLibraryBtn",
  "forbiddenText",
  "saveForbiddenBtn",
  "forbiddenList",
  "phrasePackList",
  "forbiddenSampleList",
  "launchCenter",
  "systemStatusPanel",
  "refreshSystemStatusBtn",
  "privacyNoticePanel",
  "dataExportPanel",
  "exportLocalDataBtn",
  "resetLocalDataBtn",
  "dataOpsResult",
  "launchChecklist",
];

for (const id of requiredIds) {
  assert(html.includes(`id="${id}"`), `Missing required HTML id: ${id}`);
}

assert(html.includes('<link rel="stylesheet" href="assets/styles.css">'), "index.html must load external stylesheet");
assert(html.includes('<script src="assets/app.js"></script>'), "index.html must load external app script");
assert(html.includes('<script src="assets/ai-coach.js"></script>'), "index.html must load external AI coach script");
assert(html.indexOf('assets/app.js') < html.indexOf('assets/ai-coach.js'), "app.js must load before ai-coach.js");
assert(!html.includes("<style>"), "index.html should not keep the large inline style block");
assert(!html.includes("<script>\n    const searchInput"), "index.html should not keep the large inline app script");

const styles = fs.readFileSync(stylesPath, "utf8");
const app = fs.readFileSync(appPath, "utf8");
const aiCoach = fs.readFileSync(aiCoachPath, "utf8");
const trainingData = JSON.parse(fs.readFileSync(trainingDataPath, "utf8"));
const serializedTrainingData = JSON.stringify(trainingData);
assert(!/\?{2,}/.test(serializedTrainingData), "training-data contains corrupted question-mark text");

for (const dataKey of ["tasks", "chatCoachScenarios", "nextMessageBank", "coachPersonaCopy", "personaScenarioOpeners", "challengeBank", "phrasePacks", "forbiddenSamples"]) {
  assert(trainingData[dataKey], `Missing training data key: ${dataKey}`);
}

assert(Array.isArray(trainingData.tasks) && trainingData.tasks.length >= 21, "training-data tasks must contain at least 21 daily practice items");
assert(Object.keys(trainingData.chatCoachScenarios).length >= 18, "training-data must contain at least 18 chat coach scenarios");
assert(Object.keys(trainingData.nextMessageBank).length >= 14, "training-data must contain at least 14 next-message scenarios");
assert(Object.keys(trainingData.personaScenarioOpeners).length >= 10, "training-data must contain at least 10 persona simulation scenarios");
assert(Array.isArray(trainingData.challengeBank) && trainingData.challengeBank.length >= 35, "training-data challengeBank must contain at least 35 challenge items");
assert(Array.isArray(trainingData.phrasePacks) && trainingData.phrasePacks.length >= 100, "training-data phrasePacks must contain at least 100 phrase samples");
assert(Array.isArray(trainingData.forbiddenSamples) && trainingData.forbiddenSamples.length >= 50, "training-data forbiddenSamples must contain at least 50 forbidden expressions");
assert(app.includes("loadTrainingData"), "app.js must load external training data");
assert(app.includes("renderDataDrivenOptions"), "app.js must render select options from training data");
assert(app.includes("populateSelect"), "app.js must include reusable select population helper");
assert(app.includes("renderPhrasePacks"), "app.js must render phrase samples from training data");
for (const inlineDataNeedle of ["const tasks = [", "const chatCoachScenarios = {", "const nextMessageBank = {", "const coachPersonaCopy = {", "const personaScenarioOpeners = {", "const challengeBank = ["]) {
  assert(!app.includes(inlineDataNeedle), `app.js should not keep inline data: ${inlineDataNeedle}`);
}

for (const phrase of ["AI 深度复盘", "AI 下一句生成", "用户画像记忆", "本地隐私优先", "一键脱敏", "关系档案", "聊天时间线", "结果反馈", "语言库管理器", "场景语料库", "禁用表达库"]) {
  assert(html.includes(phrase), `Missing product phrase: ${phrase}`);
}

for (const fn of ["callAiEndpoint", "sanitizeChatText", "runAiReview", "runAiNextMessage", "refreshAiProfile", "resetAiProfile", "saveRelationshipProfile", "refreshTimeline", "saveResultFeedback", "saveLibraryItem", "refreshLanguageLibrary", "saveForbiddenExpression", "renderForbiddenExpressions", "runQuickReview", "runQuickNext", "runQuickRescue", "renderSixDimensionScores", "refreshTrainingProgress", "completeTodayTraining", "runWorkbenchTrial", "fillAiReviewExample", "runAiReviewTrial", "fillAiNextExample", "runAiNextTrial", "createPendingFeedback", "savePendingFeedback", "runColdStartInsights", "fillUniversalExample", "runUniversalCommunication", "renderUniversalCommunication"]) {
  assert(aiCoach.includes(fn), `Missing AI coach function: ${fn}`);
}

assert(aiCoach.includes("initAiCoach"), "AI coach script must expose initAiCoach bootstrap");
assert(!app.includes("runAiReview"), "app.js should not keep AI review logic");
assert(!app.includes("refreshLanguageLibrary"), "app.js should not keep language library API logic");

for (const visualNeedle of [
  "--warm-bg",
  "--peach",
  "--sage",
  "--cream",
  "--rose",
  "--night",
  "--aqua",
  "comfort-glow",
  "resource-grid",
  "resource-card",
  "source-link",
  "universal-communication",
  "universal-grid",
  "universal-result",
  "cover-hero",
  "cover-visual",
  "quick-access-card",
  "smart-intake",
  "daily-workbench",
  "primary-workspace",
  "workbench-results",
  "workbench-panel",
  "feedback-prompt",
  "session-side-panel",
  "status-strip",
  "command-rail",
  "smart-route-grid",
  "focus-board",
  "progress-dashboard",
  "progress-ring",
  "launch-center",
  "status-grid",
  "privacy-stack",
  "ai-command-strip",
  "mobile-action-dock",
  "linear-gradient(145deg, var(--sidebar-warm), var(--sidebar-soft))",
  "radial-gradient(circle at 12% 8%",
  "#fff7ed",
]) {
  assert(styles.includes(visualNeedle), `Missing warm visual system token: ${visualNeedle}`);
}

for (const coverPhrase of [
  "把想发的话，先在这里练稳",
  "不知道该用哪个工具？直接贴这里",
  "自动判断：复盘 / 下一句 / 上头急救",
  "每日聊天工作台",
  "主工作区",
  "粘贴一次，直接得到判断、下一句和急救版本",
  "复盘判断",
  "建议下一句",
  "上头急救版",
  "这句发出去之后，对方反应怎么样",
  "对方怎么回",
  "试跑一次",
  "AI 冷启动洞察",
  "先生成第一版弱点画像",
  "当前会话状态",
  "辅助功能",
  "个人训练进度",
  "本周复盘洞察",
  "最常犯的 5 个错误",
  "本周训练重点",
  "落地中心",
  "系统自检",
  "隐私边界",
  "导出本地数据",
  "危险操作",
  "落地检查清单",
  "紧急救场",
  "今日只练一件事",
  "关系推进预览",
  "AI 使用顺序",
  "外部资源与观点",
  "通用人际沟通",
  "关系类型",
  "沟通目的",
  "对方状态",
  "稳妥版",
  "清晰边界版",
  "不建议说法",
  "Gottman 连接请求",
  "NVC 非暴力沟通",
  "Harvard 主动倾听",
  "Planned Parenthood 同意边界",
  "来源链接",
  "不操控",
  "移动端快捷栏",
]) {
  assert(html.includes(coverPhrase), `Missing modern cover phrase: ${coverPhrase}`);
}

for (const mobileNeedle of [
  "overflow-x: auto",
  ".sidebar-note {\n    display: none;",
  ".nav-link {\n    min-width: 112px;",
]) {
  assert(styles.includes(mobileNeedle), `Missing mobile navigation fix: ${mobileNeedle}`);
}

for (const smartFn of [
  "inferSmartRoute",
  "routeSmartIntake",
  "runWorkbench",
  "fillWorkbenchExample",
  "runWorkbenchTrial",
  "createPendingFeedback",
  "savePendingFeedback",
  "saveWorkbenchFeedback",
  "fillAiNextExample",
  "runAiNextTrial",
  "runColdStartInsights",
  "renderHomeProgressDashboard",
  "refreshReviewInsights",
  "renderReviewInsights",
  "refreshSystemStatus",
  "renderSystemStatus",
  "exportLocalData",
  "resetLocalData",
]) {
  assert(aiCoach.includes(smartFn), `Missing smart home function: ${smartFn}`);
}

const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const jsonStore = fs.readFileSync(path.join(root, "lib", "json-store.js"), "utf8");
const aiValidators = fs.readFileSync(path.join(root, "lib", "ai-validators.js"), "utf8");
const reviewInsights = fs.readFileSync(path.join(root, "lib", "review-insights.js"), "utf8");

for (const moduleNeedle of [
  'require("./lib/json-store")',
  'require("./lib/ai-validators")',
]) {
  assert(server.includes(moduleNeedle), `server.js must use module: ${moduleNeedle}`);
}

for (const needle of ["writeJsonAtomic", "backupCorruptJson", "readJsonFile", "module.exports"]) {
  assert(jsonStore.includes(needle), `Missing json-store capability: ${needle}`);
}

for (const needle of ["validateReviewResult", "validateNextMessageResult", "validateColdStartInsights", "validateFeedbackReflection", "validateUniversalCommunicationResult", "normalizeStringArray", "module.exports"]) {
  assert(aiValidators.includes(needle), `Missing ai-validator capability: ${needle}`);
}

for (const needle of ["buildReviewInsights", "topIssues", "weeklyFocus", "module.exports"]) {
  assert(reviewInsights.includes(needle), `Missing review-insights capability: ${needle}`);
}

for (const needle of [
  "127.0.0.1",
  "0.0.0.0",
  "process.env.HOST",
  "PUBLIC_AUTH_USER",
  "PUBLIC_AUTH_PASSWORD",
  "WWW-Authenticate",
  "isAuthorized",
  "/api/ai/review",
  "/api/ai/next-message",
  "/api/ai/universal-communication",
  "/api/profile",
  "/api/relationship",
  "/api/timeline",
  "/api/progress",
  "/api/insights",
  "/api/ai/cold-start-insights",
  "/api/system/status",
  "/api/export",
  "/api/data/reset",
  "/api/training/complete",
  "/api/feedback",
  "/api/library",
  "/api/forbidden",
  "AI_PROVIDER",
  "DEEPSEEK_API_KEY",
  "https://api.deepseek.com",
  "/chat/completions",
  "response_format",
  "OPENAI_API_KEY",
  "https://api.openai.com/v1/responses",
  "store: false",
  "validateReviewResult",
  "validateNextMessageResult",
  "readTrainingData",
  "buildTrainingContext",
  "phrasePacks",
  "forbiddenSamples",
  "TRAINING_PROGRESS_PATH",
  "buildReviewInsights",
  "cold-start-insights",
  "universal-communication",
  "validateUniversalCommunicationResult",
  "feedback-loop",
  "validateColdStartInsights",
  "validateFeedbackReflection",
  "userIssues",
  "averageRisk",
  "exportedAt",
  "RESET_LOCAL_DATA",
  "privacy",
  "launchReadiness",
]) {
  assert(server.includes(needle), `Missing server capability: ${needle}`);
}

assert(pkg.scripts && pkg.scripts.start === "node server.js", "package.json must define start script for deployment");
assert(pkg.engines && pkg.engines.node, "package.json must declare Node engine");

console.log("AI product checks passed");
