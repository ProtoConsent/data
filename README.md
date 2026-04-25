# ProtoConsent Data

<p align="center">
  <img src="https://github.com/ProtoConsent/ProtoConsent/blob/main/design/assets/logo/protoconsent_logo.png" alt="ProtoConsent logo" width="160">
</p>

<p align="center"><strong>Tracker blocklists organized by purpose</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/domains-250K+-blue" alt="250K+ domains">
  <img src="https://img.shields.io/badge/purposes-6-green" alt="6 purposes">
  <img src="https://img.shields.io/badge/formats-5-orange" alt="5 formats">
  <img src="https://img.shields.io/badge/updated-weekly-brightgreen" alt="Updated weekly">
  <img src="https://img.shields.io/github/license/ProtoConsent/data" alt="GPL-3.0+">
</p>

Curated domain blocklists organized by data-processing purpose: **ads**, **analytics**, **personalization**, **third-party services**, **advanced tracking**, and **security**. Unlike traditional blocklists that combine everything into a single file, these lists let you choose what to block based on *why* a domain exists, not just *what* it is.

Available in 5 formats for use with any ad blocker, DNS sinkhole, or browser extension.

Part of the [ProtoConsent](https://github.com/ProtoConsent/ProtoConsent) project. Can be used independently.

## Blocklists

Available in five formats:

| Format | Path | Compatible with |
|--------|------|-----------------|
| ABP | `lists/abp/` | uBlock Origin, Adblock Plus, Ghostery |
| AdGuard | `lists/adguard/` | AdGuard browser extension |
| Hosts | `lists/hosts/` | Pi-hole, AdGuard Home, /etc/hosts |
| Domains | `lists/domains/` | NextDNS, ControlD, RethinkDNS |
| JSON | `lists/json/` | MV3 browser extensions, custom tools |

### Combined lists

For most users, a single combined list is the easiest option. Domains are deduplicated across purposes.

| Profile | ABP | AdGuard | Hosts | Domains | JSON | Included purposes |
|---------|-----|---------|-------|---------|------|-------------------|
| Core | [abp](lists/abp/protoconsent_core.txt) | [adguard](lists/adguard/protoconsent_core.txt) | [hosts](lists/hosts/protoconsent_core.txt) | [domains](lists/domains/protoconsent_core.txt) | [json](lists/json/protoconsent_core.json) | Ads + Analytics + Personalization + Third Parties + Advanced Tracking |
| Full | [abp](lists/abp/protoconsent_full.txt) | [adguard](lists/adguard/protoconsent_full.txt) | [hosts](lists/hosts/protoconsent_full.txt) | [domains](lists/domains/protoconsent_full.txt) | [json](lists/json/protoconsent_full.json) | All 6 purposes including Security |

### Per-purpose lists

For granular control, subscribe only to the purposes you want to block.

| Purpose | ABP | AdGuard | Hosts | Domains | JSON | Description |
|---------|-----|---------|-------|---------|------|-------------|
| Ads | [abp](lists/abp/protoconsent_ads.txt) | [adguard](lists/adguard/protoconsent_ads.txt) | [hosts](lists/hosts/protoconsent_ads.txt) | [domains](lists/domains/protoconsent_ads.txt) | [json](lists/json/protoconsent_ads.json) | Advertising, remarketing and affiliation campaigns |
| Analytics | [abp](lists/abp/protoconsent_analytics.txt) | [adguard](lists/adguard/protoconsent_analytics.txt) | [hosts](lists/hosts/protoconsent_analytics.txt) | [domains](lists/domains/protoconsent_analytics.txt) | [json](lists/json/protoconsent_analytics.json) | Measurement, statistics and usage analytics |
| Personalization | [abp](lists/abp/protoconsent_personalization.txt) | [adguard](lists/adguard/protoconsent_personalization.txt) | [hosts](lists/hosts/protoconsent_personalization.txt) | [domains](lists/domains/protoconsent_personalization.txt) | [json](lists/json/protoconsent_personalization.json) | Content personalization, recommendations and A/B testing |
| Third Parties | [abp](lists/abp/protoconsent_third_parties.txt) | [adguard](lists/adguard/protoconsent_third_parties.txt) | [hosts](lists/hosts/protoconsent_third_parties.txt) | [domains](lists/domains/protoconsent_third_parties.txt) | [json](lists/json/protoconsent_third_parties.json) | Data sharing with third parties, partners or group companies |
| Advanced Tracking | [abp](lists/abp/protoconsent_advanced_tracking.txt) | [adguard](lists/adguard/protoconsent_advanced_tracking.txt) | [hosts](lists/hosts/protoconsent_advanced_tracking.txt) | [domains](lists/domains/protoconsent_advanced_tracking.txt) | [json](lists/json/protoconsent_advanced_tracking.json) | Non-cookie techniques to identify or track devices across sites |
| Security | [abp](lists/abp/protoconsent_security.txt) | [adguard](lists/adguard/protoconsent_security.txt) | [hosts](lists/hosts/protoconsent_security.txt) | [domains](lists/domains/protoconsent_security.txt) | [json](lists/json/protoconsent_security.json) | Phishing, scam and malware domains |

Updated weekly via GitHub Actions. See [LISTS.md](LISTS.md) for format details and domain counts.

### Quick start

**Pi-hole / AdGuard Home** (block all tracking):
```
https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_core.txt
```

**uBlock Origin** (custom filter list):
```
https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_core.txt
```

**AdGuard** (custom filter):
```
https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_core.txt
```

**NextDNS / ControlD** (plain domains):
```
https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_core.txt
```

Replace `protoconsent_core` with `protoconsent_full` to include security (phishing/malware), or use individual purpose lists for granular control.

Both `cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/...` (CDN, recommended) and `raw.githubusercontent.com/ProtoConsent/data/main/lists/...` (GitHub direct) work as subscription URLs.

## Why purpose-based lists?

Most blocklists are organized by source (EasyList, HaGeZi, OISD) or by threat type (ads, malware). ProtoConsent lists are organized by **data-processing purpose**, aligned with how privacy regulations (GDPR, CCPA) categorize data use:

- **Want analytics but not ads?** Subscribe to `protoconsent_ads` only.
- **Running a privacy-first setup?** Subscribe to all six.
- **Building a consent-aware tool?** Use the JSON format with purpose metadata.

## Enhanced data (ProtoConsent extension)

The `enhanced/` directory contains runtime data for the [ProtoConsent browser extension](https://github.com/ProtoConsent/ProtoConsent): third-party blocking lists converted to JSON, cosmetic filtering rules, CMP banner signatures, CNAME tracker maps, URL parameter stripping data, and regional filters. The extension fetches these from CDN when the user enables Enhanced Protection.

For per-file details, see [LISTS.md](LISTS.md).

## Scripts

All scripts are in `scripts/`. Requires Node.js 18+. No dependencies.

| Script | Description |
|--------|-------------|
| `generate-full-lists.js` | Merges bundle (extension repo) + delta (enhanced/) into full lists. Outputs ABP, AdGuard, hosts, domains, and JSON to `lists/`. |
| `convert.js` | Fetches upstream blocklists, parses them (ABP, hosts, and plain domain formats), deduplicates, and outputs JSON blocking files. |
| `convert-cosmetic.js` | Fetches EasyList, extracts element-hiding rules, and outputs a cosmetic JSON file. |
| `convert-cname.js` | Fetches AdGuard's CNAME tracker lists, merges categories, and outputs an indexed lookup map. |
| `convert-autoconsent.js` | Fetches [Autoconsent](https://github.com/duckduckgo/autoconsent) rule files, extracts CMP selectors, and builds three output files. |
| `convert-tracking-params.js` | Fetches [AdGuard TrackParamFilter](https://github.com/AdguardTeam/AdguardFilters) and [Dandelion Sprout](https://github.com/DandelionSprout/adfilt), extracts `$removeparam` names, and outputs two JSON files. |
| `convert-regional.js` | Fetches EasyList and AdGuard regional filters, outputs blocking + cosmetic per region. |
| `generate-manifest.js` | Reads metadata from all enhanced files and outputs `config/enhanced-lists.json`. |

```bash
node scripts/generate-full-lists.js          # merge bundle + delta -> lists/
node scripts/generate-full-lists.js --dry-run # show counts without writing
node scripts/convert.js                      # fetch all blocklists -> enhanced/external/
node scripts/convert.js --list hagezi_pro    # fetch one blocklist
node scripts/convert-cosmetic.js             # fetch EasyList cosmetic -> enhanced/external/
node scripts/convert-cname.js                # fetch CNAME list -> enhanced/external/
node scripts/convert-autoconsent.js          # build CMP signatures -> enhanced/protoconsent/
node scripts/convert-tracking-params.js      # fetch tracking params -> enhanced/external/
node scripts/convert-regional.js             # fetch all regional -> enhanced/regional/
node scripts/convert-regional.js --region es # fetch one region
node scripts/generate-manifest.js            # rebuild config/enhanced-lists.json
```

## License

GPL-3.0-or-later - see [LICENSE](LICENSE).

The generated JSON files contain data derived from upstream sources under their respective licenses (see [LISTS.md](LISTS.md) and [CREDITS.md](CREDITS.md)). CMP detection and hiding selectors from Autoconsent are used under the MPL-2.0 license.
