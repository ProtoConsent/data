# ProtoConsent Data - List reference

For a high-level overview and subscription URLs, see [README.md](README.md).

## Directory structure

```
lists/                    # Ready-to-use blocklists (subscribe to these)
  abp/                    # uBlock Origin, Adblock Plus, Ghostery
  adguard/                # AdGuard browser extension
  hosts/                  # Pi-hole, AdGuard Home, /etc/hosts
  domains/                # Plain domain list, one per line
  json/                   # MV3 browser extensions, custom tools

bundle/                   # Curated domains used to generate lists/
enhanced/                 # ProtoConsent extension data (see below)
```

## Blocklists

### Available lists

Blocklists in 5 formats, ready to subscribe. Available as 6 per-purpose lists and 2 combined profiles (Core, Full).

| Profile | Included purposes |
|---------|-------------------|
| Core (`protoconsent_core`) | ads, analytics, personalization, third_parties, advanced_tracking |
| Full (`protoconsent_full`) | All 6 purposes including security |

Each list comes in two versions:

- **Standard** (no suffix) - Curated set with lower false-positive risk.
- **Extended** (`_extended` suffix) - Broader coverage with more domains, but higher chance of overblocking.

### ABP and AdGuard modifiers

The ABP and AdGuard formats include blocking modifiers per domain:

| Purpose | ABP modifier | AdGuard modifier | Effect |
|---------|-------------|-----------------|--------|
| ads, analytics, personalization, third_parties, advanced_tracking | `$third-party` | `$third-party` | Blocks only when loaded by a different site |
| security | `$document` | `$all` | Blocks in all contexts including direct navigation |

Combined profiles apply the right modifier per domain automatically: Core uses `$third-party` on all domains, Full uses `$third-party` on tracker domains and `$document`/`$all` on security domains.

### JSON format

Per-purpose lists (standard and extended):

```json
{
  "name": "ProtoConsent Ads",
  "version": "2026-04-19",
  "generated": "2026-04-19T...",
  "description": "Advertising... (curated)",
  "homepage": "https://github.com/ProtoConsent/data",
  "license": "GPL-3.0-or-later",
  "domains": ["example-ad.com", "..."],
  "domain_count": 41891,
  "paths": ["||google.com/adsense/", "..."],
  "path_count": 529
}
```

Combined profile lists also include an `included_purposes` field. Domains are deduplicated across purposes.

### Source data

The lists above are generated from two sets of source data:

- **`bundle/`** - Curated domains that form the standard lists.
- **`enhanced/protoconsent/`** - Additional domains. Combined with the bundle, these form the extended lists.

---

## ProtoConsent extension data

Everything below is used by the [ProtoConsent browser extension](https://github.com/ProtoConsent/ProtoConsent). The extension fetches these files from CDN when the user enables Enhanced Protection.

### Third-party blocking lists

Compiled from public blocklists. Located in `enhanced/external/`.

| File | Source | License |
|------|--------|---------|
| `easyprivacy.json` | [EasyPrivacy](https://easylist.to/) | GPL-3.0+ / CC BY-SA 3.0+ |
| `easylist.json` | [EasyList](https://easylist.to/) | GPL-3.0+ / CC BY-SA 3.0+ |
| `fanboy_social.json` | [Fanboy Social](https://easylist.to/) | GPL-3.0+ / CC BY-SA 3.0+ |
| `adguard_dns.json` | [AdGuard DNS Filter](https://github.com/AdguardTeam/AdGuardSDNSFilter) | GPL-3.0 |
| `oisd_small.json` | [OISD Small](https://oisd.nl/) | GPL-3.0 |
| `oisd_big.json` | [OISD Big](https://oisd.nl/) | GPL-3.0 |
| `hagezi_pro.json` | [HaGeZi Pro](https://github.com/hagezi/dns-blocklists) | GPL-3.0 |
| `hagezi_light.json` | [HaGeZi Light](https://github.com/hagezi/dns-blocklists) | GPL-3.0 |
| `hagezi_normal.json` | [HaGeZi Normal](https://github.com/hagezi/dns-blocklists) | GPL-3.0 |
| `hagezi_ultimate.json` | [HaGeZi Ultimate](https://github.com/hagezi/dns-blocklists) | GPL-3.0 |
| `hagezi_tif.json` | [HaGeZi TIF](https://github.com/hagezi/dns-blocklists) | GPL-3.0 |
| `blp_crypto.json` | [BLP Crypto](https://github.com/blocklistproject/Lists) | Unlicense |
| `blp_phishing.json` | [BLP Phishing](https://github.com/blocklistproject/Lists) | Unlicense |
| `blp_gambling.json` | [BLP Gambling](https://github.com/blocklistproject/Lists) | Unlicense |
| `blp_malware.json` | [BLP Malware](https://github.com/blocklistproject/Lists) | Unlicense |
| `blp_fraud.json` | [BLP Fraud](https://github.com/blocklistproject/Lists) | Unlicense |
| `blp_scam.json` | [BLP Scam](https://github.com/blocklistproject/Lists) | Unlicense |
| `phishing_army.json` | [Phishing Army](https://phishing.army) | CC BY-NC 4.0 |
| `phishing_army_extended.json` | [Phishing Army Extended](https://phishing.army) | CC BY-NC 4.0 |
| `stevenblack.json` | [Steven Black Unified](https://github.com/StevenBlack/hosts) | MIT |
| `onehosts_lite.json` | [1Hosts Lite](https://github.com/badmojr/1Hosts) | MPL-2.0 |

JSON format:

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

### Cosmetic filtering

**`enhanced/external/easylist_cosmetic.json`** - Cosmetic filtering selectors extracted from [EasyList](https://easylist.to/) (GPL-3.0+ / CC BY-SA 3.0+). Contains ~13K generic and ~7.5K domain-specific CSS element-hiding selectors. This is a cosmetic list: it does not generate blocking rules. The extension compiles these selectors into CSS and injects them via a content script to hide ad containers and banners left empty after network-level blocking. A snapshot is also bundled in the extension package for first-install availability.

**`enhanced/external/easylist_cookie_cosmetic.json`** - Cookie banner cosmetic hiding selectors extracted from [EasyList Cookie](https://easylist.to/) (GPL-3.0+ / CC BY-SA 3.0+). Contains ~15K generic and ~17K domain-specific CSS element-hiding selectors that hide cookie consent banners and overlays. Only cosmetic selectors (`##` rules) are extracted; network blocking rules that would conflict with ProtoConsent's CMP cookie injection are excluded. Full preset.

**`enhanced/external/webannoyances_cosmetic.json`** - Annoyance cosmetic hiding selectors extracted from [Web Annoyances Ultralist](https://github.com/LanikSJ/webannoyances) (CC BY-SA 4.0). Contains ~2K generic and ~8K domain-specific CSS element-hiding selectors that hide cookie notices, newsletter popups, social widgets, and other annoyances. Full preset.

### CMP banner handling

**`enhanced/protoconsent/protoconsent_cmp_signatures.json`** - CMP auto-response templates for cookie consent banners (GPL-3.0-or-later). Contains 31 banner handler signatures covering major CMPs, with full cookie injection, cosmetic hiding, and scroll-unlock support. The pipeline augments these signatures with prehide CSS selectors extracted from [Autoconsent](https://github.com/duckduckgo/autoconsent) (MPL-2.0, DuckDuckGo) for faster banner hiding. The extension injects all signatures at `document_start` to dismiss consent banners according to the user's purpose preferences. A snapshot is also bundled in the extension package for first-install availability. Listed as **ProtoConsent Banners** in the UI.

**`enhanced/external/autoconsent_cmp_detectors.json`** - CMP presence-detection selectors extracted from [Autoconsent](https://github.com/duckduckgo/autoconsent) (MPL-2.0, DuckDuckGo). Contains ~287 CMP detection rules with CSS selectors for `present` (CMP loaded) and `showing` (banner visible) states. Filtered through `config/cmp-safelist.json` to remove dangerous or overly generic selectors. Entries with site-specific names include a `domains` field for scoped matching. Used by the extension's CMP detection feature at `document_idle`. A snapshot is also bundled in the extension package. Listed as **Autoconsent CMP Detectors** in the UI (independent card, not grouped under ProtoConsent Banners).

**`enhanced/external/autoconsent_cmp_signatures_site.json`** - Site-specific CMP hiding selectors extracted from [Autoconsent](https://github.com/duckduckgo/autoconsent) (MPL-2.0, DuckDuckGo). Contains ~233 CMP entries with CSS hiding selectors and detection selectors, scoped to specific websites via the `domains` field. These selectors are too generic to apply globally but safe when limited to their target site. Filtered through `config/cmp-safelist.json`. Applied by the extension only after CMP detection confirms the banner is present. A snapshot is also bundled in the extension package. Listed as **Autoconsent Site Banners** in the UI (independent card, not grouped under ProtoConsent Banners).

CMP signature JSON format:

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

### ProtoConsent Hotfix

**`enhanced/protoconsent/protoconsent_hotfix.json`** - Domains to exclude from blocking since the last extension release (GPL-3.0-or-later). Lists domains that should no longer be blocked but are still present in the frozen extension bundle. The extension creates a DNR allow rule (priority 3) that overrides static block rules (priority 1) for these domains. This is a core list: always active when downloaded, no UI toggle, no preset dependency. Listed as **ProtoConsent Hotfix** in the catalog.

```json
{
  "version": "2026-04-27",
  "generated": "2026-04-27T06:11:25.598Z",
  "revocation_count": 1,
  "revocations": ["example-domain.com"]
}
```

### CNAME tracker detection

**`enhanced/external/cname_trackers.json`** - CNAME cloaking lookup map compiled from [AdGuard CNAME Trackers](https://github.com/AdguardTeam/cname-trackers) (MIT). Contains ~229K disguised domains mapped to their tracker destinations. This is an informational list: it does not generate blocking rules. The extension uses it to flag CNAME-cloaked domains in the Log tab.

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

### URL tracking parameter stripping

**`enhanced/external/adguard_tracking_params.json`** - Global URL tracking parameter stripping compiled from [AdGuard TrackParamFilter](https://github.com/AdguardTeam/AdguardFilters) (GPL-3.0). Contains ~304 literal `$removeparam` parameter names (e.g. `utm_source`, `fbclid`, `gclid`, `msclkid`). The extension uses these to build a static DNR `redirect` ruleset with `queryTransform.removeParams`, stripping tracking parameters from navigation URLs without blocking the request.

**`enhanced/external/dandelion_tracking_params.json`** - Per-site URL tracking parameter stripping compiled from [AdGuard TrackParamFilter](https://github.com/AdguardTeam/AdguardFilters) (GPL-3.0) and [Dandelion Sprout's Legitimate URL Shortener Tool](https://github.com/DandelionSprout/adfilt) (Dandelicence v1.4). Contains ~1,814 site-specific parameters across ~879 domains (e.g. Amazon, Google, Facebook). Parameters that already appear in the global list are excluded. The extension merges all per-site parameters into a single static DNR `redirect` ruleset scoped by `requestDomains`.

```json
{
  "version": "2026-04-14",
  "type": "tracking_params",
  "param_count": 304,
  "params": ["_ga", "_gl", "fbclid", "gclid", "msclkid", "utm_campaign", "..."]
}
```

### Regional lists

Regional cosmetic and blocking lists in `enhanced/regional/`, compiled from [EasyList](https://easylist.to/) regional supplements (GPL-3.0+) and [AdGuard](https://github.com/AdguardTeam/AdguardFilters) language-specific filters (GPL-3.0). Two files per region: `regional_<code>_cosmetic.json` (element hiding rules) and `regional_<code>_blocking.json` (domain and path blocking rules).

| Region | Code | Sources |
|--------|------|---------|
| Albanian | `al` | Adblock List for Albania |
| Arabic | `ar` | AdGuard Arabic |
| Bulgarian | `bg` | AdGuard Bulgarian |
| Chinese | `cn` | EasyList China + AdGuard Chinese |
| Czech/Slovak | `cs` | AdGuard Czech/Slovak |
| German | `de` | EasyList Germany + AdGuard German |
| Spanish | `es` | EasyList Spanish + AdGuard Spanish/Portuguese |
| Estonian | `et` | AdGuard Estonian |
| Persian | `fa` | AdGuard Persian |
| Finnish | `fi` | AdGuard Finnish |
| French | `fr` | AdGuard French |
| Greek | `gr` | Greek AdBlock Filter |
| Hebrew | `he` | EasyList Hebrew |
| Indian | `hi` | AdGuard Hindi + IndianList |
| Serbo-Croatian | `hr` | AdGuard Serbo-Croatian |
| Hungarian | `hu` | AdGuard Hungarian |
| Indonesian | `id` | AdGuard Indonesian |
| Icelandic | `is` | Icelandic ABP List |
| Italian | `it` | EasyList Italy |
| Japanese | `ja` | AdGuard Japanese |
| Korean | `ko` | AdGuard Korean + List-KR |
| Lithuanian | `lt` | EasyList Lithuania |
| Latvian | `lv` | AdGuard Latvian |
| Macedonian | `mk` | AdGuard Macedonian |
| Dutch | `nl` | EasyList Dutch + AdGuard Dutch |
| Nordic | `no` | AdGuard Nordic + Dandelion Sprout's Nordic Filters |
| Polish | `pl` | EasyList Polish |
| Portuguese | `pt` | EasyList Portuguese + AdGuard Spanish/Portuguese |
| Romanian | `ro` | ROList (AdGuard) + ROad-Block |
| Russian | `ru` | AdGuard Russian + RU AdList |
| Slovenian | `si` | Slovenian List |
| Swedish | `sv` | AdGuard Swedish |
| Thai | `th` | AdGuard Thai |
| Turkish | `tr` | AdGuard Turkish |
| Ukrainian | `uk` | AdGuard Ukrainian |
| Vietnamese | `vi` | AdGuard Vietnamese |

Regional lists appear in both the bundled and remote catalog as 2 aggregated entries (`regional_cosmetic` and `regional_blocking`) with `fetch_base` and `regions` fields instead of individual `fetch_url` entries. The extension's fetch handler reads the user's selected regions and downloads individual per-region files from `enhanced/regional/`, merging them at runtime.

### Configuration

**`config/enhanced-lists.json`** - Catalog of all available Enhanced lists including regional entries. The extension fetches this file from CDN to discover lists, their metadata (name, category, preset, version, domain count, region), and their `fetch_url` for downloading. It is regenerated automatically by `generate-manifest.js` after each list refresh. A copy of this file is also shipped inside the extension as `extension/config/enhanced-lists.json` for offline fallback. The extension merges the remote catalog on top of the local copy on startup if the user accepts it.
