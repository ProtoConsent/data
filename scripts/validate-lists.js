#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// validate-lists.js
// Validates inputs (bundle, delta) and outputs (lists/) for correctness.
// Run after generate-full-lists.js, before committing.

"use strict";

const fs = require("fs");
const path = require("path");

// --- Config ---

const REPO_ROOT = path.resolve(__dirname, "..");
const BUNDLE_DIR = path.join(REPO_ROOT, "bundle");
const DELTA_DIR = path.join(REPO_ROOT, "enhanced", "protoconsent");
const LISTS_DIR = path.join(REPO_ROOT, "lists");

const PURPOSES = [
  "ads",
  "analytics",
  "personalization",
  "third_parties",
  "advanced_tracking",
  "security",
];

const PROFILES = ["core", "full"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MIN_TOTAL_EXTENDED = 100000;

// Expected ABP modifiers per list ID.
const ABP_MODIFIERS = {
  ads: "$third-party",
  analytics: "$third-party",
  personalization: "$third-party",
  third_parties: "$third-party",
  advanced_tracking: "$third-party",
  security: "$document",
  core: "$third-party",
  full: "mixed", // per-domain: $third-party for trackers, $document for security
};

// Expected AdGuard modifiers per list ID.
const ADGUARD_MODIFIERS = {
  ads: "$third-party",
  analytics: "$third-party",
  personalization: "$third-party",
  third_parties: "$third-party",
  advanced_tracking: "$third-party",
  security: "$all",
  core: "$third-party",
  full: "mixed", // per-domain: $third-party for trackers, $all for security
};

// --- Reporting ---

let errors = 0;
let warnings = 0;

function fail(section, msg) {
  console.error(`  FAIL  ${section}: ${msg}`);
  errors++;
}

function warn(section, msg) {
  console.warn(`  WARN  ${section}: ${msg}`);
  warnings++;
}

function ok(section, msg) {
  console.log(`  OK    ${section}: ${msg}`);
}

// --- Helpers ---

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return null;
  }
}

function countDomainsInBundle(filePath) {
  const data = readJSON(filePath);
  if (!Array.isArray(data)) return -1;
  let count = 0;
  for (const rule of data) {
    const rd = rule.condition && rule.condition.requestDomains;
    if (Array.isArray(rd)) count += rd.length;
  }
  return count;
}

function countPathsInBundle(filePath) {
  const data = readJSON(filePath);
  if (!Array.isArray(data)) return -1;
  let count = 0;
  for (const rule of data) {
    if (rule.condition && rule.condition.urlFilter) count++;
  }
  return count;
}

/** Parse header entry count from `# Entries: N` or `! Entries: N` lines. */
function parseEntryCount(lines) {
  for (const line of lines) {
    const m = line.match(/^[#!]\s*Entries:\s*(\d+)/);
    if (m) return parseInt(m[1], 10);
  }
  return -1;
}

// ---------------------------------------------------------------------------
// 1. Input validation
// ---------------------------------------------------------------------------

function validateInputs() {
  console.log("  Input validation");

  // Bundle domain files
  for (const purpose of PURPOSES) {
    const file = path.join(BUNDLE_DIR, `protoconsent_${purpose}.json`);
    const label = `bundle/${purpose}`;

    if (!fs.existsSync(file)) {
      fail(label, "file missing");
      continue;
    }

    const data = readJSON(file);
    if (!Array.isArray(data)) {
      fail(label, "not a JSON array");
      continue;
    }
    if (data.length === 0) {
      fail(label, "empty array (0 rules)");
      continue;
    }

    let domainCount = 0;
    const allDomains = [];
    for (const rule of data) {
      const rd = rule.condition && rule.condition.requestDomains;
      if (Array.isArray(rd)) {
        domainCount += rd.length;
        for (const d of rd) allDomains.push(d);
      }
    }

    if (domainCount === 0) {
      fail(label, "0 domains in rules");
      continue;
    }

    const dupes = allDomains.length - new Set(allDomains).size;
    if (dupes > 0) {
      fail(label, `${dupes} duplicate domains`);
    }

    ok(label, `${domainCount} domains`);
  }

  // Bundle path files (5 purposes, security has none)
  for (const purpose of PURPOSES) {
    if (purpose === "security") continue;
    const file = path.join(BUNDLE_DIR, `protoconsent_${purpose}_paths.json`);
    const label = `bundle/${purpose}_paths`;

    if (!fs.existsSync(file)) {
      warn(label, "file missing");
      continue;
    }

    const data = readJSON(file);
    if (!Array.isArray(data)) {
      fail(label, "not a JSON array");
      continue;
    }

    const pathCount = countPathsInBundle(file);
    ok(label, `${pathCount} paths`);
  }

  console.log();

  // Delta files
  for (const purpose of PURPOSES) {
    const file = path.join(DELTA_DIR, `protoconsent_${purpose}.json`);
    const label = `delta/${purpose}`;

    if (!fs.existsSync(file)) {
      fail(label, "file missing");
      continue;
    }

    const data = readJSON(file);
    if (!data) {
      fail(label, "invalid JSON");
      continue;
    }

    const requiredKeys = ["version", "list_id", "generated", "domain_count", "path_rule_count", "rules"];
    for (const k of requiredKeys) {
      if (!(k in data)) fail(label, `missing key: ${k}`);
    }

    if (typeof data.version !== "string" || !DATE_RE.test(data.version)) {
      fail(label, `version should be YYYY-MM-DD, got: ${data.version}`);
    }

    const expectedId = `protoconsent_${purpose}`;
    if (data.list_id !== expectedId) {
      fail(label, `list_id should be ${expectedId}, got: ${data.list_id}`);
    }

    if (!Array.isArray(data.rules)) {
      fail(label, "rules is not an array");
      continue;
    }

    let domainCount = 0;
    let pathCount = 0;
    const allDomains = [];
    for (const rule of data.rules) {
      const cond = rule.condition || {};
      if (cond.requestDomains) {
        domainCount += cond.requestDomains.length;
        for (const d of cond.requestDomains) allDomains.push(d);
      }
      if (cond.urlFilter) pathCount++;
    }

    if (data.domain_count !== domainCount) {
      fail(label, `domain_count says ${data.domain_count} but found ${domainCount}`);
    }
    if (data.path_rule_count !== pathCount) {
      fail(label, `path_rule_count says ${data.path_rule_count} but found ${pathCount}`);
    }

    const dupes = allDomains.length - new Set(allDomains).size;
    if (dupes > 0) {
      fail(label, `${dupes} duplicate domains`);
    }

    ok(label, `${domainCount} domains, ${pathCount} paths`);
  }

  console.log();

  // Revoke file
  const revokeFile = path.join(DELTA_DIR, "protoconsent_hotfix.json");
  if (fs.existsSync(revokeFile)) {
    const rv = readJSON(revokeFile);
    if (!rv) {
      fail("revoke", "invalid JSON");
    } else {
      if (!Array.isArray(rv.revocations)) {
        fail("revoke", "revocations is not an array");
      } else if (rv.revocation_count !== rv.revocations.length) {
        fail("revoke", `count says ${rv.revocation_count} but array has ${rv.revocations.length}`);
      } else {
        ok("revoke", `${rv.revocations.length} revocations`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Output validation
// ---------------------------------------------------------------------------

/** Validate a JSON list file. Returns domain count or -1 on error. */
function validateJSON(filePath, label) {
  const data = readJSON(filePath);
  if (!data) {
    fail(label, "invalid JSON");
    return -1;
  }

  const requiredKeys = ["name", "version", "generated", "description", "domains", "domain_count"];
  for (const k of requiredKeys) {
    if (!(k in data)) fail(label, `missing key: ${k}`);
  }

  if (!Array.isArray(data.domains)) {
    fail(label, "domains is not an array");
    return -1;
  }

  if (data.domain_count !== data.domains.length) {
    fail(label, `domain_count=${data.domain_count} but domains.length=${data.domains.length}`);
  }

  if ("paths" in data && "path_count" in data) {
    if (data.path_count !== data.paths.length) {
      fail(label, `path_count=${data.path_count} but paths.length=${data.paths.length}`);
    }
  }

  const empty = data.domains.filter((d) => typeof d !== "string" || d.length === 0);
  if (empty.length > 0) {
    fail(label, `${empty.length} empty or non-string entries in domains`);
  }

  return data.domain_count;
}

// Validate a hosts file. Returns entry count or -1 on error.
function validateHosts(filePath, label) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter((l) => l.length > 0);

  if (!lines[0] || !lines[0].startsWith("# Title: ProtoConsent")) {
    fail(label, "header missing or wrong format");
  }

  const headerCount = parseEntryCount(lines);
  const dataLines = lines.filter((l) => !l.startsWith("#"));
  const badLines = dataLines.filter((l) => !l.match(/^0\.0\.0\.0 \S+$/));

  if (badLines.length > 0) {
    fail(label, `${badLines.length} lines not matching '0.0.0.0 <domain>' format`);
  }

  if (headerCount !== -1 && headerCount !== dataLines.length) {
    fail(label, `Entries header=${headerCount} but actual=${dataLines.length}`);
  }

  return dataLines.length;
}

// Validate a domains file. Returns entry count or -1 on error.
function validateDomains(filePath, label) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter((l) => l.length > 0);

  if (!lines[0] || !lines[0].startsWith("# Title: ProtoConsent")) {
    fail(label, "header missing or wrong format");
  }

  const headerCount = parseEntryCount(lines);
  const dataLines = lines.filter((l) => !l.startsWith("#"));

  if (headerCount !== -1 && headerCount !== dataLines.length) {
    fail(label, `Entries header=${headerCount} but actual=${dataLines.length}`);
  }

  return dataLines.length;
}

// Validate an ABP file. Returns entry count or -1 on error.
function validateABP(filePath, label, expectedModifier) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter((l) => l.length > 0);

  if (!lines[0] || lines[0] !== "[Adblock Plus 2.0]") {
    fail(label, `first line should be '[Adblock Plus 2.0]', got: ${(lines[0] || "").slice(0, 40)}`);
  }

  const headerCount = parseEntryCount(lines);
  const dataLines = lines.filter((l) => !l.startsWith("!") && !l.startsWith("["));

  if (headerCount !== -1 && headerCount !== dataLines.length) {
    fail(label, `Entries header=${headerCount} but actual=${dataLines.length}`);
  }

  // Check modifier on domain lines (||domain^$modifier)
  if (expectedModifier !== "mixed") {
    const domainLines = dataLines.filter((l) => l.startsWith("||"));
    if (domainLines.length > 0) {
      const sample = domainLines.slice(0, 20);
      const suffix = expectedModifier || "";
      const expectedEnd = `^${suffix}`;
      const bad = sample.filter((l) => !l.endsWith(expectedEnd));
      if (bad.length > 0) {
        const got = bad[0].slice(-20);
        fail(label, `modifier mismatch: expected '${expectedEnd}', sample ends with '${got}'`);
      }
    }
  }

  return dataLines.length;
}

// Validate an AdGuard file. Returns entry count or -1 on error.
function validateAdGuard(filePath, label, expectedModifier) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter((l) => l.length > 0);

  const hasFormat = lines.some((l) => l.includes("! Format: AdGuard"));
  if (!hasFormat) {
    fail(label, "missing '! Format: AdGuard' in header");
  }

  const headerCount = parseEntryCount(lines);
  const dataLines = lines.filter((l) => !l.startsWith("!"));

  if (headerCount !== -1 && headerCount !== dataLines.length) {
    fail(label, `Entries header=${headerCount} but actual=${dataLines.length}`);
  }

  // Check modifier on domain lines
  if (expectedModifier !== "mixed") {
    const domainLines = dataLines.filter((l) => l.startsWith("||"));
    if (domainLines.length > 0) {
      const sample = domainLines.slice(0, 20);
      const suffix = expectedModifier || "";
      const expectedEnd = `^${suffix}`;
      const bad = sample.filter((l) => !l.endsWith(expectedEnd));
      if (bad.length > 0) {
        const got = bad[0].slice(-20);
        fail(label, `modifier mismatch: expected '${expectedEnd}', sample ends with '${got}'`);
      }
    }
  }

  return dataLines.length;
}

function validateOutputs() {
  const allIds = [...PURPOSES, ...PROFILES];
  const suffixes = ["", "_extended"];
  const counts = {}; // { "ads": { light: { json, hosts, domains, abp, adguard }, extended: ... } }

  for (const id of allIds) {
    counts[id] = {};

    for (const suffix of suffixes) {
      const variant = suffix ? "extended" : "light";
      const filename = `protoconsent_${id}${suffix}`;
      const c = {};

      console.log(`  Output validation (${id} ${variant})`);

      // JSON
      const jsonFile = path.join(LISTS_DIR, "json", `${filename}.json`);
      if (!fs.existsSync(jsonFile)) {
        fail(`json/${filename}`, "file missing");
        c.json = -1;
      } else {
        c.json = validateJSON(jsonFile, `json/${filename}`);
        if (c.json >= 0) ok(`json/${filename}`, `${c.json} domains`);
      }

      // Hosts
      const hostsFile = path.join(LISTS_DIR, "hosts", `${filename}.txt`);
      if (!fs.existsSync(hostsFile)) {
        fail(`hosts/${filename}`, "file missing");
        c.hosts = -1;
      } else {
        c.hosts = validateHosts(hostsFile, `hosts/${filename}`);
        if (c.hosts >= 0) ok(`hosts/${filename}`, `${c.hosts} entries`);
      }

      // Domains
      const domainsFile = path.join(LISTS_DIR, "domains", `${filename}.txt`);
      if (!fs.existsSync(domainsFile)) {
        fail(`domains/${filename}`, "file missing");
        c.domains = -1;
      } else {
        c.domains = validateDomains(domainsFile, `domains/${filename}`);
        if (c.domains >= 0) ok(`domains/${filename}`, `${c.domains} entries`);
      }

      // ABP
      const abpFile = path.join(LISTS_DIR, "abp", `${filename}.txt`);
      if (!fs.existsSync(abpFile)) {
        fail(`abp/${filename}`, "file missing");
        c.abp = -1;
      } else {
        c.abp = validateABP(abpFile, `abp/${filename}`, ABP_MODIFIERS[id]);
        if (c.abp >= 0) ok(`abp/${filename}`, `${c.abp} entries, modifier=${ABP_MODIFIERS[id] || "none"}`);
      }

      // AdGuard
      const adgFile = path.join(LISTS_DIR, "adguard", `${filename}.txt`);
      if (!fs.existsSync(adgFile)) {
        fail(`adguard/${filename}`, "file missing");
        c.adguard = -1;
      } else {
        c.adguard = validateAdGuard(adgFile, `adguard/${filename}`, ADGUARD_MODIFIERS[id]);
        if (c.adguard >= 0) ok(`adguard/${filename}`, `${c.adguard} entries, modifier=${ADGUARD_MODIFIERS[id] || "none"}`);
      }

      counts[id][variant] = c;
      console.log();
    }
  }

  return counts;
}

// ---------------------------------------------------------------------------
// 3. Cross-checks
// ---------------------------------------------------------------------------

function crossChecks(counts) {
  console.log("  Cross-checks");

  const allIds = [...PURPOSES, ...PROFILES];

  for (const id of allIds) {
    const light = counts[id] && counts[id].light;
    const ext = counts[id] && counts[id].extended;

    if (!light || !ext) continue;

    // Light <= Extended
    if (light.json >= 0 && ext.json >= 0) {
      if (light.json > ext.json) {
        fail(id, `light (${light.json}) > extended (${ext.json}) domain count`);
      } else {
        ok(id, `light=${light.json} <= extended=${ext.json}`);
      }
    }

    // JSON = hosts = domains count (light)
    if (light.json >= 0 && light.hosts >= 0 && light.domains >= 0) {
      if (light.json !== light.hosts || light.json !== light.domains) {
        fail(id, `light count mismatch: json=${light.json} hosts=${light.hosts} domains=${light.domains}`);
      } else {
        ok(id, `light json=hosts=domains=${light.json}`);
      }
    }

    // ABP entries = AdGuard entries
    if (light.abp >= 0 && light.adguard >= 0 && light.abp !== light.adguard) {
      fail(id, `light ABP entries=${light.abp} != AdGuard entries=${light.adguard}`);
    }
    if (ext.abp >= 0 && ext.adguard >= 0 && ext.abp !== ext.adguard) {
      fail(id, `extended ABP entries=${ext.abp} != AdGuard entries=${ext.adguard}`);
    }
  }

  // Bundle + delta >= extended (purposes only)
  for (const purpose of PURPOSES) {
    const bundleCount = countDomainsInBundle(path.join(BUNDLE_DIR, `protoconsent_${purpose}.json`));
    const deltaFile = path.join(DELTA_DIR, `protoconsent_${purpose}.json`);
    const delta = readJSON(deltaFile);
    const deltaCount = delta ? (delta.domain_count || 0) : 0;
    const ext = counts[purpose] && counts[purpose].extended;

    if (bundleCount >= 0 && ext && ext.json >= 0) {
      if (bundleCount + deltaCount < ext.json) {
        fail(purpose, `bundle(${bundleCount}) + delta(${deltaCount}) < extended(${ext.json})`);
      }
    }
  }

  console.log();
}

// ---------------------------------------------------------------------------
// 4. Sanity checks
// ---------------------------------------------------------------------------

function sanityChecks(counts) {
  console.log("  Sanity checks");

  // No purpose has 0 extended domains
  for (const id of [...PURPOSES, ...PROFILES]) {
    const ext = counts[id] && counts[id].extended;
    if (ext && ext.json === 0) {
      fail(id, "extended has 0 domains");
    }
  }

  // Security light > 0
  const secLight = counts.security && counts.security.light;
  if (secLight && secLight.json === 0) {
    fail("security", "light has 0 domains (expected data-bundle)");
  } else if (secLight && secLight.json > 0) {
    ok("security light", `${secLight.json} domains (> 0)`);
  }

  // Total extended > MIN_TOTAL_EXTENDED
  let totalExtended = 0;
  for (const purpose of PURPOSES) {
    const ext = counts[purpose] && counts[purpose].extended;
    if (ext && ext.json > 0) totalExtended += ext.json;
  }
  if (totalExtended < MIN_TOTAL_EXTENDED) {
    fail("total", `extended sum=${totalExtended} < ${MIN_TOTAL_EXTENDED} floor`);
  } else {
    ok("total extended", `${totalExtended.toLocaleString()} (> ${MIN_TOTAL_EXTENDED.toLocaleString()} floor)`);
  }

  // File size check
  const formats = ["json", "hosts", "domains", "abp", "adguard"];
  for (const fmt of formats) {
    const dir = path.join(LISTS_DIR, fmt);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const filePath = path.join(dir, f);
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_FILE_SIZE) {
        fail(`${fmt}/${f}`, `file size ${(stat.size / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }
    }
  }

  console.log();
}


// --- Main ---

console.log("Validating ProtoConsent lists");
console.log(`  Inputs:  ${BUNDLE_DIR}`);
console.log(`           ${DELTA_DIR}`);
console.log(`  Outputs: ${LISTS_DIR}`);
console.log();

validateInputs();
console.log();

const counts = validateOutputs();
crossChecks(counts);
sanityChecks(counts);

if (errors > 0) {
  console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
} else {
  console.log(`PASSED: ${warnings} warning(s)`);
}
