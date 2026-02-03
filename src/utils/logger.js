// src/utils/logger.js
const { WebhookClient, EmbedBuilder } = require("discord.js");

/**
 * ENV:
 *  LOG_WEBHOOK_INFO_URL
 *  LOG_WEBHOOK_SUCCESS_URL
 *  LOG_WEBHOOK_WARN_URL
 *  LOG_WEBHOOK_ERROR_URL
 *  LOG_WEBHOOK_DEBUG_URL
 *  LOG_WEBHOOK_DEFAULT_URL (fallback)
 *
 * Optional legacy fallback:
 *  LOG_WEBHOOK_URL (falls du es noch nutzt)
 */

function time() {
  return new Date().toLocaleTimeString();
}

function safeStr(msg) {
  if (msg instanceof Error) return msg.stack || msg.message;
  if (typeof msg === "object") {
    try {
      return JSON.stringify(msg, null, 2);
    } catch {
      return String(msg);
    }
  }
  return String(msg);
}

// Discord Embed description limit ist 4096 – wir bleiben drunter.
function clip(s, max = 4000) {
  s = String(s);
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

const COLORS = {
  INFO: 0x3498db,
  SUCCESS: 0x2ecc71,
  WARN: 0xf1c40f,
  ERROR: 0xe74c3c,
  DEBUG: 0x9b59b6,
};

const TITLES = {
  INFO: "ℹ️ INFO",
  SUCCESS: "✅ SUCCESS",
  WARN: "⚠️ WARN",
  ERROR: "❌ ERROR",
  DEBUG: "🛠️ DEBUG",
};

const URLS = {
  INFO: process.env.LOG_WEBHOOK_INFO_URL,
  SUCCESS: process.env.LOG_WEBHOOK_SUCCESS_URL,
  WARN: process.env.LOG_WEBHOOK_WARN_URL,
  ERROR: process.env.LOG_WEBHOOK_ERROR_URL,
  DEBUG: process.env.LOG_WEBHOOK_DEBUG_URL,
};

const DEFAULT_URL =
  process.env.LOG_WEBHOOK_DEFAULT_URL || process.env.LOG_WEBHOOK_URL || null;

// Cache für WebhookClients (damit nicht bei jedem Log neu erstellt wird)
const clients = new Map();

function getClient(url) {
  if (!url) return null;
  if (clients.has(url)) return clients.get(url);

  try {
    const c = new WebhookClient({ url });
    clients.set(url, c);
    return c;
  } catch (e) {
    console.error("[LOGGER] Invalid webhook URL:", e?.message || e);
    return null;
  }
}

async function sendWebhook(level, message) {
  const url = URLS[level] || DEFAULT_URL;
  if (!url) return;

  const webhook = getClient(url);
  if (!webhook) return;

  const embed = new EmbedBuilder()
    .setTitle(TITLES[level] || `🧾 ${level}`)
    .setDescription(clip(message))
    .setColor(COLORS[level] ?? 0x95a5a6)
    .setTimestamp();

  try {
    await webhook.send({ embeds: [embed] });
  } catch (err) {
    console.error(`[LOGGER] Webhook error (${level}):`, err.message);
  }
}

function logConsole(level, msg) {
  const line = `[${time()}] [${level}] ${msg}`;

  if (level === "WARN") console.warn(line);
  else if (level === "ERROR") console.error(line);
  else console.log(line);
}

function make(level) {
  return (msg) => {
    const text = safeStr(msg);
    logConsole(level, text);
    // fire & forget
    sendWebhook(level, text);
  };
}

module.exports = {
  info: make("INFO"),
  success: make("SUCCESS"),
  warn: make("WARN"),
  error: make("ERROR"),
  debug: make("DEBUG"),
};