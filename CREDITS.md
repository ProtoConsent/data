# Credits

ProtoConsent Data compiles and transforms data from several upstream open-source
projects. We are grateful to their maintainers and contributors.

## Upstream sources

### Blocklists

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [EasyList](https://easylist.to/) | EasyList authors | GPL-3.0+ / CC BY-SA 3.0+ | `easylist.json`, `easylist_cosmetic.json`, `easylist_cookie_cosmetic.json` |
| [EasyPrivacy](https://easylist.to/) | EasyList authors | GPL-3.0+ / CC BY-SA 3.0+ | `easyprivacy.json` |
| [AdGuard DNS Filter](https://github.com/AdguardTeam/AdGuardSDNSFilter) | AdGuard Team | GPL-3.0 | `adguard_dns.json` |
| [OISD](https://oisd.nl/) | Stephan van Ruth | GPL-3.0 | `oisd_small.json`, `oisd_big.json` |
| [HaGeZi DNS Blocklists](https://github.com/hagezi/dns-blocklists) | HaGeZi | GPL-3.0 | `hagezi_pro.json`, `hagezi_light.json`, `hagezi_normal.json`, `hagezi_ultimate.json`, `hagezi_tif.json` |
| [Blocklist Project](https://github.com/blocklistproject/Lists) | Blocklist Project | Unlicense | `blp_crypto.json`, `blp_phishing.json`, `blp_gambling.json`, `blp_malware.json`, `blp_fraud.json`, `blp_scam.json` |
| [Phishing Army](https://phishing.army) | Andrea Draghetti | CC BY-NC 4.0 | `phishing_army.json`, `phishing_army_extended.json` |
| [Steven Black Unified Hosts](https://github.com/StevenBlack/hosts) | Steven Black | MIT | `stevenblack.json` |
| [1Hosts Lite](https://github.com/badmojr/1Hosts) | badmojr | MPL-2.0 | `onehosts_lite.json` |

### Cosmetic annoyance filtering

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [Web Annoyances Ultralist](https://github.com/LanikSJ/webannoyances) | yourduskquibbles, LanikSJ | CC BY-SA 4.0 | `webannoyances_cosmetic.json` |

### CNAME tracker detection

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [AdGuard CNAME Trackers](https://github.com/AdguardTeam/cname-trackers) | Adguard Software Ltd | MIT | `cname_trackers.json` |

### CMP banner handling

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [Autoconsent](https://github.com/duckduckgo/autoconsent) | DuckDuckGo, Inc. | MPL-2.0 | `protoconsent_cmp_signatures.json` (prehide selectors), `autoconsent_cmp_detectors.json`, `autoconsent_cmp_signatures_site.json` |

### URL tracking parameter stripping

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [AdGuard TrackParamFilter](https://github.com/AdguardTeam/AdguardFilters) | AdGuard Team | GPL-3.0 | `adguard_tracking_params.json`, `dandelion_tracking_params.json` (per-site entries) |
| [Legitimate URL Shortener Tool](https://github.com/DandelionSprout/adfilt) | Dandelion Sprout | Dandelicence v1.4 | `dandelion_tracking_params.json` (per-site entries) |

### Regional lists

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [EasyList regional supplements](https://easylist.to/) | EasyList authors | GPL-3.0+ / CC BY-SA 3.0+ | `regional/regional_{cn,de,nl,es,he,it,lt,pl}_*.json` |
| [AdGuard language filters](https://github.com/AdguardTeam/AdguardFilters) | AdGuard Team | GPL-3.0 | `regional/regional_{cn,de,nl,es,fr,ja,ru,tr,uk}_*.json` |

Regions with both sources (CN, DE, NL, ES) merge EasyList and AdGuard rules into a single
output per type. Each region produces two files: `*_cosmetic.json` (element hiding) and
`*_blocking.json` (domain and path blocking).

AdGuard's TrackParamFilter general section provides the global parameter list. Per-site
parameters in `dandelion_tracking_params.json` are merged from AdGuard's specific section
and Dandelion Sprout's list, with global parameters excluded to avoid duplication.

Autoconsent prehide selectors, CMP detection selectors (detectCmp/detectPopup), and
site-specific hiding selectors are extracted by `convert-autoconsent.js` and filtered
through `config/cmp-safelist.json`. Prehide selectors are merged into
`protoconsent_cmp_signatures.json` alongside ProtoConsent's own hand-maintained CMP
signatures. The 31 hand-maintained signatures (with cookie injection templates) are
original to ProtoConsent. Detection and site-specific entries are output as separate files.

## MPL-2.0 license notice (Autoconsent)

Autoconsent is distributed under the Mozilla Public License, version 2.0.
The full license text is available at: https://www.mozilla.org/en-US/MPL/2.0/

> This Source Code Form is subject to the terms of the Mozilla Public
> License, v. 2.0. If a copy of the MPL was not distributed with this
> file, You can obtain one at https://mozilla.org/MPL/2.0/.
>
> Copyright (c) 2021 DuckDuckGo, Inc.

## MIT license notice (AdGuard CNAME Trackers)

> Copyright 2021 Adguard Software Ltd
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.

## Dandelicence v1.4 notice (Dandelion Sprout)

Dandelion Sprout's Legitimate URL Shortener Tool is distributed under the
Dandelicence, version 1.4. The full license text is available at:
https://github.com/DandelionSprout/Dandelicence

> Redistribution and use in all forms, with or without modification or
> commercial purpose, are permitted, provided that the following conditions
> are met: near-unmodified redistributions must retain this licence text,
> contributors' names cannot endorse forked products without written
> permission, and near-unmodified redistributions shall be accessible in
> ≥100 countries worldwide.

## CC BY-SA 4.0 notice (Web Annoyances Ultralist)

Web Annoyances Ultralist is distributed under the Creative Commons
Attribution-ShareAlike 4.0 International license.
The full license text is available at: https://creativecommons.org/licenses/by-sa/4.0/

> Copyright (c) 2016-2024 by yourduskquibbles and LanikSJ
