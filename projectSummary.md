# Project Summary: Massachusetts Utility Intelligence Dashboard

## Overview

The Massachusetts Utility Intelligence Dashboard is a static GIS and analytics application for exploring Massachusetts utility infrastructure, gas leak, GSEP, hosting-capacity, environmental justice, borehole, and wastewater facility datasets.

The application is built with vanilla HTML, CSS, JavaScript, ArcGIS Maps SDK for JavaScript, and Chart.js. It does not require a backend service or build system. It can be served from any static host, including GitHub Pages.

## Primary Goal

The goal of the dashboard is to provide a single interactive workspace where users can:

- View statewide utility and environmental layers on a map.
- Filter map layers by category, utility, year, status/type, and region.
- Inspect map feature attributes.
- Review wastewater facility data from local MassDEP CSV files.
- Save and share filtered map states.
- Review data-source health.
- Use a separate analytics tab for full-dataset reporting.

## Current Application State

The dashboard currently has two main user experiences:

1. Spatial Maps
   - Map-first workflow.
   - Respects map toggles and filters.
   - Used for exploration, inspection, bookmarks, source review, and hotspot context.

2. Data Analytics
   - Chart-first workflow.
   - Summarizes the full dashboard dataset.
   - Bypasses current map visibility toggles by design.

## Core Files

### index.html

Contains:

- Page structure.
- CSS styling.
- Light/dark theme styles.
- Sidebar filters.
- Map container.
- Analytics tab cards and canvases.
- External library imports.
- Cache-busted `app.js` script reference.

### app.js

Contains:

- ArcGIS map setup.
- Layer definitions.
- Filter logic.
- CSV parsing.
- Wastewater aggregation.
- Bookmarks.
- Share links.
- Data health checks.
- Feature inspector.
- Hotspot watchlist.
- Chart.js initialization.
- Analytics aggregation.

### data/wastewater_graded_facilities.csv

MassDEP graded wastewater facility list.

- Records: 2,220
- Facility type breakdown:
  - Municipal: 485
  - Industrial: 1,530
  - Combined: 137
  - Other / no grade: 68

### data/wastewater_groundwater.csv

MassDEP wastewater plants discharging to groundwater.

- Records: 381
- Listed design flow total: 62,927,952
- Region breakdown:
  - SE: 203
  - NE: 84
  - CE: 71
  - WE: 20
  - Unknown/blank: 3

## Data Families

The dashboard integrates these major data families:

| Data Family | Source Type | Map Representation | Analytics Representation |
| --- | --- | --- | --- |
| GSEP | ArcGIS FeatureLayers | Individual hosted layers grouped by utility/year | Counts by status, utility, and timeline |
| Gas leaks | ArcGIS FeatureLayers | Open, repaired, and summary leak layers | Counts by utility and safety status |
| Hosting capacity | ArcGIS MapImageLayer and portal links | National Grid hosting capacity layer | Service/sublayer availability summary |
| Environmental justice | ArcGIS FeatureLayer | EJ 2020 layer | Supporting layer counts |
| Boreholes/wells | ArcGIS FeatureLayer | MassDEP borehole/well points | Supporting layer counts |
| Wastewater major facilities | ArcGIS FeatureLayer | Individual MassDEP facility points | Wastewater/context analytics |
| Wastewater graded facilities | Local CSV | Aggregated town bubbles | Type mix and top-town counts |
| Wastewater groundwater plants | Local CSV | Aggregated town bubbles | Groundwater counts and flow total |

## Wastewater Implementation

Wastewater is the most customized part of the dashboard.

The local CSVs do not contain latitude/longitude, so the dashboard does not geocode every address. Instead, it:

1. Loads both CSV files in the browser.
2. Parses rows with a custom CSV parser.
3. Normalizes town names.
4. Resolves common aliases and neighborhood names.
5. Aggregates facility counts by municipality.
6. Queries a MassGIS municipal boundary FeatureServer.
7. Places proportional bubbles at municipal centroids.

This approach represents the full dataset while avoiding unreliable bulk geocoding.

Wastewater-specific filters include:

- Wastewater graded facilities.
- Wastewater groundwater discharge.
- Wastewater major facilities.
- Wastewater municipal.
- Wastewater industrial.
- Wastewater combined.
- Wastewater other / no grade.

The yellow point markers seen on the map are the individual MassDEP major waste-treatment facilities layer. The teal bubbles are town-level aggregated wastewater records from the local CSV datasets.

## Filters

The Spatial Maps tab supports:

- Category toggles:
  - GSEP
  - Gas leaks
  - EJ
  - Borehole
  - National Grid hosting
  - Waste treatment facilities

- Utility filter:
  - Uses dynamic values from active data families.
  - Displays `MassDEP / Wastewater` while preserving internal value `MassDEP`.

- Year filter:
  - Derived from GSEP and leak layer titles.

- Status/type filter:
  - Combines leak, GSEP, and wastewater options.

- Region filter:
  - Moves the map to predefined Massachusetts regions.

## Analytics

The Data Analytics tab is intentionally independent of map toggles. Turning off map layers does not remove those layers from analytics.

Current charts:

1. Dataset Volume by Map Family
2. Total Infrastructure Allocation by Utility
3. GSEP Status Overview
4. GSEP Features by Utility
5. Gas Leak Features by Utility
6. Hosting Capacity Overview
7. Project Timeline by Batch
8. Wastewater Facility Type Mix
9. Top Wastewater Towns
10. Environmental & Supporting Layers
11. Safety Status Overview

`Comparison Mode` is currently commented out in `index.html`.

## User-Facing Features

### Theme Toggle

Switches between light and dark modes, updates ArcGIS theme CSS, changes the basemap, and updates chart colors.

### Bookmarks

Users can save up to eight filtered map states in browser localStorage.

### Share Links

The app serializes filters, toggles, theme, map center, and zoom into the URL query string. The share button copies the current URL.

### Feature Inspector

Clicking a map feature displays key attributes in a floating Feature Inspector card.

### Hotspot Watchlist

Visible summary layers are queried within the current map extent and ranked by a preferred numeric metric.

### Data Health

The app checks representative ArcGIS services and local wastewater CSV loading status, then reports Ready, Partial, or Issue states.

## Local Development

Use a local HTTP server:

```powershell
python -m http.server
```

Open:

```text
http://127.0.0.1:8000/
```

Opening `index.html` directly is not recommended because local CSV fetches and external SDK behavior are more reliable over HTTP.

## Deployment Notes

The app can be deployed as static files. Deployment must include:

- `index.html`
- `app.js`
- `data/wastewater_graded_facilities.csv`
- `data/wastewater_groundwater.csv`

The dashboard also depends on external services:

- ArcGIS Maps SDK.
- ArcGIS hosted layers.
- Chart.js CDN.
- Google Fonts.
- Utility and Mass.gov source links.

## Current Strengths

- No backend needed.
- Works as a static dashboard.
- Combines many infrastructure datasets in one workspace.
- Has both map-level exploration and full-dataset analytics.
- Handles missing/broken data sources gracefully in most cases.
- Uses local wastewater CSVs without needing geocoding.
- Supports shareable map states and local bookmarks.

## Current Limitations

- Wastewater CSV map positions are municipal centroids, not exact facility locations.
- Bookmarks are local to each browser.
- Some external source previews may not render in iframes.
- ArcGIS service outages can reduce map completeness.
- The codebase is a single large JavaScript file and a single large HTML/CSS file, which is simple to deploy but harder to maintain as the app grows.

## Recommended Future Improvements

1. Split `app.js` into modules:
   - state
   - layers
   - filters
   - wastewater
   - analytics
   - UI rendering

2. Move CSS into a separate stylesheet.

3. Add a dedicated wastewater exact-location dataset if available.

4. Add automated smoke tests with Playwright.

5. Add a data-source registry object so new layers can be added declaratively.

6. Add chart export/download support.

7. Add a table view for wastewater CSV records.

8. Add layer legends or custom symbology for the wastewater major-facilities point layer.

9. Add a last-updated section for local CSV files.

10. Add deployment documentation for GitHub Pages.

## Summary

This project is a practical static GIS dashboard for Massachusetts infrastructure intelligence. It combines live ArcGIS layers with local MassDEP CSV datasets, supports spatial exploration, and now provides a more detailed analytics workspace that reports on the full dataset regardless of map visibility. Its current architecture favors simplicity and deployability, while future work should focus on modularizing code and deepening data governance around source updates.

