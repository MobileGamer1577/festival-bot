// src/services/fnfestivalTracksApi.js

const DATA_URL =
  "https://raw.githubusercontent.com/FNFestival/fnfestival.github.io/main/data/tracks.json";

let cache = { fetchedAt: 0, tracks: [] };
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

// Prevent multiple simultaneous fetches (dedupe)
let inFlight = null;

// Network safety
const FETCH_TIMEOUT_MS = 12_000;

// Optional: bump this when you change mapping logic
const SCHEMA_VERSION = 1;

function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function toArray(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.tracks)) return json.tracks;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.data)) return json.data;

  if (json && typeof json === "object") {
    return Object.values(json).filter((v) => v && typeof v === "object");
  }
  return [];
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function mapTrack(raw) {
  const title = pickFirst(raw.title, raw.trackTitle, raw.tt, raw.name);
  const artist = pickFirst(raw.artist, raw.artistName, raw.trackArtist, raw.an);
  if (!title || !artist) return null;

  const id =
    pickFirst(
      raw.shortname,
      raw.shortName,
      raw.slug,
      raw.id,
      raw.trackId,
      raw.devName
    ) || `${title}||${artist}`;

  const genres = pickFirst(raw.genre, raw.genres, raw.ge);
  const genreArr = Array.isArray(genres)
    ? genres
    : genres
    ? [String(genres)]
    : [];

  const artworkUrl = pickFirst(raw.artwork, raw.artworkUrl, raw.cover, raw.image, raw.au);
  const diffs = pickFirst(raw.difficulties, raw.intensities, raw.in) || null;

  return {
    id: String(id),
    title: String(title),
    artist: String(artist),

    releaseYear: pickFirst(raw.releaseYear, raw.year, raw.ry) ?? null,
    album: pickFirst(raw.album, raw.ab) ?? null,
    genres: genreArr,
    duration: pickFirst(raw.duration, raw.length, raw.dn) ?? null,
    bpm: pickFirst(raw.bpm, raw.mt) ?? null,
    key: pickFirst(raw.key, raw.mk) ?? null,
    mode: pickFirst(raw.mode, raw.mm) ?? null,
    artworkUrl: artworkUrl ? String(artworkUrl) : null,

    shortname: pickFirst(raw.shortname, raw.shortName, raw.sn) ?? null,
    jamLoopCode: pickFirst(raw.jamLoopCode, raw.jam_loop_code) ?? null,
    isrc: pickFirst(raw.isrc) ?? null,

    lastModified: pickFirst(raw.lastModified) ?? null,
    activeDate: pickFirst(raw.activeDate) ?? null,
    newUntil: pickFirst(raw.newUntil) ?? null,

    difficulties: diffs,
  };
}

// Custom error with a stable code for localization in commands
function makeServiceError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code; // e.g. "FETCH_FAILED", "TIMEOUT", "BAD_JSON"
  Object.assign(err, extra);
  return err;
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FestivalBot (Discord.js)" },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw makeServiceError(
        "FETCH_FAILED",
        `FNFestival data fetch failed: ${res.status} ${res.statusText}`,
        { status: res.status, statusText: res.statusText }
      );
    }

    // res.json() can throw
    return await res.json();
  } catch (e) {
    if (e?.name === "AbortError") {
      throw makeServiceError("TIMEOUT", `FNFestival data fetch timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    // If it's already our service error, rethrow
    if (e?.code) throw e;
    throw makeServiceError("NETWORK_ERROR", e?.message || "Network error while fetching tracks.json");
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFNFestivalTracks({ force = false } = {}) {
  const now = Date.now();

  // Cache hit
  if (!force && cache.tracks.length && now - cache.fetchedAt < CACHE_TTL_MS) {
    return {
      tracks: cache.tracks,
      cached: true,
      fetchedAt: cache.fetchedAt,
      source: DATA_URL,
      schemaVersion: SCHEMA_VERSION,
    };
  }

  // Dedupe concurrent fetches
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const json = await fetchJsonWithTimeout(DATA_URL);
    const rawTracks = toArray(json);

    const tracks = rawTracks.map(mapTrack).filter(Boolean);

    cache = { fetchedAt: now, tracks };
    return {
      tracks,
      cached: false,
      fetchedAt: now,
      source: DATA_URL,
      schemaVersion: SCHEMA_VERSION,
    };
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

function searchTracks(tracks, query) {
  const q = normalize(query);
  if (!q) return [];

  return tracks
    .map((t) => {
      const title = normalize(t.title);
      const artist = normalize(t.artist);

      let score = 0;
      if (title === q) score += 120;
      if (artist === q) score += 90;
      if (title.includes(q)) score += 60;
      if (artist.includes(q)) score += 40;

      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}

module.exports = { fetchFNFestivalTracks, searchTracks, DATA_URL };