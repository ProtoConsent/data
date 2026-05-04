# ProtoConsent Data

<p align="center">
  <img src="https://github.com/ProtoConsent/ProtoConsent/blob/main/design/assets/logo/protoconsent_logo.png" alt="ProtoConsent logo" width="160">
</p>

<p align="center"><strong>Tracker blocklists organized by purpose</strong></p>

<p align="center">
  <a href="https://github.com/ProtoConsent/ProtoConsent"><strong>Browser extension</strong></a> &middot;
  <a href="https://github.com/ProtoConsent/data"><strong>Blocklists</strong></a> &middot;
  <a href="https://protoconsent.org"><strong>Website</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/domains-250K+-blue" alt="250K+ domains">
  <img src="https://img.shields.io/badge/purposes-6-green" alt="6 purposes">
  <img src="https://img.shields.io/badge/formats-5-orange" alt="5 formats">
  <img src="https://img.shields.io/badge/updated-daily-brightgreen" alt="Updated daily">
  <img src="https://img.shields.io/github/license/ProtoConsent/data" alt="GPL-3.0+">
</p>

Curated domain blocklists organized by data-processing purpose: **ads**, **analytics**, **personalization**, **third-party services**, **advanced tracking**, and **security**. Unlike traditional blocklists that combine everything into a single file, these lists let you choose what to block based on *why* a domain exists, not just *what* it is.

Part of the [ProtoConsent](https://github.com/ProtoConsent/ProtoConsent) project. Available on the [Chrome Web Store](https://chromewebstore.google.com/detail/protoconsent/dkcdkdcclhofocmkecccmikkfmfgfdlb) and [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/protoconsent/djghmcahfjgmeiocpgkdgengofconfoo). Blocklists can be used independently.

## Lists

1. [Core](#core---all-tracking-purposes) - Ads + Analytics + Personalization + Third Parties + Advanced Tracking
2. [Full](#full---all-purposes-including-security) - Everything in Core plus phishing, scam and malware
3. [Per-purpose](#per-purpose-lists) - Individual lists for granular control

Each list comes in two versions:

- **Standard** - Curated set with lower false-positive risk. Recommended for most users.
- **Extended** - Broader coverage with more domains, but higher chance of overblocking.

### Core - All tracking purposes

| Format | Standard | Extended | Use with |
|--------|----------|----------|----------|
| ABP | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_core.txt) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_core_extended.txt) | uBlock Origin, Adblock Plus, Ghostery |
| AdGuard | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_core.txt) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_core_extended.txt) | AdGuard browser extension |
| Hosts | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_core.txt) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_core_extended.txt) | Pi-hole, AdGuard Home, /etc/hosts |
| Domains | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_core.txt) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_core_extended.txt) | Plain domain list, one per line |
| JSON | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_core.json) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_core_extended.json) | Browser extensions, custom tools |

### Full - All purposes including security

Everything in Core plus phishing, scam and malware domains.

| Format | Standard | Extended | Use with |
|--------|----------|----------|----------|
| ABP | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_full.txt) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_full_extended.txt) | uBlock Origin, Adblock Plus, Ghostery |
| AdGuard | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_full.txt) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_full_extended.txt) | AdGuard browser extension |
| Hosts | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_full.txt) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_full_extended.txt) | Pi-hole, AdGuard Home, /etc/hosts |
| Domains | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_full.txt) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_full_extended.txt) | Plain domain list, one per line |
| JSON | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_full.json) | [Link](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_full_extended.json) | Browser extensions, custom tools |

### Per-purpose lists

For granular control, subscribe only to the purposes you want to block. Same 5 formats, same Standard/Extended versions.

| Purpose | Standard | Extended | Description |
|---------|----------|----------|-------------|
| Ads | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_ads.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_ads.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_ads.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_ads.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_ads.json) | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_ads_extended.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_ads_extended.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_ads_extended.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_ads_extended.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_ads_extended.json) | Advertising, remarketing and affiliation campaigns |
| Analytics | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_analytics.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_analytics.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_analytics.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_analytics.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_analytics.json) | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_analytics_extended.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_analytics_extended.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_analytics_extended.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_analytics_extended.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_analytics_extended.json) | Measurement, statistics and usage analytics |
| Personalization | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_personalization.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_personalization.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_personalization.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_personalization.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_personalization.json) | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_personalization_extended.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_personalization_extended.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_personalization_extended.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_personalization_extended.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_personalization_extended.json) | Content/UX personalization, recommendations, A/B testing |
| Third Parties | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_third_parties.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_third_parties.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_third_parties.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_third_parties.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_third_parties.json) | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_third_parties_extended.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_third_parties_extended.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_third_parties_extended.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_third_parties_extended.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_third_parties_extended.json) | Third-party data sharing beyond the core service |
| Advanced Tracking | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_advanced_tracking.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_advanced_tracking.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_advanced_tracking.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_advanced_tracking.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_advanced_tracking.json) | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_advanced_tracking_extended.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_advanced_tracking_extended.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_advanced_tracking_extended.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_advanced_tracking_extended.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_advanced_tracking_extended.json) | Fingerprinting and cross-site device tracking |
| Security | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_security.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_security.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_security.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_security.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_security.json) | [ABP](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/abp/protoconsent_security_extended.txt) \| [AdGuard](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/adguard/protoconsent_security_extended.txt) \| [Hosts](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/hosts/protoconsent_security_extended.txt) \| [Domains](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/domains/protoconsent_security_extended.txt) \| [JSON](https://cdn.jsdelivr.net/gh/ProtoConsent/data@main/lists/json/protoconsent_security_extended.json) | Phishing, scam, malware and malicious domains |

See [LISTS.md](LISTS.md) for format details.

ProtoConsent lists may overlap with other blocklists you already use (EasyList, HaGeZi, etc.). uBlock Origin deduplicates rules automatically; AdGuard does not. If you notice performance issues in AdGuard, consider removing lists that overlap.

## Why purpose-based lists?

Most blocklists are organized by source (EasyList, HaGeZi, OISD) or by threat type (ads, malware). ProtoConsent lists are organized by **data-processing purpose**, aligned with how privacy regulations (GDPR, CCPA) categorize data use:

- **Want analytics but not ads?** Subscribe to `protoconsent_ads` only.
- **Running a privacy-first setup?** Subscribe to all six.
- **Building a consent-aware tool?** Use the JSON format with purpose metadata.

---

## ProtoConsent extension data

The `enhanced/` directory contains runtime data for the [ProtoConsent browser extension](https://github.com/ProtoConsent/ProtoConsent): third-party blocking lists converted to JSON, cosmetic filtering rules, CMP banner signatures, CNAME tracker maps, URL parameter stripping data, regional filters, and a hotfix list for domains removed between extension releases. The extension fetches these from CDN when the user enables Enhanced Protection.

For per-file details, see [LISTS.md](LISTS.md).

## Scripts

All scripts are in `scripts/`. Requires Node.js 18+. No dependencies.

| Script | Description |
|--------|-------------|
| `generate-full-lists.js` | Generates all blocklists. Outputs ABP, AdGuard, hosts, domains, and JSON to `lists/`. |
| `validate-lists.js` | Validates all inputs and outputs for correctness. Runs automatically before each commit in CI. |
| `convert.js` | Fetches upstream blocklists, parses them (ABP, hosts, and plain domain formats), deduplicates, and outputs JSON blocking files. |
| `convert-cosmetic.js` | Fetches EasyList, extracts element-hiding rules, and outputs a cosmetic JSON file. |
| `convert-cname.js` | Fetches AdGuard's CNAME tracker lists, merges categories, and outputs an indexed lookup map. |
| `convert-autoconsent.js` | Fetches [Autoconsent](https://github.com/duckduckgo/autoconsent) rule files, extracts CMP selectors, and builds three output files. |
| `convert-tracking-params.js` | Fetches [AdGuard TrackParamFilter](https://github.com/AdguardTeam/AdguardFilters) and [Dandelion Sprout](https://github.com/DandelionSprout/adfilt), extracts `$removeparam` names, and outputs two JSON files. |
| `convert-regional.js` | Fetches EasyList and AdGuard regional filters, outputs blocking + cosmetic per region. |
| `generate-manifest.js` | Reads metadata from all enhanced files and outputs `config/enhanced-lists.json`. |

```bash
node scripts/generate-full-lists.js          # generate all blocklists -> lists/
node scripts/generate-full-lists.js --dry-run # show counts without writing
node scripts/validate-lists.js               # validate all generated lists
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
