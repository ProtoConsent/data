#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Cosmetic filter converter for ProtoConsent
// Fetches EasyList, parses ## element-hiding rules, and outputs JSON
// compatible with the extension's cosmetic injection system.
//
// Usage:
//   node convert-cosmetic.js                    # fetch, output to ./enhanced/
//   node convert-cosmetic.js --output ../path   # custom output dir
//   node convert-cosmetic.js --dry-run          # show stats without writing

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const EASYLIST_URL = "https://easylist.to/easylist/easylist.txt";

// Selectors with these substrings are procedural/extended and cannot
// be used as plain CSS. Skip them.
const REJECT_PATTERNS = [
  ":has(", ":has-text(", ":-abp-", ":matches-css(", ":style(",
  ":contains(", ":xpath(", ":matches-path(", ":min-text-length(",
  ":watch-attr(", ":upward(", ":remove(",
];

// --- Fetch with redirect support ---
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

// --- Check if a selector is safe plain CSS ---
function isSimpleSelector(sel) {
  if (!sel || sel.length === 0) return false;
  for (const pat of REJECT_PATTERNS) {
    if (sel.includes(pat)) return false;
  }
  // Reject selectors that could break out of CSS rule blocks
  if (sel.includes("{") || sel.includes("}")) return false;
  // Reject selectors containing commas (would break chunk split/join roundtrip)
  if (sel.includes(",")) return false;
  return true;
}

// --- Parse cosmetic rules from ABP text ---
function parseCosmeticRules(text) {
  const generic = [];
  const domains = {}; // domain -> selector[]
  const exceptions = {}; // domain -> Set<selector> (cosmetic exceptions)

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("!") || trimmed.startsWith("[")) continue;

    // Cosmetic exception rules (domain#@#selector)
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
    // Procedural/extended - skip
    if (trimmed.includes("#?#")) continue;
    // Snippet rules - skip
    if (trimmed.includes("#$#")) continue;

    // Find ## separator (standard element hiding)
    const sepIdx = trimmed.indexOf("##");
    if (sepIdx < 0) continue;

    const domainPart = trimmed.slice(0, sepIdx);
    const selector = trimmed.slice(sepIdx + 2).trim();

    if (!selector) continue;
    if (!isSimpleSelector(selector)) continue;

    if (!domainPart) {
      // Generic rule (applies to all pages)
      generic.push(selector);
    } else {
      // Domain-specific: may be comma-separated, may have ~ (exception domains)
      const parts = domainPart.split(",");
      for (const raw of parts) {
        const d = raw.trim();
        // Skip exception domains (~domain.com)
        if (!d || d.startsWith("~")) continue;
        if (!domains[d]) domains[d] = [];
        domains[d].push(selector);
      }
    }
  }

  // Deduplicate generic
  const uniqueGeneric = [...new Set(generic)];
  const genericSet = new Set(uniqueGeneric);

  // Deduplicate per-domain
  for (const d of Object.keys(domains)) {
    domains[d] = [...new Set(domains[d])];
  }

  // Filter exceptions: only keep selectors that exist in the generic set
  const filteredExceptions = {};
  for (const [d, sels] of Object.entries(exceptions)) {
    const relevant = [...sels].filter(s => genericSet.has(s));
    if (relevant.length) filteredExceptions[d] = relevant;
  }

  return { generic: uniqueGeneric, domains, exceptions: filteredExceptions };
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const outputDir = args.includes("--output") ? args[args.indexOf("--output") + 1] : path.join(__dirname, "..", "..", "enhanced");
  const dryRun = args.includes("--dry-run");

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  process.stdout.write("Fetching EasyList... ");
  const raw = await fetchUrl(EASYLIST_URL);
  const rawLines = raw.split("\n").length;
  console.log(rawLines.toLocaleString() + " lines");

  process.stdout.write("Parsing cosmetic rules... ");
  const { generic, domains, exceptions } = parseCosmeticRules(raw);

  const domainCount = Object.keys(domains).length;
  let domainRuleCount = 0;
  for (const sels of Object.values(domains)) domainRuleCount += sels.length;
  const exceptionDomainCount = Object.keys(exceptions).length;
  let exceptionCount = 0;
  for (const sels of Object.values(exceptions)) exceptionCount += sels.length;

  console.log(generic.length.toLocaleString() + " generic + " +
    domainRuleCount.toLocaleString() + " domain-specific (" +
    domainCount.toLocaleString() + " domains) + " +
    exceptionCount.toLocaleString() + " exceptions (" +
    exceptionDomainCount.toLocaleString() + " domains)");

  const today = new Date().toISOString().slice(0, 10);
  const output = {
    version: today,
    type: "cosmetic",
    generated: new Date().toISOString(),
    generic_count: generic.length,
    domain_count: domainCount,
    domain_rule_count: domainRuleCount,
    exception_count: exceptionCount,
    generic,
    domains,
    exceptions,
  };

  if (dryRun) {
    console.log("\n--- Dry run ---");
    console.log("  Generic selectors: " + generic.length.toLocaleString());
    console.log("  Domain-specific selectors: " + domainRuleCount.toLocaleString());
    console.log("  Unique domains: " + domainCount.toLocaleString());
    console.log("  Sample generic (first 5):");
    for (const s of generic.slice(0, 5)) console.log("    " + s);
    console.log("  Sample domains (first 5):");
    for (const [d, sels] of Object.entries(domains).slice(0, 5)) {
      console.log("    " + d + ": " + sels.slice(0, 2).join(", "));
    }
  } else {
    const json = JSON.stringify(output);
    const extDir = path.join(outputDir, "external");
    fs.mkdirSync(extDir, { recursive: true });
    const outPath = path.join(extDir, "easylist_cosmetic.json");
    fs.writeFileSync(outPath, json, "utf-8");
    const sizeKb = (Buffer.byteLength(json) / 1024).toFixed(1);
    console.log("  -> " + outPath + " (" + sizeKb + " KB)");
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
