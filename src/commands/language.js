// src/commands/language.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { setGuildLang, t } = require("../utils/i18n");
const logger = require("../utils/logger");

const LOCALES_DIR = path.join(__dirname, "..", "locales");

const SUPPORT_SERVER_URL = process.env.SUPPORT_SERVER_URL || "Support server link not set";
const CONTACT_HANDLE = process.env.CONTACT_HANDLE || "@mobilegamer2";

// Anzeigenamen (optional)
const LABELS = {
  en: { name: "English", nativeName: "English", emoji: "🇺🇸" },
  de: { name: "German", nativeName: "Deutsch", emoji: "🇩🇪" },
  ar: { name: "Arabic", nativeName: "العربية", emoji: "🇸🇦" },
  bn: { name: "Bengali", nativeName: "বাংলা", emoji: "🇧🇩" },
  fa: { name: "Persian", nativeName: "فارسی", emoji: "🇮🇷" },
  fr: { name: "French", nativeName: "Français", emoji: "🇫🇷" },
  hi: { name: "Hindi", nativeName: "हिन्दी", emoji: "🇮🇳" },
  id: { name: "Indonesian", nativeName: "Bahasa Indonesia", emoji: "🇮🇩" },
  it: { name: "Italian", nativeName: "Italiano", emoji: "🇮🇹" },
  ja: { name: "Japanese", nativeName: "日本語", emoji: "🇯🇵" },
  ko: { name: "Korean", nativeName: "한국어", emoji: "🇰🇷" },
  ms: { name: "Malay", nativeName: "Bahasa Melayu", emoji: "🇲🇾" },
  nl: { name: "Dutch", nativeName: "Nederlands", emoji: "🇳🇱" },
  pl: { name: "Polish", nativeName: "Polski", emoji: "🇵🇱" },
  pt: { name: "Portuguese", nativeName: "Português", emoji: "🇵🇹" },
  ru: { name: "Russian", nativeName: "Русский", emoji: "🇷🇺" },
  th: { name: "Thai", nativeName: "ไทย", emoji: "🇹🇭" },
  tr: { name: "Turkish", nativeName: "Türkçe", emoji: "🇹🇷" },
  uk: { name: "Ukrainian", nativeName: "Українська", emoji: "🇺🇦" },
  ur: { name: "Urdu", nativeName: "اردو", emoji: "🇵🇰" },
  vi: { name: "Vietnamese", nativeName: "Tiếng Việt", emoji: "🇻🇳" },
  "zh-CN": { name: "Chinese (Simplified)", nativeName: "简体中文", emoji: "🇨🇳" },
  "zh-TW": { name: "Chinese (Traditional)", nativeName: "繁體中文", emoji: "🇹🇼" },
};

function labelFor(l) {
  const emoji = l.emoji ? `${l.emoji} ` : "";
  const native = l.nativeName ? ` — ${l.nativeName}` : "";
  return `${emoji}${l.name}${native}`.slice(0, 100);
}

function safeT(lang, key, fallback) {
  try {
    const out = t(lang, key);
    if (!out || out === key) return fallback;
    return out;
  } catch {
    return fallback;
  }
}

function translateNotice(langCode) {
  const M = {
    de: "Hinweis: Diese Sprache ist noch nicht vollständig übersetzt. Aktuell sind die Bot-Texte größtenteils auf Englisch. Wenn du helfen willst, schreib mir per DM oder tritt dem Support-Server bei.",
    en: "Note: This language is not fully translated yet. Most bot messages are still in English. If you want to help translate, DM me or join the support server.",
    es: "Nota: Este idioma aún no está completamente traducido. La mayoría de los mensajes del bot siguen en inglés. Si quieres ayudar a traducir, envíame un DM o únete al servidor de soporte.",
    fr: "Remarque : cette langue n’est pas encore entièrement traduite. La plupart des messages du bot sont encore en anglais. Si tu veux aider à traduire, envoie-moi un DM ou rejoins le serveur de support.",
    it: "Nota: questa lingua non è ancora completamente tradotta. La maggior parte dei messaggi del bot è ancora in inglese. Se vuoi aiutare a tradurre, mandami un DM o unisciti al server di supporto.",
    nl: "Let op: deze taal is nog niet volledig vertaald. De meeste botberichten zijn nog in het Engels. Als je wilt helpen vertalen, stuur me een DM of join de supportserver.",
    pl: "Uwaga: ten język nie jest jeszcze w pełni przetłumaczony. Większość wiadomości bota jest nadal po angielsku. Jeśli chcesz pomóc w tłumaczeniu, napisz do mnie na DM lub dołącz do serwera wsparcia.",
    pt: "Nota: este idioma ainda não está totalmente traduzido. A maioria das mensagens do bot ainda está em inglês. Se quiser ajudar a traduzir, mande-me uma DM ou entre no servidor de suporte.",
    tr: "Not: Bu dil henüz tamamen çevrilmedi. Bot mesajlarının çoğu hâlâ İngilizce. Çeviriye yardım etmek istersen DM atabilir veya destek sunucusuna katılabilirsin.",
    ru: "Примечание: этот язык ещё не полностью переведён. Большинство сообщений бота пока на английском. Если хочешь помочь с переводом, напиши мне в ЛС или зайди на сервер поддержки.",
    uk: "Примітка: ця мова ще не повністю перекладена. Більшість повідомлень бота поки англійською. Якщо хочеш допомогти з перекладом, напиши мені в ЛС або приєднуйся до серверу підтримки.",
    ar: "ملاحظة: هذه اللغة لم تُترجم بالكامل بعد. معظم رسائل البوت ما زالت باللغة الإنجليزية. إذا كنت تريد المساعدة في الترجمة، راسلني على الخاص أو انضم إلى سيرفر الدعم.",
    hi: "नोट: यह भाषा अभी पूरी तरह अनुवादित नहीं है। बोट के ज़्यादातर संदेश अभी भी अंग्रेज़ी में हैं। अगर आप अनुवाद में मदद करना चाहते हैं, तो मुझे DM करें या सपोर्ट सर्वर जॉइन करें।",
    bn: "নোট: এই ভাষাটি এখনও পুরোপুরি অনুবাদ করা হয়নি। বটের বেশিরভাগ বার্তা এখনও ইংরেজিতে আছে। অনুবাদে সাহায্য করতে চাইলে আমাকে DM করুন বা সাপোর্ট সার্ভারে যোগ দিন।",
    ur: "نوٹ: یہ زبان ابھی مکمل طور پر ترجمہ نہیں ہوئی۔ بوٹ کے زیادہ تر پیغامات ابھی بھی انگریزی میں ہیں۔ اگر آپ ترجمہ میں مدد کرنا چاہتے ہیں تو مجھے DM کریں یا سپورٹ سرور جوائن کریں۔",
    fa: "توجه: این زبان هنوز کامل ترجمه نشده است. بیشتر پیام‌های بات فعلاً انگلیسی هستند. اگر می‌خواهی کمک کنی، به من DM بده یا وارد سرور پشتیبانی شو.",
    id: "Catatan: Bahasa ini belum sepenuhnya diterjemahkan. Sebagian besar pesan bot masih berbahasa Inggris. Jika ingin membantu menerjemahkan, DM saya atau bergabung ke server dukungan.",
    ms: "Nota: Bahasa ini belum diterjemahkan sepenuhnya. Kebanyakan mesej bot masih dalam Bahasa Inggeris. Jika anda mahu membantu menterjemah, DM saya atau sertai pelayan sokongan.",
    vi: "Lưu ý: Ngôn ngữ này chưa được dịch đầy đủ. Phần lớn tin nhắn của bot vẫn là tiếng Anh. Nếu bạn muốn giúp dịch, hãy DM cho tôi hoặc tham gia server hỗ trợ.",
    th: "หมายเหตุ: ภาษานี้ยังแปลไม่ครบถ้วน ข้อความส่วนใหญ่ของบอทยังเป็นภาษาอังกฤษ หากอยากช่วยแปล ให้ DM มาหรือเข้าร่วมเซิร์ฟเวอร์ซัพพอร์ต",
    ja: "注意: この言語はまだ完全には翻訳されていません。ボットのメッセージの多くはまだ英語です。翻訳を手伝いたい場合はDMするか、サポートサーバーに参加してください。",
    ko: "참고: 이 언어는 아직 완전히 번역되지 않았습니다. 봇 메시지 대부분은 아직 영어입니다. 번역을 도와주고 싶다면 DM을 보내거나 지원 서버에 참여해 주세요.",
    "zh-CN": "注意：该语言尚未完全翻译。机器人消息大多仍为英文。如果你想帮忙翻译，请私信我或加入支持服务器。",
    "zh-TW": "注意：此語言尚未完全翻譯。機器人訊息多數仍為英文。如果你想幫忙翻譯，請私訊我或加入支援伺服器。"
  };

  const text = M[langCode];
  if (!text) return { text: M.en, isFallback: true };
  return { text, isFallback: false };
}

// ===== Cache =====
let LANGS = [];
let LOADED = false;

function loadLocalesOnce() {
  if (LOADED) return LANGS;

  if (!fs.existsSync(LOCALES_DIR)) {
    throw new Error(`Locales folder not found: ${LOCALES_DIR}`);
  }

  const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json"));
  const codes = files.map((f) => f.replace(/\.json$/i, "")).filter(Boolean);

  LANGS = codes.map((code) => {
    const meta = LABELS[code] || {};
    return {
      code,
      name: meta.name || code,
      nativeName: meta.nativeName || "",
      emoji: meta.emoji || "🌐",
    };
  });

  const preferred = ["en", "de"];
  LANGS.sort((a, b) => {
    const ap = preferred.includes(a.code) ? -1 : 0;
    const bp = preferred.includes(b.code) ? -1 : 0;
    if (ap !== bp) return ap - bp;
    return a.name.localeCompare(b.name);
  });

  LOADED = true;
  logger.success(`[LANG] loaded ${LANGS.length} locale(s) from src/locales`);
  return LANGS;
}

function getLangMeta(code) {
  const langs = loadLocalesOnce();
  return langs.find((l) => l.code === code) || { code, name: code, nativeName: "", emoji: "🌐" };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("language")
    .setDescription("Manage the bot language for this server")
    .addSubcommand((s) =>
      s
        .setName("set")
        .setDescription("Set the bot language for this server")
        .addStringOption((opt) =>
          opt
            .setName("lang")
            .setDescription("Select a language")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("info")
        .setDescription("Show available languages and translation info")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async autocomplete(interaction) {
    let responded = false;
    try {
      const focused = interaction.options.getFocused(true);
      if (focused.name !== "lang") {
        await interaction.respond([]);
        return;
      }

      const raw = String(focused.value ?? "");
      const q = raw.trim().toLowerCase();

      const langs = loadLocalesOnce();

      // Wenn leer: Default-Liste
      if (!q) {
        await interaction.respond(
          langs.slice(0, 25).map((l) => ({ name: labelFor(l), value: l.code }))
        );
        responded = true;
        return;
      }

      // contains
      let filtered = langs.filter((l) => {
        const hay = `${l.code} ${l.name} ${l.nativeName}`.toLowerCase();
        return hay.includes(q);
      });

      // fallback startsWith
      if (filtered.length === 0) {
        filtered = langs.filter((l) => {
          const hay = `${l.code} ${l.name} ${l.nativeName}`.toLowerCase();
          return hay.startsWith(q);
        });
      }

      await interaction.respond(
        filtered.slice(0, 25).map((l) => ({ name: labelFor(l), value: l.code }))
      );
      responded = true;
    } catch (e) {
      if (!responded) {
        try { await interaction.respond([]); } catch {}
      }
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // /language info
    if (sub === "info") {
      const langs = loadLocalesOnce();

      const list = langs
        .map(
          (l) =>
            `${l.emoji || "🌐"} **${l.name || l.code}**${
              l.nativeName ? ` (${l.nativeName})` : ""
            } — \`${l.code}\``
        )
        .join("\n");

      const msg =
        `🌍 **Available languages (${langs.length})**\n` +
        `${list}\n\n` +
        `📝 **Translations**\n` +
        `Most languages are currently English placeholders. If you want to help translate:\n` +
        `• DM: ${CONTACT_HANDLE}\n` +
        `• Support: ${SUPPORT_SERVER_URL}`;

      return interaction.reply({ content: msg.slice(0, 1900), ephemeral: true });
    }

    // /language set
    const lang = interaction.options.getString("lang", true);
    const meta = getLangMeta(lang);

    if (!loadLocalesOnce().some((l) => l.code === lang)) {
      return interaction.reply({
        content: "❌ Unknown language code. Please choose a language from the suggestions.",
        ephemeral: true,
      });
    }

    setGuildLang(interaction.guildId, lang);

    const setMsg =
      lang === "de"
        ? safeT("de", "lang_set", "✅ Sprache gespeichert.")
        : safeT("en", "lang_set", "✅ Language saved.");

    const chosenLine = `🌐 **Selected language:** ${meta.emoji || "🌐"} **${meta.name}**${
      meta.nativeName ? ` (${meta.nativeName})` : ""
    } — \`${meta.code}\``;

    if (lang !== "de" && lang !== "en") {
      const englishNotice =
        "Note: This language is not fully translated yet. Most bot messages are still in English.\n" +
        `If you want to help translate, DM me (${CONTACT_HANDLE}) or join the support server: ${SUPPORT_SERVER_URL}`;

      const { text: translatedText, isFallback } = translateNotice(lang);

      const translatedNotice = !isFallback
        ? `${translatedText}\nDM: ${CONTACT_HANDLE}\nSupport: ${SUPPORT_SERVER_URL}`
        : null;

      const parts = [setMsg, chosenLine, "", englishNotice];
      if (translatedNotice) parts.push("", translatedNotice);

      return interaction.reply({ content: parts.join("\n"), ephemeral: true });
    }

    return interaction.reply({ content: `${setMsg}\n${chosenLine}`, ephemeral: true });
  },
};