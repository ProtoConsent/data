# ProtoConsent - Data

<p align="center">
  <img src="https://github.com/ProtoConsent/ProtoConsent/blob/main/design/assets/logo/protoconsent_logo.png" alt="ProtoConsent logo" width="160">
</p>

<p align="center"><strong>Consent you can express, enforce and observe</strong></p>

<p align="center"><em>User‑side, purpose‑based consent for the web</em></p>

Pre-built data files consumed by the [ProtoConsent](https://github.com/ProtoConsent/ProtoConsent) browser extension. See the main repo for full documentation.

## Contents

### `enhanced/`

Enhanced protection lists - domain and path-based blocklists compiled from public sources and ProtoConsent's own core lists. The extension fetches these JSON files at runtime when the user enables Enhanced Protection.

**ProtoConsent Core** - purpose-based lists derived from the extension's static rulesets, enabling weekly updates via CDN independently of extension releases:

| File | Category | License | Domains | Path rules |
|---|---|---|---|---|
| `protoconsent_analytics.json` | `analytics` | GPL-3.0-or-later | ~15.8K | 559 |
| `protoconsent_ads.json` | `ads` | GPL-3.0-or-later | ~12.9K | 529 |
| `protoconsent_personalization.json` | `personalization` | GPL-3.0-or-later | ~73 | 13 |
| `protoconsent_third_parties.json` | `third_parties` | GPL-3.0-or-later | ~171 | 73 |
| `protoconsent_advanced_tracking.json` | `advanced_tracking` | GPL-3.0-or-later | ~11.2K | 28 |

**Third-party lists** - compiled from public blocklists:

| File | Source | License | Domains | Path rules |
|---|---|---|---|---|
| `easyprivacy.json` | [EasyPrivacy](https://easylist.to/) | GPL-3.0+ / CC BY-SA 3.0+ | ~46K | ~4K |
| `easylist.json` | [EasyList](https://easylist.to/) | GPL-3.0+ / CC BY-SA 3.0+ | ~58K | ~1.6K |
| `adguard_dns.json` | [AdGuard DNS Filter](https://github.com/AdguardTeam/AdGuardSDNSFilter) | GPL-3.0 | ~165K | - |
| `steven_black.json` | [Steven Black Unified](https://github.com/StevenBlack/hosts) | MIT | ~49K | - |
| `oisd_small.json` | [OISD Small](https://oisd.nl/) | GPL-3.0 | ~56K | - |
| `hagezi_pro.json` | [HaGeZi Pro](https://github.com/hagezi/dns-blocklists) | GPL-3.0 | ~190K | - |
| `hagezi_tif.json` | [HaGeZi TIF](https://github.com/hagezi/dns-blocklists) | GPL-3.0 | ~966K | - |
| `onehosts_lite.json` | [1Hosts Lite](https://github.com/badmojr/1Hosts) | MPL-2.0 | ~195K | - |
| `blp_ads.json` | [Blocklist Project - Ads](https://github.com/blocklistproject/Lists) | Unlicense | ~155K | - |
| `blp_tracking.json` | [Blocklist Project - Tracking](https://github.com/blocklistproject/Lists) | Unlicense | ~15K | - |
| `blp_crypto.json` | [Blocklist Project - Crypto](https://github.com/blocklistproject/Lists) | Unlicense | ~24K | - |
| `blp_phishing.json` | [Blocklist Project - Phishing](https://github.com/blocklistproject/Lists) | Unlicense | ~87K | - |

Domain counts are approximate and change with each upstream update.

### `enhanced/cname_trackers.json`

CNAME cloaking lookup map compiled from [AdGuard CNAME Trackers](https://github.com/AdguardTeam/cname-trackers) (MIT). Contains ~229K disguised domains mapped to their tracker destinations. This is an informational list: it does not generate blocking rules. The extension uses it to flag CNAME-cloaked domains in the Log tab.

### `enhanced/easylist_cosmetic.json`

Cosmetic filtering selectors extracted from [EasyList](https://easylist.to/) (GPL-3.0+ / CC BY-SA 3.0+). Contains ~13K generic and ~7.5K domain-specific CSS element-hiding selectors. This is a cosmetic list: it does not generate blocking rules. The extension compiles these selectors into CSS and injects them via a content script to hide ad containers and banners left empty after network-level blocking. A snapshot is also bundled in the extension package for first-install availability.

### `scripts/`

`convert.js` fetches upstream blocklists, parses them (ABP, hosts, and plain domain formats), deduplicates, and outputs the JSON blocklist files.

`convert-cosmetic.js` fetches EasyList, extracts `##` element-hiding rules (generic and domain-specific CSS selectors), filters out procedural selectors, and outputs a cosmetic JSON file.

`convert-cname.js` fetches AdGuard's CNAME tracker lists, merges the 5 categories (trackers, ads, clickthroughs, mail_trackers, microsites), and outputs an indexed lookup map.

`generate-manifest.js` reads metadata from all `enhanced/*.json` files, merges it with the list catalog (names, descriptions, licenses, categories, presets), and outputs `lists.json` - the remote catalog consumed by the extension.

```bash
node scripts/convert.js                    # fetch all blocklists, output to ./enhanced/
node scripts/convert.js --list hagezi_pro  # fetch one blocklist
node scripts/convert.js --dry-run          # show stats without writing
node scripts/convert-cosmetic.js           # fetch EasyList cosmetic rules, output to ./enhanced/
node scripts/convert-cname.js              # fetch CNAME list, output to ./enhanced/
node scripts/generate-manifest.js          # rebuild lists.json from enhanced/ metadata
```

### `lists.json`

Remote catalog of all available Enhanced lists. The extension fetches this file to discover lists, their metadata (name, category, preset, version, domain count), and their `fetch_url` for downloading. It is regenerated automatically by `generate-manifest.js` after each list refresh.

The extension merges this remote catalog with its local `enhanced-lists.json` on startup if the user accepts it. If the remote fetch fails, the local catalog is used as fallback.

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

## Regenerating

```bash
node scripts/convert.js --output ./enhanced
node scripts/convert-cname.js --output ./enhanced
```

Requires Node.js 18+. No dependencies.

## License

GPL-3.0-or-later - see [LICENSE](LICENSE).

The generated JSON files contain domain lists derived from upstream sources under their respective licenses (see table above).
