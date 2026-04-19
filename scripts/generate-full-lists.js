#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// ProtoConsent - generate-full-lists.js
// Merges bundle (extension repo) + delta (enhanced/) into full lists.
// Output: lists/*.json (structured) + lists/*.txt (hosts format)

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PURPOSES = [
  "ads",
  "analytics",
  "personalization",
  "third_parties",
  "advanced_tracking",
  "security",
];

const BUNDLE_BASE =
  "https://raw.githubusercontent.com/ProtoConsent/ProtoConsent/main/extension/rules";

const REPO_ROOT = path.resolve(__dirname, "..");
const DELTA_DIR = path.join(REPO_ROOT, "enhanced", "protoconsent");
const OUT_DIR = path.join(REPO_ROOT, "lists");

const DRY_RUN = process.argv.includes("--dry-run");

const PURPOSE_LABELS = {
  ads: "Ads",
  analytics: "Analytics",
  personalization: "Personalization",
  third_parties: "Third Parties",
  advanced_tracking: "Advanced Tracking",
  security: "Security",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** HTTPS GET returning a Promise<string|null>. Returns null on 404. */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 404) {
          res.resume();
          return resolve(null);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString()));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

/** Extract domains from a bundle domain file (DNR array). */
function extractBundleDomains(json) {
  const rules = JSON.parse(json);
  const domains = [];
  for (const rule of rules) {
    if (rule.condition && rule.condition.requestDomains) {
      domains.push(...rule.condition.requestDomains);
    }
  }
  return domains;
}

/** Extract urlFilter strings from a bundle paths file (DNR array). */
function extractBundlePaths(json) {
  const rules = JSON.parse(json);
  const paths = [];
  for (const rule of rules) {
    if (rule.condition && rule.condition.urlFilter) {
      paths.push(rule.condition.urlFilter);
    }
  }
  return paths;
}

/** Extract domains and paths from a delta file. */
function extractDelta(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const domains = [];
  const paths = [];
  for (const rule of data.rules || []) {
    const cond = rule.condition || {};
    if (cond.requestDomains) {
      domains.push(...cond.requestDomains);
    }
    if (cond.urlFilter) {
      paths.push(cond.urlFilter);
    }
  }
  return { domains, paths, version: data.version };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!DRY_RUN) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const now = new Date().toISOString();
  const summary = [];

  for (const purpose of PURPOSES) {
    const label = PURPOSE_LABELS[purpose];
    const allDomains = new Set();
    const allPaths = new Set();
    let version = "";

    // --- Delta (local, always exists for all 6 purposes) ---
    const deltaPath = path.join(DELTA_DIR, `protoconsent_${purpose}.json`);
    if (fs.existsSync(deltaPath)) {
      const delta = extractDelta(deltaPath);
      delta.domains.forEach((d) => allDomains.add(d));
      delta.paths.forEach((p) => allPaths.add(p));
      version = delta.version || "";
    } else {
      console.warn(`  Warning: no delta file for ${purpose}`);
    }

    // --- Bundle domains (not available for security) ---
    if (purpose !== "security") {
      const domUrl = `${BUNDLE_BASE}/protoconsent_${purpose}.json`;
      const domJson = await httpGet(domUrl);
      if (domJson) {
        extractBundleDomains(domJson).forEach((d) => allDomains.add(d));
      } else {
        console.warn(`  Warning: no bundle domain file for ${purpose}`);
      }

      // --- Bundle paths ---
      const pathUrl = `${BUNDLE_BASE}/protoconsent_${purpose}_paths.json`;
      const pathJson = await httpGet(pathUrl);
      if (pathJson) {
        extractBundlePaths(pathJson).forEach((p) => allPaths.add(p));
      }
    }

    const sortedDomains = [...allDomains].sort();
    const sortedPaths = [...allPaths].sort();

    summary.push({
      purpose,
      domains: sortedDomains.length,
      paths: sortedPaths.length,
    });

    if (DRY_RUN) {
      console.log(
        `  ${purpose}: ${sortedDomains.length} domains, ${sortedPaths.length} paths`
      );
      continue;
    }

    // --- JSON output ---
    const jsonOut = {
      name: `ProtoConsent ${label}`,
      version: version || new Date().toISOString().slice(0, 10),
      generated: now,
      description: `Full merged ${purpose} blocklist (bundle + enhanced delta)`,
      homepage: "https://github.com/ProtoConsent/data",
      license: "GPL-3.0-or-later",
      domains: sortedDomains,
      domain_count: sortedDomains.length,
      paths: sortedPaths,
      path_count: sortedPaths.length,
    };

    const jsonPath = path.join(OUT_DIR, `protoconsent_${purpose}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2) + "\n");

    // --- Hosts output (domains only) ---
    const hostsHeader = [
      `# ProtoConsent ${label} blocklist`,
      `# Version: ${jsonOut.version}`,
      `# Generated: ${now}`,
      `# Domains: ${sortedDomains.length}`,
      `# Homepage: https://github.com/ProtoConsent/data`,
      `# License: GPL-3.0-or-later`,
      `#`,
    ];
    const hostsLines = sortedDomains.map((d) => `0.0.0.0 ${d}`);
    const hostsContent = hostsHeader.concat(hostsLines).join("\n") + "\n";

    const txtPath = path.join(OUT_DIR, `protoconsent_${purpose}.txt`);
    fs.writeFileSync(txtPath, hostsContent);

    console.log(
      `  ${purpose}: ${sortedDomains.length} domains, ${sortedPaths.length} paths -> ${jsonPath}`
    );
  }

  // --- Summary ---
  const totalDomains = summary.reduce((s, r) => s + r.domains, 0);
  const totalPaths = summary.reduce((s, r) => s + r.paths, 0);
  console.log(`\n  Total: ${totalDomains} domains, ${totalPaths} paths`);
  if (DRY_RUN) {
    console.log("  (dry run - no files written)");
  } else {
    console.log(`  Output: ${OUT_DIR}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
