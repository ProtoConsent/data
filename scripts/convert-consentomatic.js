#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Consent-O-Matic rule converter for ProtoConsent
// Fetches C-O-M rule files from GitHub and merges HIDE_CMP selectors
// INTO the existing enhanced/protoconsent_cmp_signatures.json.
//
// - Overlapping CMPs: C-O-M selectors are appended to existing `selector`
// - New CMPs: added with `selector` only (no cookie/purposeMap)
// - Hand-maintained fields (cookie, purposeMap, format, lockClass, etc.)
//   are NEVER modified — the script is additive only.
//
// Also generates enhanced/protoconsent_cmp_detectors.json (standalone,
// not in manifest) for future CMP detection features.
//
// Skips conversion if upstream hasn't changed (compares tree hash).
//
// Usage:
//   node convert-consentomatic.js                    # fetch from GitHub (default)
//   node convert-consentomatic.js --local ./rules    # read from local directory
//   node convert-consentomatic.js --force            # skip tree hash check
//   node convert-consentomatic.js --dry-run          # show stats without writing

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");

const GITHUB_API = "https://api.github.com/repos/cavi-au/Consent-O-Matic/contents/rules";
const GITHUB_RAW = "https://raw.githubusercontent.com/cavi-au/Consent-O-Matic/master/rules/";

const SIGNATURES_FILE = "protoconsent_cmp_signatures.json";
const DETECTORS_FILE = "protoconsent_cmp_detectors.json";
const SITE_FILE = "protoconsent_cmp_signatures_site.json";

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

// --- Name normalization ---
// Maps C-O-M CMP names to base ProtoConsent CMP IDs where they overlap.
// Variants (e.g. onetrust_banner) are merged under the base name.
const NAME_MAP = {
  "didomi.io": "didomi",
  "consentmanager.net": "consentmanager",
  "BorlabsCookieBox": "borlabs",
  "cookiecontrolcivic": "civic",
  "cookieinformation": "cookie_information",
  "trustarcbar": "trustarc",
  "trustarcframe": "trustarc",
  "trustarc_popup_hider": "trustarc",
  "sourcepointframe": "sourcepoint",
  "sourcepoint_frame_2022": "sourcepoint",
  "sourcepointpopup": "sourcepoint",
  "onetrust_banner": "onetrust",
  "onetrust_hidden": "onetrust",
  "onetrust_pcpanel": "onetrust",
  "onetrust_pctab": "onetrust",
  "onetrust-stackoverflow": "onetrust",
  "quantcast2": "quantcast",
  "quantcast2b": "quantcast",
};

function normalizeName(name) {
  if (NAME_MAP[name]) return NAME_MAP[name];
  return name.toLowerCase().replace(/[.\s]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

// --- CMP SDK names (apply globally, no domains restriction) ---
// These are consent management SDKs used across many websites.
// Everything else is treated as site-specific and gets a domains field
// derived from its normalized name, so selectors only apply on that site.
const CMP_SDKS = new Set([
  "admiral", "almacmpv2", "cassie", "chefcookie", "clickio",
  "contentpass", "cookie_information", "cookiebar", "cookiescript",
  "cookiesjsr", "cookiewow", "designilpdpa", "drupaleucc",
  "evidonbanner", "ezcookie", "fastcmp", "gdprmodal", "gravito",
  "iubuenda", "june", "klaro", "mediavine", "oil",
  "optanon", "optanon_springernature", "piwikproconsent", "pubtech",
  "setono_sylius", "snigel", "tarteaucitron", "truendo",
]);

// --- Extract HIDE_CMP selectors from a CMP's methods ---
function extractHideSelectors(cmp) {
  const selectors = [];
  if (!cmp.methods) return selectors;
  for (const method of cmp.methods) {
    if (method.name !== "HIDE_CMP") continue;
    collectHideFromAction(method.action, selectors);
  }
  return selectors;
}

function collectHideFromAction(action, out) {
  if (!action) return;
  if (action.type === "hide" && action.target?.selector) {
    out.push(action.target.selector);
  } else if (action.type === "list" && Array.isArray(action.actions)) {
    for (const a of action.actions) {
      collectHideFromAction(a, out);
    }
  }
}

// --- Extract detector CSS selectors ---
function extractDetectorSelectors(cmp) {
  const present = [];
  const showing = [];
  if (!cmp.detectors) return { present, showing };
  for (const detector of cmp.detectors) {
    for (const matcher of (Array.isArray(detector.presentMatcher) ? detector.presentMatcher : [])) {
      if (matcher.type === "css" && matcher.target?.selector) {
        present.push(matcher.target.selector);
      }
    }
    for (const matcher of (Array.isArray(detector.showingMatcher) ? detector.showingMatcher : [])) {
      if (matcher.type === "css" && matcher.target?.selector) {
        showing.push(matcher.target.selector);
      }
    }
  }
  return { present, showing };
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
// Returns { entries, treeHash } where treeHash is a digest of all file SHAs.
async function loadRemote() {
  console.log("Fetching file list from GitHub API...");
  const listing = JSON.parse(await fetchUrl(GITHUB_API));
  const jsonFiles = listing.filter(f => f.name.endsWith(".json"));
  console.log("Found " + jsonFiles.length + " rule files");

  // Compute tree hash from individual file SHAs (sorted for stability)
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

// --- Check if upstream changed (lightweight: listing API only) ---
async function getRemoteTreeHash() {
  const listing = JSON.parse(await fetchUrl(GITHUB_API));
  const shas = listing.filter(f => f.name.endsWith(".json")).map(f => f.sha).sort().join("\n");
  return crypto.createHash("sha256").update(shas).digest("hex").slice(0, 16);
}

// --- Read stored tree hash from existing signatures file ---
function getStoredTreeHash(outputDir) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(outputDir, SIGNATURES_FILE), "utf-8"));
    return data.source_tree_hash || null;
  } catch (_) {
    return null;
  }
}

// --- Parse all C-O-M hide selectors and detector selectors ---
function extractAll(entries) {
  const hideByName = {};   // name -> string[]
  const detectorByName = {}; // name -> { present: string[], showing: string[] }

  for (const { file, data } of entries) {
    for (const [rawName, cmp] of Object.entries(data)) {
      if (rawName.startsWith("$")) continue;
      const name = normalizeName(rawName);

      const hideSelectors = extractHideSelectors(cmp);
      if (hideSelectors.length > 0) {
        if (!hideByName[name]) hideByName[name] = [];
        hideByName[name].push(...hideSelectors);
      }

      const { present, showing } = extractDetectorSelectors(cmp);
      if (present.length > 0 || showing.length > 0) {
        if (!detectorByName[name]) detectorByName[name] = { present: [], showing: [] };
        detectorByName[name].present.push(...present);
        detectorByName[name].showing.push(...showing);
      }
    }
  }

  // Deduplicate
  for (const name of Object.keys(hideByName)) {
    hideByName[name] = dedup(hideByName[name]);
  }
  for (const name of Object.keys(detectorByName)) {
    detectorByName[name].present = dedup(detectorByName[name].present);
    detectorByName[name].showing = dedup(detectorByName[name].showing);
  }

  return { hideByName, detectorByName };
}

// --- Merge C-O-M selectors into existing signatures ---
// Only CMP SDKs (global consent tools) and overlapping CMPs are merged.
// Site-specific CMPs are extracted to a separate file — their selectors
// may be generic and need detection before applying (future feature 2.A).
function mergeIntoSignatures(sigData, hideByName, treeHash) {
  const sigs = sigData.signatures;
  // Identify our hand-maintained entries (have cookie field)
  const handMaintained = new Set();
  for (const [id, entry] of Object.entries(sigs)) {
    if (entry.cookie) handMaintained.add(id);
  }

  // Remove previous C-O-M-only entries (no cookie) so we rebuild fresh
  for (const id of Object.keys(sigs)) {
    if (!handMaintained.has(id)) delete sigs[id];
  }

  let augmented = 0;
  let sdkAdded = 0;
  const siteSpecific = {}; // name -> selectors[]

  for (const [comName, comSelectors] of Object.entries(hideByName)) {
    if (handMaintained.has(comName)) {
      // Overlapping CMP: merge selectors into existing hand-maintained entry
      const entry = sigs[comName];
      const existing = entry.selector
        ? entry.selector.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      const merged = dedup([...existing, ...comSelectors]);
      entry.selector = merged.join(", ");
      augmented++;
    } else if (CMP_SDKS.has(comName)) {
      // New CMP SDK: safe to apply globally
      sigs[comName] = {
        selector: comSelectors.join(", "),
      };
      sdkAdded++;
    } else {
      // Site-specific: separate file, needs detection before applying
      siteSpecific[comName] = comSelectors;
    }
  }

  // Update metadata
  const now = new Date();
  sigData.version = now.toISOString().slice(0, 10);
  sigData.generated = now.toISOString();
  sigData.cmp_count = Object.keys(sigs).length;
  sigData.source_tree_hash = treeHash || null;
  sigData.com_augmented = augmented;
  sigData.com_sdk_added = sdkAdded;

  return { augmented, sdkAdded, siteSpecific };
}

// --- Build standalone site-specific file ---
function buildSiteSpecific(siteSpecific, detectorByName, treeHash) {
  const now = new Date();
  const out = {
    version: now.toISOString().slice(0, 10),
    type: "cmp_site",
    generated: now.toISOString(),
    source: "Consent-O-Matic (cavi-au/Consent-O-Matic)",
    source_license: "MIT",
    source_tree_hash: treeHash || null,
    cmp_count: Object.keys(siteSpecific).length,
    signatures: {},
  };
  for (const [name, selectors] of Object.entries(siteSpecific).sort(([a], [b]) => a.localeCompare(b))) {
    const entry = { selector: selectors.join(", ") };
    // Attach detectors if available (for future 2.A)
    const det = detectorByName[name];
    if (det && (det.present.length > 0 || det.showing.length > 0)) {
      entry.detectors = {};
      if (det.present.length > 0) entry.detectors.present = det.present;
      if (det.showing.length > 0) entry.detectors.showing = det.showing;
    }
    out.signatures[name] = entry;
  }
  return out;
}

// --- Build standalone detectors file ---
function buildDetectors(detectorByName, treeHash) {
  const now = new Date();
  const out = {
    version: now.toISOString().slice(0, 10),
    type: "cmp_detectors",
    generated: now.toISOString(),
    source: "Consent-O-Matic (cavi-au/Consent-O-Matic)",
    source_license: "MIT",
    source_tree_hash: treeHash || null,
    cmp_count: Object.keys(detectorByName).length,
    detectors: {},
  };
  for (const [name, rule] of Object.entries(detectorByName).sort(([a], [b]) => a.localeCompare(b))) {
    out.detectors[name] = {
      present: rule.present,
      showing: rule.showing,
    };
  }
  return out;
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const outputDir = args.includes("--output")
    ? args[args.indexOf("--output") + 1]
    : path.join(__dirname, "..", "enhanced");
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const localIdx = args.indexOf("--local");
  const localDir = localIdx !== -1 ? args[localIdx + 1] : null;

  console.log("ProtoConsent - merge Consent-O-Matic selectors into CMP signatures");

  // Read existing signatures
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

  // Load C-O-M rules
  let entries, treeHash;

  if (localDir) {
    entries = loadLocal(localDir);
    treeHash = null;
  } else {
    // Check tree hash before fetching all files
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

  // Extract all C-O-M data
  const { hideByName, detectorByName } = extractAll(entries);

  // Merge SDK selectors into signatures, separate site-specific
  const { augmented, sdkAdded, siteSpecific } = mergeIntoSignatures(sigData, hideByName, treeHash);

  // Build standalone files
  const detectorsOut = buildDetectors(detectorByName, treeHash);
  const siteSpecificOut = buildSiteSpecific(siteSpecific, detectorByName, treeHash);

  // Summary
  const totalHideSelectors = Object.values(hideByName).reduce((n, sels) => n + sels.length, 0);
  const totalDetectors = Object.values(detectorByName).reduce((n, r) => n + r.present.length + r.showing.length, 0);

  console.log("\n--- Summary ---");
  console.log("  C-O-M source files: " + entries.length);
  console.log("  C-O-M CMPs with hide selectors: " + Object.keys(hideByName).length + " (" + totalHideSelectors + " selectors)");
  console.log("  Augmented existing CMPs: " + augmented);
  console.log("  New SDK CMPs added to signatures: " + sdkAdded);
  console.log("  Site-specific CMPs (separate file): " + Object.keys(siteSpecific).length);
  console.log("  Total CMPs in signatures: " + sigData.cmp_count + " (was " + originalCount + ")");
  console.log("  Detectors: " + detectorsOut.cmp_count + " CMPs, " + totalDetectors + " selectors");

  const sigJson = JSON.stringify(sigData, null, 2);
  const detectorsJson = JSON.stringify(detectorsOut, null, 2);
  const siteSpecificJson = JSON.stringify(siteSpecificOut, null, 2);

  if (dryRun) {
    console.log("\n--- Dry run ---");
    console.log("Signatures (" + (Buffer.byteLength(sigJson) / 1024).toFixed(1) + " KB)");
    console.log("Site-specific (" + (Buffer.byteLength(siteSpecificJson) / 1024).toFixed(1) + " KB, " + siteSpecificOut.cmp_count + " CMPs)");
    console.log("Detectors (" + (Buffer.byteLength(detectorsJson) / 1024).toFixed(1) + " KB)");
  } else {
    fs.writeFileSync(sigPath, sigJson + "\n", "utf-8");
    console.log("\n  -> " + sigPath + " (" + (Buffer.byteLength(sigJson) / 1024).toFixed(1) + " KB)");

    const sitePath = path.join(outputDir, SITE_FILE);
    fs.writeFileSync(sitePath, siteSpecificJson + "\n", "utf-8");
    console.log("  -> " + sitePath + " (" + (Buffer.byteLength(siteSpecificJson) / 1024).toFixed(1) + " KB)");

    const detectorsPath = path.join(outputDir, DETECTORS_FILE);
    fs.writeFileSync(detectorsPath, detectorsJson + "\n", "utf-8");
    console.log("  -> " + detectorsPath + " (" + (Buffer.byteLength(detectorsJson) / 1024).toFixed(1) + " KB)");
  }
}

main().catch(e => {
  console.error("FATAL: " + e.message);
  process.exit(1);
});
