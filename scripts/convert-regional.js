#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Regional filter list converter for ProtoConsent
// Fetches EasyList and AdGuard regional lists, extracts both blocking
// (||domain^) and cosmetic (##) rules, and outputs two JSON files per
// region: *_cosmetic.json and *_blocking.json.
//
// Usage:
//   node convert-regional.js                    # all regions
//   node convert-regional.js --region es        # single region
//   node convert-regional.js --output ../path   # custom output dir
//   node convert-regional.js --dry-run          # show stats only

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// --- Region definitions ---
// Each region has a label and one or more ABP-format source URLs.
// Sources are merged per region: domains deduplicated, selectors merged.
const REGIONS = {
  cn: {
    label: "Chinese",
    sources: [
      "https://easylist-downloads.adblockplus.org/easylistchina.txt",
      "https://filters.adtidy.org/extension/chromium/filters/224.txt",
    ],
  },
  de: {
    label: "German",
    sources: [
      "https://easylist-downloads.adblockplus.org/easylistgermany.txt",
      "https://filters.adtidy.org/extension/chromium/filters/6.txt",
    ],
  },
  nl: {
    label: "Dutch",
    sources: [
      "https://easylist-downloads.adblockplus.org/easylistdutch.txt",
      "https://filters.adtidy.org/extension/chromium/filters/8.txt",
    ],
  },
  es: {
    label: "Spanish/Portuguese",
    sources: [
      "https://easylist-downloads.adblockplus.org/easylistspanish.txt",
      "https://easylist-downloads.adblockplus.org/easylistportuguese.txt",
      "https://filters.adtidy.org/extension/chromium/filters/9.txt",
    ],
  },
  fr: {
    label: "French",
    sources: [
      "https://filters.adtidy.org/extension/chromium/filters/16.txt",
    ],
  },
  he: {
    label: "Hebrew",
    sources: [
      "https://easylist-downloads.adblockplus.org/israellist+easylist.txt",
    ],
  },
  it: {
    label: "Italian",
    sources: [
      "https://easylist-downloads.adblockplus.org/easylistitaly.txt",
    ],
  },
  ja: {
    label: "Japanese",
    sources: [
      "https://filters.adtidy.org/extension/chromium/filters/7.txt",
    ],
  },
  lt: {
    label: "Lithuanian",
    sources: [
      "https://easylist-downloads.adblockplus.org/easylistlithuania.txt",
    ],
  },
  pl: {
    label: "Polish",
    sources: [
      "https://easylist-downloads.adblockplus.org/easylistpolish.txt",
    ],
  },
  ru: {
    label: "Russian",
    sources: [
      "https://filters.adtidy.org/extension/chromium/filters/1.txt",
    ],
  },
  tr: {
    label: "Turkish",
    sources: [
      "https://filters.adtidy.org/extension/chromium/filters/13.txt",
    ],
  },
  uk: {
    label: "Ukrainian",
    sources: [
      "https://filters.adtidy.org/extension/chromium/filters/23.txt",
    ],
  },
};

// --- Fetch with redirect support (same as convert.js) ---
function fetchUrl(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, { headers: { "User-Agent": "ProtoConsent-ListConverter/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
        return resolve(fetchUrl(res.headers.location, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// --- Domain utilities (same as convert.js) ---

function isValidDomain(d) {
  if (!d || d.length > 253) return false;
  return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(\.[a-z]{2,})$/i.test(d);
}

function cleanDomains(domains) {
  const unique = [...new Set(domains.map(d => d.toLowerCase()))];
  const valid = unique.filter(isValidDomain);
  valid.sort((a, b) => a.length - b.length);

  const kept = new Set();
  const result = [];
  for (const d of valid) {
    let dominated = false;
    let parent = d;
    while (true) {
      const dot = parent.indexOf(".");
      if (dot < 0) break;
      parent = parent.slice(dot + 1);
      if (!parent.includes(".")) break;
      if (kept.has(parent)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) {
      kept.add(d);
      result.push(d);
    }
  }
  return result.sort();
}

// --- ABP blocking parser (same as convert.js parseAbp) ---

function parseAbpBlocking(text) {
  const domainRegex = /^\|\|([a-z0-9][a-z0-9.-]*[a-z0-9]\.[a-z]{2,})\^(\$.*)?$/i;
  const pathRegex = /^\|\|([a-z0-9][a-z0-9.-]*[a-z0-9]\.[a-z]{2,}\/[^\s^$]+)\^?(\$.*)?$/i;

  const domains = [];
  const pathRules = [];
  const seenPaths = new Set();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("!") || trimmed.startsWith("[") || trimmed.startsWith("@@")) continue;
    if (trimmed.includes("##") || trimmed.includes("#@#") || trimmed.includes("#?#")) continue;
    if (trimmed.startsWith("/") && trimmed.endsWith("/")) continue;

    const dollarIdx = trimmed.indexOf("$");
    if (dollarIdx !== -1) {
      const options = trimmed.slice(dollarIdx + 1).toLowerCase();
      if (options.includes("domain=")) continue;
      if (options.includes("popup") && !options.includes("script") && !options.includes("xmlhttprequest")) continue;
    }

    const domainMatch = trimmed.match(domainRegex);
    if (domainMatch) {
      domains.push(domainMatch[1]);
      continue;
    }

    const pathMatch = trimmed.match(pathRegex);
    if (pathMatch) {
      const urlFilter = "||" + pathMatch[1];
      if (!seenPaths.has(urlFilter)) {
        seenPaths.add(urlFilter);
        pathRules.push({ urlFilter });
      }
    }
  }

  return { domains, pathRules };
}

// --- ABP cosmetic parser (same as convert-cosmetic.js parseCosmeticRules) ---

const REJECT_PATTERNS = [
  ":has(", ":has-text(", ":-abp-", ":matches-css(", ":style(",
  ":contains(", ":xpath(", ":matches-path(", ":min-text-length(",
  ":watch-attr(", ":upward(", ":remove(",
];

function isSimpleSelector(sel) {
  if (!sel || sel.length === 0) return false;
  for (const pat of REJECT_PATTERNS) {
    if (sel.includes(pat)) return false;
  }
  if (sel.includes("{") || sel.includes("}")) return false;
  return true;
}

function parseAbpCosmetic(text) {
  const generic = [];
  const domains = {};
  const exceptions = {};

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("!") || trimmed.startsWith("[")) continue;

    if (trimmed.includes("#@#")) {
      const exIdx = trimmed.indexOf("#@#");
      const exDomainPart = trimmed.slice(0, exIdx);
      const exSelector = trimmed.slice(exIdx + 3).trim();
      if (exSelector && exDomainPart && isSimpleSelector(exSelector)) {
        for (const raw of exDomainPart.split(",")) {
          const d = raw.trim();
          if (!d || d.startsWith("~")) continue;
          if (!exceptions[d]) exceptions[d] = new Set();
          exceptions[d].add(exSelector);
        }
      }
      continue;
    }
    if (trimmed.includes("#?#")) continue;
    if (trimmed.includes("#$#")) continue;

    const sepIdx = trimmed.indexOf("##");
    if (sepIdx < 0) continue;

    const domainPart = trimmed.slice(0, sepIdx);
    const selector = trimmed.slice(sepIdx + 2).trim();
    if (!selector || !isSimpleSelector(selector)) continue;

    if (!domainPart) {
      generic.push(selector);
    } else {
      for (const raw of domainPart.split(",")) {
        const d = raw.trim();
        if (!d || d.startsWith("~")) continue;
        if (!domains[d]) domains[d] = [];
        domains[d].push(selector);
      }
    }
  }

  // Filter exceptions: only keep selectors that exist in the generic set
  const genericSet = new Set(generic);
  const filteredExceptions = {};
  for (const [d, sels] of Object.entries(exceptions)) {
    const relevant = [...sels].filter(s => genericSet.has(s));
    if (relevant.length) filteredExceptions[d] = relevant;
  }

  return { generic, domains, exceptions: filteredExceptions };
}

// --- Output generators ---

function generateBlockingJson(listId, domains, pathRules) {
  const today = new Date().toISOString().slice(0, 10);
  const rules = [];

  if (domains.length > 0) {
    rules.push({ condition: { requestDomains: domains } });
  }
  for (const pr of pathRules) {
    rules.push({ condition: { urlFilter: pr.urlFilter } });
  }

  return JSON.stringify({
    version: today,
    list_id: listId,
    generated: new Date().toISOString(),
    domain_count: domains.length,
    path_rule_count: pathRules.length,
    rules,
  }, null, 0);
}

function generateCosmeticJson(listId, generic, domains, exceptions) {
  const today = new Date().toISOString().slice(0, 10);
  const domainCount = Object.keys(domains).length;
  let domainRuleCount = 0;
  for (const sels of Object.values(domains)) domainRuleCount += sels.length;
  let exceptionCount = 0;
  if (exceptions) for (const sels of Object.values(exceptions)) exceptionCount += sels.length;

  const out = {
    version: today,
    list_id: listId,
    type: "cosmetic",
    generated: new Date().toISOString(),
    generic_count: generic.length,
    domain_count: domainCount,
    domain_rule_count: domainRuleCount,
    generic,
    domains,
  };
  if (exceptionCount > 0) {
    out.exception_count = exceptionCount;
    out.exceptions = exceptions;
  }
  return JSON.stringify(out);
}

// --- Merge helpers ---

function mergeBlocking(allResults) {
  const allDomains = [];
  const allPaths = new Map();

  for (const r of allResults) {
    allDomains.push(...r.domains);
    for (const pr of r.pathRules) {
      if (!allPaths.has(pr.urlFilter)) allPaths.set(pr.urlFilter, pr);
    }
  }

  return {
    domains: cleanDomains(allDomains),
    pathRules: [...allPaths.values()],
  };
}

function mergeCosmetic(allResults) {
  const genericSet = new Set();
  const domainMap = {};
  const exceptionMap = {};

  for (const r of allResults) {
    for (const sel of r.generic) genericSet.add(sel);
    for (const [d, sels] of Object.entries(r.domains)) {
      if (!domainMap[d]) domainMap[d] = new Set();
      for (const sel of sels) domainMap[d].add(sel);
    }
    if (r.exceptions) {
      for (const [d, sels] of Object.entries(r.exceptions)) {
        if (!exceptionMap[d]) exceptionMap[d] = new Set();
        for (const sel of sels) exceptionMap[d].add(sel);
      }
    }
  }

  const domains = {};
  for (const [d, selSet] of Object.entries(domainMap)) {
    domains[d] = [...selSet];
  }

  const exceptions = {};
  for (const [d, selSet] of Object.entries(exceptionMap)) {
    const relevant = [...selSet].filter(s => genericSet.has(s));
    if (relevant.length) exceptions[d] = relevant;
  }

  return { generic: [...genericSet], domains, exceptions };
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const regionFilter = args.includes("--region") ? args[args.indexOf("--region") + 1] : null;
  const outputDir = args.includes("--output") ? args[args.indexOf("--output") + 1] : path.join(__dirname, "..", "enhanced", "regional");
  const dryRun = args.includes("--dry-run");

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const regionIds = regionFilter ? [regionFilter] : Object.keys(REGIONS);
  const stats = [];

  for (const regionId of regionIds) {
    const region = REGIONS[regionId];
    if (!region) {
      console.error("Unknown region: " + regionId);
      continue;
    }

    console.log("\n=== " + region.label + " (" + regionId + ") — " + region.sources.length + " source(s) ===");

    const blockingResults = [];
    const cosmeticResults = [];
    let totalLines = 0;

    for (const url of region.sources) {
      const shortUrl = url.replace(/https?:\/\//, "").slice(0, 60);
      process.stdout.write("  Fetching " + shortUrl + "... ");

      try {
        const raw = await fetchUrl(url);
        const lines = raw.split("\n").length;
        totalLines += lines;
        process.stdout.write(lines.toLocaleString() + " lines\n");

        blockingResults.push(parseAbpBlocking(raw));
        cosmeticResults.push(parseAbpCosmetic(raw));
      } catch (err) {
        console.log("FAILED: " + err.message);
      }
    }

    if (blockingResults.length === 0) {
      console.log("  SKIPPED — all sources failed");
      stats.push({ regionId, label: region.label, error: "all sources failed" });
      continue;
    }

    const blocking = mergeBlocking(blockingResults);
    const cosmetic = mergeCosmetic(cosmeticResults);

    let cosmeticDomainRules = 0;
    for (const sels of Object.values(cosmetic.domains)) cosmeticDomainRules += sels.length;

    console.log("  Blocking: " + blocking.domains.length.toLocaleString() + " domains + " + blocking.pathRules.length.toLocaleString() + " path rules");
    console.log("  Cosmetic: " + cosmetic.generic.length.toLocaleString() + " generic + " + cosmeticDomainRules.toLocaleString() + " domain-specific (" + Object.keys(cosmetic.domains).length.toLocaleString() + " domains)");

    const stat = {
      regionId,
      label: region.label,
      totalLines,
      blockingDomains: blocking.domains.length,
      blockingPaths: blocking.pathRules.length,
      cosmeticGeneric: cosmetic.generic.length,
      cosmeticDomainRules,
      cosmeticDomains: Object.keys(cosmetic.domains).length,
    };
    stats.push(stat);

    if (!dryRun) {
      const blockingId = "regional_" + regionId + "_blocking";
      const cosmeticId = "regional_" + regionId + "_cosmetic";

      const blockingJson = generateBlockingJson(blockingId, blocking.domains, blocking.pathRules);
      const cosmeticJson = generateCosmeticJson(cosmeticId, cosmetic.generic, cosmetic.domains, cosmetic.exceptions);

      const blockingPath = path.join(outputDir, blockingId + ".json");
      const cosmeticPath = path.join(outputDir, cosmeticId + ".json");

      fs.writeFileSync(blockingPath, blockingJson, "utf-8");
      fs.writeFileSync(cosmeticPath, cosmeticJson, "utf-8");

      const bSize = (Buffer.byteLength(blockingJson) / 1024).toFixed(1);
      const cSize = (Buffer.byteLength(cosmeticJson) / 1024).toFixed(1);
      console.log("  -> " + blockingPath + " (" + bSize + " KB)");
      console.log("  -> " + cosmeticPath + " (" + cSize + " KB)");
    }
  }

  // Summary
  console.log("\n\n--- Summary ---");
  let totalBlockingDomains = 0;
  let totalBlockingPaths = 0;
  let totalCosmeticGeneric = 0;
  let totalCosmeticDomain = 0;

  for (const s of stats) {
    if (s.error) {
      console.log("  " + s.label + " (" + s.regionId + "): ERROR — " + s.error);
    } else {
      console.log("  " + s.label + " (" + s.regionId + "): " +
        s.blockingDomains.toLocaleString() + " blocking domains + " +
        s.blockingPaths.toLocaleString() + " paths, " +
        s.cosmeticGeneric.toLocaleString() + " generic + " +
        s.cosmeticDomainRules.toLocaleString() + " site cosmetic");
      totalBlockingDomains += s.blockingDomains;
      totalBlockingPaths += s.blockingPaths;
      totalCosmeticGeneric += s.cosmeticGeneric;
      totalCosmeticDomain += s.cosmeticDomainRules;
    }
  }

  const succeeded = stats.filter(s => !s.error).length;
  console.log("  Total: " + succeeded + " regions, " +
    totalBlockingDomains.toLocaleString() + " blocking domains + " +
    totalBlockingPaths.toLocaleString() + " paths, " +
    totalCosmeticGeneric.toLocaleString() + " generic + " +
    totalCosmeticDomain.toLocaleString() + " site cosmetic rules");

  if (succeeded === 0 && stats.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
