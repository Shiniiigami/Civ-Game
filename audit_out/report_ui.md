# Crown Waters — UI / Interaction Audit

_Generated 2026-07-13T02:29:33.685Z · runtime 103.6s · seed 111_

Complements the headless sim audit (which no-ops rendering). Drives the **real rendered game**
with Playwright across desktop viewports and emulated mobile devices (real mobile UA + touch +
deviceScaleFactor), walking every major surface and modal.

> Only the Chromium browser binary is present in this environment, so cross-browser coverage is
> Chromium + Chromium-based mobile emulation. Firefox/WebKit are skipped (binaries absent).

## Coverage
- Devices (6): desktop-1280x800, desktop-1920x1080, iphone13-portrait, iphone13-landscape, pixel7-portrait, iphonese-portrait
- Surfaces per device: 25 (map views, 5 panels, 7 council tabs, 11 action/battle/siege modals)
- Screenshots: `audit_out/ui/<device>/<surface>.png` · raw findings: `audit_out/ui/findings.json`

## Summary
| kind | count |
|---|---|
| distinct findings | 21 |
| — major | 0 |
| — minor | 21 |
| mobile-only findings | 7 |
| console errors / pageerrors | 0 |
| modals that failed to open | 0 |
| surface run errors | 0 |

## Major findings (0)
_none_

## Mobile-only findings (7)
- **[minor] tap-target** — 8 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `button.vtab.on 37×30`, `button.vtab 53×30`, `button.vtab 41×30`
- **[minor] tap-target** — 2 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`
- **[minor] tap-target** — 3 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `button.btn.small 76×37`
- **[minor] tap-target** — 7 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `select#lawSuccession 304×34`, `select#lawSlavery 304×34`, `select#lawMilitary 304×34`
- **[minor] tap-target** — 5 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `input#recruitNumber 304×37`, `input#recruitRange 304×32`, `button.btn.alt 75×37`
- **[minor] tap-target** — 6 visible interactive element(s) under 44px  
  _seen on: iphone13-portrait, pixel7-portrait, iphonese-portrait_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `input#faithName 304×37`, `select#faithClergy 304×34`, `select#faithOne 304×34`
- **[minor] tap-target** — 4 visible interactive element(s) under 44px  
  _seen on: iphone13-portrait, iphone13-landscape, iphonese-portrait_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `button.btn.small 122×37`, `button.btn.small 122×37`

## Minor findings (21)
- **[minor] tap-target** — 8 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `button.vtab.on 37×30`, `button.vtab 53×30`, `button.vtab 41×30`
- **[minor] tap-target** — 2 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`
- **[minor] tap-target** — 3 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `button.btn.small 76×37`
- **[minor] tap-target** — 7 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `select#lawSuccession 304×34`, `select#lawSlavery 304×34`, `select#lawMilitary 304×34`
- **[minor] tap-target** — 5 visible interactive element(s) under 44px  
  _seen on: 4 devices_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `input#recruitNumber 304×37`, `input#recruitRange 304×32`, `button.btn.alt 75×37`
- **[minor] tap-target** — 6 visible interactive element(s) under 44px  
  _seen on: iphone13-portrait, pixel7-portrait, iphonese-portrait_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `input#faithName 304×37`, `select#faithClergy 304×34`, `select#faithOne 304×34`
- **[minor] tap-target** — 4 visible interactive element(s) under 44px  
  _seen on: iphone13-portrait, iphone13-landscape, iphonese-portrait_  
  e.g. `button.vtab.on 49×30`, `button.vtab 58×30`, `button.btn.small 122×37`, `button.btn.small 122×37`
- **[minor] tap-target** — 21 visible interactive element(s) under 44px  
  _seen on: desktop-1280x800, desktop-1920x1080_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 19 visible interactive element(s) under 44px  
  _seen on: desktop-1280x800_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 15 visible interactive element(s) under 44px  
  _seen on: desktop-1280x800_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 13 visible interactive element(s) under 44px  
  _seen on: desktop-1280x800_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 20 visible interactive element(s) under 44px  
  _seen on: desktop-1280x800_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 18 visible interactive element(s) under 44px  
  _seen on: desktop-1280x800_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 16 visible interactive element(s) under 44px  
  _seen on: desktop-1280x800_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 14 visible interactive element(s) under 44px  
  _seen on: desktop-1280x800_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 27 visible interactive element(s) under 44px  
  _seen on: desktop-1920x1080_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 24 visible interactive element(s) under 44px  
  _seen on: desktop-1920x1080_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 31 visible interactive element(s) under 44px  
  _seen on: desktop-1920x1080_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 28 visible interactive element(s) under 44px  
  _seen on: desktop-1920x1080_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 26 visible interactive element(s) under 44px  
  _seen on: desktop-1920x1080_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`
- **[minor] tap-target** — 22 visible interactive element(s) under 44px  
  _seen on: desktop-1920x1080_  
  e.g. `button#zoomIn.iconbtn 34×34`, `button#zoomOut.iconbtn 34×34`, `button#homeMap.iconbtn 34×34`, `button#capMap.iconbtn 34×34`, `button#scoutMap.iconbtn 34×34`

## Console errors & page errors (0)
_none — clean across all surfaces_

## Modals that did not open (0)
_all modals opened_

## UX-judgment notes (lenses)
Automated checks above cover layout/tap/values/console. The following need a human eye on the
screenshots (this pass flags where to look, per README_AUDIT.md Section 2):
- **Legibility (lens 4):** is the authority/treasury death-spiral surfaced? Open `05-panel-realm`
  and the Ledger stats — when treasury is low, is the coming authority collapse visible to the player,
  or silent? (The sim audit shows this is the #1 killer.)
- **Tap-count / friction:** count taps to issue one season's actions on `iphonese-portrait` —
  council tab → action → modal → confirm. Flag any action needing >3 taps.
- **Discoverability:** are the map view tabs, scouting (◎), and reveal (👁) legible on small screens?
- **Ergonomics:** on `iphone13-landscape` does the map + council fit without the page scrolling
  horizontally, and are the End Season / footer buttons reachable with a thumb?

