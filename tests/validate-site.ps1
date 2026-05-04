$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$htmlPath = Join-Path $root "index.html"
$cssPath = Join-Path $root "assets\styles.css"
$appPath = Join-Path $root "assets\app.js"

if (-not (Test-Path -LiteralPath $htmlPath)) {
    throw "index.html is missing"
}
if (-not (Test-Path -LiteralPath $cssPath)) {
    throw "assets/styles.css is missing"
}
if (-not (Test-Path -LiteralPath $appPath)) {
    throw "assets/app.js is missing"
}

$html = Get-Content -LiteralPath $htmlPath -Raw -Encoding UTF8
$css = Get-Content -LiteralPath $cssPath -Raw -Encoding UTF8
$app = Get-Content -LiteralPath $appPath -Raw -Encoding UTF8

function Assert-Contains {
    param(
        [string]$Needle,
        [string]$Message,
        [string]$Haystack = $html
    )
    if (-not $Haystack.Contains($Needle)) {
        throw $Message
    }
}

function U {
    param([int[]]$Codepoints)
    return -join ($Codepoints | ForEach-Object { [char]$_ })
}

$expectedTitle = "<title>" + (U @(0x5F02,0x6027,0x804A,0x5929,0x7EFC,0x5408,0x8BAD,0x7EC3,0x6307,0x5357)) + "</title>"
Assert-Contains $expectedTitle "Missing expected page title"

$requiredIds = @(
    "dashboard",
    "logic",
    "stages",
    "scenarios",
    "rewrites",
    "emotion",
    "coach",
    "advanced",
    "practice",
    "trainer",
    "searchInput",
    "scenarioFilters",
    "resetProgress",
    "dailyTask",
    "chatCheck",
    "simScenario",
    "simTranscript",
    "simInput",
    "simSend",
    "simFeedback",
    "chatLogInput",
    "reviewChatBtn",
    "reviewResult",
    "emergencyInput",
    "emergencyBtn",
    "emergencyResult",
    "weaknessInput",
    "buildProfileBtn",
    "profileResult",
    "relationshipForm",
    "calculateRelationBtn",
    "relationResult",
    "messageScene",
    "messageTone",
    "messageContext",
    "generateNextBtn",
    "nextMessageResult",
    "overheatNeed",
    "interceptBtn",
    "interceptResult",
    "coachPersona",
    "savePersonaBtn",
    "personaResult",
    "partnerPersonality",
    "partnerDifficulty",
    "partnerScenario",
    "startPersonaSimBtn",
    "personaSimTranscript",
    "personaSimInput",
    "personaSimSend",
    "personaSimFeedback",
    "deepReviewInput",
    "deepReviewBtn",
    "deepReviewResult",
    "challengeQuestion",
    "challengeOptions",
    "challengeFeedback",
    "nextChallengeBtn"
)

foreach ($id in $requiredIds) {
    if ($html -notmatch "id=`"$([regex]::Escape($id))`"") {
        throw "Missing required id: $id"
    }
}

$ids = [regex]::Matches($html, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$anchors = [regex]::Matches($html, 'href="#([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

foreach ($anchor in $anchors) {
    if ($ids -notcontains $anchor) {
        throw "Broken internal anchor: #$anchor"
    }
}

$scenarioCount = ([regex]::Matches($html, 'class="scenario-card')).Count
if ($scenarioCount -lt 10) {
    throw "Expected at least 10 scenario cards, found $scenarioCount"
}

$rewriteCount = ([regex]::Matches($html, 'class="rewrite-card')).Count
if ($rewriteCount -lt 8) {
    throw "Expected at least 8 rewrite cards, found $rewriteCount"
}

$requiredPrinciples = @(
    (U @(0x5C0A,0x91CD,0x8FB9,0x754C)),
    (U @(0x4E0D,0x64CD,0x63A7)),
    (U @(0x60C5,0x7EEA,0x6682,0x505C)),
    (U @(0x9080,0x7EA6)),
    (U @(0x590D,0x76D8))
)

foreach ($phrase in $requiredPrinciples) {
    Assert-Contains $phrase "Missing guide principle: $phrase"
}

$trainingFeatures = @(
    (U @(0x804A,0x5929,0x6A21,0x62DF,0x5668)),
    (U @(0x771F,0x5B9E,0x804A,0x5929,0x590D,0x76D8,0x5668)),
    (U @(0x60C5,0x7EEA,0x6025,0x6551,0x6309,0x94AE)),
    (U @(0x4E2A,0x4EBA,0x6559,0x7EC3)),
    (U @(0x5F31,0x70B9,0x753B,0x50CF)),
    (U @(0x5173,0x7CFB,0x6E29,0x5EA6,0x8BA1)),
    (U @(0x4E0B,0x4E00,0x53E5,0x751F,0x6210,0x5668)),
    (U @(0x4E0A,0x5934,0x62E6,0x622A,0x5668)),
    (U @(0x8FDB,0x9636,0x8BAD,0x7EC3)),
    (U @(0x6559,0x7EC3,0x4EBA,0x683C,0x9009,0x62E9)),
    (U @(0x5973,0x751F,0x6027,0x683C,0x6A21,0x62DF)),
    (U @(0x804A,0x5929,0x8BB0,0x5F55,0x6DF1,0x5EA6,0x590D,0x76D8)),
    (U @(0x9009,0x62E9,0x9898,0x95EF,0x5173,0x8BAD,0x7EC3))
)

foreach ($phrase in $trainingFeatures) {
    Assert-Contains $phrase "Missing training feature label: $phrase"
}

foreach ($scriptFeature in @("localStorage", "filterScenarios", "renderDailyTask", "evaluateMessage", "chatCoachScenarios", "runSimulationTurn", "reviewChatLog", "runEmergencyRewrite", "buildWeaknessProfile", "calculateRelationshipTemperature", "generateNextMessage", "interceptOverheat", "saveCoachPersona", "startPersonaSimulation", "runPersonaSimulationTurn", "runDeepChatReview", "renderChallenge", "answerChallenge")) {
    Assert-Contains $scriptFeature "Missing script feature: $scriptFeature" $app
}

Assert-Contains "--warm-bg" "Missing warm visual token" $css
Assert-Contains "assets/styles.css" "Missing stylesheet link" $html
Assert-Contains "assets/app.js" "Missing app script link" $html

Write-Host "Static site checks passed"
