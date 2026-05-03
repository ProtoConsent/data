#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Enhanced lists manifest generator
// Reads enhanced/*.json metadata and produces config/enhanced-lists.json
// for the extension to fetch dynamically.
//
// Usage:
//   node scripts/generate-manifest.js                    # output config/enhanced-lists.json
//   node scripts/generate-manifest.js --output ./dir     # custom output directory
//   node scripts/generate-manifest.js --dry-run          # print to stdout, don't write

const fs = require("fs");
const path = require("path");

const CDN_BASE = "https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/enhanced/";

// Subdirectory for a list: protoconsent_* -> "protoconsent/", others -> "external/"
function listSubdir(listId) {
  return listId.startsWith("protoconsent_") ? "protoconsent/" : "external/";
}

// --- Read valid region codes from config/regional-languages.json ---
const REGIONAL_LANGUAGES_PATH = path.join(__dirname, "..", "..", "config", "regional-languages.json");
let VALID_REGIONS;
try {
  const rlData = JSON.parse(fs.readFileSync(REGIONAL_LANGUAGES_PATH, "utf-8"));
  if (!rlData || typeof rlData !== "object" || Array.isArray(rlData)) {
    throw new Error("expected a JSON object with region codes as keys");
  }
  VALID_REGIONS = Object.keys(rlData);
  if (VALID_REGIONS.length === 0) {
    throw new Error("no region codes found");
  }
} catch (e) {
  console.error("ERROR: cannot read " + REGIONAL_LANGUAGES_PATH + ": " + e.message);
  process.exit(1);
}

// --- List catalog definitions ---
// Source of truth for display metadata. Mirrors the extension's
// config/enhanced-lists.json and convert.js LISTS.
const LIST_CATALOG = {
  protoconsent_hotfix: {
    name: "ProtoConsent Hotfix",
    description: "Blocking corrections applied between extension releases",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: null,
    preset: "basic",
    type: "revoke",
    order: 20,
  },
  protoconsent_analytics: {
    name: "ProtoConsent Analytics",
    description: "Measurement, statistics and usage analytics, even when not directly linked to marketing",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "analytics",
    preset: "basic",
    order: 30,
  },
  protoconsent_ads: {
    name: "ProtoConsent Ads",
    description: "Advertising, remarketing and affiliation campaigns; may include behavioural profiling",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "ads",
    preset: "basic",
    order: 31,
  },
  protoconsent_personalization: {
    name: "ProtoConsent Personalization",
    description: "Content/UX personalization, recommendations, profiling and behavioural A/B testing",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "personalization",
    preset: "basic",
    order: 32,
  },
  protoconsent_third_parties: {
    name: "ProtoConsent Third Parties",
    description: "Sharing or combining data with third parties, partners or group companies beyond the core service",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "third_parties",
    preset: "basic",
    order: 33,
  },
  protoconsent_advanced_tracking: {
    name: "ProtoConsent Advanced Tracking",
    description: "Advanced or non-cookie techniques to identify or track devices across sites or sessions",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "advanced_tracking",
    preset: "basic",
    order: 34,
  },
  protoconsent_security: {
    name: "ProtoConsent Security",
    description: "Phishing, scam, malware and malicious domain blocklist",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "security",
    preset: "basic",
    order: 35,
  },
  easyprivacy: {
    name: "EasyPrivacy",
    description: "Privacy and tracking protection filter list",
    source: "https://easylist.to/",
    license: "GPL-3.0+ / CC BY-SA 3.0+",
    category: "analytics",
    preset: "basic",
    order: 100,
  },
  easylist: {
    name: "EasyList",
    description: "Primary advertising filter list",
    source: "https://easylist.to/",
    license: "GPL-3.0+ / CC BY-SA 3.0+",
    category: "ads",
    preset: "full",
    order: 110,
  },
  adguard_dns: {
    name: "AdGuard DNS Filter",
    description: "DNS-optimized filter combining 40+ upstream lists",
    source: "https://github.com/AdguardTeam/AdGuardSDNSFilter",
    license: "GPL-3.0",
    category: null,
    preset: "basic",
    order: 120,
  },
  oisd_small: {
    name: "OISD Small",
    description: "Composite domain blocklist - conservative variant",
    source: "https://oisd.nl/",
    license: "GPL-3.0",
    category: null,
    preset: "full",
    order: 200,
  },
  hagezi_pro: {
    name: "HaGeZi Pro",
    description: "Multi-source DNS blocklist - pro variant",
    source: "https://github.com/hagezi/dns-blocklists",
    license: "GPL-3.0",
    category: null,
    preset: "optional",
    order: 402,
  },
  blp_crypto: {
    name: "BLP Crypto",
    description: "Blocklist Project - Cryptojacking and crypto scams",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
    category: "advanced_tracking",
    preset: "optional",
    order: 444,
  },
  blp_phishing: {
    name: "BLP Phishing",
    description: "Blocklist Project - Phishing sites",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
    category: "security",
    preset: "optional",
    order: 445,
  },
  phishing_army: {
    name: "Phishing Army",
    description: "Phishing domain blocklist - community curated, daily updates",
    source: "https://phishing.army",
    license: "CC BY-NC 4.0",
    category: "security",
    preset: "full",
    order: 270,
  },
  cname_trackers: {
    name: "AdGuard CNAME Trackers",
    description: "CNAME-cloaked tracker detection (\u21C9 in Log), informational only",
    source: "https://github.com/AdguardTeam/cname-trackers",
    license: "MIT",
    category: null,
    type: "informational",
    preset: "full",
    order: 300,
  },
  easylist_cosmetic: {
    name: "EasyList Cosmetic",
    description: "Element hiding - hides ad containers and banners",
    source: "https://easylist.to/",
    license: "GPL-3.0+ / CC BY-SA 3.0+",
    category: "ads",
    type: "cosmetic",
    preset: "basic",
    order: 20,
  },
  easylist_cookie_cosmetic: {
    name: "EasyList Cookie Cosmetic",
    description: "Element hiding - hides cookie consent banners and overlays",
    source: "https://easylist.to/",
    license: "GPL-3.0+ / CC BY-SA 3.0+",
    category: null,
    type: "cosmetic",
    preset: "basic",
    order: 21,
  },
  easylist_cookie_network: {
    name: "EasyList Cookie Network",
    description: "Network blocking - blocks cookie consent banner scripts and resources",
    source: "https://easylist.to/",
    license: "GPL-3.0+ / CC BY-SA 3.0+",
    category: null,
    preset: "basic",
    order: 112,
  },
  webannoyances_cosmetic: {
    name: "Web Annoyances Cosmetic",
    description: "Element hiding - hides cookie notices, newsletter popups, social widgets, and annoyances",
    source: "https://github.com/LanikSJ/webannoyances",
    license: "CC BY-SA 4.0",
    category: null,
    type: "cosmetic",
    preset: "full",
    order: 22,
  },
  protoconsent_cmp_signatures: {
    name: "ProtoConsent Banners",
    description: "CMP auto-response templates - cookie injection",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: null,
    type: "cmp",
    preset: "basic",
    order: 10,
  },
  autoconsent_cmp_detectors: {
    name: "Autoconsent CMP Detectors",
    description: "CSS detection selectors for CMP presence and visibility (from DuckDuckGo Autoconsent)",
    source: "https://github.com/duckduckgo/autoconsent",
    license: "MPL-2.0",
    category: null,
    type: "cmp_detectors",
    preset: "basic",
    order: 11,
  },
  autoconsent_cmp_signatures_site: {
    name: "Autoconsent Site Banners",
    description: "Site-specific CMP hiding selectors with detection (from DuckDuckGo Autoconsent)",
    source: "https://github.com/duckduckgo/autoconsent",
    license: "MPL-2.0",
    category: null,
    type: "cmp_site",
    preset: "basic",
    order: 12,
  },
  adguard_tracking_params: {
    name: "AdGuard Tracking Params",
    description: "Global URL tracking parameter stripping (utm_*, fbclid, gclid...)",
    source: "https://github.com/AdguardTeam/AdguardFilters",
    license: "GPL-3.0",
    category: null,
    type: "tracking_params",
    preset: "basic",
    order: 290,
  },
  dandelion_tracking_params: {
    name: "Dandelion Sprout Tracking Params",
    description: "Per-site URL tracking parameter stripping (Amazon, Google, Facebook...)",
    source: "https://github.com/DandelionSprout/adfilt",
    license: "Dandelicence v1.4",
    category: null,
    type: "tracking_params_sites",
    preset: "basic",
    order: 291,
  },
  // --- Optional lists (user-managed, never auto-enabled by presets) ---
  hagezi_light: {
    name: "HaGeZi Light",
    description: "Multi-source DNS blocklist - light variant",
    source: "https://github.com/hagezi/dns-blocklists",
    license: "GPL-3.0",
    category: null,
    preset: "optional",
    order: 400,
  },
  hagezi_normal: {
    name: "HaGeZi Normal",
    description: "Multi-source DNS blocklist - normal variant",
    source: "https://github.com/hagezi/dns-blocklists",
    license: "GPL-3.0",
    category: null,
    preset: "optional",
    order: 401,
  },
  hagezi_ultimate: {
    name: "HaGeZi Ultimate",
    description: "Multi-source DNS blocklist - ultimate variant (aggressive)",
    source: "https://github.com/hagezi/dns-blocklists",
    license: "GPL-3.0",
    category: null,
    preset: "optional",
    order: 403,
  },
  oisd_big: {
    name: "OISD Big",
    description: "Composite domain blocklist - comprehensive variant",
    source: "https://oisd.nl/",
    license: "GPL-3.0",
    category: null,
    preset: "optional",
    order: 410,
  },
  blp_gambling: {
    name: "BLP Gambling",
    description: "Blocklist Project - Gambling sites",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
    category: null,
    preset: "optional",
    order: 440,
  },
  blp_malware: {
    name: "BLP Malware",
    description: "Blocklist Project - Malware distribution sites",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
    category: "security",
    preset: "optional",
    order: 441,
  },
  blp_fraud: {
    name: "BLP Fraud",
    description: "Blocklist Project - Fraud sites",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
    category: "security",
    preset: "optional",
    order: 442,
  },
  blp_scam: {
    name: "BLP Scam",
    description: "Blocklist Project - Scam sites",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
    category: "security",
    preset: "optional",
    order: 443,
  },
  stevenblack: {
    name: "Steven Black Unified Hosts",
    description: "Unified hosts file combining multiple ad and malware sources",
    source: "https://github.com/StevenBlack/hosts",
    license: "MIT",
    category: null,
    preset: "optional",
    order: 420,
  },
  onehosts_lite: {
    name: "1Hosts Lite",
    description: "Lightweight community-maintained blocklist",
    source: "https://github.com/badmojr/1Hosts",
    license: "MPL-2.0",
    category: null,
    preset: "optional",
    order: 430,
  },
  phishing_army_extended: {
    name: "Phishing Army Extended",
    description: "Extended phishing blocklist with additional sources",
    source: "https://phishing.army",
    license: "CC BY-NC 4.0",
    category: "security",
    preset: "optional",
    order: 446,
  },
  hagezi_tif: {
    name: "HaGeZi TIF",
    description: "Threat Intelligence Feeds - combined threat data from multiple sources",
    source: "https://github.com/hagezi/dns-blocklists",
    license: "GPL-3.0",
    category: "security",
    preset: "optional",
    order: 450,
  },
  // --- Regional lists (2 aggregated entries, extension fetches per-region files) ---
  regional_cosmetic: {
    name: "Regional Cosmetic",
    description: "Region-specific cosmetic element hiding from EasyList and AdGuard regional supplements",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: null,
    type: "regional_cosmetic",
    preset: "basic",       // matches extension bundled; skipped from CDN output for now
    order: 21,
    regions: VALID_REGIONS,
    fetch_base: CDN_BASE + "regional/",
  },
  regional_blocking: {
    name: "Regional Blocking",
    description: "Region-specific domain and path blocking from EasyList and AdGuard regional supplements",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: null,
    type: "regional_blocking",
    preset: "basic",       // matches extension bundled; skipped from CDN output for now
    order: 281,
    regions: VALID_REGIONS,
    fetch_base: CDN_BASE + "regional/",
  },
};

// --- Read metadata from an enhanced JSON file ---
function readEnhancedMetadata(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    const meta = {
      version: data.version || null,
      generated: data.generated || null,
      domain_count: data.domain_count || 0,
      path_rule_count: data.path_rule_count || 0,
    };
    if (data.type === "cosmetic") {
      meta.generic_count = data.generic_count || 0;
      meta.domain_rule_count = data.domain_rule_count || 0;
    }
    if (data.type === "cmp") {
      meta.cmp_count = data.cmp_count || 0;
    }
    if (data.type === "cmp_detectors") {
      meta.cmp_count = data.cmp_count || 0;
    }
    if (data.type === "cmp_site") {
      meta.cmp_count = data.cmp_count || 0;
    }
    if (data.type === "tracking_params") {
      meta.param_count = data.param_count || 0;
    }
    if (data.type === "tracking_params_sites") {
      meta.param_count = data.param_count || 0;
      meta.domain_count = data.domain_count || 0;
    }
    if (data.revocation_count !== undefined) {
      meta.revocation_count = data.revocation_count || 0;
    }
    return meta;
  } catch (e) {
    console.warn("  WARN: cannot read " + path.basename(filePath) + ": " + e.message);
    return null;
  }
}

// --- Aggregate metadata from all regional files of a given suffix ---
function readRegionalAggregate(enhancedDir, suffix) {
  const regionDir = path.join(enhancedDir, "regional");
  let totalDomains = 0;
  let totalPathRules = 0;
  let totalGeneric = 0;
  let totalDomainRules = 0;
  let latestVersion = null;
  let latestGenerated = null;
  let regionCount = 0;
  const isCosmetic = suffix === "_cosmetic";

  const regions = LIST_CATALOG["regional" + suffix]?.regions || [];
  for (const region of regions) {
    const filePath = path.join(regionDir, "regional_" + region + suffix + ".json");
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      regionCount++;
      totalDomains += data.domain_count || 0;
      totalPathRules += data.path_rule_count || 0;
      if (isCosmetic) {
        totalGeneric += data.generic_count || 0;
        totalDomainRules += data.domain_rule_count || 0;
      }
      if (data.version && (!latestVersion || data.version > latestVersion)) {
        latestVersion = data.version;
      }
      if (data.generated && (!latestGenerated || data.generated > latestGenerated)) {
        latestGenerated = data.generated;
      }
    } catch (_) { /* skip missing region files */ }
  }

  if (regionCount === 0) return null;

  const meta = {
    version: latestVersion,
    generated: latestGenerated,
    domain_count: totalDomains,
    path_rule_count: totalPathRules,
    region_count: regionCount,
  };
  if (isCosmetic) {
    meta.generic_count = totalGeneric;
    meta.domain_rule_count = totalDomainRules;
  }
  return meta;
}

// --- Build the complete manifest ---
function buildManifest(enhancedDir) {
  const lists = {};
  let missing = 0;

  for (const [listId, catalogDef] of Object.entries(LIST_CATALOG)) {
    // Regional lists: aggregate metadata from per-region files.
    // Old extension versions (<=0.5.0) ignore unknown catalog entries,
    // so including them in CDN is safe from v0.5.1 onward.
    const isRegional = catalogDef.type === "regional_cosmetic" || catalogDef.type === "regional_blocking";
    const meta = isRegional
      ? readRegionalAggregate(enhancedDir, listId === "regional_cosmetic" ? "_cosmetic" : "_blocking")
      : readEnhancedMetadata(path.join(enhancedDir, listSubdir(listId), listId + ".json"));

    const entry = {
      name: catalogDef.name,
      description: catalogDef.description,
      source: catalogDef.source,
      license: catalogDef.license,
      category: catalogDef.category,
      preset: catalogDef.preset,
    };

    if (isRegional) {
      entry.fetch_base = catalogDef.fetch_base;
      entry.regions = catalogDef.regions;
    } else {
      entry.fetch_url = CDN_BASE + listSubdir(listId) + listId + ".json";
    }

    if (catalogDef.type) entry.type = catalogDef.type;
    if (catalogDef.order !== undefined) entry.order = catalogDef.order;

    if (meta) {
      entry.version = meta.version;
      entry.generated = meta.generated;
      entry.domain_count = meta.domain_count;
      entry.path_rule_count = meta.path_rule_count;
      if (meta.generic_count !== undefined) entry.generic_count = meta.generic_count;
      if (meta.domain_rule_count !== undefined) entry.domain_rule_count = meta.domain_rule_count;
      if (meta.cmp_count !== undefined) entry.cmp_count = meta.cmp_count;
      if (meta.param_count !== undefined) entry.param_count = meta.param_count;
      if (meta.region_count !== undefined) entry.region_count = meta.region_count;
      if (meta.revocation_count !== undefined) entry.revocation_count = meta.revocation_count;
    } else {
      entry.version = null;
      entry.generated = null;
      entry.domain_count = 0;
      entry.path_rule_count = 0;
      missing++;
    }

    lists[listId] = entry;
  }

  return {
    manifest: {
      manifest_version: 1,
      generated: new Date().toISOString(),
      lists,
    },
    missing,
  };
}

// --- Main ---
function main() {
  const args = process.argv.slice(2);
  const outputDir = args.includes("--output") ? args[args.indexOf("--output") + 1] : path.join(__dirname, "..", "..", "config");
  const dryRun = args.includes("--dry-run");
  const enhancedDir = path.join(__dirname, "..", "..", "enhanced");

  console.log("ProtoConsent — generate config/enhanced-lists.json manifest");
  console.log("Enhanced dir:", enhancedDir);
  console.log();

  const { manifest, missing } = buildManifest(enhancedDir);
  const listCount = Object.keys(manifest.lists).length;
  const json = JSON.stringify(manifest, null, 2);

  // Summary
  console.log("--- Summary ---");
  for (const [id, entry] of Object.entries(manifest.lists)) {
    let line = "  " + entry.name + ": ";
    if (entry.version) {
      if (entry.type === "regional_cosmetic") {
        line += (entry.generic_count || 0).toLocaleString() + " generic";
        line += " + " + (entry.domain_rule_count || 0).toLocaleString() + " site rules";
        line += " (" + (entry.region_count || 0) + " regions)";
      } else if (entry.type === "regional_blocking") {
        line += (entry.domain_count || 0).toLocaleString() + " domains";
        if (entry.path_rule_count > 0) line += " + " + entry.path_rule_count.toLocaleString() + " path rules";
        line += " (" + (entry.region_count || 0) + " regions)";
      } else if (entry.type === "cosmetic") {
        line += (entry.generic_count || 0).toLocaleString() + " generic";
        line += " + " + (entry.domain_rule_count || 0).toLocaleString() + " site rules";
        line += " (" + (entry.domain_count || 0).toLocaleString() + " domains)";
      } else if (entry.type === "cmp") {
        line += (entry.cmp_count || 0).toLocaleString() + " banner templates";
      } else if (entry.type === "cmp_detectors") {
        line += (entry.cmp_count || 0).toLocaleString() + " CMP detectors";
      } else if (entry.type === "cmp_site") {
        line += (entry.cmp_count || 0).toLocaleString() + " site-specific CMPs";
      } else if (entry.type === "tracking_params") {
        line += (entry.param_count || 0).toLocaleString() + " global params";
      } else if (entry.type === "tracking_params_sites") {
        line += (entry.param_count || 0).toLocaleString() + " params, " + (entry.domain_count || 0).toLocaleString() + " domains";
      } else if (entry.type === "revoke") {
        line += (entry.revocation_count || 0).toLocaleString() + " revocations";
      } else {
        line += entry.domain_count.toLocaleString() + " domains";
        if (entry.path_rule_count > 0) line += " + " + entry.path_rule_count.toLocaleString() + " path rules";
      }
      line += " (v" + entry.version + ")";
    } else {
      line += "NO DATA FILE";
    }
    console.log(line);
  }
  console.log("  Total: " + listCount + " lists" + (missing > 0 ? " (" + missing + " without data)" : ""));

  if (dryRun) {
    console.log("\n--- Dry run — manifest content ---");
    console.log(json);
  } else {
    const outPath = path.join(outputDir, "enhanced-lists.json");
    fs.writeFileSync(outPath, json + "\n", "utf-8");
    const sizeKb = (Buffer.byteLength(json) / 1024).toFixed(1);
    console.log("\n  → " + outPath + " (" + sizeKb + " KB)");
  }

  if (missing > 0) {
    console.warn("\nWARN: " + missing + " enhanced file(s) missing");
    process.exit(1);
  }
}

main();
