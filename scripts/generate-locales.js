// scripts/generate-locales.js
// Erstellt 55 neue Locale-Dateien aus en.json als Template.
// de.json und en.json werden NICHT verändert.

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(process.cwd(), "src", "locales");
const TEMPLATE_FILE = path.join(LOCALES_DIR, "en.json");

const overwrite = process.argv.includes("--overwrite");

// 55 Sprachen (ohne de/en)
const LOCALES = [
  "af", "am", "ar", "bg", "bn", "ca", "cs", "da", "el", "et",
  "fa", "fi", "fil", "fr", "gl", "he", "hi", "hr", "hu", "hy",
  "id", "is", "it", "ja", "ka", "kk", "km", "ko", "lt", "lv",
  "mk", "ms", "my", "ne", "nl", "no", "pl", "pt", "ro", "ru",
  "si", "sk", "sl", "sq", "sr", "sv", "sw", "ta", "te", "th",
  "tr", "uk", "ur", "vi", "zh-CN", "zh-TW",
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw);
}

function writeJson(file, obj) {
  const content = JSON.stringify(obj, null, 2) + "\n";
  fs.writeFileSync(file, content, "utf8");
}

function main() {
  ensureDir(LOCALES_DIR);

  if (!fs.existsSync(TEMPLATE_FILE)) {
    console.error(`❌ Template nicht gefunden: ${TEMPLATE_FILE}`);
    console.error(`Lege zuerst src/locales/en.json an.`);
    process.exit(1);
  }

  const template = readJson(TEMPLATE_FILE);

  let created = 0;
  let skipped = 0;
  let overwritten = 0;

  for (const code of LOCALES) {
    // Sicherheitscheck: niemals de/en anfassen
    if (code === "de" || code === "en") continue;

    const filePath = path.join(LOCALES_DIR, `${code}.json`);

    if (fs.existsSync(filePath) && !overwrite) {
      skipped++;
      continue;
    }

    if (fs.existsSync(filePath) && overwrite) overwritten++;
    else created++;

    // Inhalt: Kopie von en.json (Keys + Werte)
    writeJson(filePath, template);
  }

  console.log("✅ Fertig!");
  console.log(`📁 Ordner: ${LOCALES_DIR}`);
  console.log(`🆕 Erstellt: ${created}`);
  console.log(`♻️ Überschrieben: ${overwritten}`);
  console.log(`⏭️ Übersprungen: ${skipped}`);
  console.log(`\nTipp: Mit "--overwrite" kannst du bestehende Dateien überschreiben.`);
}

main();