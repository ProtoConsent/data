# ProtoConsent - Data

<p align="center">
  <img src="https://github.com/ProtoConsent/ProtoConsent/blob/main/design/assets/logo/protoconsent_logo.png" alt="ProtoConsent logo" width="160">
</p>

<p align="center"><strong>Consent you can express, enforce and observe</strong></p>

<p align="center"><em>User-side, purpose-based consent for the web</em></p>

Pre-built data files consumed by the [ProtoConsent](https://github.com/ProtoConsent/ProtoConsent) browser extension. See the main repo for full documentation.

## Full lists

Complete domain blocklists in `lists/`, organized by purpose. Each purpose is available in five formats:

| Format | Path | Description |
|--------|------|-------------|
| ABP | `lists/abp/` | Adblock Plus filter syntax (uBlock Origin, Adblock Plus, Ghostery) |
| AdGuard | `lists/adguard/` | AdGuard filter syntax (AdGuard browser extension) |
| Hosts | `lists/hosts/` | `0.0.0.0 domain` format (Pi-hole, AdGuard Home) |
| Domains | `lists/domains/` | Plain domain list (NextDNS, ControlD, RethinkDNS) |
| JSON | `lists/json/` | Structured format with domains, paths, and metadata (MV3 extensions) |

| Purpose | ABP | AdGuard | Hosts | Domains | Description |
|---------|-----|---------|-------|---------|-------------|
| Ads | [abp](lists/abp/protoconsent_ads.txt) | [adguard](lists/adguard/protoconsent_ads.txt) | [hosts](lists/hosts/protoconsent_ads.txt) | [domains](lists/domains/protoconsent_ads.txt) | Advertising networks and ad servers |
| Analytics | [abp](lists/abp/protoconsent_analytics.txt) | [adguard](lists/adguard/protoconsent_analytics.txt) | [hosts](lists/hosts/protoconsent_analytics.txt) | [domains](lists/domains/protoconsent_analytics.txt) | Analytics and measurement services |
| Personalization | [abp](lists/abp/protoconsent_personalization.txt) | [adguard](lists/adguard/protoconsent_personalization.txt) | [hosts](lists/hosts/protoconsent_personalization.txt) | [domains](lists/domains/protoconsent_personalization.txt) | Personalization and A/B testing |
| Third Parties | [abp](lists/abp/protoconsent_third_parties.txt) | [adguard](lists/adguard/protoconsent_third_parties.txt) | [hosts](lists/hosts/protoconsent_third_parties.txt) | [domains](lists/domains/protoconsent_third_parties.txt) | Third-party embeds and social widgets |
| Advanced Tracking | [abp](lists/abp/protoconsent_advanced_tracking.txt) | [adguard](lists/adguard/protoconsent_advanced_tracking.txt) | [hosts](lists/hosts/protoconsent_advanced_tracking.txt) | [domains](lists/domains/protoconsent_advanced_tracking.txt) | Fingerprinting and advanced tracking |
| Security | [abp](lists/abp/protoconsent_security.txt) | [adguard](lists/adguard/protoconsent_security.txt) | [hosts](lists/hosts/protoconsent_security.txt) | [domains](lists/domains/protoconsent_security.txt) | Phishing, scam and malware domains |

These lists merge the extension's bundled rules with the enhanced delta, providing full domain coverage per purpose. Updated weekly. See [LISTS.md](LISTS.md) for format details.

## Enhanced lists

Runtime data for the ProtoConsent extension in `enhanced/`. The extension fetches these from CDN when the user enables Enhanced Protection.

| Group | Files | License | Description |
|-------|-------|---------|-------------|
| Blocking (ProtoConsent) | 6 | GPL-3.0-or-later | Purpose-based delta lists (domains + paths) |
| Blocking (third-party) | 7 | GPL-3.0+ / Unlicense | EasyList, AdGuard, OISD, HaGeZi, Blocklist Project |
| Cosmetic | 1 | GPL-3.0+ / CC BY-SA 3.0+ | CSS element-hiding selectors from EasyList |
| CMP banners | 3 | GPL-3.0-or-later / MPL-2.0 | Cookie consent banner auto-response and detection |
| CNAME trackers | 1 | MIT | Informational CNAME cloaking lookup map |
| Tracking params | 2 | GPL-3.0 / Dandelicence | URL tracking parameter stripping (global + per-site) |
| Regional | 26 | GPL-3.0+ | Region-specific blocking and cosmetic (13 regions x 2) |

For per-file details, JSON formats, sources, and regional breakdown, see [LISTS.md](LISTS.md).

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
