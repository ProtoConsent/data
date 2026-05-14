#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// External path rule bundler
// Extracts path rules from enhanced external lists and produces
// DNR static ruleset files for the extension to bundle.
//
// Usage:
//   node scripts/generate-external-paths.js
//   node scripts/generate-external-paths.js --dry-run

const fs = require("fs");
const path = require("path");

const RESOURCE_TYPES = ["script", "xmlhttprequest", "image", "sub_frame", "ping", "other"];

const LISTS = ["easyprivacy", "easylist"];

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const enhancedDir = path.join(__dirname, "..", "..", "enhanced", "external");
  const bundleDir = path.join(__dirname, "..", "..", "bundle");

  console.log("ProtoConsent — generate external path static rulesets");
  console.log();

  for (const listId of LISTS) {
    const inputPath = path.join(enhancedDir, listId + ".json");
    if (!fs.existsSync(inputPath)) {
      console.warn("  SKIP: " + inputPath + " not found");
      continue;
    }

    const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
    if (!data.rules || !Array.isArray(data.rules)) {
      console.warn("  SKIP: " + listId + " has no rules array");
      continue;
    }

    const dnrRules = [];
    let ruleId = 1;
    for (const rule of data.rules) {
      if (!rule.condition?.urlFilter) continue;
      dnrRules.push({
        id: ruleId++,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: rule.condition.urlFilter,
          resourceTypes: RESOURCE_TYPES,
        },
      });
    }

    const blockCount = dnrRules.length;

    if (Array.isArray(data.exceptions)) {
      for (const exc of data.exceptions) {
        if (!exc.urlFilter) continue;
        const condition = {
          urlFilter: exc.urlFilter,
          resourceTypes: RESOURCE_TYPES,
        };
        if (Array.isArray(exc.initiatorDomains) && exc.initiatorDomains.length > 0) {
          condition.initiatorDomains = exc.initiatorDomains;
        } else if (exc.firstParty) {
          const hostMatch = exc.urlFilter.match(/^\|\|([a-z0-9][a-z0-9.-]*[a-z0-9]\.[a-z]{2,})\//i);
          if (hostMatch) {
            condition.initiatorDomains = [hostMatch[1]];
          }
        }
        dnrRules.push({
          id: ruleId++,
          priority: 2,
          action: { type: "allow" },
          condition,
        });
      }
    }

    const allowCount = dnrRules.length - blockCount;

    if (dnrRules.length === 0) {
      console.log("  " + listId + ": 0 rules (skipped)");
      continue;
    }

    const outputFile = listId + "_paths.json";
    const json = JSON.stringify(dnrRules, null, 2);
    const sizeKb = (Buffer.byteLength(json) / 1024).toFixed(1);

    console.log("  " + listId + ": " + blockCount + " block + " + allowCount + " allow rules (" + sizeKb + " KB)");

    if (!dryRun) {
      fs.mkdirSync(bundleDir, { recursive: true });
      const outPath = path.join(bundleDir, outputFile);
      fs.writeFileSync(outPath, json + "\n", "utf-8");
      console.log("    → " + outPath);
    }
  }

  if (dryRun) {
    console.log("\n(dry-run, no files written)");
  }
}

main();
