# Credits

ProtoConsent Data compiles and transforms data from several upstream open-source
projects. We are grateful to their maintainers and contributors.

## Upstream sources

### Blocklists

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [EasyList](https://easylist.to/) | EasyList authors | GPL-3.0+ / CC BY-SA 3.0+ | `easylist.json`, `easylist_cosmetic.json` |
| [EasyPrivacy](https://easylist.to/) | EasyList authors | GPL-3.0+ / CC BY-SA 3.0+ | `easyprivacy.json` |
| [AdGuard DNS Filter](https://github.com/AdguardTeam/AdGuardSDNSFilter) | AdGuard Team | GPL-3.0 | `adguard_dns.json` |
| [Steven Black Unified Hosts](https://github.com/StevenBlack/hosts) | Steven Black | MIT | `steven_black.json` |
| [OISD](https://oisd.nl/) | Stephan van Ruth | GPL-3.0 | `oisd_small.json` |
| [HaGeZi DNS Blocklists](https://github.com/hagezi/dns-blocklists) | HaGeZi | GPL-3.0 | `hagezi_pro.json`, `hagezi_tif.json` |
| [1Hosts](https://github.com/badmojr/1Hosts) | badmojr | MPL-2.0 | `onehosts_lite.json` |
| [Blocklist Project](https://github.com/blocklistproject/Lists) | Blocklist Project | Unlicense | `blp_ads.json`, `blp_tracking.json`, `blp_crypto.json`, `blp_phishing.json` |

### CNAME tracker detection

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [AdGuard CNAME Trackers](https://github.com/AdguardTeam/cname-trackers) | Adguard Software Ltd | MIT | `cname_trackers.json` |

### CMP banner handling

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [Autoconsent](https://github.com/duckduckgo/autoconsent) | DuckDuckGo, Inc. | MPL-2.0 | `protoconsent_cmp_signatures.json` (prehide selectors), `protoconsent_cmp_detectors.json`, `protoconsent_cmp_signatures_site.json` |

### URL tracking parameter stripping

| Source | Authors | License | Files |
|--------|---------|---------|-------|
| [AdGuard TrackParamFilter](https://github.com/AdguardTeam/AdguardFilters) | AdGuard Team | GPL-3.0 | `adguard_tracking_params.json`, `dandelion_tracking_params.json` (per-site entries) |
| [Legitimate URL Shortener Tool](https://github.com/DandelionSprout/adfilt) | Dandelion Sprout | Dandelicence v1.4 | `dandelion_tracking_params.json` (per-site entries) |

AdGuard's TrackParamFilter general section provides the global parameter list. Per-site
parameters in `dandelion_tracking_params.json` are merged from AdGuard's specific section
and Dandelion Sprout's list, with global parameters excluded to avoid duplication.

Autoconsent prehide selectors, CMP detection selectors (detectCmp/detectPopup), and
site-specific hiding selectors are extracted by `convert-autoconsent.js` and filtered
through `config/cmp-safelist.json`. Prehide selectors are merged into
`protoconsent_cmp_signatures.json` alongside ProtoConsent's own hand-maintained CMP
signatures. The 22 hand-maintained signatures (with cookie injection templates) are
original to ProtoConsent. Detection and site-specific entries are output as separate files.

## MPL-2.0 license notice (Autoconsent)

Autoconsent is distributed under the Mozilla Public License, version 2.0.
The full license text is available at: https://www.mozilla.org/en-US/MPL/2.0/

> This Source Code Form is subject to the terms of the Mozilla Public
> License, v. 2.0. If a copy of the MPL was not distributed with this
> file, You can obtain one at https://mozilla.org/MPL/2.0/.
>
> Copyright (c) 2021 DuckDuckGo, Inc.

## MIT license notice (Steven Black Unified Hosts)

> The MIT License (MIT)
>
> Copyright (c) 2023 Steven Black
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
