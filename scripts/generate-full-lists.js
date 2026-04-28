#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// ProtoConsent - generate-full-lists.js
// Generates public blocklists from bundle (local) + delta (enhanced/).
//
// Light (default, no suffix) = bundle only (high-confidence domains)
// Extended (_extended suffix) = bundle + delta (all classified domains)
//
// Output: lists/{json,hosts,domains,abp,adguard}/protoconsent_*.{json,txt}

"use strict";

const fs = require("fs");
const path = require("path");

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

const PROFILES = {
  core: {
    label: "Core",
    description: "Full merged blocklist covering ads, analytics, personalization, third-party services, and advanced tracking",
    purposes: ["ads", "analytics", "personalization", "third_parties", "advanced_tracking"],
    abpModifier: "$third-party",
    adguardModifier: "$third-party",
  },
  full: {
    label: "Full",
    description: "Full merged blocklist covering all purposes including security (phishing, scam, malware)",
    purposes: ["ads", "analytics", "personalization", "third_parties", "advanced_tracking", "security"],
  },
};

const REPO_ROOT = path.resolve(__dirname, "..");
const BUNDLE_DIR = path.join(REPO_ROOT, "bundle");
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
  ads: "Advertising, remarketing and affiliation campaigns; may include behavioural profiling",
  analytics: "Measurement, statistics and usage analytics, even when not directly linked to marketing",
  personalization: "Content/UX personalization, recommendations, profiling and behavioural A/B testing",
  third_parties: "Sharing or combining data with third parties, partners or group companies beyond the core service",
  advanced_tracking: "Advanced or non-cookie techniques to identify or track devices across sites or sessions",
  security: "Phishing, scam, malware and malicious domains",
};

// --- Helpers ---


// Extract domains from a bundle domain file (DNR array).
function extractBundleDomains(json) {
  const rules = JSON.parse(json);
  const domains = [];
  for (const rule of rules) {
    if (rule.condition && rule.condition.requestDomains) {
      for (const d of rule.condition.requestDomains) domains.push(d);
    }
  }
  return domains;
}

// Extract urlFilter strings from a bundle paths file (DNR array).
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

// Extract domains and paths from a delta file (enhanced format).
function extractDelta(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const domains = [];
  const paths = [];
  for (const rule of data.rules || []) {
    const cond = rule.condition || {};
    if (cond.requestDomains) {
      for (const d of cond.requestDomains) domains.push(d);
    }
    if (cond.urlFilter) {
      paths.push(cond.urlFilter);
    }
  }
  return { domains, paths, version: data.version };
}

// Read a local file, return contents or null if missing.
function readFileOrNull(filePath) {
  try { return fs.readFileSync(filePath, "utf8"); } catch (_) { return null; }
}


// --- ABP/AdGuard modifiers ---

// ABP modifiers: $document for security (compatible), $third-party for trackers.
const ABP_MODIFIERS = {
  ads: "$third-party",
  analytics: "$third-party",
  personalization: "$third-party",
  third_parties: "$third-party",
  advanced_tracking: "$third-party",
  security: "$document",
};

// AdGuard modifiers: $all for security (native), $third-party for trackers.
const ADGUARD_MODIFIERS = {
  ads: "$third-party",
  analytics: "$third-party",
  personalization: "$third-party",
  third_parties: "$third-party",
  advanced_tracking: "$third-party",
  security: "$all",
};

// Generate ABP (Adblock Plus) format from domains and paths.
// modifier: single modifier for all domains (string or null).
// domainModifiers: optional Map<domain, modifier> for per-domain modifiers (overrides modifier).
function generateAbp(label, description, version, now, sortedDomains, sortedPaths, modifier, domainModifiers) {
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

  const domainLines = sortedDomains.map((d) => {
    const m = domainModifiers ? (domainModifiers.get(d) || "") : (modifier || "");
    return `||${d}^${m}`;
  });

  const pathLines = sortedPaths.map((p) => {
    if (p.endsWith("^") || p.endsWith("|")) return p;
    return `${p}^`;
  });

  return abpHeader.concat(domainLines).concat(pathLines).join("\n") + "\n";
}

// Generate AdGuard format from domains and paths.
// modifier: single modifier for all domains (string or null).
// domainModifiers: optional Map<domain, modifier> for per-domain modifiers (overrides modifier).
function generateAdguard(label, description, version, now, sortedDomains, sortedPaths, modifier, domainModifiers) {
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

  const domainLines = sortedDomains.map((d) => {
    const m = domainModifiers ? (domainModifiers.get(d) || "") : (modifier || "");
    return `||${d}^${m}`;
  });

  const pathLines = sortedPaths.map((p) => {
    return p.endsWith("^") ? p : `${p}^`;
  });

  return adgHeader.concat(domainLines).concat(pathLines).join("\n") + "\n";
}

// --- File writers ---

// Write all 5 format files for a single purpose.
// suffix: "" for light (default), "_extended" for full.

function writePurposeFiles(purpose, label, description, version, now, sortedDomains, sortedPaths, suffix) {
  const displayLabel = suffix ? `${label} Extended` : label;
  const displayDescription = suffix ? `${description} (extended - all sources)` : `${description} (curated - high-confidence sources)`;

  // JSON
  const jsonOut = {
    name: `ProtoConsent ${displayLabel}`,
    version,
    generated: now,
    description: displayDescription,
    homepage: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    domains: sortedDomains,
    domain_count: sortedDomains.length,
    paths: sortedPaths,
    path_count: sortedPaths.length,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "json", `protoconsent_${purpose}${suffix}.json`),
    JSON.stringify(jsonOut, null, 2) + "\n"
  );

  // Hosts
  const hostsHeader = [
    `# Title: ProtoConsent ${displayLabel}`,
    `# Description: ${displayDescription}`,
    `# Version: ${version}`,
    `# Last modified: ${now}`,
    `# Entries: ${sortedDomains.length}`,
    `# Homepage: https://github.com/ProtoConsent/data`,
    `# License: GPL-3.0-or-later`,
    `#`,
  ];
  const hostsContent = hostsHeader.concat(sortedDomains.map((d) => `0.0.0.0 ${d}`)).join("\n") + "\n";
  fs.writeFileSync(path.join(OUT_DIR, "hosts", `protoconsent_${purpose}${suffix}.txt`), hostsContent);

  // Domains
  const domainsHeader = [
    `# Title: ProtoConsent ${displayLabel}`,
    `# Description: ${displayDescription}`,
    `# Version: ${version}`,
    `# Last modified: ${now}`,
    `# Entries: ${sortedDomains.length}`,
    `# Homepage: https://github.com/ProtoConsent/data`,
    `# License: GPL-3.0-or-later`,
    `#`,
  ];
  const domainsContent = domainsHeader.concat(sortedDomains).join("\n") + "\n";
  fs.writeFileSync(path.join(OUT_DIR, "domains", `protoconsent_${purpose}${suffix}.txt`), domainsContent);

  // ABP
  const abpContent = generateAbp(displayLabel, displayDescription, version, now, sortedDomains, sortedPaths, ABP_MODIFIERS[purpose]);
  fs.writeFileSync(path.join(OUT_DIR, "abp", `protoconsent_${purpose}${suffix}.txt`), abpContent);

  // AdGuard
  const adgContent = generateAdguard(displayLabel, displayDescription, version, now, sortedDomains, sortedPaths, ADGUARD_MODIFIERS[purpose]);
  fs.writeFileSync(path.join(OUT_DIR, "adguard", `protoconsent_${purpose}${suffix}.txt`), adgContent);
}

// Write all 5 format files for an aggregate profile.
// suffix: "" for light (default), "_extended" for full.

function writeProfileFiles(profileId, label, description, version, now, purposes, sortedDomains, sortedPaths, suffix, abpModifier, adguardModifier, abpDomainModifiers, adguardDomainModifiers) {
  const displayLabel = suffix ? `${label} Extended` : label;
  const displayDescription = suffix ? `${description} (extended - all sources)` : `${description} (curated - high-confidence sources)`;

  // JSON
  const jsonOut = {
    name: `ProtoConsent ${displayLabel}`,
    version,
    generated: now,
    description: displayDescription,
    homepage: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    included_purposes: purposes,
    domains: sortedDomains,
    domain_count: sortedDomains.length,
    paths: sortedPaths,
    path_count: sortedPaths.length,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "json", `protoconsent_${profileId}${suffix}.json`),
    JSON.stringify(jsonOut, null, 2) + "\n"
  );

  // Hosts
  const hostsHeader = [
    `# Title: ProtoConsent ${displayLabel}`,
    `# Description: ${displayDescription}`,
    `# Version: ${version}`,
    `# Last modified: ${now}`,
    `# Entries: ${sortedDomains.length}`,
    `# Homepage: https://github.com/ProtoConsent/data`,
    `# License: GPL-3.0-or-later`,
    `#`,
  ];
  const hostsContent = hostsHeader.concat(sortedDomains.map((d) => `0.0.0.0 ${d}`)).join("\n") + "\n";
  fs.writeFileSync(path.join(OUT_DIR, "hosts", `protoconsent_${profileId}${suffix}.txt`), hostsContent);

  // Domains
  const domainsHeader = [
    `# Title: ProtoConsent ${displayLabel}`,
    `# Description: ${displayDescription}`,
    `# Version: ${version}`,
    `# Last modified: ${now}`,
    `# Entries: ${sortedDomains.length}`,
    `# Homepage: https://github.com/ProtoConsent/data`,
    `# License: GPL-3.0-or-later`,
    `#`,
  ];
  const domainsContent = domainsHeader.concat(sortedDomains).join("\n") + "\n";
  fs.writeFileSync(path.join(OUT_DIR, "domains", `protoconsent_${profileId}${suffix}.txt`), domainsContent);

  // ABP
  const abpContent = generateAbp(displayLabel, displayDescription, version, now, sortedDomains, sortedPaths, abpModifier, abpDomainModifiers);
  fs.writeFileSync(path.join(OUT_DIR, "abp", `protoconsent_${profileId}${suffix}.txt`), abpContent);

  // AdGuard
  const adgContent = generateAdguard(displayLabel, displayDescription, version, now, sortedDomains, sortedPaths, adguardModifier, adguardDomainModifiers);
  fs.writeFileSync(path.join(OUT_DIR, "adguard", `protoconsent_${profileId}${suffix}.txt`), adgContent);
}


// --- Main ---

function main() {
  if (!DRY_RUN) {
    for (const sub of ["json", "hosts", "domains", "abp", "adguard"]) {
      fs.mkdirSync(path.join(OUT_DIR, sub), { recursive: true });
    }
  }

  console.log(`  Bundle: ${BUNDLE_DIR}`);
  console.log(`  Delta:  ${DELTA_DIR}`);
  console.log();

  const now = new Date().toISOString();
  const summary = [];
  const purposeResults = new Map();

  for (const purpose of PURPOSES) {
    const label = PURPOSE_LABELS[purpose];

    // Read bundle (local DNR format) - empty if file missing (e.g. security has no bundle)
    const bundleDomJson = readFileOrNull(path.join(BUNDLE_DIR, `protoconsent_${purpose}.json`));
    const bundleDomains = bundleDomJson ? extractBundleDomains(bundleDomJson) : [];
    const bundlePathJson = readFileOrNull(path.join(BUNDLE_DIR, `protoconsent_${purpose}_paths.json`));
    const bundlePaths = bundlePathJson ? extractBundlePaths(bundlePathJson) : [];

    // Read delta (local enhanced format)
    let deltaDomains = [], deltaPaths = [], version = "";
    const deltaPath = path.join(DELTA_DIR, `protoconsent_${purpose}.json`);
    if (fs.existsSync(deltaPath)) {
      const delta = extractDelta(deltaPath);
      deltaDomains = delta.domains;
      deltaPaths = delta.paths;
      version = delta.version || "";
    } else {
      console.warn(`  Warning: no delta file for ${purpose}`);
    }

    // Light = bundle only
    const lightDomains = [...new Set(bundleDomains)].sort();
    const lightPaths = [...new Set(bundlePaths)].sort();

    // Extended = bundle + delta
    const extDomains = [...new Set([...bundleDomains, ...deltaDomains])].sort();
    const extPaths = [...new Set([...bundlePaths, ...deltaPaths])].sort();

    const purposeVersion = version || new Date().toISOString().slice(0, 10);

    purposeResults.set(purpose, {
      lightDomains,
      lightPaths,
      extDomains,
      extPaths,
      version: purposeVersion,
    });

    summary.push({
      purpose,
      light: lightDomains.length,
      extended: extDomains.length,
      paths: extPaths.length,
    });

    if (DRY_RUN) {
      console.log(`  ${purpose}: ${lightDomains.length} light + ${extDomains.length} extended, ${extPaths.length} paths`);
      continue;
    }

    // Write light (default, no suffix) = bundle only
    writePurposeFiles(purpose, label, PURPOSE_DESCRIPTIONS[purpose], purposeVersion, now, lightDomains, lightPaths, "");

    // Write extended (_extended suffix) = bundle + delta
    writePurposeFiles(purpose, label, PURPOSE_DESCRIPTIONS[purpose], purposeVersion, now, extDomains, extPaths, "_extended");

    console.log(`  ${purpose}: ${lightDomains.length} light + ${extDomains.length} extended, ${extPaths.length} paths -> json | hosts | domains | abp | adguard`);
  }

  // --- Profile lists (combined across purposes) ---
  console.log();
  for (const [profileId, profile] of Object.entries(PROFILES)) {
    const lightDomSet = new Set();
    const lightPathSet = new Set();
    const extDomSet = new Set();
    const extPathSet = new Set();
    // Track which purpose each domain belongs to (first match wins for dedup)
    const lightDomPurpose = new Map();
    const extDomPurpose = new Map();
    for (const purpose of profile.purposes) {
      const r = purposeResults.get(purpose);
      if (!r) continue;
      r.lightDomains.forEach((d) => { if (!lightDomSet.has(d)) lightDomPurpose.set(d, purpose); lightDomSet.add(d); });
      r.lightPaths.forEach((p) => lightPathSet.add(p));
      r.extDomains.forEach((d) => { if (!extDomSet.has(d)) extDomPurpose.set(d, purpose); extDomSet.add(d); });
      r.extPaths.forEach((p) => extPathSet.add(p));
    }
    const lightDomains = [...lightDomSet].sort();
    const lightPaths = [...lightPathSet].sort();
    const extDomains = [...extDomSet].sort();
    const extPaths = [...extPathSet].sort();
    const version = new Date().toISOString().slice(0, 10);
    const label = profile.label;

    // Build per-domain modifier maps for profiles with mixed purposes
    const lightAbpMods = new Map();
    const lightAdgMods = new Map();
    const extAbpMods = new Map();
    const extAdgMods = new Map();
    for (const [d, purpose] of lightDomPurpose) {
      lightAbpMods.set(d, ABP_MODIFIERS[purpose] || "");
      lightAdgMods.set(d, ADGUARD_MODIFIERS[purpose] || "");
    }
    for (const [d, purpose] of extDomPurpose) {
      extAbpMods.set(d, ABP_MODIFIERS[purpose] || "");
      extAdgMods.set(d, ADGUARD_MODIFIERS[purpose] || "");
    }

    summary.push({
      purpose: profileId,
      light: lightDomains.length,
      extended: extDomains.length,
      paths: extPaths.length,
    });

    if (DRY_RUN) {
      console.log(`  ${profileId}: ${lightDomains.length} light + ${extDomains.length} extended, ${extPaths.length} paths (${profile.purposes.join(" + ")})`);
      continue;
    }

    writeProfileFiles(profileId, label, profile.description, version, now, profile.purposes, lightDomains, lightPaths, "", profile.abpModifier, profile.adguardModifier, lightAbpMods, lightAdgMods);
    writeProfileFiles(profileId, label, profile.description, version, now, profile.purposes, extDomains, extPaths, "_extended", profile.abpModifier, profile.adguardModifier, extAbpMods, extAdgMods);

    console.log(`  ${profileId}: ${lightDomains.length} light + ${extDomains.length} extended, ${extPaths.length} paths -> json | hosts | domains | abp | adguard (${profile.purposes.join(" + ")})`);
  }

  // --- Summary (per-purpose only, profiles overlap) ---
  const purposeSummary = summary.filter((r) => PURPOSES.includes(r.purpose));
  const totalLight = purposeSummary.reduce((s, r) => s + r.light, 0);
  const totalExt = purposeSummary.reduce((s, r) => s + r.extended, 0);
  const totalPaths = purposeSummary.reduce((s, r) => s + r.paths, 0);
  console.log(`\n  Total: ${totalLight} light, ${totalExt} extended, ${totalPaths} paths`);
  if (DRY_RUN) {
    console.log("  (dry run - no files written)");
  } else {
    console.log(`  Output: ${OUT_DIR}`);
  }
}

main();
