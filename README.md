# ProtoConsent - Data

<p align="center">
  <img src="https://github.com/ProtoConsent/ProtoConsent/blob/main/design/assets/logo/protoconsent_logo.png" alt="ProtoConsent logo" width="160">
</p>

<p align="center"><strong>Consent you can express, enforce and observe</strong></p>

<p align="center"><em>User-side, purpose-based consent for the web</em></p>

Pre-built data files consumed by the [ProtoConsent](https://github.com/ProtoConsent/ProtoConsent) browser extension. See the main repo for full documentation.

## Contents

The `enhanced/` directory contains all list data, organized by source and function:

```
enhanced/
  protoconsent/           # ProtoConsent domain, CMP and security lists
  external/               # Third-party lists (EasyList, AdGuard, etc.)
  regional/               # Region-specific blocking and cosmetic rules
```

| Group | Files | Description |
|-------|-------|-------------|
| [Blocking lists](#blocking-lists) | 13 JSON files | Domain and path-based request blocking (6 core + 7 third-party) |
| [Cosmetic filtering](#cosmetic-filtering) | 1 JSON file | CSS element-hiding selectors from EasyList |
| [CMP banner handling](#cmp-banner-handling) | 3 JSON files | Cookie consent banner auto-response, detection and hiding |
| [CNAME tracker detection](#cname-tracker-detection) | 1 JSON file | Informational CNAME cloaking lookup map |
| [URL tracking parameter stripping](#url-tracking-parameter-stripping) | 2 JSON files | Global and per-site tracking parameter removal |
| [Regional lists](#regional-lists) | 26 JSON files | Region-specific blocking and cosmetic rules (13 regions x 2) |

All files are served via jsDelivr CDN. The extension fetches them at runtime when the user enables Enhanced Protection.

## Blocking lists

### ProtoConsent Core

Purpose-based lists curated from 18 upstream sources via the classifier pipeline. These are delta lists containing only domains not already in the extension's static rulesets (58,094 bundled domains). Combined with the bundle, they provide 185,763 total domain rules across 6 purpose categories.

| File | Category | License | Domains | Path rules |
|---|---|---|---|---|
| `protoconsent_ads.json` | `ads` | GPL-3.0-or-later | 78,532 | 533 |
| `protoconsent_analytics.json` | `analytics` | GPL-3.0-or-later | 24,481 | 562 |
| `protoconsent_personalization.json` | `personalization` | GPL-3.0-or-later | 212 | 14 |
| `protoconsent_third_parties.json` | `third_parties` | GPL-3.0-or-later | 486 | 110 |
| `protoconsent_advanced_tracking.json` | `advanced_tracking` | GPL-3.0-or-later | 1,576 | 30 |
| `protoconsent_security.json` | `security` | GPL-3.0-or-later | 22,382 | - |

### Third-party blocking lists

Compiled from public blocklists by the conversion pipeline.

| File | Source | License | Domains | Path rules |
|---|---|---|---|---|
| `easyprivacy.json` | [EasyPrivacy](https://easylist.to/) | GPL-3.0+ / CC BY-SA 3.0+ | ~46K | ~4K |
| `easylist.json` | [EasyList](https://easylist.to/) | GPL-3.0+ / CC BY-SA 3.0+ | ~58K | ~1.6K |
| `adguard_dns.json` | [AdGuard DNS Filter](https://github.com/AdguardTeam/AdGuardSDNSFilter) | GPL-3.0 | ~165K | - |
| `oisd_small.json` | [OISD Small](https://oisd.nl/) | GPL-3.0 | ~56K | - |
| `hagezi_pro.json` | [HaGeZi Pro](https://github.com/hagezi/dns-blocklists) | GPL-3.0 | ~190K | - |
| `blp_crypto.json` | [Blocklist Project - Crypto](https://github.com/blocklistproject/Lists) | Unlicense | ~24K | - |
| `blp_phishing.json` | [Blocklist Project - Phishing](https://github.com/blocklistproject/Lists) | Unlicense | ~87K | - |

Domain counts are exact as of 2026-04-18 and change with each upstream update.

## Cosmetic filtering

**`enhanced/external/easylist_cosmetic.json`** - Cosmetic filtering selectors extracted from [EasyList](https://easylist.to/) (GPL-3.0+ / CC BY-SA 3.0+). Contains ~13K generic and ~7.5K domain-specific CSS element-hiding selectors. This is a cosmetic list: it does not generate blocking rules. The extension compiles these selectors into CSS and injects them via a content script to hide ad containers and banners left empty after network-level blocking. A snapshot is also bundled in the extension package for first-install availability.

## CMP banner handling

**`enhanced/protoconsent/protoconsent_cmp_signatures.json`** - CMP auto-response templates for cookie consent banners (GPL-3.0-or-later). Contains 31 banner handler signatures covering major CMPs, with full cookie injection, cosmetic hiding, and scroll-unlock support. The pipeline augments these signatures with prehide CSS selectors extracted from [Autoconsent](https://github.com/duckduckgo/autoconsent) (MPL-2.0, DuckDuckGo) for faster banner hiding. The extension injects all signatures at `document_start` to dismiss consent banners according to the user's purpose preferences. A snapshot is also bundled in the extension package for first-install availability. Listed as **ProtoConsent Banners** in the UI.

**`enhanced/protoconsent/protoconsent_cmp_detectors.json`** - CMP presence-detection selectors extracted from [Autoconsent](https://github.com/duckduckgo/autoconsent) (MPL-2.0). Contains ~290 CMP detection rules with CSS selectors for `present` (CMP loaded) and `showing` (banner visible) states. Filtered through `config/cmp-safelist.json` to remove dangerous or overly generic selectors. Entries with site-specific names include a `domains` field for scoped matching. Used by the extension's CMP detection feature at `document_idle`. A snapshot is also bundled in the extension package.

**`enhanced/protoconsent/protoconsent_cmp_signatures_site.json`** - Site-specific CMP hiding selectors extracted from [Autoconsent](https://github.com/duckduckgo/autoconsent) (MPL-2.0). Contains ~237 CMP entries with CSS hiding selectors and detection selectors, scoped to specific websites via the `domains` field. These selectors are too generic to apply globally but safe when limited to their target site. Filtered through `config/cmp-safelist.json`. Applied by the extension only after CMP detection confirms the banner is present. A snapshot is also bundled in the extension package.

## CNAME tracker detection

**`enhanced/external/cname_trackers.json`** - CNAME cloaking lookup map compiled from [AdGuard CNAME Trackers](https://github.com/AdguardTeam/cname-trackers) (MIT). Contains ~229K disguised domains mapped to their tracker destinations. This is an informational list: it does not generate blocking rules. The extension uses it to flag CNAME-cloaked domains in the Log tab.

## URL tracking parameter stripping

**`enhanced/external/adguard_tracking_params.json`** - Global URL tracking parameter stripping compiled from [AdGuard TrackParamFilter](https://github.com/AdguardTeam/AdguardFilters) (GPL-3.0). Contains ~304 literal `$removeparam` parameter names (e.g. `utm_source`, `fbclid`, `gclid`, `msclkid`). The extension uses these to build a static DNR `redirect` ruleset with `queryTransform.removeParams`, stripping tracking parameters from navigation URLs without blocking the request.

**`enhanced/external/dandelion_tracking_params.json`** - Per-site URL tracking parameter stripping compiled from [AdGuard TrackParamFilter](https://github.com/AdguardTeam/AdguardFilters) (GPL-3.0) and [Dandelion Sprout's Legitimate URL Shortener Tool](https://github.com/DandelionSprout/adfilt) (Dandelicence v1.4). Contains ~1,814 site-specific parameters across ~879 domains (e.g. Amazon, Google, Facebook). Parameters that already appear in the global list are excluded. The extension merges all per-site parameters into a single static DNR `redirect` ruleset scoped by `requestDomains`.

## Regional lists

Regional cosmetic and blocking lists in `enhanced/regional/`, compiled from [EasyList](https://easylist.to/) regional supplements (GPL-3.0+) and [AdGuard](https://github.com/AdguardTeam/AdguardFilters) language-specific filters (GPL-3.0). Two files per region: `regional_<code>_cosmetic.json` (element hiding rules) and `regional_<code>_blocking.json` (domain and path blocking rules).

| Region | Code | Sources |
|--------|------|---------|
| Chinese | `cn` | EasyList China + AdGuard Chinese |
| German | `de` | EasyList Germany + AdGuard German |
| Dutch | `nl` | EasyList Dutch + AdGuard Dutch |
| Spanish/Portuguese | `es` | EasyList Spanish + EasyList Portuguese + AdGuard Spanish/Portuguese |
| French | `fr` | AdGuard French |
| Hebrew | `he` | EasyList Hebrew |
| Italian | `it` | EasyList Italy |
| Japanese | `ja` | AdGuard Japanese |
| Lithuanian | `lt` | EasyList Lithuania |
| Polish | `pl` | EasyList Polish |
| Russian | `ru` | AdGuard Russian |
| Turkish | `tr` | AdGuard Turkish |
| Ukrainian | `uk` | AdGuard Ukrainian |

Regional lists appear in both the bundled and remote catalog as 2 aggregated entries (`regional_cosmetic` and `regional_blocking`) with `fetch_base` and `regions` fields instead of individual `fetch_url` entries. The extension's fetch handler reads the user's selected regions and downloads individual per-region files from `enhanced/regional/`, merging them at runtime. The user must enable Enhanced Protection and select regions.

## Scripts

All scripts are in `scripts/`. Requires Node.js 18+. No dependencies.

| Script | Description |
|--------|-------------|
| `convert.js` | Fetches upstream blocklists, parses them (ABP, hosts, and plain domain formats), deduplicates, and outputs JSON blocking files. |
| `convert-cosmetic.js` | Fetches EasyList, extracts `##` element-hiding rules (generic and domain-specific CSS selectors), filters out procedural selectors, and outputs a cosmetic JSON file. |
| `convert-cname.js` | Fetches AdGuard's CNAME tracker lists, merges the 5 categories (trackers, ads, clickthroughs, mail_trackers, microsites), and outputs an indexed lookup map. |
| `convert-autoconsent.js` | Fetches [Autoconsent](https://github.com/duckduckgo/autoconsent) rule files from GitHub, extracts prehide selectors, detectCmp/detectPopup selectors, and builds three output files. Applies `config/cmp-safelist.json` filtering and domain matching. Uses a tree hash cache to skip re-fetching when upstream hasn't changed. |
| `convert-tracking-params.js` | Fetches [AdGuard TrackParamFilter](https://github.com/AdguardTeam/AdguardFilters) and [Dandelion Sprout's Legitimate URL Shortener Tool](https://github.com/DandelionSprout/adfilt), extracts literal `$removeparam` names (skips regex), separates global vs. per-site, and outputs two JSON files. |
| `convert-regional.js` | Fetches EasyList regional supplements and AdGuard language-specific filters, extracts both blocking and cosmetic rules, merges sources per region, deduplicates, and outputs two JSON files per region to `enhanced/regional/`. |
| `generate-manifest.js` | Reads metadata from all `enhanced/protoconsent/*.json`, `enhanced/external/*.json` and `enhanced/regional/*.json` files, merges with the list catalog, aggregates per-region metadata into 2 catalog entries (`regional_cosmetic` and `regional_blocking`), and outputs `config/enhanced-lists.json` (full catalog for CDN and extension packaging). |

```bash
node scripts/convert.js                    # fetch all blocklists, output to ./enhanced/external/
node scripts/convert.js --list hagezi_pro  # fetch one blocklist
node scripts/convert.js --dry-run          # show stats without writing
node scripts/convert-cosmetic.js           # fetch EasyList cosmetic rules → enhanced/external/
node scripts/convert-cname.js              # fetch CNAME list → enhanced/external/
node scripts/convert-autoconsent.js        # build CMP signatures → enhanced/protoconsent/
node scripts/convert-tracking-params.js    # fetch tracking param lists → enhanced/external/
node scripts/convert-regional.js           # fetch all regional lists → enhanced/regional/
node scripts/convert-regional.js --region es  # fetch one region
node scripts/generate-manifest.js          # rebuild config/enhanced-lists.json from enhanced/ metadata
```

## Configuration

**`config/enhanced-lists.json`** - Catalog of all available Enhanced lists including regional entries. The extension fetches this file from CDN to discover lists, their metadata (name, category, preset, version, domain count, region), and their `fetch_url` for downloading. It is regenerated automatically by `generate-manifest.js` after each list refresh. A copy of this file is also shipped inside the extension as `extension/config/enhanced-lists.json` for offline fallback. The extension merges the remote catalog on top of the local copy on startup if the user accepts it.

## JSON formats

### Blocklists

```json
{
  "version": "2026-04-06",
  "list_id": "easyprivacy",
  "generated": "2026-04-06T...",
  "domain_count": 46123,
  "path_rule_count": 3456,
  "rules": [
    { "condition": { "requestDomains": ["tracker.example.com", "..."] } },
    { "condition": { "urlFilter": "||example.com/tracking/pixel" } }
  ]
}
```

The extension reads `rules[].condition` and creates `declarativeNetRequest` dynamic rules from them.

### Tracking parameter lists

Global (`tracking_params`):

```json
{
  "version": "2026-04-14",
  "type": "tracking_params",
  "param_count": 304,
  "params": ["_ga", "_gl", "fbclid", "gclid", "msclkid", "utm_campaign", "..."]
}
```

Per-site (`tracking_params_sites`):

```json
{
  "version": "2026-04-14",
  "type": "tracking_params_sites",
  "param_count": 1814,
  "domain_count": 879,
  "sites": {
    "amazon.com": ["tag", "linkCode", "..."],
    "google.com": ["ei", "gs_lcp", "..."]
  }
}
```

The extension uses these to build static DNR `redirect` rulesets with `queryTransform.removeParams`. Parameters are stripped from navigation URLs silently - no blocking, no badge increment.

### CNAME lookup map

```json
{
  "version": "2026-04-06",
  "generated": "2026-04-06T...",
  "domain_count": 229037,
  "tracker_count": 244,
  "trackers": ["adjust.com", "adobe.com", "..."],
  "map": { "disguised.example.com": 0, "...": 1 }
}
```

The `trackers` array stores tracker destination names once. The `map` uses numeric indices into `trackers` instead of repeating strings, reducing file size from ~10.7 MB to ~7.9 MB.

### CMP signatures

```json
{
  "version": "2026-04-12",
  "type": "cmp",
  "generated": "2026-04-12T...",
  "cmp_count": 31,
  "source_tree_hash": "9d88488e86b6b046",
  "signatures": {
    "onetrust": {
      "cookie": [{ "name": "OptanonConsent", "template": "..." }],
      "purposeMap": { "analytics": "2", "ads": "4" },
      "format": { "allow": "1", "deny": "0" },
      "selector": "#onetrust-banner-sdk, #onetrust-consent-sdk, ...",
      "lockClass": "ot-sdk-show-settings"
    }
  }
}
```

Signatures with `cookie`, `purposeMap`, `format`, and `lockClass` are hand-maintained and support all three layers: cookie injection, cosmetic hiding, and scroll unlock. Hand-maintained signatures may also include prehide selectors from [Autoconsent](https://github.com/duckduckgo/autoconsent) (MPL-2.0) merged into their `selector` field. Unlike blocklists and cosmetic rules, the core CMP signatures are not generated from upstream sources.

## Regenerating

```bash
node scripts/convert.js
node scripts/convert-cosmetic.js
node scripts/convert-cname.js
node scripts/convert-autoconsent.js
node scripts/convert-tracking-params.js
node scripts/convert-regional.js
node scripts/generate-manifest.js
```

Requires Node.js 18+. No dependencies.

## License

GPL-3.0-or-later - see [LICENSE](LICENSE).

The generated JSON files contain data derived from upstream sources under their respective licenses (see table above and [CREDITS.md](CREDITS.md)). CMP detection and hiding selectors from Autoconsent are used under the MPL-2.0 license.
