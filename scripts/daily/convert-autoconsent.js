#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Autoconsent rule converter for ProtoConsent
// Fetches DuckDuckGo autoconsent JSON rules from GitHub and extracts:
//   - prehideSelectors -> hiding CSS
//   - detectCmp (exists) -> detection present selectors
//   - detectPopup (visible) -> detection showing selectors
//
// Also includes prehideSelectors from TypeScript CMP classes (hardcoded,
// since parsing TS requires a compiler). These are updated manually.
//
// Outputs:
//   - protoconsent_cmp_signatures.json (augments existing hand-maintained selectors)
//   - protoconsent_cmp_signatures_site.json (new CMPs with detection + hiding)
//   - protoconsent_cmp_detectors.json (all detectors for passive CMP detection)
//
// Applies cmp-safelist.json (config/cmp-safelist.json):
//   - Bans dangerous entries and selectors
//   - Extracts domain matching from entry names (domain_tld pattern)
//
// Skips conversion if upstream hasn't changed (compares tree hash).
//
// Usage:
//   node convert-autoconsent.js                    # fetch from GitHub (default)
//   node convert-autoconsent.js --local ./rules    # read from local directory
//   node convert-autoconsent.js --force            # skip tree hash check
//   node convert-autoconsent.js --dry-run          # show stats without writing

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");

const GITHUB_API = "https://api.github.com/repos/duckduckgo/autoconsent/contents/rules/autoconsent";
const GITHUB_RAW = "https://raw.githubusercontent.com/duckduckgo/autoconsent/main/rules/autoconsent/";

const SIGNATURES_FILE = "protoconsent_cmp_signatures.json";
const DETECTORS_FILE = "protoconsent_cmp_detectors.json";
const SITE_FILE = "protoconsent_cmp_signatures_site.json";
const SAFELIST_FILE = path.join(__dirname, "..", "..", "config", "cmp-safelist.json");

// --- Safelist loading ---
function loadSafelist() {
  try {
    const raw = JSON.parse(fs.readFileSync(SAFELIST_FILE, "utf-8"));
    const bannedSelectors = new Set(raw.banned_selectors || []);
    const bannedPatterns = (raw.banned_selector_patterns || []).map(p => new RegExp(p));
    const bannedEntries = new Set(raw.banned_entries || []);
    const domainTldPattern = raw.domain_tld_pattern ? new RegExp(raw.domain_tld_pattern) : null;
    const domainTldOverrides = raw.domain_tld_overrides || {};
    return { bannedSelectors, bannedPatterns, bannedEntries, domainTldPattern, domainTldOverrides };
  } catch (e) {
    console.warn("WARN: cannot load safelist: " + e.message + " - proceeding without filtering");
    return { bannedSelectors: new Set(), bannedPatterns: [], bannedEntries: new Set(), domainTldPattern: null, domainTldOverrides: {} };
  }
}

function isSelectorBanned(sel, safelist) {
  const trimmed = sel.trim();
  if (safelist.bannedSelectors.has(trimmed)) return true;
  for (const re of safelist.bannedPatterns) {
    if (re.test(trimmed)) return true;
  }
  return false;
}

function filterSelectors(selectors, safelist) {
  return selectors.filter(sel => !isSelectorBanned(sel, safelist));
}

function extractDomain(name, safelist) {
  if (safelist.domainTldOverrides[name]) return safelist.domainTldOverrides[name];
  if (!safelist.domainTldPattern) return null;
  const m = name.match(safelist.domainTldPattern);
  if (!m) return null;
  const base = m[1].replace(/_/g, ".");
  const tld = m[2].replace(/_/g, ".");
  return base + "." + tld;
}

// --- HTTP fetch ---
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "ProtoConsent-ListConverter/1.0",
        "Accept": "application/json",
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode + " for " + url));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// --- TypeScript CMP prehideSelectors (manually maintained) ---
// These CMPs are defined in lib/cmps/*.ts, not in JSON rule files.
// Updated from: https://github.com/duckduckgo/autoconsent/tree/main/lib/cmps
const TS_CMPS = {
  onetrust: {
    prehide: ["#onetrust-banner-sdk", "#onetrust-consent-sdk", ".onetrust-pc-dark-filter", ".js-consent-banner"],
    detect: ["#onetrust-banner-sdk", "#onetrust-pc-sdk"],
  },
  cookiebot: {
    prehide: ["#CybotCookiebotDialog", "#CybotCookiebotDialogBodyUnderlay", "#dtcookie-container", "#cookiebanner", "#cb-cookieoverlay", ".modal--cookie-banner", "#cookiebanner_outer", "#CookieBanner"],
    detect: [],
  },
  sourcepoint: {
    prehide: ["div[id^='sp_message_container_']", ".message-overlay", "#sp_privacy_manager_container"],
    detect: [],
  },
  trustarc: {
    prehide: [".trustarc-banner-container", ".truste_popframe", ".truste_overlay", ".truste_box_overlay", "#truste-consent-track"],
    detect: ["#truste-show-consent", "#truste-consent-track"],
  },
  klaro: {
    prehide: [".klaro"],
    detect: [".klaro > .cookie-modal", ".klaro > .cookie-notice"],
  },
  uniconsent: {
    prehide: [".unic", ".modal:has(.unic)"],
    detect: [".unic .unic-box", ".unic .unic-bar", ".unic .unic-modal"],
  },
  consentmanager: {
    prehide: ["#cmpbox", "#cmpbox2"],
    detect: ["#cmpbox"],
  },
  conversant: {
    prehide: [".cmp-root"],
    detect: [".cmp-root .cmp-receptacle"],
  },
  tumblr: {
    prehide: ["#cmp-app-container"],
    detect: ["#cmp-app-container"],
  },
  tiktok: {
    prehide: [],
    detect: ["tiktok-cookie-banner"],
  },
  admiral: {
    prehide: [],
    detect: [],
  },
  evidon: {
    prehide: [],
    detect: ["#_evidon_banner"],
  },
  usercentrics: {
    prehide: ["#usercentrics-root", "#usercentrics-cmp-ui", "#usercentrics-button", ".uc-embedding-wrapper", "#uc-center-container", "uc-layer1", "uc-layer2", "[data-testid='uc-default-wall']", "[data-testid='uc-banner-modal']"],
    detect: ["#usercentrics-root", "uc-layer1", "uc-layer2"],
  },
  google_com: {
    prehide: [],
    detect: ["a[href^=\"https://policies.google.com/technologies/cookies\"]"],
    showing: ["a[href^=\"https://policies.google.com/technologies/cookies\"]"],
  },
  facebook: {
    prehide: [],
    detect: ["div[role=\"dialog\"][aria-modal=\"true\"]"],
    showing: ["div[role=\"dialog\"][aria-modal=\"true\"]"],
  },
};

// --- Name normalization ---
function normalizeName(name) {
  const NAME_MAP = {
    "Onetrust": "onetrust",
    "onetrust": "onetrust",
    "Cybotcookiebot": "cookiebot",
    "cookiebot": "cookiebot",
    "Sourcepoint-frame": "sourcepoint",
    "sourcepoint-frame": "sourcepoint",
    "TrustArc-top": "trustarc",
    "trustarc-top": "trustarc",
    "TrustArc-frame": "trustarc",
    "trustarc-frame": "trustarc",
    "consentmanager.net": "consentmanager",
    "didomi.io": "didomi",
    "Klaro": "klaro",
    "klaro": "klaro",
    "tumblr-com": "tumblr",
    "tiktok.com": "tiktok",
    "Complianz banner": "complianz_banner",
    "Complianz categories": "complianz_categories",
    "Complianz notice": "complianz_notice",
    "Complianz optin": "complianz_optin",
    "Complianz opt-both": "complianz_opt_both",
    "Complianz opt-out": "complianz_opt_out",
  };
  if (NAME_MAP[name]) return NAME_MAP[name];
  return name.toLowerCase().replace(/[.\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

// --- Extract selectors from step arrays ---
function extractExistsSelectors(steps) {
  const selectors = [];
  if (!Array.isArray(steps)) return selectors;
  for (const step of steps) {
    if (step.exists) {
      if (typeof step.exists === "string") selectors.push(step.exists);
      else if (Array.isArray(step.exists)) {
        if (step.exists.length > 0 && typeof step.exists[0] === "string") {
          selectors.push(step.exists[0]);
        }
      }
    }
    if (step.visible) {
      if (typeof step.visible === "string") selectors.push(step.visible);
      else if (Array.isArray(step.visible)) {
        if (step.visible.length > 0 && typeof step.visible[0] === "string") {
          selectors.push(step.visible[0]);
        }
      }
    }
  }
  return selectors;
}

function extractVisibleSelectors(steps) {
  const selectors = [];
  if (!Array.isArray(steps)) return selectors;
  for (const step of steps) {
    if (step.visible) {
      if (typeof step.visible === "string") selectors.push(step.visible);
      else if (Array.isArray(step.visible)) {
        if (step.visible.length > 0 && typeof step.visible[0] === "string") {
          selectors.push(step.visible[0]);
        }
      }
    }
  }
  return selectors;
}

function dedup(arr) {
  return [...new Set(arr)];
}

// --- Load rules from local directory ---
function loadLocal(localDir) {
  const absDir = path.resolve(localDir);
  if (!fs.existsSync(absDir)) {
    console.error("ERROR: local directory not found: " + absDir);
    process.exit(1);
  }
  const files = fs.readdirSync(absDir).filter(f => f.endsWith(".json"));
  console.log("Reading " + files.length + " local files from " + absDir);
  const entries = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(absDir, file), "utf-8");
      entries.push({ file, data: JSON.parse(raw) });
    } catch (e) {
      console.warn("  WARN: parse error in " + file + ": " + e.message);
    }
  }
  return entries;
}

// --- Load rules from GitHub ---
async function loadRemote() {
  console.log("Fetching autoconsent file list from GitHub API...");
  const listing = JSON.parse(await fetchUrl(GITHUB_API));
  const jsonFiles = listing.filter(f => f.name.endsWith(".json"));
  console.log("Found " + jsonFiles.length + " rule files");

  const shas = jsonFiles.map(f => f.sha).sort().join("\n");
  const treeHash = crypto.createHash("sha256").update(shas).digest("hex").slice(0, 16);

  console.log("Fetching rule contents...");
  const entries = [];
  const BATCH = 10;
  for (let i = 0; i < jsonFiles.length; i += BATCH) {
    const batch = jsonFiles.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (f) => {
      try {
        const raw = await fetchUrl(GITHUB_RAW + f.name);
        return { file: f.name, data: JSON.parse(raw) };
      } catch (e) {
        console.warn("  WARN: failed " + f.name + ": " + e.message);
        return null;
      }
    }));
    for (const r of results) {
      if (r) entries.push(r);
    }
    if (i + BATCH < jsonFiles.length) {
      process.stdout.write("  " + Math.min(i + BATCH, jsonFiles.length) + "/" + jsonFiles.length + "\r");
    }
  }
  console.log("  " + entries.length + "/" + jsonFiles.length + " fetched OK");
  return { entries, treeHash };
}

// --- Check tree hash without full fetch ---
async function getRemoteTreeHash() {
  const listing = JSON.parse(await fetchUrl(GITHUB_API));
  const shas = listing.filter(f => f.name.endsWith(".json")).map(f => f.sha).sort().join("\n");
  return crypto.createHash("sha256").update(shas).digest("hex").slice(0, 16);
}

function getStoredTreeHash(outputDir) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(outputDir, DETECTORS_FILE), "utf-8"));
    return data.autoconsent_tree_hash || null;
  } catch (_) {
    return null;
  }
}

// --- Parse all autoconsent rules ---
function extractAll(entries) {
  const hideByName = {};
  const detectByName = {};

  for (const { file, data } of entries) {
    if (!data.name) continue;
    const name = normalizeName(data.name);

    if (Array.isArray(data.prehideSelectors) && data.prehideSelectors.length > 0) {
      if (!hideByName[name]) hideByName[name] = [];
      for (const sel of data.prehideSelectors) {
        if (typeof sel === "string") hideByName[name].push(sel);
      }
    }

    const present = extractExistsSelectors(data.detectCmp);
    const showing = extractVisibleSelectors(data.detectPopup);

    if (present.length > 0 || showing.length > 0) {
      if (!detectByName[name]) detectByName[name] = { present: [], showing: [] };
      detectByName[name].present.push(...present);
      detectByName[name].showing.push(...showing);
    }
  }

  for (const [name, ts] of Object.entries(TS_CMPS)) {
    if (ts.prehide.length > 0) {
      if (!hideByName[name]) hideByName[name] = [];
      hideByName[name].push(...ts.prehide);
    }
    if (ts.detect.length > 0) {
      if (!detectByName[name]) detectByName[name] = { present: [], showing: [] };
      detectByName[name].present.push(...ts.detect);
    }
    if (ts.showing && ts.showing.length > 0) {
      if (!detectByName[name]) detectByName[name] = { present: [], showing: [] };
      detectByName[name].showing.push(...ts.showing);
    }
  }

  for (const name of Object.keys(hideByName)) {
    hideByName[name] = dedup(hideByName[name]);
  }
  for (const name of Object.keys(detectByName)) {
    detectByName[name].present = dedup(detectByName[name].present);
    detectByName[name].showing = dedup(detectByName[name].showing);
  }

  return { hideByName, detectByName };
}

// --- Augment hand-maintained signatures with prehide selectors ---
function augmentSignatures(sigData, hideByName) {
  const sigs = sigData.signatures;
  const handMaintained = new Set();
  for (const [id, entry] of Object.entries(sigs)) {
    if (entry.cookie) handMaintained.add(id);
  }

  // Remove previous non-hand-maintained entries so we rebuild fresh
  for (const id of Object.keys(sigs)) {
    if (!handMaintained.has(id)) delete sigs[id];
  }

  let augmented = 0;
  for (const [acName, acSelectors] of Object.entries(hideByName)) {
    if (!handMaintained.has(acName)) continue;
    const entry = sigs[acName];
    const existing = entry.selector
      ? entry.selector.split(",").map(s => s.trim()).filter(Boolean)
      : [];
    const merged = dedup([...existing, ...acSelectors]);
    entry.selector = merged.join(", ");
    augmented++;
  }

  const now = new Date();
  sigData.version = now.toISOString().slice(0, 10);
  sigData.generated = now.toISOString();
  sigData.cmp_count = Object.keys(sigs).length;
  sigData.autoconsent_augmented = augmented;

  return { augmented, handMaintained };
}

// --- Build site-specific file ---
function buildSiteSpecific(hideByName, detectByName, handMaintained, treeHash, safelist) {
  const now = new Date();
  const out = {
    version: now.toISOString().slice(0, 10),
    type: "cmp_site",
    generated: now.toISOString(),
    source: "Autoconsent (duckduckgo/autoconsent) MPL-2.0",
    autoconsent_tree_hash: treeHash || null,
    cmp_count: 0,
    signatures: {},
  };

  let dropped = 0;
  let selectorsBanned = 0;

  for (const [name, selectors] of Object.entries(hideByName).sort(([a], [b]) => a.localeCompare(b))) {
    if (handMaintained.has(name)) continue;
    if (safelist.bannedEntries.has(name)) { dropped++; continue; }

    const filtered = filterSelectors(selectors, safelist);
    selectorsBanned += selectors.length - filtered.length;
    if (filtered.length === 0) { dropped++; continue; }

    const entry = { selector: filtered.join(", ") };

    const det = detectByName[name];
    if (det) {
      const dPresent = filterSelectors(det.present || [], safelist);
      const dShowing = filterSelectors(det.showing || [], safelist);
      selectorsBanned += ((det.present || []).length - dPresent.length) + ((det.showing || []).length - dShowing.length);
      if (dPresent.length > 0 || dShowing.length > 0) {
        entry.detectors = {};
        if (dPresent.length > 0) entry.detectors.present = dPresent;
        if (dShowing.length > 0) entry.detectors.showing = dShowing;
      }
    }

    const domain = extractDomain(name, safelist);
    if (domain) entry.domains = [domain];

    out.signatures[name] = entry;
  }

  out.cmp_count = Object.keys(out.signatures).length;
  if (dropped > 0 || selectorsBanned > 0) {
    console.log("  Site-specific: dropped " + dropped + " entries, banned " + selectorsBanned + " selectors");
  }
  return out;
}

// --- Build detectors file ---
function buildDetectors(detectByName, treeHash, safelist) {
  const now = new Date();
  const out = {
    version: now.toISOString().slice(0, 10),
    type: "cmp_detectors",
    generated: now.toISOString(),
    source: "Autoconsent (duckduckgo/autoconsent) MPL-2.0",
    autoconsent_tree_hash: treeHash || null,
    cmp_count: 0,
    detectors: {},
  };
  let dropped = 0;
  let selectorsBanned = 0;
  for (const [name, rule] of Object.entries(detectByName).sort(([a], [b]) => a.localeCompare(b))) {
    if (safelist.bannedEntries.has(name)) { dropped++; continue; }

    const present = filterSelectors(rule.present, safelist);
    const showing = filterSelectors(rule.showing, safelist);
    selectorsBanned += (rule.present.length - present.length) + (rule.showing.length - showing.length);

    if (present.length === 0 && showing.length === 0) { dropped++; continue; }

    const entry = { present, showing };
    const domain = extractDomain(name, safelist);
    if (domain) entry.domains = [domain];

    out.detectors[name] = entry;
  }
  out.cmp_count = Object.keys(out.detectors).length;
  if (dropped > 0 || selectorsBanned > 0) {
    console.log("  Detectors: dropped " + dropped + " entries, banned " + selectorsBanned + " selectors");
  }
  return out;
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const outputDir = args.includes("--output")
    ? args[args.indexOf("--output") + 1]
    : path.join(__dirname, "..", "..", "enhanced", "protoconsent");
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const localIdx = args.indexOf("--local");
  const localDir = localIdx !== -1 ? args[localIdx + 1] : null;

  console.log("ProtoConsent - convert autoconsent rules into CMP data");

  // Load safelist
  const safelist = loadSafelist();
  console.log("Safelist: " + safelist.bannedEntries.size + " banned entries, " + safelist.bannedSelectors.size + " banned selectors, " + safelist.bannedPatterns.length + " patterns");

  // Read existing signatures (hand-maintained CMPs)
  const sigPath = path.join(outputDir, SIGNATURES_FILE);
  let sigData;
  try {
    sigData = JSON.parse(fs.readFileSync(sigPath, "utf-8"));
  } catch (e) {
    console.error("ERROR: cannot read " + sigPath + ": " + e.message);
    process.exit(1);
  }
  const originalCount = Object.keys(sigData.signatures).length;
  console.log("Existing signatures: " + originalCount + " CMPs");

  // Load autoconsent rules
  let entries, treeHash;
  if (localDir) {
    entries = loadLocal(localDir);
    treeHash = null;
  } else {
    if (!force) {
      const remoteHash = await getRemoteTreeHash();
      const storedHash = getStoredTreeHash(outputDir);
      console.log("  Remote tree hash: " + remoteHash);
      console.log("  Stored tree hash: " + (storedHash || "(none)"));
      if (remoteHash === storedHash) {
        console.log("\nUpstream unchanged - skipping conversion.");
        return;
      }
    }
    const result = await loadRemote();
    entries = result.entries;
    treeHash = result.treeHash;
  }

  if (entries.length === 0) {
    console.error("ERROR: no rules loaded");
    process.exit(1);
  }

  // Extract all autoconsent data
  const { hideByName, detectByName } = extractAll(entries);

  // Augment hand-maintained signatures with prehide selectors
  const { augmented, handMaintained } = augmentSignatures(sigData, hideByName);

  // Build output files (safelist filtering + domain extraction)
  const siteSpecificOut = buildSiteSpecific(hideByName, detectByName, handMaintained, treeHash, safelist);
  const detectorsOut = buildDetectors(detectByName, treeHash, safelist);

  // Summary
  const totalHideSelectors = Object.values(hideByName).reduce((n, sels) => n + sels.length, 0);
  console.log("\n--- Summary ---");
  console.log("  Autoconsent source files: " + entries.length);
  console.log("  TypeScript CMPs (hardcoded): " + Object.keys(TS_CMPS).length);
  console.log("  CMPs with prehide selectors: " + Object.keys(hideByName).length + " (" + totalHideSelectors + " selectors)");
  console.log("  Augmented hand-maintained CMPs: " + augmented);
  console.log("  Site-specific CMPs: " + siteSpecificOut.cmp_count);
  console.log("  Detectors: " + detectorsOut.cmp_count + " CMPs");
  console.log("  Total in signatures: " + sigData.cmp_count + " (was " + originalCount + ")");

  const sigJson = JSON.stringify(sigData, null, 2);
  const siteJson = JSON.stringify(siteSpecificOut, null, 2);
  const detectorsJson = JSON.stringify(detectorsOut, null, 2);

  if (dryRun) {
    console.log("\n--- Dry run ---");
    console.log("Signatures (" + (Buffer.byteLength(sigJson) / 1024).toFixed(1) + " KB)");
    console.log("Site-specific (" + (Buffer.byteLength(siteJson) / 1024).toFixed(1) + " KB, " + siteSpecificOut.cmp_count + " CMPs)");
    console.log("Detectors (" + (Buffer.byteLength(detectorsJson) / 1024).toFixed(1) + " KB)");
  } else {
    fs.writeFileSync(sigPath, sigJson + "\n", "utf-8");
    console.log("\n  -> " + sigPath + " (" + (Buffer.byteLength(sigJson) / 1024).toFixed(1) + " KB)");

    const sitePath = path.join(outputDir, SITE_FILE);
    fs.writeFileSync(sitePath, siteJson + "\n", "utf-8");
    console.log("  -> " + sitePath + " (" + (Buffer.byteLength(siteJson) / 1024).toFixed(1) + " KB)");

    const detectorsPath = path.join(outputDir, DETECTORS_FILE);
    fs.writeFileSync(detectorsPath, detectorsJson + "\n", "utf-8");
    console.log("  -> " + detectorsPath + " (" + (Buffer.byteLength(detectorsJson) / 1024).toFixed(1) + " KB)");
  }
}

main().catch(e => {
  console.error("FATAL: " + e.message);
  process.exit(1);
});
