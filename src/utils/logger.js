const { WebhookClient, EmbedBuilder } = require("discord.js");

const webhookUrl = process.env.LOG_WEBHOOK_URL;
const webhook = webhookUrl ? new WebhookClient({ url: webhookUrl }) : null;

function time() {
  return new Date().toLocaleTimeString();
}

async function sendWebhook(level, message, color) {
  if (!webhook) return;

  const embed = new EmbedBuilder()
    .setTitle(`🧾 ${level}`)
    .setDescription(String(message).slice(0, 4000))
    .setColor(color)
    .setTimestamp();

  try {
    await webhook.send({ embeds: [embed] });
  } catch (err) {
    console.error("[LOGGER] Webhook error:", err.message);
  }
}

module.exports = {
  info(msg) {
    console.log(`[${time()}] [INFO] ${msg}`);
    sendWebhook("INFO", msg, 0x3498db);
  },

  success(msg) {
    console.log(`[${time()}] [SUCCESS] ${msg}`);
    sendWebhook("SUCCESS", msg, 0x2ecc71);
  },

  warn(msg) {
    console.warn(`[${time()}] [WARN] ${msg}`);
    sendWebhook("WARN", msg, 0xf1c40f);
  },

  error(msg) {
    console.error(`[${time()}] [ERROR] ${msg}`);
    sendWebhook("ERROR", msg, 0xe74c3c);
  },

  debug(msg) {
    console.log(`[${time()}] [DEBUG] ${msg}`);
    sendWebhook("DEBUG", msg, 0x9b59b6);
  }
};