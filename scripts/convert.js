#!/usr/bin/env node
// ProtoConsent browser extension
// Copyright (C) 2026 ProtoConsent contributors
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Enhanced lists converter for ProtoConsent
// Fetches blocklists from their sources, parses, and outputs JSON
// compatible with the extension's FETCH handler.
//
// Usage:
//   node convert.js                    # fetch all, output to ./output/
//   node convert.js --list hagezi_pro  # fetch one list
//   node convert.js --output ../path   # custom output dir
//   node convert.js --dry-run          # show stats without writing

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// --- List definitions -------------------------------------------------------------------
const LISTS = {
  easyprivacy: {
    name: "EasyPrivacy",
    url: "https://easylist.to/easylist/easyprivacy.txt",
    format: "abp",
  },
  easylist: {
    name: "EasyList",
    url: "https://easylist.to/easylist/easylist.txt",
    format: "abp",
  },
  steven_black: {
    name: "Steven Black Unified",
    url: "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
    format: "hosts",
  },
  adguard_dns: {
    name: "AdGuard DNS Filter",
    url: "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt",
    format: "abp",
  },
  oisd_small: {
    name: "OISD small",
    url: "https://small.oisd.nl/domainswild2",
    format: "domains",
  },
  hagezi_pro: {
    name: "HaGeZi Pro",
    url: "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/pro.txt",
    format: "domains",
  },
  hagezi_tif: {
    name: "HaGeZi TIF",
    url: "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/tif.txt",
    format: "domains",
  },
};

// --- Fetch with redirect support -------------------------------------------
function fetchUrl(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    proto.get(url, { headers: { "User-Agent": "ProtoConsent-ListConverter/1.0" } }, (res) => {
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

// --- Parsers -------------------------------------------

// Valid domain: letters, digits, hyphens, dots. At least one dot.
function isValidDomain(d) {
  if (!d || d.length > 253) return false;
  return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(\.[a-z]{2,})$/i.test(d);
}

// Clean and deduplicate domains, remove subdomains covered by parents
function cleanDomains(domains) {
  const unique = [...new Set(domains.map(d => d.toLowerCase()))];
  const valid = unique.filter(isValidDomain);

  // Sort shortest first so parents are processed before children
  valid.sort((a, b) => a.length - b.length);

  // Remove subdomains whose parent is already in the set
  // (DNR requestDomains matches all subdomains automatically)
  const kept = new Set();
  const result = [];
  for (const d of valid) {
    let dominated = false;
    let parent = d;
    while (true) {
      const dot = parent.indexOf(".");
      if (dot < 0) break;
      parent = parent.slice(dot + 1);
      if (!parent.includes(".")) break; // don't go to TLD
      if (kept.has(parent)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) {
      kept.add(d);
      result.push(d);
    }
  }

  return result.sort();
}

// Parse plain domain list (one domain per line)
function parseDomains(text) {
  const domains = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;
    // Handle wildcard prefix from OISD domainswild format
    const domain = trimmed.replace(/^\*\./, "");
    if (domain) domains.push(domain);
  }
  return cleanDomains(domains);
}

// Parse hosts file format (Steven Black): "0.0.0.0 domain" or "127.0.0.1 domain"
function parseHosts(text) {
  const domains = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    // Match: 0.0.0.0 domain or 127.0.0.1 domain
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && (parts[0] === "0.0.0.0" || parts[0] === "127.0.0.1")) {
      const domain = parts[1];
      if (domain && domain !== "localhost" && domain !== "0.0.0.0") {
        domains.push(domain);
      }
    }
  }
  return cleanDomains(domains);
}

// Parse ABP/Adblock filter list — extract domain blocks AND path-based blocks.
// Domain blocks: ||domain.com^ → requestDomains
// Path blocks:   ||domain.com/path^ → urlFilter
// Skips: exception rules (@@), element hiding (##), regex, non-third-party
function parseAbp(text) {
  // domain-only: ||domain^  or  ||domain^$options
  const domainRegex = /^\|\|([a-z0-9][a-z0-9.-]*[a-z0-9]\.[a-z]{2,})\^(\$.*)?$/i;
  // path-based: ||domain/path^ or ||domain/path^$options or ||domain/path$options
  const pathRegex = /^\|\|([a-z0-9][a-z0-9.-]*[a-z0-9]\.[a-z]{2,}\/[^\s^$]+)\^?(\$.*)?$/i;

  const domains = [];
  const pathRules = [];
  const seenPaths = new Set();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("!") || trimmed.startsWith("[") || trimmed.startsWith("@@")) continue;
    // Skip element hiding / cosmetic filters
    if (trimmed.includes("##") || trimmed.includes("#@#") || trimmed.includes("#?#")) continue;
    // Skip regex rules
    if (trimmed.startsWith("/") && trimmed.endsWith("/")) continue;

    // Check options — skip rules restricted to specific domains or types we can't enforce
    const dollarIdx = trimmed.indexOf("$");
    let options = "";
    if (dollarIdx !== -1) {
      options = trimmed.slice(dollarIdx + 1).toLowerCase();
      // Skip if limited to specific first-party domains (domain=)
      if (options.includes("domain=")) continue;
      // Skip if not applicable to sub_frame/xmlhttprequest (popup-only, etc.)
      if (options.includes("popup") && !options.includes("script") && !options.includes("xmlhttprequest")) continue;
    }

    // Try domain-only match first
    const domainMatch = trimmed.match(domainRegex);
    if (domainMatch) {
      domains.push(domainMatch[1]);
      continue;
    }

    // Try path-based match
    const pathMatch = trimmed.match(pathRegex);
    if (pathMatch) {
      const fullPath = pathMatch[1]; // e.g. "example.com/tracking/pixel"
      const urlFilter = "||" + fullPath;
      if (!seenPaths.has(urlFilter)) {
        seenPaths.add(urlFilter);
        pathRules.push({ urlFilter });
      }
    }
  }

  return {
    domains: cleanDomains(domains),
    pathRules,
  };
}

// --- Output generation -------------------------------------------
function generateJson(listId, domains, pathRules) {
  const today = new Date().toISOString().slice(0, 10);
  const rules = [];

  if (domains.length > 0) {
    rules.push({
      condition: {
        requestDomains: domains,
      },
    });
  }

  for (const pr of pathRules) {
    rules.push({
      condition: {
        urlFilter: pr.urlFilter,
      },
    });
  }

  return JSON.stringify({
    version: today,
    list_id: listId,
    generated: new Date().toISOString(),
    domain_count: domains.length,
    path_rule_count: pathRules.length,
    rules,
  }, null, 0);
}

// --- Main -------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const listFilter = args.includes("--list") ? args[args.indexOf("--list") + 1] : null;
  const outputDir = args.includes("--output") ? args[args.indexOf("--output") + 1] : path.join(__dirname, "..", "enhanced");
  const dryRun = args.includes("--dry-run");

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ids = listFilter ? [listFilter] : Object.keys(LISTS);
  const stats = [];

  for (const id of ids) {
    const def = LISTS[id];
    if (!def) {
      console.error("Unknown list: " + id);
      continue;
    }

    process.stdout.write("Fetching " + def.name + "... ");

    try {
      const raw = await fetchUrl(def.url);
      const rawLines = raw.split("\n").length;
      process.stdout.write(rawLines.toLocaleString() + " lines → ");

      let domains;
      let pathRules = [];

      if (def.format === "abp") {
        const result = parseAbp(raw);
        domains = result.domains;
        pathRules = result.pathRules;
      } else if (def.format === "hosts") {
        domains = parseHosts(raw);
      } else {
        domains = parseDomains(raw);
      }

      let summary = domains.length.toLocaleString() + " domains";
      if (pathRules.length > 0) {
        summary += " + " + pathRules.length.toLocaleString() + " path rules";
      }
      console.log(summary);

      stats.push({ id, name: def.name, rawLines, domains: domains.length, pathRules: pathRules.length });

      if (!dryRun) {
        const json = generateJson(id, domains, pathRules);
        const outPath = path.join(outputDir, id + ".json");
        fs.writeFileSync(outPath, json, "utf-8");
        const sizeMb = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);
        console.log("  → " + outPath + " (" + sizeMb + " MB)");
      }
    } catch (err) {
      console.error("FAILED: " + err.message);
      stats.push({ id, name: def.name, error: err.message });
    }
  }

  // Summary
  console.log("\n--- Summary ---");
  let totalDomains = 0;
  let totalPaths = 0;
  for (const s of stats) {
    if (s.error) {
      console.log("  " + s.name + ": ERROR — " + s.error);
    } else {
      let line = "  " + s.name + ": " + s.domains.toLocaleString() + " domains";
      if (s.pathRules > 0) line += " + " + s.pathRules.toLocaleString() + " path rules";
      line += " (from " + s.rawLines.toLocaleString() + " lines)";
      console.log(line);
      totalDomains += s.domains;
      totalPaths += s.pathRules;
    }
  }
  let totalLine = "  Total: " + totalDomains.toLocaleString() + " domains";
  if (totalPaths > 0) totalLine += " + " + totalPaths.toLocaleString() + " path rules";
  totalLine += " across " + stats.filter(s => !s.error).length + " lists";
  console.log(totalLine);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
