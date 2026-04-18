#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// CNAME cloaking tracker map generator
// Fetches AdGuard's CNAME tracker lists (MIT) and merges into a single
// lookup map: { disguised_domain: real_tracker_domain }
//
// Usage:
//   node convert-cname.js              # fetch all, output to ./enhanced/
//   node convert-cname.js --output dir # custom output dir
//   node convert-cname.js --dry-run    # show stats without writing

const fs = require("fs");
const path = require("path");
const https = require("https");

// --- AdGuard CNAME tracker sources (MIT license) ---
const BASE = "https://raw.githubusercontent.com/AdguardTeam/cname-trackers/master/data";
const CATEGORIES = [
  { id: "trackers",      url: BASE + "/combined_disguised_trackers.json" },
  { id: "ads",           url: BASE + "/combined_disguised_ads.json" },
  { id: "clickthroughs", url: BASE + "/combined_disguised_clickthroughs.json" },
  { id: "mail_trackers",  url: BASE + "/combined_disguised_mail_trackers.json" },
  { id: "microsites",    url: BASE + "/combined_disguised_microsites.json" },
];

// --- Fetch with redirect support ---
function fetchUrl(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "ProtoConsent-CNAME-Converter/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error("Too many redirects"));
        return resolve(fetchUrl(res.headers.location, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const outputDir = args.includes("--output") ? args[args.indexOf("--output") + 1] : path.join(__dirname, "..", "enhanced");
  const dryRun = args.includes("--dry-run");

  const map = {};
  const stats = [];

  for (const cat of CATEGORIES) {
    process.stdout.write("Fetching " + cat.id + "... ");
    try {
      const raw = await fetchUrl(cat.url);
      const data = JSON.parse(raw);
      const count = Object.keys(data).length;
      console.log(count.toLocaleString() + " entries");

      for (const [disguised, tracker] of Object.entries(data)) {
        if (!map[disguised]) map[disguised] = tracker;
      }

      stats.push({ id: cat.id, count });
    } catch (err) {
      console.error("FAILED: " + err.message);
      stats.push({ id: cat.id, error: err.message });
    }
  }

  const totalDomains = Object.keys(map).length;
  const today = new Date().toISOString().slice(0, 10);

  // Index tracker destinations to avoid repeating strings 229K times
  const trackerSet = [...new Set(Object.values(map))].sort();
  const trackerIndex = {};
  trackerSet.forEach((t, i) => { trackerIndex[t] = i; });
  const indexedMap = {};
  for (const [disguised, tracker] of Object.entries(map)) {
    indexedMap[disguised] = trackerIndex[tracker];
  }

  const output = JSON.stringify({
    version: today,
    generated: new Date().toISOString(),
    source: "https://github.com/AdguardTeam/cname-trackers",
    license: "MIT",
    domain_count: totalDomains,
    tracker_count: trackerSet.length,
    trackers: trackerSet,
    map: indexedMap,
  }, null, 0);

  console.log("\n--- Summary ---");
  for (const s of stats) {
    if (s.error) {
      console.log("  " + s.id + ": ERROR — " + s.error);
    } else {
      console.log("  " + s.id + ": " + s.count.toLocaleString() + " entries");
    }
  }
  console.log("  Total (deduplicated): " + totalDomains.toLocaleString() + " domains");

  // Exit 1 if every category failed (partial success is OK for CI)
  const succeeded = stats.filter(s => !s.error).length;
  if (succeeded === 0 && stats.length > 0) {
    process.exit(1);
  }

  if (!dryRun) {
    const extDir = path.join(outputDir, "external");
    fs.mkdirSync(extDir, { recursive: true });
    const outPath = path.join(extDir, "cname_trackers.json");
    fs.writeFileSync(outPath, output, "utf-8");
    const sizeMb = (Buffer.byteLength(output) / 1024 / 1024).toFixed(1);
    console.log("  → " + outPath + " (" + sizeMb + " MB)");
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
