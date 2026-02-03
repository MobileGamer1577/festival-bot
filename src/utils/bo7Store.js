const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "src", "data");
const ACH_FILE = path.join(DATA_DIR, "bo7.achievements.json");
const PROG_FILE = path.join(DATA_DIR, "bo7.progress.json");

function ensureDirAndFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(ACH_FILE)) {
    fs.writeFileSync(ACH_FILE, JSON.stringify([], null, 2), "utf8");
  }

  if (!fs.existsSync(PROG_FILE)) {
    fs.writeFileSync(PROG_FILE, JSON.stringify({}, null, 2), "utf8");
  }
}

function loadAchievements() {
  ensureDirAndFiles();
  return JSON.parse(fs.readFileSync(ACH_FILE, "utf8"));
}

function loadAllProgress() {
  ensureDirAndFiles();
  return JSON.parse(fs.readFileSync(PROG_FILE, "utf8"));
}

function saveAllProgress(data) {
  ensureDirAndFiles();
  fs.writeFileSync(PROG_FILE, JSON.stringify(data, null, 2), "utf8");
}

function getUserProgress(userId) {
  const all = loadAllProgress();
  if (!all[userId]) {
    all[userId] = { done: [] };
  }
  return { all, user: all[userId] };
}

module.exports = {
  loadAchievements,
  getUserProgress,
  saveAllProgress
};