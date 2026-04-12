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
    const filePath = path.join(enhancedDir, listId + ".json");
    const meta = readEnhancedMetadata(filePath);

    const entry = {
      name: catalogDef.name,
      description: catalogDef.description,
      source: catalogDef.source,
      license: catalogDef.license,
      category: catalogDef.category,
      preset: catalogDef.preset,
      fetch_url: CDN_BASE + listId + ".json",
    };

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
