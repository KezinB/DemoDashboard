# Massachusetts Utility Intelligence Dashboard

An interactive GIS dashboard for Platanus Labs that combines ArcGIS-based utility mapping with live analytics for Massachusetts GSEP, gas leak, hosting-capacity, EJ, borehole, and waste-treatment facility datasets.

## What It Does

- Explore statewide utility layers in an interactive ArcGIS map.
- Switch between `Spatial Maps` and `Data Analytics` views.
- Filter by utility, year, status/type, and regional focus.
- Inspect feature attributes directly from the map.
- Track bookmarks, share filtered map state by URL, and review source health.
- See analytics update from the same live filter state used in the map.

## Current Stack

- ArcGIS Maps SDK for JavaScript `4.31`
- Chart.js
- Vanilla HTML, CSS, and JavaScript

## Project Files

- [index.html](/H:/My%20Drive/Freelance/Platanus%20Labs/map-dashboard/index.html): layout, styling, and ArcGIS widget theming
- [app.js](/H:/My%20Drive/Freelance/Platanus%20Labs/map-dashboard/app.js): map setup, filters, analytics, bookmarks, sharing, and tab behavior
- `data/wastewater_graded_facilities.csv`: MassDEP graded wastewater facility list
- `data/wastewater_groundwater.csv`: MassDEP wastewater plants discharging to groundwater

## Local Use

Because the app pulls ArcGIS-hosted services and external scripts, it works best when served over HTTP instead of opening the file directly.

Simple local options:

1. Use VS Code Live Server.
2. Use Python: `python -m http.server`
3. Open the dashboard from the local static server URL in your browser.

## Deployment Notes

- The dashboard is fully static and can be hosted on GitHub Pages.
- If tabs work locally but not on the hosted version, clear cache or hard refresh after deploy.
- Tab buttons include both JS event listeners and inline `onclick` fallback so hosted builds are more resilient to caching or early script errors.

## Live Demo

[https://kezinb.github.io/DemoDashboard/](https://kezinb.github.io/DemoDashboard/)

---

Developed and managed by **Platanus Labs LLP**
