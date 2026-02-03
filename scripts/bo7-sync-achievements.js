/* scripts/bo7-sync-achievements.js */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// Steam Achievements Seite (App 1938090)
const URL_EN = "https://steamcommunity.com/stats/1938090/achievements/?l=english";
const URL_DE = "https://steamcommunity.com/stats/1938090/achievements/?l=german";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "src", "data");
const LOCALES_DIR = path.join(ROOT, "src", "locales");

const OUT_ACH = path.join(DATA_DIR, "bo7.achievements.json");
const OUT_DE = path.join(LOCALES_DIR, "de.json");
const OUT_EN = path.join(LOCALES_DIR, "en.json");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOCALES_DIR)) fs.mkdirSync(LOCALES_DIR, { recursive: true });
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function slugifyId(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")      // accents
    .replace(/[^a-z0-9]+/g, "_")          // non-alnum -> _
    .replace(/^_+|_+$/g, "")              // trim _
    .replace(/_+/g, "_");                 // collapse
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (AchievementSyncBot)"
    }
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

/**
 * Steam Achievements Page parsing:
 * Typical structure:
 *  - .achieveRow
 *  - inside: .achieveTxt h3 (name) and .achieveTxt h5 (desc)
 * Hidden achievements show "Hidden Achievement" text in desc or blank.
 */
function parseAchievements(html) {
  const $ = cheerio.load(html);
  const rows = $(".achieveRow");

  const list = [];

  rows.each((_, el) => {
    const name = $(el).find(".achieveTxt h3").first().text().trim();
    const desc = $(el).find(".achieveTxt h5").first().text().trim();

    // Hidden achievements on Steam often show no real details
    const isHidden =
      /hidden achievement/i.test(desc) ||
      /versteckte errungenschaft/i.test(desc) ||
      name === "" ||
      desc === "";

    if (!name) return;

    list.push({ name, desc, isHidden });
  });

  return list;
}

function buildUniqueIds(itemsEn) {
  const used = new Map(); // baseId -> count
  return itemsEn.map(it => {
    const base = slugifyId(it.name);
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);
    const id = count === 1 ? base : `${base}_${count}`;
    return { ...it, id };
  });
}

function mergeLocale(localeObj, id, name, desc) {
  const keyName = `bo7.achievements.${id}.name`;
  const keyDesc = `bo7.achievements.${id}.desc`;

  if (!(keyName in localeObj)) localeObj[keyName] = name;
  if (!(keyDesc in localeObj)) localeObj[keyDesc] = desc || "";
}

(async () => {
  ensureDirs();

  console.log("Fetching Steam achievements (EN)...");
  const htmlEn = await fetchHtml(URL_EN);
  console.log("Fetching Steam achievements (DE)...");
  const htmlDe = await fetchHtml(URL_DE);

  const enListRaw = parseAchievements(htmlEn);
  const deListRaw = parseAchievements(htmlDe);

  if (enListRaw.length === 0) {
    throw new Error("Could not parse EN achievements (0 found). Steam layout might have changed.");
  }

  // Create stable IDs based on EN names
  const enWithIds = buildUniqueIds(enListRaw);

  // Map German by index (Steam page order is usually identical per language)
  // If sizes differ, we still try best-effort by index.
  const len = enWithIds.length;
  const achievementsOut = [];
  const enLocale = readJsonSafe(OUT_EN, {});
  const deLocale = readJsonSafe(OUT_DE, {});

  for (let i = 0; i < len; i++) {
    const enItem = enWithIds[i];
    const deItem = deListRaw[i] || { name: enItem.name, desc: "" };

    achievementsOut.push({
      id: enItem.id
      // category optional, you can add later if you want
      // hidden optional:
      // hidden: !!enItem.isHidden
    });

    mergeLocale(enLocale, enItem.id, enItem.name, enItem.desc);
    mergeLocale(deLocale, enItem.id, deItem.name || enItem.name, deItem.desc || "");
  }

  writeJson(OUT_ACH, achievementsOut);
  writeJson(OUT_EN, enLocale);
  writeJson(OUT_DE, deLocale);

  console.log(`✅ Done! Wrote ${achievementsOut.length} achievements.`);
  console.log(`- ${path.relative(ROOT, OUT_ACH)}`);
  console.log(`- ${path.relative(ROOT, OUT_EN)}`);
  console.log(`- ${path.relative(ROOT, OUT_DE)}`);
})().catch(err => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
