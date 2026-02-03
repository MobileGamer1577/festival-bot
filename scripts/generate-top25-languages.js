// scripts/generate-top25-languages.js
// Erstellt src/data/languages.json mit 25 (inkl. en+de) beliebten Sprachen.
// Optional: löscht alle anderen Locale-Dateien in src/locales/ (außer en/de + die 25)
// Flags:
//   --prune-locales   löscht nicht benötigte locale json Dateien
//   --dry             zeigt nur was passieren würde (kein Schreiben/Löschen)

const fs = require("fs");
const path = require("path");

const DRY = process.argv.includes("--dry");
const PRUNE = process.argv.includes("--prune-locales");

const DATA_DIR = path.join(process.cwd(), "src", "data");
const OUT_FILE = path.join(DATA_DIR, "languages.json");
const LOCALES_DIR = path.join(process.cwd(), "src", "locales");

// 25 Sprachen total (inkl. en + de)
const TOP25 = [
  { code: "en", name: "English", nativeName: "English", emoji: "🇺🇸" },
  { code: "de", name: "German", nativeName: "Deutsch", emoji: "🇩🇪" },
  { code: "es", name: "Spanish", nativeName: "Español", emoji: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", emoji: "🇫🇷" },
  { code: "it", name: "Italian", nativeName: "Italiano", emoji: "🇮🇹" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", emoji: "🇳🇱" },
  { code: "pl", name: "Polish", nativeName: "Polski", emoji: "🇵🇱" },
  { code: "pt", name: "Portuguese", nativeName: "Português", emoji: "🇵🇹" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", emoji: "🇧🇷" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", emoji: "🇹🇷" },
  { code: "ru", name: "Russian", nativeName: "Русский", emoji: "🇷🇺" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", emoji: "🇺🇦" },
  { code: "ar", name: "Arabic", nativeName: "العربية", emoji: "🇸🇦" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", emoji: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", emoji: "🇧🇩" },
  { code: "ur", name: "Urdu", nativeName: "اردو", emoji: "🇵🇰" },
  { code: "fa", name: "Persian", nativeName: "فارسی", emoji: "🇮🇷" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", emoji: "🇮🇩" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", emoji: "🇲🇾" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", emoji: "🇻🇳" },
  { code: "th", name: "Thai", nativeName: "ไทย", emoji: "🇹🇭" },
  { code: "ja", name: "Japanese", nativeName: "日本語", emoji: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", emoji: "🇰🇷" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", emoji: "🇨🇳" },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", emoji: "🇹🇼" }
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    if (DRY) return;
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeJson(file, obj) {
  const content = JSON.stringify(obj, null, 2) + "\n";
  if (DRY) return;
  fs.writeFileSync(file, content, "utf8");
}

function main() {
  ensureDir(DATA_DIR);

  const payload = {
    _how_to_add: [
      "To add a language later, add an entry to languages[] and create src/locales/<code>.json.",
      "Discord choices are limited to 25, so this file is intentionally capped."
    ],
    languages: TOP25
  };

  console.log(`${DRY ? "🧪 (dry) " : ""}📝 Writing: ${OUT_FILE}`);
  writeJson(OUT_FILE, payload);

  // Optional: prune locales
  if (PRUNE) {
    if (!fs.existsSync(LOCALES_DIR)) {
      console.log("ℹ️ No locales directory found, skipping prune.");
      return;
    }

    const keep = new Set(TOP25.map((l) => `${l.code}.json`));
    // extra safety
    keep.add("en.json");
    keep.add("de.json");

    const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json"));

    const toDelete = files.filter((f) => !keep.has(f));
    console.log(`${DRY ? "🧪 (dry) " : ""}🧹 Locales prune: keeping ${keep.size} files, deleting ${toDelete.length}`);

    for (const f of toDelete) {
      const full = path.join(LOCALES_DIR, f);
      console.log(`${DRY ? "🧪 (dry) " : ""}🗑️  delete: ${full}`);
      if (!DRY) fs.unlinkSync(full);
    }
  }

  console.log("✅ Done.");
  console.log("Next: run your deploy again if /language choices changed:");
  console.log("   node src/deploy-commands.js");
}

main();