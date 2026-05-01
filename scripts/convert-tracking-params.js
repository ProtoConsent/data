#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// URL tracking parameter stripping — list generator
// Fetches AdGuard TrackParamFilter + Dandelion Sprout LegitimateURLShortener,
// extracts literal $removeparam names, and outputs:
//
//   enhanced/adguard_tracking_params.json  — Enhanced list: global params (AdGuard general)
//   enhanced/dandelion_tracking_params.json — Enhanced list: per-site params (specific + Dandelion)
//
// Also generates ready-to-use static rulesets for the extension (opt-in):
//   bundle/strip_tracking_params.json       — DNR ruleset: global
//   bundle/strip_tracking_params_sites.json — DNR ruleset: per-site
//
// Usage:
//   node convert-tracking-params.js                        # CDN enhanced lists only
//   node convert-tracking-params.js --enable-dnr           # also generate DNR static rulesets
//   node convert-tracking-params.js --enable-dnr --output ../path  # custom DNR output dir
//   node convert-tracking-params.js --dry-run              # show stats without writing

const fs = require("fs");
const path = require("path");
const https = require("https");

// --- Sources ---
// Kept separate for attribution and licensing.
const SOURCES = {
  adguard_general: {
    name: "AdGuard URL Tracking Protection (general)",
    url: "https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/TrackParamFilter/sections/general_url.txt",
    license: "GPL-3.0",
  },
  adguard_specific: {
    name: "AdGuard URL Tracking Protection (specific)",
    url: "https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/TrackParamFilter/sections/specific.txt",
    license: "GPL-3.0",
  },
  dandelion: {
    name: "Actually Legitimate URL Shortener Tool (Dandelion Sprout)",
    url: "https://raw.githubusercontent.com/DandelionSprout/adfilt/master/LegitimateURLShortener.txt",
    license: "Dandelicence v1.4",
  },
};

// --- CLI args ---
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const enableDnr = args.includes("--enable-dnr");
let outputDir = path.join(__dirname, "..", "bundle");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output" && args[i + 1]) outputDir = args[++i];
}

// --- Fetch helper ---
function fetch(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { "User-Agent": "ProtoConsent-data/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode + " for " + u));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

// --- Extraction ---
const REMOVEPARAM_RE = /[\$,](?:removeparam|queryprune)=([^\$,\s]+)/;
const DOMAIN_RE = /^\|\|([a-zA-Z0-9][\w.-]+\.[a-z]{2,})/;
const DOMAIN_ALT_RE = /^([a-zA-Z0-9][\w.-]+\.[a-z]{2,})[\$\^/]/;

function extractParams(text) {
  const global = new Set();
  const perSite = new Map(); // domain -> Set<param>

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("!") || line.startsWith("#")) continue;

    const mp = REMOVEPARAM_RE.exec(line);
    if (!mp) continue;
    const param = mp[1];
    if (param.startsWith("/")) continue; // skip regex

    let domain = null;
    const md = DOMAIN_RE.exec(line) || DOMAIN_ALT_RE.exec(line);
    if (md) {
      domain = md[1].toLowerCase();
    }

    if (domain) {
      if (!perSite.has(domain)) perSite.set(domain, new Set());
      perSite.get(domain).add(param);
    } else {
      global.add(param);
    }
  }

  return { global, perSite };
}

// --- Main ---
async function main() {
  console.log("Fetching sources...");

  const texts = {};
  for (const [key, src] of Object.entries(SOURCES)) {
    process.stdout.write("  " + src.name + "... ");
    texts[key] = await fetch(src.url);
    const lines = texts[key].split("\n").length;
    console.log(lines + " lines");
  }

  // --- Extract ---
  // Global params: AdGuard general only (conservative, production-safe)
  const generalResult = extractParams(texts.adguard_general);
  const globalParams = generalResult.global;

  // Site-specific: from all three sources
  const specificResult = extractParams(texts.adguard_specific);
  const dandelionResult = extractParams(texts.dandelion);

  const allSites = new Map();
  for (const src of [generalResult.perSite, specificResult.perSite, dandelionResult.perSite]) {
    for (const [domain, params] of src) {
      if (!allSites.has(domain)) allSites.set(domain, new Set());
      for (const p of params) allSites.get(domain).add(p);
    }
  }

  // Remove global params from per-site (already covered by global rule)
  for (const [domain, params] of allSites) {
    for (const p of globalParams) params.delete(p);
    if (params.size === 0) allSites.delete(domain);
  }

  const today = new Date().toISOString().slice(0, 10);
  const generated = new Date().toISOString();

  // --- Enhanced list JSON: global (AdGuard) ---
  const enhancedGlobal = {
    version: today,
    generated,
    type: "tracking_params",
    param_count: globalParams.size,
    params: [...globalParams].sort(),
  };

  // --- Enhanced list JSON: per-site (AdGuard specific + Dandelion) ---
  const siteEntries = {};
  for (const [domain, params] of allSites) {
    siteEntries[domain] = [...params].sort();
  }
  const enhancedSites = {
    version: today,
    generated,
    type: "tracking_params_sites",
    domain_count: Object.keys(siteEntries).length,
    param_count: new Set([...Object.values(siteEntries).flat()]).size,
    sites: siteEntries,
  };

  // --- DNR rulesets ---
  // Global: 1 rule, all global params, no domain restriction
  const globalRule = [{
    id: 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { transform: { queryTransform: { removeParams: [...globalParams].sort() } } },
    },
    condition: { resourceTypes: ["main_frame", "sub_frame"] },
  }];

  // Per-site: group domains by identical param set → 1 rule per unique set
  // Bundle: top 100 domains by param count, then grouped
  const sortedSites = [...allSites.entries()]
    .sort((a, b) => b[1].size - a[1].size);
  const bundleSites = sortedSites.slice(0, 100);

  // Group domains sharing the exact same param set into one rule
  function groupByParamSet(sites) {
    const groups = new Map(); // paramKey → { params: string[], domains: string[] }
    for (const [domain, params] of sites) {
      const sorted = [...params].sort();
      const key = sorted.join("\0");
      if (!groups.has(key)) groups.set(key, { params: sorted, domains: [] });
      groups.get(key).domains.push(domain);
    }
    return [...groups.values()];
  }

  const bundleGroups = groupByParamSet(bundleSites);
  const siteRules = bundleGroups.map((g, i) => ({
    id: i + 1,
    priority: 2,
    action: {
      type: "redirect",
      redirect: { transform: { queryTransform: { removeParams: g.params } } },
    },
    condition: {
      requestDomains: g.domains.sort(),
      resourceTypes: ["main_frame", "sub_frame"],
    },
  }));

  // --- Stats ---
  const allSiteParams = new Set([...Object.values(siteEntries).flat()]);
  console.log("\n--- Results ---");
  console.log("Global params: " + globalParams.size);
  console.log("Site-specific domains: " + allSites.size + " (bundle top 100 → " + bundleGroups.length + " rules)");
  console.log("Site-specific unique params: " + allSiteParams.size);
  console.log("Total bundle DNR rules: " + (1 + bundleGroups.length) + " (1 global + " + bundleGroups.length + " grouped per-site)");

  if (dryRun) {
    console.log("\n(dry-run, no files written)");
    return;
  }

  // --- Write enhanced JSONs ---
  const enhancedDir = path.join(__dirname, "..", "enhanced", "external");
  if (!fs.existsSync(enhancedDir)) fs.mkdirSync(enhancedDir, { recursive: true });

  const egPath = path.join(enhancedDir, "adguard_tracking_params.json");
  const esPath = path.join(enhancedDir, "dandelion_tracking_params.json");
  fs.writeFileSync(egPath, JSON.stringify(enhancedGlobal, null, 2) + "\n", "utf8");
  fs.writeFileSync(esPath, JSON.stringify(enhancedSites, null, 2) + "\n", "utf8");

  const egSize = fs.statSync(egPath).size;
  const esSize = fs.statSync(esPath).size;

  console.log("\nWritten (enhanced lists):");
  console.log("  " + egPath + " (" + (egSize / 1024).toFixed(1) + " KB)");
  console.log("  " + esPath + " (" + (esSize / 1024).toFixed(1) + " KB)");

  if (enableDnr) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const grPath = path.join(outputDir, "strip_tracking_params.json");
    const srPath = path.join(outputDir, "strip_tracking_params_sites.json");
    fs.writeFileSync(grPath, JSON.stringify(globalRule, null, 2) + "\n", "utf8");
    fs.writeFileSync(srPath, JSON.stringify(siteRules, null, 2) + "\n", "utf8");

    const grSize = fs.statSync(grPath).size;
    const srSize = fs.statSync(srPath).size;

    console.log("\nWritten (DNR rulesets):");
    console.log("  " + grPath + " (" + (grSize / 1024).toFixed(1) + " KB)");
    console.log("  " + srPath + " (" + (srSize / 1024).toFixed(1) + " KB)");
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
