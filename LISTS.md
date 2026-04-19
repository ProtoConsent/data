# ProtoConsent Data - List reference

Technical reference for all data files in this repository. For a high-level overview, see [README.md](README.md).

## Directory structure

```
enhanced/
  protoconsent/           # ProtoConsent domain, CMP and security lists
  external/               # Third-party lists (EasyList, AdGuard, etc.)
  regional/               # Region-specific blocking and cosmetic rules

lists/                    # Full merged lists (bundle + delta)
  abp/                    # ABP filter syntax (uBlock Origin, Adblock Plus, Ghostery)
  adguard/                # AdGuard filter syntax (AdGuard browser extension)
  hosts/                  # 0.0.0.0 domain format (Pi-hole, AdGuard Home)
  domains/                # Plain domain list (NextDNS, ControlD, RethinkDNS)
  json/                   # Structured JSON with domains, paths, metadata (MV3 extensions)
```

## Blocking lists

### ProtoConsent Core (delta)

Purpose-based lists curated from 18 upstream sources via the classifier pipeline. These are delta lists containing only domains not already in the extension's static rulesets (58,094 bundled domains). Combined with the bundle, they provide full coverage across 6 purpose categories.

| File | Category | License | Description |
|------|----------|---------|-------------|
| `protoconsent_ads.json` | `ads` | GPL-3.0-or-later | Advertising networks and ad servers |
| `protoconsent_analytics.json` | `analytics` | GPL-3.0-or-later | Analytics and measurement services |
| `protoconsent_personalization.json` | `personalization` | GPL-3.0-or-later | Personalization and A/B testing |
| `protoconsent_third_parties.json` | `third_parties` | GPL-3.0-or-later | Third-party embeds and social widgets |
| `protoconsent_advanced_tracking.json` | `advanced_tracking` | GPL-3.0-or-later | Fingerprinting and advanced tracking |
| `protoconsent_security.json` | `security` | GPL-3.0-or-later | Phishing, scam and malware domains |

### Third-party blocking lists

Compiled from public blocklists by the conversion pipeline.

| File | Source | License |
|------|--------|---------|
| `easyprivacy.json` | [EasyPrivacy](https://easylist.to/) | GPL-3.0+ / CC BY-SA 3.0+ |
| `easylist.json` | [EasyList](https://easylist.to/) | GPL-3.0+ / CC BY-SA 3.0+ |
| `adguard_dns.json` | [AdGuard DNS Filter](https://github.com/AdguardTeam/AdGuardSDNSFilter) | GPL-3.0 |
| `oisd_small.json` | [OISD Small](https://oisd.nl/) | GPL-3.0 |
| `hagezi_pro.json` | [HaGeZi Pro](https://github.com/hagezi/dns-blocklists) | GPL-3.0 |
| `blp_crypto.json` | [Blocklist Project - Crypto](https://github.com/blocklistproject/Lists) | Unlicense |
| `blp_phishing.json` | [Blocklist Project - Phishing](https://github.com/blocklistproject/Lists) | Unlicense |

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

Regional lists appear in both the bundled and remote catalog as 2 aggregated entries (`regional_cosmetic` and `regional_blocking`) with `fetch_base` and `regions` fields instead of individual `fetch_url` entries. The extension's fetch handler reads the user's selected regions and downloads individual per-region files from `enhanced/regional/`, merging them at runtime.

## Configuration

**`config/enhanced-lists.json`** - Catalog of all available Enhanced lists including regional entries. The extension fetches this file from CDN to discover lists, their metadata (name, category, preset, version, domain count, region), and their `fetch_url` for downloading. It is regenerated automatically by `generate-manifest.js` after each list refresh. A copy of this file is also shipped inside the extension as `extension/config/enhanced-lists.json` for offline fallback. The extension merges the remote catalog on top of the local copy on startup if the user accepts it.

## JSON formats

### Blocklists (enhanced)

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

### Full lists (`lists/`)

```json
{
  "name": "ProtoConsent Ads",
  "version": "2026-04-19",
  "generated": "2026-04-19T...",
  "description": "Full merged ads blocklist (bundle + enhanced delta)",
  "homepage": "https://github.com/ProtoConsent/data",
  "license": "GPL-3.0-or-later",
  "domains": ["example-ad.com", "..."],
  "domain_count": 103328,
  "paths": ["||google.com/adsense/", "..."],
  "path_count": 1645
}
```

Flat domain and path arrays. Domains sorted, deduplicated. Paths as urlFilter strings. Also available as ABP, AdGuard, hosts, and plain domain formats in `lists/`.

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
