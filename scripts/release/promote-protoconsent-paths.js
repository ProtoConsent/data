#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Promote ProtoConsent path candidates from delta into bundle.
// Reads path rules from enhanced/protoconsent/ delta files and merges
// them into bundle/protoconsent_*_paths.json DNR static rulesets.
//
// Usage:
//   node scripts/release/promote-protoconsent-paths.js
//   node scripts/release/promote-protoconsent-paths.js --dry-run

const fs = require("fs");
const path = require("path");

const RESOURCE_TYPES = ["script", "xmlhttprequest", "image", "sub_frame", "ping", "other"];

const PURPOSES = ["ads", "analytics", "personalization", "third_parties", "advanced_tracking"];

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const enhancedDir = path.join(__dirname, "..", "..", "enhanced", "protoconsent");
  const bundleDir = path.join(__dirname, "..", "..", "bundle");

  console.log("ProtoConsent — promote path candidates to bundle");
  console.log(`  Mode: ${dryRun ? "DRY RUN" : "WRITE"}`);
  console.log();

  let totalExisting = 0;
  let totalPromoted = 0;

  for (const purpose of PURPOSES) {
    const deltaPath = path.join(enhancedDir, `protoconsent_${purpose}.json`);
    const bundlePath = path.join(bundleDir, `protoconsent_${purpose}_paths.json`);

    // Read existing bundle paths
    let existingRules = [];
    try {
      existingRules = JSON.parse(fs.readFileSync(bundlePath, "utf-8"));
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.error(`  ERROR: ${bundlePath}: ${err.message}`);
        process.exit(1);
      }
    }

    const existingFilters = new Set();
    for (const rule of existingRules) {
      if (rule.condition?.urlFilter) existingFilters.add(rule.condition.urlFilter);
    }

    // Read delta and extract path rules
    let deltaPathFilters = [];
    try {
      const delta = JSON.parse(fs.readFileSync(deltaPath, "utf-8"));
      if (Array.isArray(delta.rules)) {
        for (const rule of delta.rules) {
          if (rule.condition?.urlFilter) deltaPathFilters.push(rule.condition.urlFilter);
        }
      }
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.error(`  ERROR: ${deltaPath}: ${err.message}`);
        process.exit(1);
      }
    }

    // Deduplicate: only new paths
    const newFilters = deltaPathFilters.filter(f => !existingFilters.has(f));

    totalExisting += existingRules.length;
    totalPromoted += newFilters.length;

    if (newFilters.length === 0) {
      console.log(`  ${purpose}: ${existingRules.length} existing, 0 new`);
      continue;
    }

    // Assign IDs after max existing
    let nextId = existingRules.length > 0
      ? Math.max(...existingRules.map(r => r.id)) + 1
      : 1;

    for (const urlFilter of newFilters) {
      existingRules.push({
        id: nextId++,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter, resourceTypes: RESOURCE_TYPES },
      });
    }

    console.log(`  ${purpose}: ${existingRules.length - newFilters.length} existing + ${newFilters.length} promoted = ${existingRules.length} total`);

    if (!dryRun) {
      fs.mkdirSync(bundleDir, { recursive: true });
      fs.writeFileSync(bundlePath, JSON.stringify(existingRules, null, 2) + "\n", "utf-8");
    }
  }

  console.log();
  console.log(`  Total: ${totalExisting} existing + ${totalPromoted} promoted = ${totalExisting + totalPromoted}`);

  if (dryRun) {
    console.log("\n(dry-run, no files written)");
  }
}

main();
