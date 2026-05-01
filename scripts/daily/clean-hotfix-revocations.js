#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Hotfix revocation cleanup
// Removes revoked domains that are legitimately blocked by external or
// regional enhanced lists. Prevents zombie revocations from unblocking
// domains that other lists still want to block.
//
// Usage:
//   node scripts/daily/clean-hotfix-revocations.js
//   node scripts/daily/clean-hotfix-revocations.js --dry-run

const fs = require("fs");
const path = require("path");

const HOTFIX_PATH = path.join(__dirname, "..", "..", "enhanced", "protoconsent", "protoconsent_hotfix.json");
const EXTERNAL_DIR = path.join(__dirname, "..", "..", "enhanced", "external");
const REGIONAL_DIR = path.join(__dirname, "..", "..", "enhanced", "regional");

function extractDomains(filePath) {
  const domains = new Set();
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(data.rules)) return domains;
    for (const rule of data.rules) {
      const rd = rule.condition && rule.condition.requestDomains;
      if (Array.isArray(rd)) {
        for (const d of rd) domains.add(d);
      }
    }
  } catch (err) {
    console.warn("  WARNING: " + filePath + ": " + err.message);
  }
  return domains;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("ProtoConsent -- clean hotfix revocations");
  console.log();

  if (!fs.existsSync(HOTFIX_PATH)) {
    console.log("  No hotfix file found. Nothing to clean.");
    return;
  }

  const hotfix = JSON.parse(fs.readFileSync(HOTFIX_PATH, "utf-8"));

  if (!Array.isArray(hotfix.revocations) || hotfix.revocations.length === 0) {
    console.log("  No revocations in hotfix. Nothing to clean.");
    return;
  }

  console.log("  Revocations before cleanup: " + hotfix.revocations.length);

  const coveredDomains = new Set();

  const externalFiles = fs.readdirSync(EXTERNAL_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => path.join(EXTERNAL_DIR, f));

  const regionalFiles = fs.readdirSync(REGIONAL_DIR)
    .filter(f => f.endsWith("_blocking.json"))
    .map(f => path.join(REGIONAL_DIR, f));

  const allFiles = [...externalFiles, ...regionalFiles];
  console.log("  Scanning " + allFiles.length + " enhanced list files");

  for (const filePath of allFiles) {
    const domains = extractDomains(filePath);
    for (const d of domains) coveredDomains.add(d);
  }

  console.log("  Total domains in external/regional lists: " + coveredDomains.size.toLocaleString());

  const removed = [];
  const kept = [];

  for (const domain of hotfix.revocations) {
    if (coveredDomains.has(domain)) {
      removed.push(domain);
    } else {
      kept.push(domain);
    }
  }

  if (removed.length === 0) {
    console.log("  No revocations covered by external lists. Nothing to clean.");
    return;
  }

  console.log();
  console.log("  Removing " + removed.length + " revocations covered by other lists:");
  for (const d of removed.sort()) {
    console.log("    - " + d);
  }
  console.log();
  console.log("  Revocations after cleanup: " + kept.length);

  if (dryRun) {
    console.log("\n  (dry-run, no files written)");
    return;
  }

  hotfix.revocations = kept.sort();
  hotfix.revocation_count = kept.length;

  fs.writeFileSync(HOTFIX_PATH, JSON.stringify(hotfix, null, 2) + "\n", "utf-8");
  console.log("  -> " + HOTFIX_PATH);
}

main();
