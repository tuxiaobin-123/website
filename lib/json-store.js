const fs = require("node:fs");
const path = require("node:path");

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonAtomic(filePath, value) {
  ensureParentDir(filePath);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(value, null, 2);
  fs.writeFileSync(tempPath, payload, "utf8");
  fs.renameSync(tempPath, filePath);
}

function backupCorruptJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const backupPath = `${filePath}.corrupt-${Date.now()}.bak`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function readJsonFile(filePath, fallback, guard = () => true) {
  ensureParentDir(filePath);
  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return guard(value) ? value : fallback();
  } catch {
    backupCorruptJson(filePath);
    return fallback();
  }
}

module.exports = {
  backupCorruptJson,
  readJsonFile,
  writeJsonAtomic,
};
