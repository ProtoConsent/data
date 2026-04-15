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

// --- List catalog definitions ---
// Source of truth for display metadata. Mirrors the extension's
// config/enhanced-lists.json and convert.js LISTS.
const LIST_CATALOG = {
  protoconsent_analytics: {
    name: "ProtoConsent Analytics",
    description: "Core analytics and tracking domain blocklist",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "analytics",
    preset: "basic",
    order: 30,
  },
  protoconsent_ads: {
    name: "ProtoConsent Ads",
    description: "Core advertising domain blocklist",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "ads",
    preset: "basic",
    order: 31,
  },
  protoconsent_personalization: {
    name: "ProtoConsent Personalization",
    description: "Core personalization domain blocklist",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "personalization",
    preset: "basic",
    order: 32,
  },
  protoconsent_third_parties: {
    name: "ProtoConsent Third Parties",
    description: "Core third-party domain blocklist",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "third_parties",
    preset: "basic",
    order: 33,
  },
  protoconsent_advanced_tracking: {
    name: "ProtoConsent Advanced Tracking",
    description: "Core fingerprinting and advanced tracking domain blocklist",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: "advanced_tracking",
    preset: "basic",
    order: 34,
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
    preset: "basic",
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
  steven_black: {
    name: "Steven Black Unified",
    description: "Aggregated hosts list from 15+ sources - ads, malware, tracking",
    source: "https://github.com/StevenBlack/hosts",
    license: "MIT",
    category: null,
    preset: "basic",
    order: 130,
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
    preset: "full",
    order: 210,
  },
  hagezi_tif: {
    name: "HaGeZi TIF",
    description: "Threat intelligence feeds - fingerprinting, cryptominers, malware",
    source: "https://github.com/hagezi/dns-blocklists",
    license: "GPL-3.0",
    category: "advanced_tracking",
    preset: "full",
    order: 220,
  },
  onehosts_lite: {
    name: "1Hosts Lite",
    description: "Independent curation - ads, trackers, malware",
    source: "https://github.com/badmojr/1Hosts",
    license: "MPL-2.0",
    category: null,
    preset: "full",
    order: 230,
  },
  blp_ads: {
    name: "Blocklist Project - Ads",
    description: "Ad servers - categorized blocklist",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
    category: "ads",
    preset: "full",
    order: 240,
  },
  blp_tracking: {
    name: "Blocklist Project - Tracking",
    description: "Tracking and analytics servers - categorized blocklist",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
    category: "analytics",
    preset: "full",
    order: 250,
  },
  blp_crypto: {
    name: "Blocklist Project - Crypto",
    description: "Cryptojacking and crypto scams - categorized blocklist",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
    category: "advanced_tracking",
    preset: "full",
    order: 260,
  },
  blp_phishing: {
    name: "Blocklist Project - Phishing",
    description: "Phishing sites - categorized blocklist",
    source: "https://github.com/blocklistproject/Lists",
    license: "Unlicense",
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
    preset: "basic",
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
  protoconsent_cmp_signatures: {
    name: "ProtoConsent Banners",
    description: "CMP auto-response templates - cookie injection, cosmetic hiding, scroll unlock",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: null,
    type: "cmp",
    preset: "basic",
    order: 10,
  },
  protoconsent_cmp_detectors: {
    name: "ProtoConsent CMP Detectors",
    description: "CSS detection selectors for CMP presence and visibility",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
    category: null,
    type: "cmp_detectors",
    preset: "basic",
    order: 11,
  },
  protoconsent_cmp_signatures_site: {
    name: "ProtoConsent Site Banners",
    description: "Site-specific CMP hiding selectors with detection",
    source: "https://github.com/ProtoConsent/data",
    license: "GPL-3.0-or-later",
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
    order: 15,
  },
  dandelion_tracking_params: {
    name: "Dandelion Sprout Tracking Params",
    description: "Per-site URL tracking parameter stripping (Amazon, Google, Facebook...)",
    source: "https://github.com/DandelionSprout/adfilt",
    license: "Dandelicence v1.4",
    category: null,
    type: "tracking_params_sites",
    preset: "basic",
    order: 16,
  },
  // --- Regional lists (cosmetic + blocking per region) ---
  regional_cn_cosmetic: {
    name: "Regional Cosmetic - Chinese",
    description: "Element hiding rules for Chinese websites",
    source: "https://easylist.to/ + https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "cn",
    preset: null,
    order: 500,
  },
  regional_cn_blocking: {
    name: "Regional Blocking - Chinese",
    description: "Request blocking rules for Chinese websites",
    source: "https://easylist.to/ + https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "cn",
    preset: null,
    order: 501,
  },
  regional_de_cosmetic: {
    name: "Regional Cosmetic - German",
    description: "Element hiding rules for German websites",
    source: "https://easylist.to/ + https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "de",
    preset: null,
    order: 502,
  },
  regional_de_blocking: {
    name: "Regional Blocking - German",
    description: "Request blocking rules for German websites",
    source: "https://easylist.to/ + https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "de",
    preset: null,
    order: 503,
  },
  regional_nl_cosmetic: {
    name: "Regional Cosmetic - Dutch",
    description: "Element hiding rules for Dutch websites",
    source: "https://easylist.to/ + https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "nl",
    preset: null,
    order: 504,
  },
  regional_nl_blocking: {
    name: "Regional Blocking - Dutch",
    description: "Request blocking rules for Dutch websites",
    source: "https://easylist.to/ + https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "nl",
    preset: null,
    order: 505,
  },
  regional_es_cosmetic: {
    name: "Regional Cosmetic - Spanish/Portuguese",
    description: "Element hiding rules for Spanish and Portuguese websites",
    source: "https://easylist.to/ + https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "es",
    preset: null,
    order: 506,
  },
  regional_es_blocking: {
    name: "Regional Blocking - Spanish/Portuguese",
    description: "Request blocking rules for Spanish and Portuguese websites",
    source: "https://easylist.to/ + https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "es",
    preset: null,
    order: 507,
  },
  regional_fr_cosmetic: {
    name: "Regional Cosmetic - French",
    description: "Element hiding rules for French websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "fr",
    preset: null,
    order: 508,
  },
  regional_fr_blocking: {
    name: "Regional Blocking - French",
    description: "Request blocking rules for French websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "fr",
    preset: null,
    order: 509,
  },
  regional_he_cosmetic: {
    name: "Regional Cosmetic - Hebrew",
    description: "Element hiding rules for Hebrew websites",
    source: "https://easylist.to/",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "he",
    preset: null,
    order: 510,
  },
  regional_he_blocking: {
    name: "Regional Blocking - Hebrew",
    description: "Request blocking rules for Hebrew websites",
    source: "https://easylist.to/",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "he",
    preset: null,
    order: 511,
  },
  regional_it_cosmetic: {
    name: "Regional Cosmetic - Italian",
    description: "Element hiding rules for Italian websites",
    source: "https://easylist.to/",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "it",
    preset: null,
    order: 512,
  },
  regional_it_blocking: {
    name: "Regional Blocking - Italian",
    description: "Request blocking rules for Italian websites",
    source: "https://easylist.to/",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "it",
    preset: null,
    order: 513,
  },
  regional_ja_cosmetic: {
    name: "Regional Cosmetic - Japanese",
    description: "Element hiding rules for Japanese websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "ja",
    preset: null,
    order: 514,
  },
  regional_ja_blocking: {
    name: "Regional Blocking - Japanese",
    description: "Request blocking rules for Japanese websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "ja",
    preset: null,
    order: 515,
  },
  regional_lt_cosmetic: {
    name: "Regional Cosmetic - Lithuanian",
    description: "Element hiding rules for Lithuanian websites",
    source: "https://easylist.to/",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "lt",
    preset: null,
    order: 516,
  },
  regional_lt_blocking: {
    name: "Regional Blocking - Lithuanian",
    description: "Request blocking rules for Lithuanian websites",
    source: "https://easylist.to/",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "lt",
    preset: null,
    order: 517,
  },
  regional_pl_cosmetic: {
    name: "Regional Cosmetic - Polish",
    description: "Element hiding rules for Polish websites",
    source: "https://easylist.to/",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "pl",
    preset: null,
    order: 518,
  },
  regional_pl_blocking: {
    name: "Regional Blocking - Polish",
    description: "Request blocking rules for Polish websites",
    source: "https://easylist.to/",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "pl",
    preset: null,
    order: 519,
  },
  regional_ru_cosmetic: {
    name: "Regional Cosmetic - Russian",
    description: "Element hiding rules for Russian websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "ru",
    preset: null,
    order: 520,
  },
  regional_ru_blocking: {
    name: "Regional Blocking - Russian",
    description: "Request blocking rules for Russian websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "ru",
    preset: null,
    order: 521,
  },
  regional_tr_cosmetic: {
    name: "Regional Cosmetic - Turkish",
    description: "Element hiding rules for Turkish websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "tr",
    preset: null,
    order: 522,
  },
  regional_tr_blocking: {
    name: "Regional Blocking - Turkish",
    description: "Request blocking rules for Turkish websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "tr",
    preset: null,
    order: 523,
  },
  regional_uk_cosmetic: {
    name: "Regional Cosmetic - Ukrainian",
    description: "Element hiding rules for Ukrainian websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "cosmetic",
    region: "uk",
    preset: null,
    order: 524,
  },
  regional_uk_blocking: {
    name: "Regional Blocking - Ukrainian",
    description: "Request blocking rules for Ukrainian websites",
    source: "https://adguard.com",
    license: "GPL-3.0",
    category: null,
    type: "regional_blocking",
    region: "uk",
    preset: null,
    order: 525,
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
    return meta;
  } catch (e) {
    console.warn("  WARN: cannot read " + path.basename(filePath) + ": " + e.message);
    return null;
  }
}

// --- Build the complete manifest ---
function buildManifest(enhancedDir) {
  const lists = {};
  let missing = 0;

  for (const [listId, catalogDef] of Object.entries(LIST_CATALOG)) {
    const filePath = catalogDef.region
      ? path.join(enhancedDir, "regional", listId + ".json")
      : path.join(enhancedDir, listId + ".json");
    const meta = readEnhancedMetadata(filePath);

    const entry = {
      name: catalogDef.name,
      description: catalogDef.description,
      source: catalogDef.source,
      license: catalogDef.license,
      category: catalogDef.category,
      preset: catalogDef.preset,
      fetch_url: catalogDef.region
        ? CDN_BASE + "regional/" + listId + ".json"
        : CDN_BASE + listId + ".json",
    };

    if (catalogDef.type) entry.type = catalogDef.type;
    if (catalogDef.order !== undefined) entry.order = catalogDef.order;
    if (catalogDef.region) entry.region = catalogDef.region;

    if (meta) {
      entry.version = meta.version;
      entry.generated = meta.generated;
      entry.domain_count = meta.domain_count;
      entry.path_rule_count = meta.path_rule_count;
      if (meta.generic_count !== undefined) entry.generic_count = meta.generic_count;
      if (meta.domain_rule_count !== undefined) entry.domain_rule_count = meta.domain_rule_count;
      if (meta.cmp_count !== undefined) entry.cmp_count = meta.cmp_count;
      if (meta.param_count !== undefined) entry.param_count = meta.param_count;
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
  const outputDir = args.includes("--output") ? args[args.indexOf("--output") + 1] : path.join(__dirname, "..", "config");
  const dryRun = args.includes("--dry-run");
  const enhancedDir = path.join(__dirname, "..", "enhanced");

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
      if (entry.type === "cosmetic") {
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

    // Generate bundled version without regional entries (for extension packaging)
    const bundledLists = {};
    for (const [id, entry] of Object.entries(manifest.lists)) {
      if (!entry.region) bundledLists[id] = entry;
    }
    const bundledManifest = { manifest_version: manifest.manifest_version, generated: manifest.generated, lists: bundledLists };
    const bundledJson = JSON.stringify(bundledManifest, null, 2);
    const bundledPath = path.join(outputDir, "enhanced-lists-bundled.json");
    fs.writeFileSync(bundledPath, bundledJson + "\n", "utf-8");
    const bundledSizeKb = (Buffer.byteLength(bundledJson) / 1024).toFixed(1);
    console.log("  → " + bundledPath + " (" + bundledSizeKb + " KB, no regional)");
  }

  if (missing > 0) {
    console.warn("\nWARN: " + missing + " enhanced file(s) missing");
    process.exit(1);
  }
}

main();
