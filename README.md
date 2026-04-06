# ProtoConsent - Data

<p align="center">
  <img src="assets/logo/protoconsent_logo.png" alt="ProtoConsent logo" width="160">
</p>

<p align="center"><strong>One place to control how every website uses your data.</strong></p>

<p align="center"><em>User‑side, purpose‑based consent for the web.</em></p>

Pre-built data files consumed by the [ProtoConsent](https://github.com/ProtoConsent/ProtoConsent) browser extension. See the main repo for full documentation.

## Contents

### `enhanced/`

Enhanced protection lists - domain and path-based blocklists compiled from public sources. The extension fetches these JSON files at runtime when the user enables Enhanced Protection.

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
| `blp_ads.json` | [Blocklist Project — Ads](https://github.com/blocklistproject/Lists) | Unlicense | ~155K | - |
| `blp_tracking.json` | [Blocklist Project — Tracking](https://github.com/blocklistproject/Lists) | Unlicense | ~15K | - |
| `blp_crypto.json` | [Blocklist Project — Crypto](https://github.com/blocklistproject/Lists) | Unlicense | ~24K | - |
| `blp_phishing.json` | [Blocklist Project — Phishing](https://github.com/blocklistproject/Lists) | Unlicense | ~87K | - |

Domain counts are approximate and change with each upstream update.

### `scripts/`

`convert.js` - Node.js script that fetches upstream blocklists, parses them (ABP, hosts, and plain domain formats), deduplicates, and outputs the JSON files used by the extension.

```bash
node scripts/convert.js                    # fetch all, output to ./enhanced/
node scripts/convert.js --list hagezi_pro  # fetch one list
node scripts/convert.js --dry-run          # show stats without writing
```

## JSON format

Each file contains:

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

## Regenerating

```bash
node scripts/convert.js --output ./enhanced
```

Requires Node.js 18+. No dependencies.

## License

GPL-3.0-or-later - see [LICENSE](LICENSE).

The generated JSON files contain domain lists derived from upstream sources under their respective licenses (see table above).
