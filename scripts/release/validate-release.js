#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Post-generation release validator.
// Runs after all release scripts (generate-external-paths, promote-protoconsent-paths,
// convert-tracking-params, convert-cosmetic) and before commit.
// Validates the bundle/ directory is consistent and well-formed.
//
// Usage:
//   node scripts/release/validate-release.js

const fs = require("fs");
const path = require("path");

const BUNDLE_DIR = path.resolve(__dirname, "../../bundle");
const ENHANCED_EXT_DIR = path.resolve(__dirname, "../../enhanced/external");

const PURPOSES = ["ads", "analytics", "personalization", "third_parties", "advanced_tracking"];

let errors = 0;

function fail(label, msg) {
  console.error(`  FAIL  ${label}: ${msg}`);
  errors++;
}

function ok(label, msg) {
  console.log(`  OK    ${label}: ${msg}`);
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateDNRRules(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(label, "file missing");
    return null;
  }

  let rules;
  try {
    rules = readJSON(filePath);
  } catch (e) {
    fail(label, "invalid JSON: " + e.message);
    return null;
  }

  if (!Array.isArray(rules)) {
    fail(label, "expected array, got " + typeof rules);
    return null;
  }

  if (rules.length === 0) {
    fail(label, "0 rules");
    return null;
  }

  const ids = new Set();
  let dupeIds = 0;
  let malformed = 0;

  for (const rule of rules) {
    if (!rule.id || !rule.action || !rule.condition) {
      malformed++;
      continue;
    }
    if (ids.has(rule.id)) dupeIds++;
    ids.add(rule.id);
  }

  if (malformed > 0) fail(label, `${malformed} rules missing id/action/condition`);
  if (dupeIds > 0) fail(label, `${dupeIds} duplicate rule IDs`);

  return rules;
}

console.log("Release validation");
console.log(`  Bundle: ${BUNDLE_DIR}`);
console.log();

// --- 1. External path rulesets ---
console.log("External paths:");
for (const list of ["easyprivacy", "easylist"]) {
  const file = path.join(BUNDLE_DIR, `${list}_paths.json`);
  const rules = validateDNRRules(file, list);
  if (rules) ok(list, `${rules.length} rules`);
}
console.log();

// --- 2. ProtoConsent domain rulesets ---
console.log("ProtoConsent domain bundles:");
for (const purpose of PURPOSES) {
  const file = path.join(BUNDLE_DIR, `protoconsent_${purpose}.json`);
  const label = purpose;
  if (!fs.existsSync(file)) {
    fail(label, "file missing");
    continue;
  }
  try {
    const data = readJSON(file);
    const rules = Array.isArray(data) ? data : (data.rules || []);
    if (rules.length === 0) {
      fail(label, "0 rules");
      continue;
    }
    let domainCount = 0;
    for (const r of rules) {
      const rd = r.condition && r.condition.requestDomains;
      if (Array.isArray(rd)) domainCount += rd.length;
    }
    ok(label, `${rules.length} rules, ${domainCount} domains`);
  } catch (e) {
    fail(label, "invalid JSON: " + e.message);
  }
}
console.log();

// --- 3. ProtoConsent path rulesets: DNR format + no duplicate urlFilters ---
console.log("ProtoConsent path bundles:");
for (const purpose of PURPOSES) {
  const file = path.join(BUNDLE_DIR, `protoconsent_${purpose}_paths.json`);
  const label = `${purpose}_paths`;

  if (!fs.existsSync(file)) {
    console.log(`  SKIP  ${label}: not present`);
    continue;
  }

  const rules = validateDNRRules(file, label);
  if (!rules) continue;

  const seen = new Set();
  let dupes = 0;
  for (const rule of rules) {
    if (rule.condition?.urlFilter) {
      if (seen.has(rule.condition.urlFilter)) dupes++;
      seen.add(rule.condition.urlFilter);
    }
  }

  if (dupes > 0) {
    fail(label, `${dupes} duplicate urlFilters`);
  } else {
    ok(label, `${rules.length} rules, ${seen.size} unique paths`);
  }
}
console.log();

// --- 4. Tracking param rulesets ---
console.log("Tracking params:");
for (const name of ["strip_tracking_params", "strip_tracking_params_sites"]) {
  const file = path.join(BUNDLE_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    console.log(`  SKIP  ${name}: not present`);
    continue;
  }
  const rules = validateDNRRules(file, name);
  if (rules) ok(name, `${rules.length} rules`);
}
console.log();

// --- 5. Cosmetic ruleset ---
console.log("Cosmetic:");
const cosmeticFile = path.join(ENHANCED_EXT_DIR, "easylist_cosmetic.json");
if (!fs.existsSync(cosmeticFile)) {
  fail("easylist_cosmetic", "file missing in enhanced/external/");
} else {
  try {
    const data = readJSON(cosmeticFile);
    const generic = data.generic_count || (Array.isArray(data.generic) ? data.generic.length : 0);
    const domains = data.domain_count || Object.keys(data.domains || {}).length;
    if (generic === 0 && domains === 0) {
      fail("easylist_cosmetic", "0 selectors");
    } else {
      ok("easylist_cosmetic", `${generic} generic, ${domains} domain selectors`);
    }
  } catch (e) {
    fail("easylist_cosmetic", "invalid JSON: " + e.message);
  }
}

console.log();
if (errors > 0) {
  console.error(`FAILED: ${errors} error(s)`);
  process.exit(1);
} else {
  console.log("PASSED");
}
