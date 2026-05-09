const crypto = require("node:crypto");
const {
  readJsonFile,
  writeJsonAtomic,
} = require("./json-store");

const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 32;
const HASH_DIGEST = "sha256";

function nowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : String(now);
}

function createEmptyAccountDatabase(now = new Date()) {
  return {
    version: 1,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
    users: [],
    loginSessions: [],
    dataOwnership: [],
  };
}

function normalizeAccountDatabase(value, now = new Date()) {
  const fallback = createEmptyAccountDatabase(now);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  return {
    version: 1,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : fallback.createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt,
    users: Array.isArray(value.users) ? value.users.filter((item) => item && typeof item === "object") : [],
    loginSessions: Array.isArray(value.loginSessions) ? value.loginSessions.filter((item) => item && typeof item === "object") : [],
    dataOwnership: Array.isArray(value.dataOwnership) ? value.dataOwnership.filter((item) => item && typeof item === "object") : [],
  };
}

function readAccountDatabase(dbPath) {
  return readJsonFile(dbPath, createEmptyAccountDatabase, (value) => Boolean(value && typeof value === "object" && !Array.isArray(value)));
}

function writeAccountDatabase(dbPath, database) {
  writeJsonAtomic(dbPath, normalizeAccountDatabase(database));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(String(password || ""), salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST)
    .toString("hex");
  return `pbkdf2:${HASH_DIGEST}:${HASH_ITERATIONS}:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split(":");
  if (parts.length !== 5 || parts[0] !== "pbkdf2") return false;
  const [, digest, iterationsText, salt, expected] = parts;
  const iterations = Number(iterationsText);
  if (!digest || !iterations || !salt || !expected) return false;
  const actual = crypto
    .pbkdf2Sync(String(password || ""), salt, iterations, Buffer.from(expected, "hex").length, digest)
    .toString("hex");
  const left = Buffer.from(actual, "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function cleanUsername(username) {
  const value = String(username || "owner").trim();
  return value ? value.slice(0, 80) : "owner";
}

function getOrCreateOwnerAccount(dbPath, credentials = {}, now = new Date()) {
  const database = normalizeAccountDatabase(readAccountDatabase(dbPath), now);
  const timestamp = nowIso(now);
  const username = cleanUsername(credentials.username);
  const password = String(credentials.password || "");
  let owner = database.users.find((user) => user.role === "owner");

  if (!owner) {
    owner = {
      id: "owner",
      username,
      role: "owner",
      source: String(credentials.source || "local").slice(0, 40),
      passwordHash: password ? hashPassword(password) : null,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSeenAt: timestamp,
    };
    database.users.push(owner);
  } else {
    owner.username = username;
    owner.source = String(credentials.source || owner.source || "local").slice(0, 40);
    owner.lastSeenAt = timestamp;
    owner.updatedAt = timestamp;
    if (password && !verifyPassword(password, owner.passwordHash)) {
      owner.passwordHash = hashPassword(password);
    }
  }

  database.updatedAt = timestamp;
  writeAccountDatabase(dbPath, database);
  return { ...owner };
}

function recordLoginSession(dbPath, userId, reqMeta = {}, now = new Date()) {
  const database = normalizeAccountDatabase(readAccountDatabase(dbPath), now);
  const timestamp = nowIso(now);
  const session = {
    id: `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    userId,
    source: String(reqMeta.source || "basic-auth").slice(0, 40),
    userAgent: String(reqMeta.userAgent || "").slice(0, 200),
    createdAt: timestamp,
    lastSeenAt: timestamp,
  };
  database.loginSessions = [
    ...database.loginSessions.filter((item) => item && item.userId !== userId),
    session,
  ].slice(-20);
  database.updatedAt = timestamp;
  writeAccountDatabase(dbPath, database);
  return session;
}

function recordDataOwnership(dbPath, userId, files = [], now = new Date()) {
  const database = normalizeAccountDatabase(readAccountDatabase(dbPath), now);
  const timestamp = nowIso(now);
  const owned = {
    id: `${userId}:local-data`,
    userId,
    files: [...new Set(files.map((file) => String(file || "").trim()).filter(Boolean))],
    updatedAt: timestamp,
  };
  database.dataOwnership = [
    ...database.dataOwnership.filter((item) => item && item.id !== owned.id),
    owned,
  ];
  database.updatedAt = timestamp;
  writeAccountDatabase(dbPath, database);
  return owned;
}

function publicAccountStatus(dbPath, userId = "owner") {
  const database = normalizeAccountDatabase(readAccountDatabase(dbPath));
  const user = database.users.find((item) => item.id === userId) || database.users.find((item) => item.role === "owner") || null;
  const owned = user ? database.dataOwnership.find((item) => item.userId === user.id) : null;
  return {
    currentUser: user ? {
      id: user.id,
      username: user.username,
      role: user.role,
      source: user.source,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastSeenAt: user.lastSeenAt,
      passwordConfigured: Boolean(user.passwordHash),
    } : null,
    database: {
      version: database.version,
      createdAt: database.createdAt,
      updatedAt: database.updatedAt,
      userCount: database.users.length,
      loginSessionCount: database.loginSessions.length,
      ownedFileCount: owned && Array.isArray(owned.files) ? owned.files.length : 0,
      passwordHashesStored: database.users.some((item) => Boolean(item.passwordHash)),
    },
  };
}

module.exports = {
  createEmptyAccountDatabase,
  getOrCreateOwnerAccount,
  hashPassword,
  normalizeAccountDatabase,
  publicAccountStatus,
  readAccountDatabase,
  recordDataOwnership,
  recordLoginSession,
  verifyPassword,
  writeAccountDatabase,
};
