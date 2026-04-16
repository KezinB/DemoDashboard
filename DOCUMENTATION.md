# Massachusetts Utility Intelligence Dashboard Documentation

## 1. Purpose

The Massachusetts Utility Intelligence Dashboard is a static web-based GIS dashboard for exploring utility, infrastructure, environmental, and wastewater datasets across Massachusetts. It combines an ArcGIS map with a companion analytics workspace so users can inspect spatial layers, filter operational views, review data health, save/share map states, and analyze statewide infrastructure patterns.

The project is built for Platanus Labs and is designed to run as a static site. It does not require a backend server, database, build system, or package installation. The browser loads hosted ArcGIS services, external JavaScript libraries, and two local CSV datasets.

## 2. Technology Stack

- HTML, CSS, and vanilla JavaScript.
- ArcGIS Maps SDK for JavaScript 4.31.
- Chart.js from CDN.
- ArcGIS-hosted FeatureServer and MapServer layers.
- Local CSV files for wastewater facility datasets.
- Browser localStorage for theme preference and saved bookmarks.
- URL query parameters for shareable dashboard state.

## 3. Project Structure

```text
map-dashboard/
  .gitignore
  README.md
  DOCUMENTATION.md
  projectSummary.md
  index.html
  app.js
  data/
    wastewater_graded_facilities.csv
    wastewater_groundwater.csv
```

### index.html

`index.html` contains the document shell, all CSS, the user interface layout, ArcGIS theme import, Chart.js import, ArcGIS SDK import, and the script tag for `app.js`.

Major UI sections:

- Top bar with project name, map status, active region badge, and theme toggle.
- Tab navigation for `Spatial Maps` and `Data Analytics`.
- Map sidebar with filters, workspace summary, bookmarks/share, data health, wastewater summary, raw sources, and source preview.
- ArcGIS map canvas with loading overlay, feature inspector, and hotspot watchlist.
- Analytics tab with stat cards and Chart.js charts.
- Footer attribution.

### app.js

`app.js` contains all runtime behavior:

- State parsing from URL and localStorage.
- Theme switching.
- ArcGIS map, layers, widgets, and popups.
- Filter handling.
- Wastewater CSV parsing and town aggregation.
- Bookmark save/load/delete.
- Share-link creation.
- Source list and source preview.
- Data-health checks.
- Feature inspector rendering.
- Hotspot generation.
- Chart.js initialization and updates.
- Analytics aggregation.

### data/

The `data` folder contains local MassDEP wastewater datasets used by the dashboard:

- `wastewater_graded_facilities.csv`
  - 2,220 records.
  - Fields: `Facility Name`, `Facility Address`, `City or Town`, `Phone Number`, `Facility Grade`.
  - Facility type counts:
    - Municipal: 485
    - Industrial: 1,530
    - Combined: 137
    - Other / no grade: 68

- `wastewater_groundwater.csv`
  - 381 records.
  - Fields include `REGION`, `TOWN`, `PROJNAME`, `FLOW`, `Applicant`, `Contact`, `Address`, and `CAddress`.
  - Listed design flow total: 62,927,952.
  - Region counts:
    - SE: 203
    - NE: 84
    - CE: 71
    - WE: 20
    - blank/unknown: 3

## 4. Application Modes

The dashboard has two main tabs.

### Spatial Maps

The Spatial Maps tab is the operational map workspace. It respects the map filters and toggles directly. If a user turns off GSEP, leak, EJ, borehole, hosting, or wastewater layers, those layers are hidden from the map.

The map view includes:

- ArcGIS basemap.
- Zoom, home, search, and legend controls.
- Layer visibility filters.
- Utility, year, status/type, and region filters.
- Clickable feature inspection.
- Hotspot watchlist.
- Data source and data health panels.
- Wastewater facility summary.
- Bookmark and share-link controls.

### Data Analytics

The Data Analytics tab summarizes the full dashboard dataset. It intentionally bypasses the current map visibility toggles. This means users can hide layers on the map without zeroing out the analytics.

Analytics currently includes:

- Total layer/entry count.
- Utility count.
- GSEP component count.
- Leak summary count.
- Total features.
- Hotspot count from the current map context.
- Dataset volume by map family.
- Infrastructure allocation by utility.
- GSEP status overview.
- GSEP features by utility.
- Gas leak features by utility.
- Hosting capacity overview.
- Project timeline.
- Wastewater facility type mix.
- Top wastewater towns.
- Environmental and supporting layer volumes.
- Safety status overview.

The `Comparison Mode` card is currently commented out in `index.html`. The JavaScript is tolerant of its missing canvas, so it can be re-enabled later by uncommenting the card.

## 5. Data Sources

### GSEP Layers

The dashboard loads multiple GSEP FeatureServer layers from hosted ArcGIS services. These cover utilities and planning periods such as:

- Berkshire
- Boston Gas
- Colonial Gas
- Eversource
- EGMA
- Liberty
- Unitil
- National Grid NPAs
- Estimated costs

GSEP metadata is created in `createLayerMeta()`, which derives:

- Utility name.
- Year or year range.
- Status kind, such as `npa` or `cost`.
- Sidebar title.
- Whether the layer is considered a summary layer.

### Gas Leak Layers

The dashboard loads gas leak FeatureServer layers for open leaks, repaired leaks, and summary/emissions layers. Utilities include:

- Berkshire Gas
- Boston Gas
- Colonial Gas
- EGMA
- Eversource / NSTAR
- Liberty Utilities
- Unitil

Summary layers include town/neighborhood leak summaries and estimated emissions.

### Environmental Justice

The EJ layer is loaded as a FeatureLayer:

```text
Environmental Justice Populations 2020
```

It is treated as a supporting/context layer in analytics.

### Borehole / Well Viewer

The MassDEP well/borehole viewer layer is loaded as a FeatureLayer and is treated as a supporting/context layer in analytics.

### National Grid Hosting Capacity

Hosting capacity is loaded as a MapImageLayer:

```text
National Grid Hosting Capacity
```

The dashboard also links to:

- Eversource Navigator.
- National Grid System Data Portal.

### Wastewater Layers

Wastewater is represented in three ways:

1. MassDEP major waste-treatment facilities ArcGIS layer.
   - This is the individual point layer that may appear as yellow markers depending on ArcGIS default symbology.
   - It can be isolated with the `Wastewater major facilities` status/type filter.

2. Local graded wastewater facilities CSV.
   - 2,220 records.
   - Facility type mix is derived from `Facility Grade`.
   - Types are Municipal, Industrial, Combined, and Other / no grade.

3. Local groundwater discharge CSV.
   - 381 records.
   - Includes listed design flow and MassDEP region.

Because the CSV files do not include latitude/longitude, the dashboard aggregates wastewater records by municipality and renders town-level bubbles using the MassGIS municipal boundary service. This avoids unreliable bulk address geocoding while still representing the full CSV datasets spatially.

## 6. Wastewater Town Aggregation

The wastewater CSV records are normalized and aggregated by town.

Important functions:

- `parseCsv(text)`
  - Parses CSV text in-browser, including quoted values and embedded line breaks.

- `normalizeTown(value)`
  - Converts CSV town strings into uppercase official municipality-like values.
  - Removes ZIP codes and `MA` suffixes.
  - Resolves common aliases and neighborhood names.

- `buildWastewaterCsvState(gradedRows, groundwaterRows)`
  - Converts CSV rows into normalized wastewater records.
  - Builds the full wastewater summary and town-stat dictionary.

- `aggregateWastewaterRecords(records)`
  - Produces counts by town and facility type.
  - Computes groundwater flow totals.

- `renderWastewaterTownGraphics()`
  - Queries MassGIS municipal boundaries.
  - Places a bubble at each town polygon centroid.
  - Sizes the bubble based on total wastewater records.

Known town normalization examples:

- Dorchester, Brighton, Roxbury, Hyde Park, Mattapan, and Jamaica Plain map to Boston.
- Buzzards Bay and Cataumet map to Bourne.
- Woods Hole maps to Falmouth.
- Turners Falls maps to Montague.
- North Grafton maps to Grafton.
- North Dartmouth maps to Dartmouth.

## 7. Filtering Behavior

### Map Toggles

The sidebar map toggles control map visibility:

- Show GSEP layers.
- Show Gas Leak layers.
- Show EJ layer.
- Show Borehole layer.
- Show National Grid hosting.
- Show Waste Treatment Facilities.

These toggles affect the Spatial Maps tab. They do not remove data from the Data Analytics tab.

### Utility Filter

The utility filter is populated dynamically from the available active categories. It includes utility names derived from layer titles and supporting categories such as:

- National Grid
- Eversource
- MassDEP / Wastewater
- Environmental Justice
- Other gas utilities from GSEP/leak layers

The internal value for wastewater-related data remains `MassDEP`, while the user-facing label is `MassDEP / Wastewater`.

### Year Filter

The year filter is generated from GSEP and leak layer titles. It supports values such as:

- 2024
- 2026
- 2027-2028
- 2027-2030
- undated

### Status / Type Filter

The status/type filter combines options from the active categories.

Leak options:

- Open leaks
- Repaired leaks
- Summary layers

GSEP options:

- NPA
- Cost estimates

Wastewater options:

- Wastewater graded facilities
- Wastewater groundwater discharge
- Wastewater major facilities
- Wastewater municipal
- Wastewater industrial
- Wastewater combined
- Wastewater other / no grade

The wastewater filters affect:

- Wastewater town bubbles.
- Wastewater summary panel.
- Map visibility of the major facilities point layer.
- Analytics entries where relevant.

### Regional Focus

The regional focus filter moves the map to predefined centers/zooms:

- Statewide
- Greater Boston
- Western MA
- Central MA
- North Shore
- South Shore / Cape

The region changes the map viewpoint. Analytics remains full-dataset unless otherwise designed in future.

## 8. Bookmarks and Share Links

The dashboard supports saved map states and shareable URLs.

### Bookmarks

Bookmarks are stored in browser localStorage under:

```text
platanus-dashboard-bookmarks
```

Each bookmark stores:

- Name.
- Filter state.
- Toggle state.
- Region.
- Theme.
- Map center and zoom when available.

The dashboard keeps the latest eight bookmarks.

### Share Links

The share button writes the current URL to the clipboard. The URL query string can include:

- `utility`
- `year`
- `status`
- `region`
- `compareA`
- `compareB`
- `center`
- `zoom`
- `gsep`
- `leaks`
- `ej`
- `borehole`
- `hosting`
- `wastewater`
- `theme`

Toggle values use `1` or `0`.

## 9. Feature Inspector

Clicking a mapped feature runs an ArcGIS hit test and renders selected attributes in the Feature Inspector panel.

The inspector:

- Shows the source layer title.
- Filters out shape/global id style fields.
- Displays up to eight readable attributes.
- Escapes HTML to avoid rendering unsafe markup from external services.

For wastewater town bubbles, the popup includes:

- Total wastewater records.
- Graded facility count.
- Groundwater discharge plant count.
- Municipal/Industrial/Combined/Other type counts.
- Listed flow.
- Example facility/project names.

## 10. Hotspot Watchlist

Hotspots are derived from visible summary layers. The hotspot logic:

- Loads summary layers.
- Queries features in the current map extent.
- Finds a preferred numeric metric field.
- Ranks features by metric value.
- Displays the top five.

This is intentionally map-context-aware, unlike the full analytics tab.

## 11. Data Health

The Data Health panel checks whether representative layers can load their metadata. It reports:

- Ready
- Partial
- Issue

For FeatureLayer sources, it attempts `layer.load()` and reads edit metadata if exposed. For the National Grid MapImageLayer, it reports whether sublayers are available.

Wastewater CSV loading also adds a data-health entry:

- Ready when both local CSV files are loaded.
- Issue when the local wastewater data files cannot be loaded.

## 12. Analytics Architecture

The analytics system is intentionally split into two concepts:

### Map-visible analytics entries

Used for:

- Map summary.
- Hotspots.
- Map state feedback.

This path respects layer visibility and filters.

### Full analytics entries

Used for:

- Data Analytics charts.
- Analytics stat cards.

This path bypasses map visibility toggles and summarizes the full dashboard dataset.

Important functions:

- `getVisibleAnalyticsEntries()`
  - Uses current map visibility.

- `getFullAnalyticsEntries()`
  - Uses all dashboard data regardless of map toggles.

- `queryFeatureCounts()`
  - Queries ArcGIS FeatureLayer counts.
  - Uses precomputed counts for local CSV-derived records.

- `updateChartsFromAnalytics()`
  - Populates all Chart.js charts and stat cards.

## 13. Current Analytics Charts

The Data Analytics tab currently renders:

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

The Comparison Mode card is commented out.

## 14. Styling and Theme

The UI uses CSS custom properties for light/dark themes:

- `--bg`
- `--panel`
- `--ink`
- `--muted`
- `--accent`
- `--accent-secondary`
- `--line`
- `--glass`
- `--card`

The theme toggle:

- Switches body class `dark-theme`.
- Updates ArcGIS CSS theme.
- Switches basemap between gray and dark-gray vector.
- Stores preference in localStorage.
- Refreshes Chart.js colors.

## 15. Local Development

Because the app loads local CSV files and external services, run it from a local HTTP server rather than opening `index.html` directly.

Recommended command:

```powershell
python -m http.server
```

Then open:

```text
http://127.0.0.1:8000/
```

If port 8000 is occupied, Python may need another port:

```powershell
python -m http.server 8001
```

## 16. Deployment

The dashboard is fully static and can be deployed to:

- GitHub Pages.
- Netlify.
- Vercel static hosting.
- Any simple web server.

Deployment requirements:

- Preserve `index.html`, `app.js`, and the `data/` folder.
- Ensure CSV files are served with normal static-file access.
- Keep external network access to ArcGIS, Chart.js, Google Fonts, Mass.gov links, and utility portals.

The `index.html` script reference includes a cache-busting query string. Update it when making user-facing JavaScript changes that may otherwise be cached by browsers or GitHub Pages.

## 17. Security and Robustness Notes

The dashboard receives data from external ArcGIS services and local CSV files. To reduce risk:

- Dynamic strings are escaped before insertion into `innerHTML` where appropriate.
- Links opened from source cards use `target="_blank"` with `rel="noopener noreferrer"`.
- Failed layer loads are caught and reported in data health.
- Failed analytics layer counts return zero rather than breaking the dashboard.
- Missing chart canvases are tolerated, which allows chart cards to be commented out safely.

## 18. Known Limitations

- The app has no backend and no persistent database.
- Bookmarks are per-browser because they use localStorage.
- CSV wastewater records do not include latitude/longitude, so they are mapped by town aggregation, not exact facility address.
- Some source previews may be blank because external websites block iframe embedding.
- ArcGIS service availability is outside the app's control.
- The National Grid hosting layer is a MapImageLayer, so analytics uses service/sublayer availability rather than individual feature counts.
- The Data Analytics tab bypasses map toggles by design, but map hotspot ranking remains map-context-aware.

## 19. Maintenance Checklist

When updating data sources:

1. Confirm the ArcGIS service URL opens in a browser.
2. Confirm layer id numbers are correct.
3. Verify FeatureLayer vs MapImageLayer type.
4. Check whether query/count operations are supported.
5. Add source metadata to the sidebar list if needed.
6. Update analytics grouping if the source should appear in charts.
7. Run a browser smoke test.

When updating wastewater CSV files:

1. Replace files in `data/` without changing filenames unless code is also updated.
2. Confirm headers still match current parser expectations.
3. Check row counts.
4. Verify type parsing from `Facility Grade`.
5. Verify town normalization for new town/village names.
6. Refresh the dashboard and inspect the Wastewater Facility Summary.

When updating UI or JavaScript:

1. Update the cache-busting query string on the `app.js` script tag.
2. Test the Spatial Maps tab.
3. Test the Data Analytics tab.
4. Confirm no page errors or console errors.
5. Confirm toggles, filters, bookmarks, and share links still work.

