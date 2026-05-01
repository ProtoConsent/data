#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Hotfix path exception generator
// Compares fresh upstream exceptions (from convert.js output) against
// the published baseline (frozen at release time) and writes new
// exceptions to the hotfix JSON as path_exceptions.
//
// Usage:
//   node scripts/generate-hotfix-exceptions.js
//   node scripts/generate-hotfix-exceptions.js --dry-run

const fs = require("fs");
const path = require("path");

const LISTS = ["easyprivacy", "easylist"];

const BUNDLE_DIR = path.join(__dirname, "..", "..", "bundle");
const ENHANCED_DIR = path.join(__dirname, "..", "..", "enhanced", "external");
const HOTFIX_PATH = path.join(__dirname, "..", "..", "enhanced", "protoconsent", "protoconsent_hotfix.json");

function extractPublishedAllowFilters(filePath) {
  const filters = new Set();
  if (!fs.existsSync(filePath)) return filters;
  const rules = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  for (const rule of rules) {
    if (rule.action?.type === "allow" && rule.condition?.urlFilter) {
      let key = rule.condition.urlFilter;
      if (rule.condition.initiatorDomains?.length) {
        key += "$" + rule.condition.initiatorDomains.sort().join("|");
      }
      filters.add(key);
    }
  }
  return filters;
}

function buildExceptionKey(exc) {
  let key = exc.urlFilter;
  if (Array.isArray(exc.initiatorDomains) && exc.initiatorDomains.length > 0) {
    key += "$" + exc.initiatorDomains.slice().sort().join("|");
  } else if (exc.firstParty) {
    const hostMatch = exc.urlFilter.match(/^\|\|([a-z0-9][a-z0-9.-]*\.[a-z]{2,})\//i);
    if (hostMatch) key += "$" + hostMatch[1];
  }
  return key;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("ProtoConsent -- generate hotfix path exceptions");
  console.log();

  if (!fs.existsSync(BUNDLE_DIR)) {
    console.log("  No bundle/ directory found. Skipping (run generate-external-paths.js first).");
    return;
  }

  const newExceptions = [];

  for (const listId of LISTS) {
    const publishedPath = path.join(BUNDLE_DIR, listId + "_paths.json");
    const freshPath = path.join(ENHANCED_DIR, listId + ".json");

    if (!fs.existsSync(publishedPath)) {
      console.log("  " + listId + ": no bundle baseline, skipping");
      continue;
    }
    if (!fs.existsSync(freshPath)) {
      console.log("  " + listId + ": no fresh data, skipping");
      continue;
    }

    const publishedFilters = extractPublishedAllowFilters(publishedPath);
    const freshData = JSON.parse(fs.readFileSync(freshPath, "utf-8"));

    if (!Array.isArray(freshData.exceptions)) {
      console.log("  " + listId + ": no exceptions in fresh data");
      continue;
    }

    let newCount = 0;
    for (const exc of freshData.exceptions) {
      if (!exc.urlFilter) continue;
      const key = buildExceptionKey(exc);
      if (!publishedFilters.has(key)) {
        const entry = { urlFilter: exc.urlFilter };
        if (Array.isArray(exc.initiatorDomains) && exc.initiatorDomains.length > 0) {
          entry.initiatorDomains = exc.initiatorDomains;
        }
        if (exc.firstParty) entry.firstParty = true;
        newExceptions.push(entry);
        newCount++;
      }
    }

    console.log("  " + listId + ": " + freshData.exceptions.length + " fresh, " +
      publishedFilters.size + " published, " + newCount + " new");
  }

  console.log();
  console.log("  Total new path exceptions: " + newExceptions.length);

  if (!fs.existsSync(HOTFIX_PATH)) {
    console.log("  No hotfix file found at " + HOTFIX_PATH + ". Skipping write.");
    return;
  }

  const hotfix = JSON.parse(fs.readFileSync(HOTFIX_PATH, "utf-8"));

  if (newExceptions.length > 0) {
    hotfix.path_exceptions = newExceptions;
    hotfix.path_exception_count = newExceptions.length;
  } else {
    delete hotfix.path_exceptions;
    delete hotfix.path_exception_count;
  }

  if (dryRun) {
    console.log("\n(dry-run, no files written)");
  } else {
    fs.writeFileSync(HOTFIX_PATH, JSON.stringify(hotfix, null, 2) + "\n", "utf-8");
    console.log("  -> " + HOTFIX_PATH);
  }
}

main();
