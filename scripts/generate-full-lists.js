#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// ProtoConsent - generate-full-lists.js
// Merges bundle (extension repo) + delta (enhanced/) into full lists.
// Output: lists/*.json (structured) + lists/*.txt (hosts format) + lists/*.abp (ABP format) + lists/*.adguard (AdGuard format)

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

const PURPOSE_DESCRIPTIONS = {
  ads: "Advertising networks, ad servers and ad-serving domains",
  analytics: "Analytics, measurement and tracking services",
  personalization: "Personalization, A/B testing and content recommendation",
  third_parties: "Third-party embeds, social widgets and external services",
  advanced_tracking: "Fingerprinting, canvas tracking and advanced tracking techniques",
  security: "Phishing, scam, malware and malicious domains",
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

/** Generate ABP (Adblock Plus) format from domains and paths. */
function generateAbp(label, description, version, now, sortedDomains, sortedPaths) {
  const abpHeader = [
    `[Adblock Plus 2.0]`,
    `! Title: ProtoConsent ${label}`,
    `! Description: ${description}`,
    `! Version: ${version}`,
    `! Last modified: ${now}`,
    `! Entries: ${sortedDomains.length + sortedPaths.length}`,
    `! Homepage: https://github.com/ProtoConsent/data`,
    `! License: GPL-3.0-or-later`,
    `!`,
  ];

  // Domain-only rules: ||domain^
  const domainLines = sortedDomains.map((d) => `||${d}^`);

  // Path-based rules: assume sortedPaths already has || prefix from DNR, add ^
  const pathLines = sortedPaths.map((p) => {
    if (p.endsWith("^") || p.endsWith("|")) return p;
    return `${p}^`;
  });

  const allLines = abpHeader.concat(domainLines).concat(pathLines);
  return allLines.join("\n") + "\n";
}

/** Generate AdGuard format from domains and paths. */
function generateAdguard(label, description, version, now, sortedDomains, sortedPaths) {
  const adgHeader = [
    `! Title: ProtoConsent ${label}`,
    `! Description: ${description}`,
    `! Homepage: https://github.com/ProtoConsent/data`,
    `! License: GPL-3.0-or-later`,
    `! Last modified: ${now}`,
    `! Format: AdGuard`,
    `! Entries: ${sortedDomains.length + sortedPaths.length}`,
    `!`,
  ];

  const domainLines = sortedDomains.map((d) => `||${d}^`);

  const pathLines = sortedPaths.map((p) => {
    return p.endsWith("^") ? p : `${p}^`;
  });

  const allLines = adgHeader.concat(domainLines).concat(pathLines);
  return allLines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!DRY_RUN) {
    for (const sub of ["json", "hosts", "domains", "abp", "adguard"]) {
      fs.mkdirSync(path.join(OUT_DIR, sub), { recursive: true });
    }
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
      description: PURPOSE_DESCRIPTIONS[purpose],
      homepage: "https://github.com/ProtoConsent/data",
      license: "GPL-3.0-or-later",
      domains: sortedDomains,
      domain_count: sortedDomains.length,
      paths: sortedPaths,
      path_count: sortedPaths.length,
    };

    const jsonPath = path.join(OUT_DIR, "json", `protoconsent_${purpose}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2) + "\n");

    // --- Hosts output (domains only) ---
    const hostsHeader = [
      `# Title: ProtoConsent ${label}`,
      `# Description: ${PURPOSE_DESCRIPTIONS[purpose]}`,
      `# Version: ${jsonOut.version}`,
      `# Last modified: ${now}`,
      `# Entries: ${sortedDomains.length}`,
      `# Homepage: https://github.com/ProtoConsent/data`,
      `# License: GPL-3.0-or-later`,
      `#`,
    ];
    const hostsLines = sortedDomains.map((d) => `0.0.0.0 ${d}`);
    const hostsContent = hostsHeader.concat(hostsLines).join("\n") + "\n";

    const txtPath = path.join(OUT_DIR, "hosts", `protoconsent_${purpose}.txt`);
    fs.writeFileSync(txtPath, hostsContent);

    // --- Domains output (plain domain list) ---
    const domainsHeader = [
      `# Title: ProtoConsent ${label}`,
      `# Description: ${PURPOSE_DESCRIPTIONS[purpose]}`,
      `# Version: ${jsonOut.version}`,
      `# Last modified: ${now}`,
      `# Entries: ${sortedDomains.length}`,
      `# Homepage: https://github.com/ProtoConsent/data`,
      `# License: GPL-3.0-or-later`,
      `#`,
    ];
    const domainsContent = domainsHeader.concat(sortedDomains).join("\n") + "\n";

    const domainsPath = path.join(OUT_DIR, "domains", `protoconsent_${purpose}.txt`);
    fs.writeFileSync(domainsPath, domainsContent);

    // --- ABP output (domains + paths) ---
    const abpContent = generateAbp(
      label,
      PURPOSE_DESCRIPTIONS[purpose],
      jsonOut.version,
      now,
      sortedDomains,
      sortedPaths
    );

    const abpPath = path.join(OUT_DIR, "abp", `protoconsent_${purpose}.txt`);
    fs.writeFileSync(abpPath, abpContent);

    // --- AdGuard output ---
    const adgContent = generateAdguard(
      label,
      PURPOSE_DESCRIPTIONS[purpose],
      jsonOut.version,
      now,
      sortedDomains,
      sortedPaths
    );

    const adgPath = path.join(OUT_DIR, "adguard", `protoconsent_${purpose}.txt`);
    fs.writeFileSync(adgPath, adgContent);

    console.log(
      `  ${purpose}: ${sortedDomains.length} domains, ${sortedPaths.length} paths -> json | hosts | domains | abp | adguard`
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
