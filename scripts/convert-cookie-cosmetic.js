#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Cookie/annoyance cosmetic filter converter for ProtoConsent
// Fetches EasyList Cookie and Web Annoyances Ultralist, parses ## element-hiding
// rules, and outputs JSON compatible with the extension's cosmetic injection system.
//
// Only cosmetic selectors are extracted. Network blocking rules (||domain^) are
// ignored because they would conflict with ProtoConsent's CMP cookie injection.
//
// Outputs:
//   - enhanced/external/easylist_cookie_cosmetic.json
//   - enhanced/external/webannoyances_cosmetic.json
//
// Usage:
//   node convert-cookie-cosmetic.js                    # fetch, output to ./enhanced/
//   node convert-cookie-cosmetic.js --output ../path   # custom output dir
//   node convert-cookie-cosmetic.js --dry-run          # show stats without writing

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const EASYLIST_COOKIE_URL = "https://secure.fanboy.co.nz/fanboy-cookiemonster.txt";
const WEBANNOYANCES_BASE = "https://raw.githubusercontent.com/LanikSJ/webannoyances/master/";
const WEBANNOYANCES_INDEX = WEBANNOYANCES_BASE + "ultralist.txt";

// Selectors with these substrings are procedural/extended and cannot
// be used as plain CSS. Skip them.
const REJECT_PATTERNS = [
  ":has(", ":has-text(", ":-abp-", ":matches-css(", ":style(",
  ":contains(", ":xpath(", ":matches-path(", ":min-text-length(",
  ":watch-attr(", ":upward(", ":remove(",
];

// --- Fetch with redirect support ---
function fetchUrl(url, maxRedirects) {
  if (maxRedirects === undefined) maxRedirects = 3;
  return new Promise(function (resolve, reject) {
    var proto = url.startsWith("https") ? https : http;
    proto.get(url, { headers: { "User-Agent": "ProtoConsent-ListConverter/1.0" } }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
        return resolve(fetchUrl(res.headers.location, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode + " for " + url));
      }
      var chunks = [];
      res.on("data", function (chunk) { chunks.push(chunk); });
      res.on("end", function () { resolve(Buffer.concat(chunks).toString("utf-8")); });
      res.on("error", reject);
    }).on("error", reject);
  });
}

// --- Check if a selector is safe plain CSS ---
function isSimpleSelector(sel) {
  if (!sel || sel.length === 0) return false;
  for (var i = 0; i < REJECT_PATTERNS.length; i++) {
    if (sel.includes(REJECT_PATTERNS[i])) return false;
  }
  if (sel.includes("{") || sel.includes("}")) return false;
  if (sel.includes(",")) return false;
  return true;
}

// --- Parse cosmetic rules from ABP text ---
function parseCosmeticRules(text) {
  var generic = [];
  var domains = {};
  var exceptions = {};

  var lines = text.split("\n");
  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("!") || trimmed.startsWith("[")) continue;

    // Cosmetic exception rules (domain#@#selector)
    if (trimmed.includes("#@#")) {
      var exIdx = trimmed.indexOf("#@#");
      var exDomainPart = trimmed.slice(0, exIdx);
      var exSelector = trimmed.slice(exIdx + 3).trim();
      if (exSelector && exDomainPart && isSimpleSelector(exSelector)) {
        var exParts = exDomainPart.split(",");
        for (var j = 0; j < exParts.length; j++) {
          var d = exParts[j].trim();
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
    var sepIdx = trimmed.indexOf("##");
    if (sepIdx < 0) continue;

    var domainPart = trimmed.slice(0, sepIdx);
    var selector = trimmed.slice(sepIdx + 2).trim();

    if (!selector) continue;
    if (!isSimpleSelector(selector)) continue;

    if (!domainPart) {
      generic.push(selector);
    } else {
      var parts = domainPart.split(",");
      for (var k = 0; k < parts.length; k++) {
        var dd = parts[k].trim();
        if (!dd || dd.startsWith("~")) continue;
        if (!domains[dd]) domains[dd] = [];
        domains[dd].push(selector);
      }
    }
  }

  // Deduplicate generic
  var uniqueGeneric = [];
  var genericSet = new Set();
  for (var g = 0; g < generic.length; g++) {
    if (!genericSet.has(generic[g])) {
      genericSet.add(generic[g]);
      uniqueGeneric.push(generic[g]);
    }
  }

  // Deduplicate per-domain
  for (var key of Object.keys(domains)) {
    domains[key] = [...new Set(domains[key])];
  }

  // Filter exceptions: only keep selectors that exist in the generic set
  var filteredExceptions = {};
  for (var [ed, sels] of Object.entries(exceptions)) {
    var relevant = [...sels].filter(function (s) { return genericSet.has(s); });
    if (relevant.length) filteredExceptions[ed] = relevant;
  }

  return { generic: uniqueGeneric, domains: domains, exceptions: filteredExceptions };
}

// --- Build output JSON ---
function buildOutput(parsed, type) {
  var today = new Date().toISOString().slice(0, 10);
  var domainCount = Object.keys(parsed.domains).length;
  var domainRuleCount = 0;
  for (var sels of Object.values(parsed.domains)) domainRuleCount += sels.length;
  var exceptionDomainCount = Object.keys(parsed.exceptions).length;
  var exceptionCount = 0;
  for (var esels of Object.values(parsed.exceptions)) exceptionCount += esels.length;

  return {
    version: today,
    type: type,
    generated: new Date().toISOString(),
    generic_count: parsed.generic.length,
    domain_count: domainCount,
    domain_rule_count: domainRuleCount,
    exception_count: exceptionCount,
    generic: parsed.generic,
    domains: parsed.domains,
    exceptions: parsed.exceptions,
  };
}

// --- Resolve webannoyances !#include directives ---
async function fetchWebAnnoyances() {
  process.stdout.write("Fetching Web Annoyances index... ");
  var index = await fetchUrl(WEBANNOYANCES_INDEX);
  var includes = [];
  var lines = index.split("\n");
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith("!#include ")) {
      var relPath = line.slice("!#include ".length).trim();
      // Skip platform-specific exclusion filters
      if (relPath.includes("exclusion")) continue;
      includes.push(relPath);
    }
  }
  console.log(includes.length + " sublists");

  var allText = "";
  var BATCH = 4;
  for (var i = 0; i < includes.length; i += BATCH) {
    var batch = includes.slice(i, i + BATCH);
    var results = await Promise.all(batch.map(async function (relPath) {
      var url = WEBANNOYANCES_BASE + relPath;
      try {
        return await fetchUrl(url);
      } catch (e) {
        console.warn("  WARN: failed " + relPath + ": " + e.message);
        return "";
      }
    }));
    for (var j = 0; j < results.length; j++) {
      allText += results[j] + "\n";
    }
    process.stdout.write("  " + Math.min(i + BATCH, includes.length) + "/" + includes.length + "\r");
  }
  console.log("  " + includes.length + "/" + includes.length + " fetched OK");
  return allText;
}

// --- Print stats ---
function printStats(label, parsed) {
  var domainCount = Object.keys(parsed.domains).length;
  var domainRuleCount = 0;
  for (var sels of Object.values(parsed.domains)) domainRuleCount += sels.length;
  var exceptionCount = 0;
  for (var esels of Object.values(parsed.exceptions)) exceptionCount += esels.length;

  console.log("  " + label + ":");
  console.log("    Generic selectors: " + parsed.generic.length.toLocaleString());
  console.log("    Domain-specific: " + domainRuleCount.toLocaleString() + " selectors (" + domainCount.toLocaleString() + " domains)");
  console.log("    Exceptions: " + exceptionCount.toLocaleString());
}

// --- Main ---
async function main() {
  var args = process.argv.slice(2);
  var outputDir = args.includes("--output") ? args[args.indexOf("--output") + 1] : path.join(__dirname, "..", "enhanced");
  var dryRun = args.includes("--dry-run");

  if (!dryRun) {
    fs.mkdirSync(path.join(outputDir, "external"), { recursive: true });
  }

  console.log("ProtoConsent - convert cookie/annoyance cosmetic rules");
  console.log();

  // 1. Fetch EasyList Cookie
  process.stdout.write("Fetching EasyList Cookie... ");
  var cookieRaw = await fetchUrl(EASYLIST_COOKIE_URL);
  console.log(cookieRaw.split("\n").length.toLocaleString() + " lines");

  process.stdout.write("Parsing cosmetic rules... ");
  var cookieParsed = parseCosmeticRules(cookieRaw);
  console.log("done");

  // 2. Fetch Web Annoyances (resolve includes)
  var waRaw = await fetchWebAnnoyances();

  process.stdout.write("Parsing cosmetic rules... ");
  var waParsed = parseCosmeticRules(waRaw);
  console.log("done");

  // 3. Summary
  console.log("\n--- Summary ---");
  printStats("EasyList Cookie", cookieParsed);
  printStats("Web Annoyances", waParsed);

  // 4. Build output
  var cookieOutput = buildOutput(cookieParsed, "cosmetic");
  var waOutput = buildOutput(waParsed, "cosmetic");

  var cookieJson = JSON.stringify(cookieOutput);
  var waJson = JSON.stringify(waOutput);

  if (dryRun) {
    console.log("\n--- Dry run ---");
    console.log("EasyList Cookie (" + (Buffer.byteLength(cookieJson) / 1024).toFixed(1) + " KB)");
    console.log("  Sample generic (first 5):");
    for (var i = 0; i < Math.min(5, cookieParsed.generic.length); i++) {
      console.log("    " + cookieParsed.generic[i]);
    }
    console.log("Web Annoyances (" + (Buffer.byteLength(waJson) / 1024).toFixed(1) + " KB)");
    console.log("  Sample generic (first 5):");
    for (var j = 0; j < Math.min(5, waParsed.generic.length); j++) {
      console.log("    " + waParsed.generic[j]);
    }
  } else {
    var extDir = path.join(outputDir, "external");

    var cookiePath = path.join(extDir, "easylist_cookie_cosmetic.json");
    fs.writeFileSync(cookiePath, cookieJson, "utf-8");
    console.log("\n  -> " + cookiePath + " (" + (Buffer.byteLength(cookieJson) / 1024).toFixed(1) + " KB)");

    var waPath = path.join(extDir, "webannoyances_cosmetic.json");
    fs.writeFileSync(waPath, waJson, "utf-8");
    console.log("  -> " + waPath + " (" + (Buffer.byteLength(waJson) / 1024).toFixed(1) + " KB)");
  }
}

main().catch(function (err) {
  console.error("Fatal:", err);
  process.exit(1);
});
