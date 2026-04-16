const sourceList = document.getElementById("sourceList");
const sourcePicker = document.getElementById("sourcePicker");
const sourceFrame = document.getElementById("sourceFrame");
const utilitySelect = document.getElementById("utilityFilter");
const yearSelect = document.getElementById("yearFilter");
const statusSelect = document.getElementById("statusFilter");
const regionSelect = document.getElementById("regionFilter");
const compareUtilityA = document.getElementById("compareUtilityA");
const compareUtilityB = document.getElementById("compareUtilityB");
const bookmarkNameInput = document.getElementById("bookmarkName");
const saveBookmarkBtn = document.getElementById("saveBookmarkBtn");
const shareStateBtn = document.getElementById("shareStateBtn");
const bookmarkList = document.getElementById("bookmarkList");
const healthList = document.getElementById("healthList");
const healthSummary = document.getElementById("healthSummary");
const hotspotList = document.getElementById("hotspotList");
const featureInspector = document.getElementById("featureInspector");
const mapStatusText = document.getElementById("mapStatusText");
const activeFilterSummary = document.getElementById("activeFilterSummary");
const heroRegion = document.getElementById("heroRegion");
const heroUtility = document.getElementById("heroUtility");
const heroLayerMix = document.getElementById("heroLayerMix");
const heroVisibleCount = document.getElementById("heroVisibleCount");
const summaryChips = document.getElementById("summaryChips");
const summaryNarrative = document.getElementById("summaryNarrative");
const analyticsSummaryChips = document.getElementById("analyticsSummaryChips");
const wastewaterCsvSummary = document.getElementById("wastewaterCsvSummary");
const compareEnabled = Boolean(compareUtilityA && compareUtilityB);

const BOOKMARK_STORAGE_KEY = "platanus-dashboard-bookmarks";
const WASTEWATER_CSV_SOURCES = {
  graded: "data/wastewater_graded_facilities.csv",
  groundwater: "data/wastewater_groundwater.csv"
};
const GRADE_TYPE_LABELS = {
  M: "Municipal",
  I: "Industrial",
  C: "Combined",
  O: "Other / no grade"
};
const TOWN_ALIASES = {
  ASSONET: "FREETOWN",
  BALDWINVILLE: "TEMPLETON",
  BRIGHTON: "BOSTON",
  "BOSTON ALLSTON": "BOSTON",
  "BOSTON BRIGHTON": "BOSTON",
  "BOSTON CHARLESTOWN": "BOSTON",
  "BOSTON DORCHESTER": "BOSTON",
  "BOSTON EAST": "BOSTON",
  "BOSTON HYDE PARK": "BOSTON",
  "BOSTON ROXBURY": "BOSTON",
  "BOSTON SOUTH": "BOSTON",
  BOXBOROURH: "BOXBOROUGH",
  "BUZZARDS BAY": "BOURNE",
  BYFIELD: "NEWBURY",
  CAMDRIDGE: "CAMBRIDGE",
  CATAUMET: "BOURNE",
  CHARLEMONTE: "CHARLEMONT",
  CHARLESTOWN: "BOSTON",
  DEVENS: "AYER",
  DORCHESTER: "BOSTON",
  "E WEYMOUTH": "WEYMOUTH",
  "EAST BOSTON": "BOSTON",
  "EAST DEERFIELD": "DEERFIELD",
  "FALLL RIVER": "FALL RIVER",
  FOXBORO: "FOXBOROUGH",
  FRAMINGHAN: "FRAMINGHAM",
  HOUSATONIC: "GREAT BARRINGTON",
  "JAMACIA PLAIN": "BOSTON",
  "JAMAICA PLAIN": "BOSTON",
  LANESBORO: "LANESBOROUGH",
  "LONGWOOD - BOSTON": "BOSTON",
  MANCHESTER: "MANCHESTER-BY-THE-SEA",
  MARLBORO: "MARLBOROUGH",
  MATTAPAN: "BOSTON",
  MIDDLEBORO: "MIDDLEBOROUGH",
  "MOUNT HERMON": "NORTHFIELD",
  "MT WASHINGTON": "MOUNT WASHINGTON",
  "N ANDOVER": "NORTH ANDOVER",
  "N BILLERICA": "BILLERICA",
  "NEEDHAM HEIGHTS": "NEEDHAM",
  "NORTH ATTLEBORO": "NORTH ATTLEBOROUGH",
  "NORTH CARVER": "CARVER",
  "NORTH DARTMOUTH": "DARTMOUTH",
  "NORTH GRAFTON": "GRAFTON",
  "NORTH WEYMOUTH": "WEYMOUTH",
  NORTHBORO: "NORTHBOROUGH",
  NOWOOD: "NORWOOD",
  "OTIS ANG BASE": "MASHPEE",
  "OTIS ANG BASEMASHPE": "MASHPEE",
  "OTTER RIVER": "TEMPLETON",
  ROXBURY: "BOSTON",
  "S DEERFIELD": "DEERFIELD",
  "SHELBURNE FALLS": "SHELBURNE",
  "SO BOSTON": "BOSTON",
  "SOUTH BOSTON": "BOSTON",
  "SOUTH DEERFIELD": "DEERFIELD",
  "SOUTH DENNIS": "DENNIS",
  "SOUTH HAMILTON": "HAMILTON",
  SOUTHBORO: "SOUTHBOROUGH",
  "TURNER FALLS": "MONTAGUE",
  "TURNERS FALLS": "MONTAGUE",
  "WEST SOMERVILLE": "SOMERVILLE",
  "WEST WARREN": "WARREN",
  WESTBORO: "WESTBOROUGH",
  WESTOVER: "CHICOPEE",
  "WOODS HOLE": "FALMOUTH"
};
const REGION_TARGETS = {
  statewide: { center: [-71.7, 42.2], zoom: 8 },
  "greater-boston": { center: [-71.06, 42.36], zoom: 10.5 },
  "western-ma": { center: [-72.65, 42.26], zoom: 9.2 },
  "central-ma": { center: [-71.8, 42.28], zoom: 9.5 },
  "north-shore": { center: [-70.95, 42.58], zoom: 10.2 },
  "south-shore-cape": { center: [-70.51, 41.89], zoom: 9.3 }
};

let mapReady = false;
let mapViewRef = null;
let charts = {};
let analyticsRunId = 0;
const appState = {
  bookmarks: [],
  health: [],
  latestHotspots: [],
  wastewaterCsv: {
    loaded: false,
    gradedRows: [],
    groundwaterRows: [],
    records: [],
    townStats: {},
    summary: null
  },
  pendingState: parseIncomingState()
};

function parseIncomingState() {
  const params = new URLSearchParams(window.location.search);
  return {
    theme: params.get("theme") || localStorage.getItem("theme"),
    utility: params.get("utility"),
    year: params.get("year"),
    status: params.get("status"),
    region: params.get("region"),
    compareA: params.get("compareA"),
    compareB: params.get("compareB"),
    center: params.get("center"),
    zoom: params.get("zoom"),
    toggleGsep: params.get("gsep"),
    toggleLeaks: params.get("leaks"),
    toggleEJ: params.get("ej"),
    toggleBorehole: params.get("borehole"),
    toggleNationalGrid: params.get("hosting"),
    toggleWastewater: params.get("wastewater")
  };
}

function forceHideMapLoader() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.add("hidden");
}

function showLoaderError(message) {
  const overlay = document.getElementById("loadingOverlay");
  const text = overlay ? overlay.querySelector(".loading-text") : null;
  if (text && message) {
    text.textContent = "Map load issue: " + message;
  }
  forceHideMapLoader();
}

function formatNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString() : "0";
}

function safeText(value) {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

function escapeHtml(value) {
  return safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  const headers = (rows.shift() || []).map((header) => header.trim());
  return rows.map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = (cells[index] || "").trim();
    });
    return record;
  });
}

function normalizeTown(value) {
  if (!value) return "";
  const town = String(value)
    .replace(/\bMA\b.*$/i, "")
    .replace(/\d{5}.*/g, "")
    .replace(/\s*\(.*$/g, "")
    .replace(/,/g, "")
    .replace(/\./g, "")
    .trim()
    .toUpperCase();
  return TOWN_ALIASES[town] || town;
}

function getGradeType(grade) {
  const match = String(grade || "").match(/-\s*([MICO])/i);
  return match ? match[1].toUpperCase() : "O";
}

function isWastewaterStatus(statusValue) {
  return /^ww-/.test(statusValue || "");
}

function wastewaterRecordMatchesStatus(record, statusValue) {
  if (!statusValue || statusValue === "all") return true;
  if (statusValue === "ww-graded") return record.dataset === "graded";
  if (statusValue === "ww-groundwater") return record.dataset === "groundwater";
  if (statusValue === "ww-major-facilities") return false;
  if (statusValue === "ww-municipal") return record.type === "M";
  if (statusValue === "ww-industrial") return record.type === "I";
  if (statusValue === "ww-combined") return record.type === "C";
  if (statusValue === "ww-other") return record.type === "O";
  return false;
}

function getWastewaterStatusLabel(statusValue) {
  const labels = {
    "ww-graded": "Graded facilities",
    "ww-groundwater": "Groundwater discharge plants",
    "ww-major-facilities": "MassDEP major waste-treatment facilities",
    "ww-municipal": "Municipal facilities",
    "ww-industrial": "Industrial facilities",
    "ww-combined": "Combined facilities",
    "ww-other": "Other / no-grade facilities"
  };
  return labels[statusValue] || "Wastewater facilities";
}

function getUtilityLabel(value) {
  const labels = {
    all: "All utilities",
    MassDEP: "MassDEP / Wastewater",
    Environmental: "Environmental Justice"
  };
  return labels[value] || value;
}

function setSelectValue(select, value, fallback) {
  if (!select) return;
  const options = Array.from(select.options).map((option) => option.value);
  if (value && options.includes(value)) {
    select.value = value;
  } else if (fallback && options.includes(fallback)) {
    select.value = fallback;
  }
}

function updateThemeLabel() {
  const dark = document.body.classList.contains("dark-theme");
  const themeLabel = document.getElementById("themeLabel");
  if (themeLabel) themeLabel.textContent = dark ? "Light Mode" : "Dark Mode";
}

function formatLabel(value) {
  if (!value) return "All";
  return String(value)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActiveLayerMix(toggles) {
  const labels = [];
  if (toggles.toggleGsep) labels.push("GSEP");
  if (toggles.toggleLeaks) labels.push("Leaks");
  if (toggles.toggleEJ) labels.push("EJ");
  if (toggles.toggleBorehole) labels.push("Boreholes");
  if (toggles.toggleNationalGrid) labels.push("Hosting");
  if (toggles.toggleWastewater) labels.push("Wastewater");
  return labels.length ? labels.join(" + ") : "No layers";
}

function getChartPalette() {
  const styles = getComputedStyle(document.body);
  const accent = styles.getPropertyValue("--accent").trim() || "#3b82f6";
  const ink = styles.getPropertyValue("--ink").trim() || "#0f172a";
  const muted = styles.getPropertyValue("--muted").trim() || "#64748b";
  const line = styles.getPropertyValue("--line").trim() || "rgba(148, 163, 184, 0.2)";
  const accentSecondary = styles.getPropertyValue("--accent-secondary").trim() || "#f97316";
  return {
    accent,
    ink,
    muted,
    line,
    accentSecondary,
    series: [accent, "#38bdf8", "#f59e0b", "#10b981", "#a78bfa", accentSecondary]
  };
}

function refreshChartTheme() {
  const palette = getChartPalette();
  Object.values(charts).forEach((chart) => {
    if (!chart) return;
    chart.options.plugins.legend.labels.color = palette.muted;
    if (chart.options.scales && chart.options.scales.y) {
      chart.options.scales.y.ticks.color = palette.muted;
      chart.options.scales.y.grid.color = palette.line;
    }
    if (chart.options.scales && chart.options.scales.x) {
      chart.options.scales.x.ticks.color = palette.muted;
      chart.options.scales.x.grid.color = "transparent";
    }
    chart.update();
  });
}

function updateExperienceSummary(visibleFeatureCount) {
  const toggles = getCurrentToggles();
  const regionLabel = formatLabel(regionSelect.value || "statewide");
  const utilityLabel = getUtilityLabel(utilitySelect.value || "all");
  const yearLabel = yearSelect.value === "all" ? "All years" : yearSelect.value;
  const statusLabel = statusSelect.value === "all" ? "All statuses" : formatLabel(statusSelect.value);
  const layerMix = getActiveLayerMix(toggles);

  if (mapStatusText) mapStatusText.textContent = visibleFeatureCount > 0 ? "Live map" : "Filtering";
  if (activeFilterSummary) activeFilterSummary.textContent = regionLabel;
  if (heroRegion) heroRegion.textContent = regionLabel;
  if (heroUtility) heroUtility.textContent = utilityLabel;
  if (heroLayerMix) heroLayerMix.textContent = layerMix;
  if (heroVisibleCount) heroVisibleCount.textContent = formatNumber(visibleFeatureCount);

  if (summaryChips) {
    summaryChips.innerHTML = `
      <span class="badge">${escapeHtml(layerMix)}</span>
      <span class="badge">${escapeHtml(utilityLabel)}</span>
      <span class="badge">${escapeHtml(yearLabel)}</span>
      <span class="badge">${escapeHtml(statusLabel)}</span>
    `;
  }

  if (summaryNarrative) {
    summaryNarrative.textContent = `${regionLabel} is in focus with ${layerMix.toLowerCase()} visible. The map is currently filtered to ${utilityLabel.toLowerCase()}, ${yearLabel.toLowerCase()}, and ${statusLabel.toLowerCase()}.`;
  }

  if (analyticsSummaryChips) {
    analyticsSummaryChips.innerHTML = `
      <span class="badge">${formatNumber(visibleFeatureCount)} visible features</span>
      <span class="badge">${formatNumber(appState.latestHotspots.length)} hotspots</span>
      <span class="badge">${escapeHtml(regionLabel)}</span>
    `;
  }
}

function renderFeatureInspector(graphic) {
  if (!featureInspector) return;
  if (!graphic) {
    featureInspector.innerHTML = `
      <div class="metric-item">
        <strong>No feature selected</strong>
        <span>Click any mapped feature to inspect its attributes, source layer, and context.</span>
      </div>
    `;
    return;
  }

  const attrs = graphic.attributes || {};
  const layerTitle = safeText(graphic.layer && graphic.layer.title ? graphic.layer.title : "Unknown layer");
  const entries = Object.entries(attrs)
    .filter(([key, value]) => key && value !== null && value !== "" && !/shape|globalid/i.test(key))
    .slice(0, 8);

  const items = entries.length
    ? entries.map(([key, value]) => `
        <div class="attribute-item">
          <strong>${escapeHtml(key)}</strong>
          <span>${escapeHtml(value)}</span>
        </div>
      `).join("")
    : `
      <div class="attribute-item">
        <strong>No readable attributes</strong>
        <span>This feature did not expose tabular attributes through the hit test response.</span>
      </div>
    `;

  featureInspector.innerHTML = `
    <div class="metric-item">
      <strong>${escapeHtml(layerTitle)}</strong>
      <span>Spatial feature selected from the current map stack.</span>
    </div>
    <div class="attribute-list">${items}</div>
  `;
}

function getUtilityFromName(name) {
  const known = ["National Grid", "Boston Gas", "Colonial Gas", "Liberty Utilities", "Liberty", "Eversource", "Berkshire", "EGMA", "Unitil"];
  for (const utility of known) {
    if (name.includes(utility)) return utility;
  }
  return name.split(" ")[0];
}

function inferStatusFromTitle(title, group) {
  if (group === "leaks") {
    if (/repaired/i.test(title)) return "repaired";
    if (/summary|estimated emissions|towns|neighborhood/i.test(title)) return "summary";
    return "open";
  }
  if (/cost/i.test(title)) return "cost";
  return "npa";
}

function extractYearFromTitle(title) {
  const match = title.match(/\d{4}-\d{4}|\d{4}/);
  return match ? match[0] : "undated";
}

function hasYear(title, yearValue) {
  if (yearValue === "all") return true;
  if (yearValue === "2027-2030") return /2027-2030|2027-2028/i.test(title);
  return title.includes(yearValue);
}

function hasStatus(entry, statusValue) {
  if (statusValue === "all") return true;
  return entry.statusKind === statusValue;
}

function getCurrentToggles() {
  return {
    toggleGsep: document.getElementById("toggleGsep").checked,
    toggleLeaks: document.getElementById("toggleLeaks").checked,
    toggleEJ: document.getElementById("toggleEJ").checked,
    toggleBorehole: document.getElementById("toggleBorehole").checked,
    toggleNationalGrid: document.getElementById("toggleNationalGrid").checked,
    toggleWastewater: document.getElementById("toggleWastewater").checked
  };
}

function getCurrentState(view) {
  const toggles = getCurrentToggles();
  const state = {
    utility: utilitySelect.value,
    year: yearSelect.value,
    status: statusSelect.value,
    region: regionSelect.value,
    compareA: compareEnabled ? compareUtilityA.value : null,
    compareB: compareEnabled ? compareUtilityB.value : null,
    gsep: toggles.toggleGsep ? "1" : "0",
    leaks: toggles.toggleLeaks ? "1" : "0",
    ej: toggles.toggleEJ ? "1" : "0",
    borehole: toggles.toggleBorehole ? "1" : "0",
    hosting: toggles.toggleNationalGrid ? "1" : "0",
    wastewater: toggles.toggleWastewater ? "1" : "0",
    theme: document.body.classList.contains("dark-theme") ? "dark" : "light"
  };

  if (view && view.center) {
    state.center = `${view.center.longitude.toFixed(4)},${view.center.latitude.toFixed(4)}`;
    state.zoom = String(view.zoom.toFixed(2));
  }
  return state;
}

function syncUrlState(view) {
  const state = getCurrentState(view);
  const params = new URLSearchParams();
  Object.entries(state).forEach(([key, value]) => {
    if (value && value !== "all" && value !== "statewide") params.set(key, value);
    if ((key === "gsep" || key === "leaks" || key === "ej" || key === "borehole" || key === "hosting" || key === "wastewater") && value === "0") {
      params.set(key, value);
    }
  });
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    appState.bookmarks = raw ? JSON.parse(raw) : [];
  } catch (error) {
    appState.bookmarks = [];
  }
}

function persistBookmarks() {
  localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(appState.bookmarks));
}

function renderBookmarks(applyBookmark, removeBookmark) {
  if (!bookmarkList) return;
  if (!appState.bookmarks.length) {
    bookmarkList.innerHTML = `
      <div class="bookmark-item">
        <strong>No saved views yet</strong>
        <span>Save a filtered map state and you can jump back to it anytime.</span>
      </div>
    `;
    return;
  }

  bookmarkList.innerHTML = appState.bookmarks.map((bookmark, index) => `
    <div class="bookmark-item">
      <strong>${escapeHtml(bookmark.name)}</strong>
      <span>${escapeHtml(bookmark.summary)}</span>
      <div class="inline-actions" style="margin-top: 8px;">
        <button class="action-btn" type="button" data-bookmark-apply="${index}">Open</button>
        <button class="action-btn" type="button" data-bookmark-delete="${index}">Delete</button>
      </div>
    </div>
  `).join("");

  bookmarkList.querySelectorAll("[data-bookmark-apply]").forEach((btn) => {
    btn.addEventListener("click", () => applyBookmark(Number(btn.dataset.bookmarkApply)));
  });
  bookmarkList.querySelectorAll("[data-bookmark-delete]").forEach((btn) => {
    btn.addEventListener("click", () => removeBookmark(Number(btn.dataset.bookmarkDelete)));
  });
}

function renderHealth(entries) {
  if (!healthSummary || !healthList) return;
  const ready = entries.filter((entry) => entry.status === "Ready").length;
  const degraded = entries.filter((entry) => entry.status !== "Ready").length;
  healthSummary.innerHTML = `
    <span class="badge">Ready ${ready}</span>
    <span class="badge">Issues ${degraded}</span>
    <span class="badge">Tracked ${entries.length}</span>
  `;

  healthList.innerHTML = entries.map((entry) => {
    const pillClass = entry.status === "Ready" ? "good" : (entry.status === "Partial" ? "warn" : "bad");
    return `
      <div class="health-item">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <strong>${escapeHtml(entry.title)}</strong>
          <span class="status-pill ${pillClass}">${escapeHtml(entry.status)}</span>
        </div>
        <span>${escapeHtml(entry.detail)}</span>
      </div>
    `;
  }).join("");
}

function renderHotspots(items) {
  if (!hotspotList) return;
  document.getElementById("statHotspots").textContent = formatNumber(items.length);
  if (!items.length) {
    hotspotList.innerHTML = `
      <div class="hotspot-item">
        <strong>No hotspots detected</strong>
        <span>Try enabling leak summary layers or zooming the map into a more focused region.</span>
      </div>
    `;
    return;
  }

  hotspotList.innerHTML = items.map((item) => `
    <div class="hotspot-item">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.layerTitle)}<br />${escapeHtml(item.metricLabel)}: ${formatNumber(item.metricValue)}</span>
    </div>
  `).join("");
}

function buildWastewaterCsvState(gradedRows, groundwaterRows) {
  const records = [];
  gradedRows.forEach((row) => {
    const town = normalizeTown(row["City or Town"]);
    const type = getGradeType(row["Facility Grade"]);
    records.push({
      dataset: "graded",
      type,
      town,
      name: row["Facility Name"] || "",
      flow: 0
    });
  });

  groundwaterRows.forEach((row) => {
    const town = normalizeTown(row.TOWN);
    const flow = Number(String(row.FLOW || "").replace(/,/g, "")) || 0;
    records.push({
      dataset: "groundwater",
      type: "groundwater",
      town,
      name: row.PROJNAME || "",
      flow
    });
  });

  const aggregate = aggregateWastewaterRecords(records);
  return {
    loaded: true,
    gradedRows,
    groundwaterRows,
    records,
    townStats: aggregate.townStats,
    summary: aggregate.summary
  };
}

function aggregateWastewaterRecords(records) {
  const townStats = {};
  const typeCounts = { M: 0, I: 0, C: 0, O: 0 };
  let gradedTotal = 0;
  let groundwaterTotal = 0;
  let groundwaterFlow = 0;

  function ensureTown(town) {
    if (!town) return null;
    if (!townStats[town]) {
      townStats[town] = {
        town,
        graded: 0,
        groundwater: 0,
        total: 0,
        flow: 0,
        types: { M: 0, I: 0, C: 0, O: 0 },
        examples: []
      };
    }
    return townStats[town];
  }

  records.forEach((record) => {
    if (record.dataset === "graded") {
      gradedTotal += 1;
      typeCounts[record.type] = (typeCounts[record.type] || 0) + 1;
    }
    if (record.dataset === "groundwater") {
      groundwaterTotal += 1;
      groundwaterFlow += record.flow;
    }
    const entry = ensureTown(record.town);
    if (!entry) return;
    if (record.dataset === "graded") {
      entry.graded += 1;
      entry.types[record.type] = (entry.types[record.type] || 0) + 1;
    }
    if (record.dataset === "groundwater") {
      entry.groundwater += 1;
      entry.flow += record.flow;
    }
    entry.total += 1;
    if (entry.examples.length < 4 && record.name) entry.examples.push(record.name);
  });

  return {
    townStats,
    summary: {
      gradedTotal,
      groundwaterTotal,
      townTotal: Object.keys(townStats).length,
      groundwaterFlow,
      typeCounts
    }
  };
}

function getFilteredWastewaterCsvState(statusValue = statusSelect.value, utilityValue = utilitySelect.value) {
  if (!appState.wastewaterCsv.records.length) return { townStats: {}, summary: null };
  if (utilityValue !== "all" && utilityValue !== "MassDEP") {
    return {
      townStats: {},
      summary: {
        gradedTotal: 0,
        groundwaterTotal: 0,
        townTotal: 0,
        groundwaterFlow: 0,
        typeCounts: { M: 0, I: 0, C: 0, O: 0 }
      }
    };
  }
  if (statusValue !== "all" && !isWastewaterStatus(statusValue)) {
    return {
      townStats: {},
      summary: {
        gradedTotal: 0,
        groundwaterTotal: 0,
        townTotal: 0,
        groundwaterFlow: 0,
        typeCounts: { M: 0, I: 0, C: 0, O: 0 }
      }
    };
  }
  return aggregateWastewaterRecords(
    appState.wastewaterCsv.records.filter((record) => wastewaterRecordMatchesStatus(record, statusValue))
  );
}

function renderWastewaterCsvSummary(statusValue = statusSelect.value, utilityValue = utilitySelect.value) {
  if (!wastewaterCsvSummary) return;
  const filtered = getFilteredWastewaterCsvState(statusValue, utilityValue);
  const summary = filtered.summary;
  if (!summary) {
    wastewaterCsvSummary.innerHTML = `
      <div class="metric-item">
        <strong>Wastewater datasets loading</strong>
        <span>Graded facilities and groundwater discharge records will appear after the local data files load.</span>
      </div>
    `;
    return;
  }

  const filterLabel = statusValue === "all" ? "All wastewater records" : getWastewaterStatusLabel(statusValue);
  wastewaterCsvSummary.innerHTML = `
    <div class="metric-item">
      <strong>${formatNumber(summary.gradedTotal)} graded facilities</strong>
      <span>${escapeHtml(filterLabel)} across ${formatNumber(summary.townTotal)} towns.</span>
    </div>
    <div class="metric-item">
      <strong>${formatNumber(summary.groundwaterTotal)} groundwater discharge plants</strong>
      <span>${formatNumber(summary.groundwaterFlow)} total listed design flow across groundwater records.</span>
    </div>
    <div class="metric-item">
      <strong>Facility Type Mix</strong>
      <span>
        Municipal ${formatNumber(summary.typeCounts.M)} |
        Industrial ${formatNumber(summary.typeCounts.I)} |
        Combined ${formatNumber(summary.typeCounts.C)} |
        Other ${formatNumber(summary.typeCounts.O)}
      </span>
    </div>
  `;
}

function applyStateToControls(state) {
  if (!state) return;
  if (state.toggleGsep !== null && state.toggleGsep !== undefined) document.getElementById("toggleGsep").checked = state.toggleGsep !== "0";
  if (state.toggleLeaks !== null && state.toggleLeaks !== undefined) document.getElementById("toggleLeaks").checked = state.toggleLeaks !== "0";
  if (state.toggleEJ !== null && state.toggleEJ !== undefined) document.getElementById("toggleEJ").checked = state.toggleEJ !== "0";
  if (state.toggleBorehole !== null && state.toggleBorehole !== undefined) document.getElementById("toggleBorehole").checked = state.toggleBorehole !== "0";
  if (state.toggleNationalGrid !== null && state.toggleNationalGrid !== undefined) document.getElementById("toggleNationalGrid").checked = state.toggleNationalGrid !== "0";
  if (state.toggleWastewater !== null && state.toggleWastewater !== undefined) document.getElementById("toggleWastewater").checked = state.toggleWastewater !== "0";
  if (state.region) regionSelect.value = state.region;
  if (state.theme === "dark") document.body.classList.add("dark-theme");
  if (state.theme === "light") document.body.classList.remove("dark-theme");
  updateThemeLabel();
}

function toggleMenu(force) {
  const panel = document.querySelector(".panel");
  const overlay = document.getElementById("overlay");
  const isActive = force !== undefined ? force : !panel.classList.contains("active");
  panel.classList.toggle("active", isActive);
  overlay.classList.toggle("active", isActive);
}

function switchTab(tabId, clickedBtn) {
  if (window.innerWidth <= 1024) toggleMenu(false);
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((button) => button.classList.remove("active"));
  document.getElementById(`tab-${tabId}`).classList.add("active");
  if (clickedBtn) clickedBtn.classList.add("active");
  if (tabId === "maps" && mapReady && mapViewRef) {
    setTimeout(() => refreshMapViewSize(mapViewRef), 60);
  }
}

function refreshMapViewSize(view) {
  if (view && typeof view.resize === "function") {
    view.resize();
  }
}

window.addEventListener("load", () => setTimeout(forceHideMapLoader, 3500));
setTimeout(forceHideMapLoader, 9000);
window.addEventListener("error", (e) => {
  if (e && e.message) showLoaderError(e.message);
});
window.addEventListener("unhandledrejection", () => {
  showLoaderError("unexpected script error");
});
document.getElementById("menuBtn").addEventListener("click", () => toggleMenu());
document.getElementById("overlay").addEventListener("click", () => toggleMenu(false));
sourcePicker.addEventListener("change", (event) => {
  sourceFrame.src = event.target.value;
  sourceFrame.dataset.sourceUrl = event.target.value;
});
document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab, button));
});

const scheduleMapResize = (() => {
  let timer = null;
  return () => {
    if (!mapReady || !mapViewRef) return;
    clearTimeout(timer);
    timer = setTimeout(() => refreshMapViewSize(mapViewRef), 120);
  };
})();

window.addEventListener("resize", scheduleMapResize);
window.addEventListener("orientationchange", scheduleMapResize);

function initCharts() {
  const palette = getChartPalette();
  const createChart = (id, type, label, bgColor) => {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    return new Chart(canvas, {
      type,
      data: {
        labels: [],
        datasets: [{
          label,
          data: [],
          backgroundColor: bgColor,
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: palette.muted,
              font: { family: "Outfit" }
            }
          }
        },
        scales: type === "bar" ? {
          y: {
            beginAtZero: true,
            grid: { color: palette.line },
            ticks: { color: palette.muted, precision: 0 }
          },
          x: {
            grid: { display: false },
            ticks: { color: palette.muted }
          }
        } : {}
      }
    });
  };

  charts.utility = createChart("chartUtilityDistribution", "bar", "Total Features", palette.accent);
  charts.status = createChart("chartGsepStatus", "pie", "Project Statuses", palette.series.slice(0, 5));
  charts.hosting = createChart("chartHostingTiers", "doughnut", "Hosting Access", ["#ef4444", "#f59e0b", "#10b981"]);
  charts.timeline = createChart("chartBatchTimeline", "bar", "Projects by Year", "#38bdf8");
  charts.safety = createChart("chartSafetyStatus", "doughnut", "Repair Status", ["#10b981", "#f59e0b"]);
  charts.compare = createChart("chartComparison", "bar", "Comparison", [palette.accent, palette.accentSecondary]);
  charts.layerGroups = createChart("chartLayerGroups", "bar", "Feature Count", palette.series);
  charts.gsepUtility = createChart("chartGsepUtility", "bar", "GSEP Features", "#10b981");
  charts.leakUtility = createChart("chartLeakUtility", "bar", "Leak Features", "#f59e0b");
  charts.wastewaterTypes = createChart("chartWastewaterTypes", "doughnut", "Facility Types", ["#0f766e", "#f97316", "#6366f1", "#94a3b8"]);
  charts.wastewaterTowns = createChart("chartWastewaterTowns", "bar", "Wastewater Records", "#0891b2");
  charts.contextLayers = createChart("chartContextLayers", "bar", "Context Features", "#a78bfa");
}

function updateYearList(allLayerMeta, toggles) {
  const currentVal = yearSelect.value || appState.pendingState.year || "all";
  const years = new Set();
  allLayerMeta.forEach((entry) => {
    if ((entry.group === "gsep" && toggles.toggleGsep) || (entry.group === "leaks" && toggles.toggleLeaks)) {
      years.add(entry.year);
    }
  });

  yearSelect.innerHTML = '<option value="all">All years</option>';
  Array.from(years).sort().forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
  setSelectValue(yearSelect, currentVal, "all");
}

function updateStatusList(toggles) {
  const currentVal = statusSelect.value || appState.pendingState.status || "all";
  const options = [{ val: "all", label: "All statuses" }];
  if (toggles.toggleLeaks) {
    options.push({ val: "open", label: "Open leaks" });
    options.push({ val: "repaired", label: "Repaired leaks" });
    options.push({ val: "summary", label: "Summary layers" });
  }
  if (toggles.toggleGsep) {
    options.push({ val: "npa", label: "NPA" });
    options.push({ val: "cost", label: "Cost estimates" });
  }
  if (toggles.toggleWastewater) {
    options.push({ val: "ww-graded", label: "Wastewater graded facilities" });
    options.push({ val: "ww-groundwater", label: "Wastewater groundwater discharge" });
    options.push({ val: "ww-major-facilities", label: "Wastewater major facilities" });
    options.push({ val: "ww-municipal", label: "Wastewater municipal" });
    options.push({ val: "ww-industrial", label: "Wastewater industrial" });
    options.push({ val: "ww-combined", label: "Wastewater combined" });
    options.push({ val: "ww-other", label: "Wastewater other / no grade" });
  }

  statusSelect.innerHTML = "";
  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.val;
    option.textContent = item.label;
    statusSelect.appendChild(option);
  });
  setSelectValue(statusSelect, currentVal, "all");
}

function updateUtilityLists(allLayerMeta, extraLayers, toggles) {
  const currentUtility = utilitySelect.value || appState.pendingState.utility || "all";
  const currentCompareA = compareEnabled ? (compareUtilityA.value || appState.pendingState.compareA || "National Grid") : "National Grid";
  const currentCompareB = compareEnabled ? (compareUtilityB.value || appState.pendingState.compareB || "Eversource") : "Eversource";
  const utilities = new Set();
  const categoryMap = { gsep: "toggleGsep", leaks: "toggleLeaks", ej: "toggleEJ", borehole: "toggleBorehole", nationalgrid: "toggleNationalGrid", wastewater: "toggleWastewater" };

  allLayerMeta.concat(extraLayers).forEach((entry) => {
    const toggleKey = categoryMap[entry.group] || entry.categoryToggle;
    if (!toggleKey || toggles[toggleKey]) {
      const utility = entry.utility || getUtilityFromName(entry.title);
      if (utility) utilities.add(utility);
    }
  });

  const values = Array.from(utilities).sort();
  utilitySelect.innerHTML = '<option value="all">All utilities</option>';
  values.forEach((utility) => {
    const option = document.createElement("option");
    option.value = utility;
    option.textContent = getUtilityLabel(utility);
    utilitySelect.appendChild(option);
  });
  setSelectValue(utilitySelect, currentUtility, "all");

  if (compareEnabled) {
    [compareUtilityA, compareUtilityB].forEach((select) => {
      select.innerHTML = "";
      values.forEach((utility) => {
        const option = document.createElement("option");
        option.value = utility;
        option.textContent = getUtilityLabel(utility);
        select.appendChild(option);
      });
    });
    setSelectValue(compareUtilityA, currentCompareA, values[0]);
    setSelectValue(compareUtilityB, currentCompareB, values[Math.min(1, Math.max(values.length - 1, 0))] || values[0]);
  }
}

function updateSidebarSources(allLayerMeta, extraLayers) {
  sourceList.innerHTML = "";
  sourcePicker.innerHTML = "";
  const uniqueSources = new Map();

  allLayerMeta.concat(extraLayers).forEach((entry) => {
    const sourceUrl = entry.sourceUrl || entry.url;
    if (entry.layer && entry.layer.visible && sourceUrl) {
      if (!uniqueSources.has(sourceUrl)) {
        uniqueSources.set(sourceUrl, entry.sidebarTitle || entry.title);
      }
    }
  });

  if (!uniqueSources.size) {
    sourceList.innerHTML = `
      <div class="source">
        <strong>No active sources</strong>
        <a href="#" onclick="return false;">Enable layers to inspect sources</a>
      </div>
    `;
    sourceFrame.removeAttribute("src");
    delete sourceFrame.dataset.sourceUrl;
    return;
  }

  let firstUrl = null;
  uniqueSources.forEach((title, url) => {
    if (!firstUrl) firstUrl = url;
    const card = document.createElement("div");
    card.className = "source";
    card.innerHTML = `<strong>${escapeHtml(title)}</strong><a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">Open source</a>`;
    sourceList.appendChild(card);

    const option = document.createElement("option");
    option.value = url;
    option.textContent = title;
    sourcePicker.appendChild(option);
  });

  if (!sourceFrame.dataset.sourceUrl || !uniqueSources.has(sourceFrame.dataset.sourceUrl)) {
    sourceFrame.src = firstUrl;
    sourceFrame.dataset.sourceUrl = firstUrl;
  }
}

function getRegionTarget(region) {
  return REGION_TARGETS[region] || REGION_TARGETS.statewide;
}

function applyViewTarget(view, state, allowRegionFallback) {
  if (!view) return;
  if (state.center && state.zoom) {
    const [longitude, latitude] = state.center.split(",").map(Number);
    const zoom = Number(state.zoom);
    if (Number.isFinite(longitude) && Number.isFinite(latitude) && Number.isFinite(zoom)) {
      view.goTo({ center: [longitude, latitude], zoom }).catch(() => {});
      return;
    }
  }
  if (allowRegionFallback) {
    const target = getRegionTarget(state.region || regionSelect.value);
    view.goTo(target).catch(() => {});
  }
}

async function collectHealth(entries, hostingLayer) {
  const visibleHealth = await Promise.all(entries.map(async (entry) => {
    try {
      await entry.layer.load();
      const lastEdit = entry.layer.sourceJSON && entry.layer.sourceJSON.editingInfo && entry.layer.sourceJSON.editingInfo.lastEditDate
        ? new Date(entry.layer.sourceJSON.editingInfo.lastEditDate).toLocaleDateString()
        : null;
      return {
        title: entry.title,
        status: "Ready",
        detail: lastEdit ? `Metadata loaded. Last edit ${lastEdit}.` : "Metadata loaded. No edit timestamp exposed."
      };
    } catch (error) {
      return {
        title: entry.title,
        status: "Issue",
        detail: "Layer metadata could not be loaded cleanly."
      };
    }
  }));

  try {
    await hostingLayer.load();
    visibleHealth.push({
      title: hostingLayer.title,
      status: "Partial",
      detail: `Map image service available with ${hostingLayer.allSublayers ? hostingLayer.allSublayers.length : 0} sublayers exposed.`
    });
  } catch (error) {
    visibleHealth.push({
      title: hostingLayer.title,
      status: "Issue",
      detail: "Hosting capacity service metadata could not be confirmed."
    });
  }

  const existingCsvHealth = appState.health.filter((entry) => /^Wastewater datasets/i.test(entry.title));
  appState.health = visibleHealth.concat(existingCsvHealth);
  renderHealth(appState.health);
}

function buildHotspotMetric(feature, fields) {
  const attributes = feature.attributes || {};
  const numericFields = fields
    .filter((field) => field.type === "integer" || field.type === "small-integer" || field.type === "single" || field.type === "double")
    .map((field) => field.name);
  const preferredMetric = numericFields.find((field) => /(leak|emission|score|count|total|open|risk|sum|volume|priority)/i.test(field)) || numericFields[0];
  if (!preferredMetric) return null;
  const metricValue = Number(attributes[preferredMetric]);
  if (!Number.isFinite(metricValue)) return null;

  const nameField = Object.keys(attributes).find((field) => /(town|municip|city|neigh|name|community|place|area)/i.test(field)) || "OBJECTID";
  return {
    name: safeText(attributes[nameField] || attributes.OBJECTID || "Unnamed feature"),
    metricLabel: preferredMetric,
    metricValue
  };
}

async function buildHotspots(view, layerEntries) {
  const hotspotCandidates = [];
  for (const entry of layerEntries.filter((item) => item.visible && item.isSummary)) {
    try {
      await entry.layer.load();
      const query = entry.layer.createQuery();
      query.where = "1=1";
      query.returnGeometry = false;
      query.outFields = ["*"];
      query.num = 25;
      if (view.extent) {
        query.geometry = view.extent;
        query.spatialRelationship = "intersects";
      }
      const response = await entry.layer.queryFeatures(query);
      response.features.forEach((feature) => {
        const metric = buildHotspotMetric(feature, entry.layer.fields || []);
        if (metric) {
          hotspotCandidates.push({
            layerTitle: entry.title,
            name: metric.name,
            metricLabel: metric.metricLabel,
            metricValue: metric.metricValue
          });
        }
      });
    } catch (error) {
      // ignore noisy layers
    }
  }

  const ranked = hotspotCandidates
    .sort((a, b) => b.metricValue - a.metricValue)
    .slice(0, 5);
  appState.latestHotspots = ranked;
  renderHotspots(ranked);
}

async function queryFeatureCounts(view, visibleEntries) {
  const results = await Promise.all(visibleEntries.map(async (entry) => {
    try {
      if (!entry.layer || Number.isFinite(entry.featureCount)) {
        return { ...entry, featureCount: Number(entry.featureCount) || 0 };
      }
      const query = entry.layer.createQuery();
      query.where = "1=1";
      if (view.extent) {
        query.geometry = view.extent;
        query.spatialRelationship = "intersects";
      }
      const count = await entry.layer.queryFeatureCount(query);
      return { ...entry, featureCount: count };
    } catch (error) {
      return { ...entry, featureCount: 0 };
    }
  }));
  return results;
}

function shouldIncludeAnalyticsEntry(entry, options) {
  if (!entry.includeInAnalytics || !entry.layer) return false;
  if (!options.includeAllToggles && !entry.layer.visible) return false;
  if (options.activeUtility !== "all" && entry.utility !== options.activeUtility) return false;
  if (isWastewaterStatus(options.activeStatus) && options.activeStatus !== "ww-major-facilities") return false;
  if (options.activeStatus === "ww-major-facilities" && entry.analyticsGroup !== "wastewater") return false;
  if (options.activeStatus !== "all" && !isWastewaterStatus(options.activeStatus) && entry.analyticsGroup !== "wastewater") return false;
  return true;
}

function getAnalyticsEntries(allLayerMeta, extraLayers, options = {}) {
  const activeUtility = options.activeUtility || utilitySelect.value;
  const activeStatus = options.activeStatus || statusSelect.value;
  const includeAllToggles = Boolean(options.includeAllToggles);
  const extraAnalyticsEntries = extraLayers
    .filter((entry) => shouldIncludeAnalyticsEntry(entry, { activeUtility, activeStatus, includeAllToggles }))
    .map((entry) => ({
      ...entry,
      group: entry.group || entry.analyticsGroup || "context",
      year: entry.year || "current",
      statusKind: entry.statusKind || "context",
      isSummary: false
  }));
  const csvEntries = [];
  const wastewaterSummary = getFilteredWastewaterCsvState(activeStatus, activeUtility).summary;
  if ((includeAllToggles || getCurrentToggles().toggleWastewater) && wastewaterSummary) {
    csvEntries.push({
      group: "wastewater",
      title: "Graded wastewater facilities",
      utility: "MassDEP",
      year: "current",
      statusKind: activeStatus === "all" ? "graded" : getWastewaterStatusLabel(activeStatus),
      featureCount: wastewaterSummary.gradedTotal
    });
    csvEntries.push({
      group: "wastewater",
      title: "Groundwater discharge plants",
      utility: "MassDEP",
      year: "current",
      statusKind: activeStatus === "all" ? "groundwater" : getWastewaterStatusLabel(activeStatus),
      featureCount: wastewaterSummary.groundwaterTotal
    });
  }
  const layerEntries = allLayerMeta.filter((entry) => {
    const utilityMatch = activeUtility === "all" || entry.utility === activeUtility;
    const statusMatch = activeStatus === "all" || hasStatus(entry, activeStatus);
    return utilityMatch && statusMatch && (includeAllToggles || entry.layer.visible);
  });
  return layerEntries.concat(extraAnalyticsEntries, csvEntries);
}

function getVisibleAnalyticsEntries(allLayerMeta, extraLayers) {
  return getAnalyticsEntries(allLayerMeta, extraLayers, { includeAllToggles: false });
}

function getFullAnalyticsEntries(allLayerMeta, extraLayers) {
  return getAnalyticsEntries(allLayerMeta, extraLayers, {
    activeUtility: "all",
    activeStatus: "all",
    includeAllToggles: true
  });
}

function updateChartsFromAnalytics(analytics, compareAValue, compareBValue, hostingLayer, portals) {
  const palette = getChartPalette();
  const utilityCounts = {};
  const statusCounts = {};
  const timelineCounts = {};
  const safetyCounts = { Repaired: 0, Open: 0 };
  const groupCounts = {};
  const gsepUtilityCounts = {};
  const leakUtilityCounts = {};
  const contextCounts = {};
  const compareMetrics = {
    [compareAValue]: { layers: 0, features: 0, leaks: 0, gsep: 0 },
    [compareBValue]: { layers: 0, features: 0, leaks: 0, gsep: 0 }
  };

  let totalLayers = 0;
  let totalFeatures = 0;
  let leakLayers = 0;
  let gsepLayers = 0;

  analytics.forEach((entry) => {
    totalLayers += 1;
    totalFeatures += entry.featureCount;
    utilityCounts[entry.utility] = (utilityCounts[entry.utility] || 0) + entry.featureCount;
    statusCounts[entry.statusKind] = (statusCounts[entry.statusKind] || 0) + entry.featureCount;
    timelineCounts[entry.year] = (timelineCounts[entry.year] || 0) + entry.featureCount;
    const groupLabel = formatLabel(entry.group || "context");
    groupCounts[groupLabel] = (groupCounts[groupLabel] || 0) + entry.featureCount;

    if (entry.group === "leaks") {
      leakLayers += 1;
      leakUtilityCounts[entry.utility] = (leakUtilityCounts[entry.utility] || 0) + entry.featureCount;
      if (entry.statusKind === "repaired") safetyCounts.Repaired += entry.featureCount;
      else safetyCounts.Open += entry.featureCount;
    }
    if (entry.group === "gsep") {
      gsepLayers += 1;
      gsepUtilityCounts[entry.utility] = (gsepUtilityCounts[entry.utility] || 0) + entry.featureCount;
    }
    if (entry.group !== "gsep" && entry.group !== "leaks" && entry.group !== "wastewater") {
      contextCounts[entry.title || groupLabel] = (contextCounts[entry.title || groupLabel] || 0) + entry.featureCount;
    }

    if (compareMetrics[entry.utility]) {
      compareMetrics[entry.utility].layers += 1;
      compareMetrics[entry.utility].features += entry.featureCount;
      if (entry.group === "leaks") compareMetrics[entry.utility].leaks += entry.featureCount;
      if (entry.group === "gsep") compareMetrics[entry.utility].gsep += entry.featureCount;
    }
  });

  document.getElementById("statTotalLayers").textContent = formatNumber(totalLayers);
  document.getElementById("statActiveUtilities").textContent = formatNumber(Object.keys(utilityCounts).length);
  document.getElementById("statGsepProjects").textContent = formatNumber(gsepLayers);
  document.getElementById("statLeaksTracked").textContent = formatNumber(leakLayers);
  document.getElementById("statVisibleFeatures").textContent = formatNumber(totalFeatures);
  updateExperienceSummary(totalFeatures);

  charts.utility.data.labels = Object.keys(utilityCounts);
  charts.utility.data.datasets[0].data = Object.values(utilityCounts);
  charts.utility.update();

  charts.status.data.labels = Object.keys(statusCounts);
  charts.status.data.datasets[0].data = Object.values(statusCounts);
  charts.status.update();

  charts.timeline.data.labels = Object.keys(timelineCounts).sort();
  charts.timeline.data.datasets[0].data = charts.timeline.data.labels.map((label) => timelineCounts[label]);
  charts.timeline.update();

  charts.safety.data.labels = Object.keys(safetyCounts);
  charts.safety.data.datasets[0].data = Object.values(safetyCounts);
  charts.safety.update();

  charts.hosting.data.labels = ["Hosting service", "Portal links", "Visible sublayers"];
  charts.hosting.data.datasets[0].data = [
    hostingLayer.visible ? 1 : 0,
    portals.filter((portal) => portal.layer.visible).length,
    hostingLayer.visible && hostingLayer.allSublayers ? hostingLayer.allSublayers.length : 0
  ];
  charts.hosting.update();

  if (charts.compare) {
    charts.compare.data.labels = ["Visible Layers", "Visible Features", "Leak Features", "GSEP Features"];
    charts.compare.data.datasets = [
      {
        label: compareAValue,
        data: [
          compareMetrics[compareAValue] ? compareMetrics[compareAValue].layers : 0,
          compareMetrics[compareAValue] ? compareMetrics[compareAValue].features : 0,
          compareMetrics[compareAValue] ? compareMetrics[compareAValue].leaks : 0,
          compareMetrics[compareAValue] ? compareMetrics[compareAValue].gsep : 0
        ],
        backgroundColor: palette.accent
      },
      {
        label: compareBValue,
        data: [
          compareMetrics[compareBValue] ? compareMetrics[compareBValue].layers : 0,
          compareMetrics[compareBValue] ? compareMetrics[compareBValue].features : 0,
          compareMetrics[compareBValue] ? compareMetrics[compareBValue].leaks : 0,
          compareMetrics[compareBValue] ? compareMetrics[compareBValue].gsep : 0
        ],
        backgroundColor: palette.accentSecondary
      }
    ];
    charts.compare.update();
  }

  const setChartData = (chart, labels, data, colors) => {
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    if (colors) chart.data.datasets[0].backgroundColor = colors;
    chart.update();
  };
  const sortedEntries = (items, limit) => Object.entries(items)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || Object.keys(items).length);

  const layerGroupEntries = sortedEntries(groupCounts);
  setChartData(
    charts.layerGroups,
    layerGroupEntries.map(([label]) => label),
    layerGroupEntries.map(([, value]) => value),
    palette.series
  );

  const gsepUtilityEntries = sortedEntries(gsepUtilityCounts, 12);
  setChartData(charts.gsepUtility, gsepUtilityEntries.map(([label]) => label), gsepUtilityEntries.map(([, value]) => value), palette.accent);

  const leakUtilityEntries = sortedEntries(leakUtilityCounts, 12);
  setChartData(charts.leakUtility, leakUtilityEntries.map(([label]) => label), leakUtilityEntries.map(([, value]) => value), "#f59e0b");

  const wastewaterSummary = appState.wastewaterCsv.summary;
  if (wastewaterSummary) {
    setChartData(
      charts.wastewaterTypes,
      ["Municipal", "Industrial", "Combined", "Other / no grade"],
      [
        wastewaterSummary.typeCounts.M,
        wastewaterSummary.typeCounts.I,
        wastewaterSummary.typeCounts.C,
        wastewaterSummary.typeCounts.O
      ],
      ["#0f766e", "#f97316", "#6366f1", "#94a3b8"]
    );
    const wastewaterTownEntries = sortedEntries(
      Object.fromEntries(Object.entries(appState.wastewaterCsv.townStats).map(([town, stats]) => [formatLabel(town), stats.total])),
      12
    );
    setChartData(
      charts.wastewaterTowns,
      wastewaterTownEntries.map(([label]) => label),
      wastewaterTownEntries.map(([, value]) => value),
      "#0891b2"
    );
  }

  const contextEntries = sortedEntries(contextCounts, 10);
  setChartData(charts.contextLayers, contextEntries.map(([label]) => label), contextEntries.map(([, value]) => value), "#a78bfa");
}

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GroupLayer",
  "esri/layers/GraphicsLayer",
  "esri/layers/MapImageLayer",
  "esri/Graphic",
  "esri/widgets/Legend",
  "esri/widgets/Expand",
  "esri/widgets/Search",
  "esri/widgets/Home"
], function (Map, MapView, FeatureLayer, GroupLayer, GraphicsLayer, MapImageLayer, Graphic, Legend, Expand, Search, Home) {
  applyStateToControls(appState.pendingState);
  const themeBtn = document.getElementById("themeBtn");
  const map = new Map({
    basemap: document.body.classList.contains("dark-theme") ? "dark-gray-vector" : "gray-vector"
  });

  function updateThemeUI() {
    const dark = document.body.classList.contains("dark-theme");
    const esriLink = document.getElementById("esri-theme");
    esriLink.href = dark ? "https://js.arcgis.com/4.31/esri/themes/dark/main.css" : "https://js.arcgis.com/4.31/esri/themes/light/main.css";
    map.basemap = dark ? "dark-gray-vector" : "gray-vector";
    updateThemeLabel();
    refreshChartTheme();
  }

  updateThemeUI();
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", document.body.classList.contains("dark-theme") ? "dark" : "light");
    updateThemeUI();
    syncUrlState(mapViewRef);
  });

  const gsepDefs = [
    ["Berkshire 2026", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Berkshire_GSEP_2026/FeatureServer/0"],
    ["Berkshire 2027-2028", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Berkshire_GSEP_2027_2028_tsv/FeatureServer/0"],
    ["Boston Gas 2026", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Boston_Gas_2026/FeatureServer/0"],
    ["Boston Gas 2027-2030", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Boston_Gas_GSEP_2027_2030/FeatureServer/0"],
    ["Colonial Gas 2026", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Colonial_Gas__GSEP__2026/FeatureServer/0"],
    ["Colonial Gas 2027-2030", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Colonial_Gas__GSEP__2027_2030/FeatureServer/0"],
    ["Eversource 2026", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Eversource__GSEP__2026/FeatureServer/0"],
    ["Eversource 2027-2030", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Eversource__GSEP__2027_2030/FeatureServer/0"],
    ["EGMA 2026", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/EGMA__GSEP__2026/FeatureServer/0"],
    ["EGMA 2027-2030", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/EGMA__GSEP__2027_2030/FeatureServer/0"],
    ["Liberty 2026", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Liberty__GSEP__2026/FeatureServer/0"],
    ["Liberty 2027-2030", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Liberty__GSEP__2027_2030/FeatureServer/0"],
    ["Unitil 2026", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Unitil__GSEP__2026/FeatureServer/0"],
    ["Unitil 2027-2030", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Unitil_GSEP_2027_2030/FeatureServer/0"],
    ["National Grid NPAs 2026", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/National_Grid_NPAs_2026/FeatureServer/0"],
    ["National Grid NPAs 2027-2030", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/NationalGrid_2027_2030_tsv/FeatureServer/0"],
    ["Estimated costs 2026", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Estimated_costs_2026/FeatureServer/0"]
  ];

  const leakDefs = [
    ["Berkshire Gas open leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Berkshire_Gas_Unrepaired_Leaks_2024/FeatureServer/0"],
    ["Berkshire Gas repaired leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Berkshire_Gas_Repaired_Leaks_2024/FeatureServer/0"],
    ["Boston Gas open leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Boston_Gas_open_leaks_2024/FeatureServer/0"],
    ["Boston Gas repaired leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Boston_Gas___repaired_2024/FeatureServer/0"],
    ["Colonial Gas open leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Colonial_Gas_open_leaks_2024/FeatureServer/0"],
    ["Colonial Gas repaired leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Colonial_Gas_repaired_leaks_2024/FeatureServer/0"],
    ["EGMA open leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/EGMA_open_leaks_2024/FeatureServer/0"],
    ["EGMA repaired leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/EGMA___repaired_2024/FeatureServer/0"],
    ["Eversource (NSTAR) open leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/NSTAR_unrepaired_2024/FeatureServer/0"],
    ["Eversource (NSTAR) repaired leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/NSTAR_repaired_2024/FeatureServer/0"],
    ["Liberty Utilities open leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Liberty_Utilities_open_leaks_2024/FeatureServer/0"],
    ["Liberty Utilities repaired leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Liberty_repaired_leaks_2024/FeatureServer/0"],
    ["Unitil repaired leaks 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Fitchburg_repaired_2024/FeatureServer/0"],
    ["Leaks summary by towns", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Leaks%20by%20town%20test/FeatureServer/0"],
    ["Boston neighborhoods leak summary", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Summarize%20allleaks2024%20within%20Boston%20Neighborhoods/FeatureServer/0"],
    ["MA towns estimated emissions 2024", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/MA%20towns%20estimated%20emissions%202024/FeatureServer/0"],
    ["Boston neighborhood estimated emissions", "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/Boston neighborhood estimated emissions/FeatureServer/0"]
  ];

  function createLayerMeta(defs, group) {
    return defs.map(([title, url]) => {
      const layer = new FeatureLayer({ url, title: `${group === "gsep" ? "GSEP" : "Leaks"} | ${title}` });
      return {
        layer,
        group,
        title,
        url,
        utility: getUtilityFromName(title),
        year: extractYearFromTitle(title),
        statusKind: inferStatusFromTitle(title, group),
        sidebarTitle: `${group === "gsep" ? "GSEP" : "Leaks"} ${title}`,
        isSummary: /summary|estimated emissions|towns|neighborhood/i.test(title)
      };
    });
  }

  const allLayerMeta = [...createLayerMeta(gsepDefs, "gsep"), ...createLayerMeta(leakDefs, "leaks")];
  const gsepLayers = allLayerMeta.filter((entry) => entry.group === "gsep").map((entry) => entry.layer);
  const leakLayers = allLayerMeta.filter((entry) => entry.group === "leaks").map((entry) => entry.layer);

  const gsepGroup = new GroupLayer({ title: "GSEP All Layers (HEET)", visible: true, layers: gsepLayers });
  const gasLeakGroup = new GroupLayer({ title: "Gas Leak All Layers (HEET)", visible: true, layers: leakLayers });

  const ejLayer = new FeatureLayer({
    url: "https://services5.arcgis.com/lWpwJ2MvpjCmjj94/arcgis/rest/services/ej2020/FeatureServer/0",
    title: "Environmental Justice Populations 2020"
  });
  const boreholeLayer = new FeatureLayer({
    url: "https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/Well_Location_Viewer_Data_4_26_23/FeatureServer/0",
    title: "MassDEP Well/Borehole Viewer Data"
  });
  const wastewaterLayer = new FeatureLayer({
    url: "https://services6.arcgis.com/euKKjtGUuDiy24vy/ArcGIS/rest/services/MassDEP_Major_Facilities_Waste_Treatment/FeatureServer/4",
    title: "MassDEP Waste Treatment Facilities"
  });
  const townBoundaryLayer = new FeatureLayer({
    url: "https://services8.arcgis.com/o4UVke7qqC8oNJ7j/ArcGIS/rest/services/Massachusetts_Towns_General_Coast/FeatureServer/0",
    title: "Massachusetts Municipal Boundaries"
  });
  const wastewaterTownLayer = new GraphicsLayer({
    title: "Wastewater Facilities by Town",
    visible: true
  });
  const nationalGridLayer = new MapImageLayer({
    url: "https://systemdataportal.nationalgrid.com/arcgis/rest/services/MASDP/MA_HostingCapacity_with_DGPending/MapServer",
    title: "National Grid Hosting Capacity"
  });

  const eversourcePortal = {
    layer: { visible: true },
    title: "Eversource Navigator",
    url: "https://navigator.eversource.envelio.com/?lang=en-us#8.18/42.025/-71.67",
    utility: "Eversource",
    categoryToggle: "toggleNationalGrid"
  };
  const ngridPortal = {
    layer: { visible: true },
    title: "National Grid Portal",
    url: "https://systemdataportal.nationalgrid.com/MA/",
    utility: "National Grid",
    categoryToggle: "toggleNationalGrid"
  };
  const extraLayers = [
    { layer: ejLayer, title: ejLayer.title, url: ejLayer.url, utility: "Environmental", categoryToggle: "toggleEJ", includeInAnalytics: true, analyticsGroup: "ej", statusKind: "context", year: "2020" },
    { layer: boreholeLayer, title: boreholeLayer.title, url: boreholeLayer.url, utility: "MassDEP", categoryToggle: "toggleBorehole", includeInAnalytics: true, analyticsGroup: "borehole", statusKind: "context", year: "2023" },
    {
      layer: wastewaterLayer,
      title: wastewaterLayer.title,
      url: wastewaterLayer.url,
      sourceUrl: "https://www.mass.gov/info-details/wastewater-treatment-plant-operations#lists-of-treatment-plants-by-town-and-type",
      utility: "MassDEP",
      categoryToggle: "toggleWastewater",
      includeInAnalytics: true,
      analyticsGroup: "wastewater",
      statusKind: "facility",
      year: "current",
      sidebarTitle: "Mass.gov wastewater treatment plant operations"
    },
    { layer: wastewaterTownLayer, title: "Graded wastewater facilities", url: WASTEWATER_CSV_SOURCES.graded, utility: "MassDEP", categoryToggle: "toggleWastewater" },
    { layer: wastewaterTownLayer, title: "Groundwater discharge plants", url: WASTEWATER_CSV_SOURCES.groundwater, utility: "MassDEP", categoryToggle: "toggleWastewater" },
    { layer: nationalGridLayer, title: nationalGridLayer.title, url: nationalGridLayer.url, utility: "National Grid", categoryToggle: "toggleNationalGrid" },
    eversourcePortal,
    ngridPortal
  ];

  map.addMany([nationalGridLayer, ejLayer, boreholeLayer, wastewaterLayer, wastewaterTownLayer, gasLeakGroup, gsepGroup]);
  const view = new MapView({
    container: "mapCanvas",
    map,
    center: REGION_TARGETS.statewide.center,
    zoom: REGION_TARGETS.statewide.zoom,
    constraints: { minZoom: 7, maxZoom: 19 }
  });
  mapViewRef = view;

  const legend = new Legend({ view, hideLayersNotInCurrentView: true });
  const legendExpand = new Expand({
    view,
    content: legend,
    expanded: false,
    expandTooltip: "Show legend",
    collapseTooltip: "Hide legend"
  });
  const searchWidget = new Search({ view });
  const homeWidget = new Home({ view });
  const mobileLegendQuery = window.matchMedia("(max-width: 1024px)");

  function syncLegendVisibility() {
    view.ui.remove(legendExpand);
    if (!mobileLegendQuery.matches) {
      view.ui.add(legendExpand, "bottom-left");
    }
  }

  view.ui.add(searchWidget, "top-right");
  view.ui.add(homeWidget, "top-left");
  syncLegendVisibility();
  if (mobileLegendQuery.addEventListener) {
    mobileLegendQuery.addEventListener("change", syncLegendVisibility);
  } else if (mobileLegendQuery.addListener) {
    mobileLegendQuery.addListener(syncLegendVisibility);
  }

  function getWastewaterBubbleSymbol(total) {
    const size = Math.max(10, Math.min(40, 8 + Math.sqrt(total) * 3.2));
    return {
      type: "simple-marker",
      style: "circle",
      size,
      color: [14, 116, 144, 0.72],
      outline: { color: [255, 255, 255, 0.92], width: 1.5 }
    };
  }

  async function renderWastewaterTownGraphics(statusValue = statusSelect.value, utilityValue = utilitySelect.value) {
    wastewaterTownLayer.removeAll();
    const townStats = getFilteredWastewaterCsvState(statusValue, utilityValue).townStats || {};
    const townNames = Object.keys(townStats);
    if (!townNames.length) return;

    try {
      const query = townBoundaryLayer.createQuery();
      query.where = "1=1";
      query.outFields = ["TOWN"];
      query.returnGeometry = true;
      const response = await townBoundaryLayer.queryFeatures(query);
      response.features.forEach((feature) => {
        const town = normalizeTown(feature.attributes && feature.attributes.TOWN);
        const stats = townStats[town];
        if (!stats || !feature.geometry || !feature.geometry.extent) return;
        const examples = stats.examples.map(escapeHtml).join("<br />");
        wastewaterTownLayer.add(new Graphic({
          geometry: feature.geometry.extent.center,
          symbol: getWastewaterBubbleSymbol(stats.total),
          attributes: stats,
          popupTemplate: {
            title: "{town}",
            content: `
              <strong>${formatNumber(stats.total)} wastewater records</strong><br />
              Graded facilities: ${formatNumber(stats.graded)}<br />
              Groundwater discharge plants: ${formatNumber(stats.groundwater)}<br />
              Municipal: ${formatNumber(stats.types.M)} | Industrial: ${formatNumber(stats.types.I)} | Combined: ${formatNumber(stats.types.C)} | Other: ${formatNumber(stats.types.O)}<br />
              Listed flow: ${formatNumber(stats.flow)}<br />
              ${examples ? `<br /><strong>Examples</strong><br />${examples}` : ""}
            `
          }
        }));
      });
    } catch (error) {
      appState.health.push({
        title: "Wastewater town map",
        status: "Issue",
        detail: "Municipal boundary lookup failed, so wastewater records could not be aggregated on the map."
      });
      renderHealth(appState.health);
    }
  }

  async function loadWastewaterCsvData() {
    renderWastewaterCsvSummary();
    try {
      const [gradedResponse, groundwaterResponse] = await Promise.all([
        fetch(WASTEWATER_CSV_SOURCES.graded),
        fetch(WASTEWATER_CSV_SOURCES.groundwater)
      ]);
      if (!gradedResponse.ok || !groundwaterResponse.ok) throw new Error("CSV response was not OK");
      const [gradedText, groundwaterText] = await Promise.all([
        gradedResponse.text(),
        groundwaterResponse.text()
      ]);
      appState.wastewaterCsv = buildWastewaterCsvState(parseCsv(gradedText), parseCsv(groundwaterText));
      updateStatusList(getCurrentToggles());
      renderWastewaterCsvSummary();
      await renderWastewaterTownGraphics();
      appState.health = appState.health.filter((entry) => !/^Wastewater datasets/i.test(entry.title));
      appState.health.push({
        title: "Wastewater datasets",
        status: "Ready",
        detail: `${formatNumber(appState.wastewaterCsv.summary.gradedTotal)} graded facilities and ${formatNumber(appState.wastewaterCsv.summary.groundwaterTotal)} groundwater discharge plants loaded.`
      });
      renderHealth(appState.health);
    } catch (error) {
      appState.health.push({
        title: "Wastewater datasets",
        status: "Issue",
        detail: "Local wastewater data files could not be loaded."
      });
      renderHealth(appState.health);
    }
  }

  async function refreshAnalytics() {
    const runId = ++analyticsRunId;
    const visibleFeatureEntries = getVisibleAnalyticsEntries(allLayerMeta, extraLayers);
    const fullFeatureEntries = getFullAnalyticsEntries(allLayerMeta, extraLayers);
    document.getElementById("statVisibleFeatures").textContent = "...";
    updateExperienceSummary(0);
    await buildHotspots(view, visibleFeatureEntries);
    const analytics = await queryFeatureCounts(view, fullFeatureEntries);
    if (runId !== analyticsRunId) return;
    updateChartsFromAnalytics(
      analytics,
      compareEnabled ? compareUtilityA.value : "National Grid",
      compareEnabled ? compareUtilityB.value : "Eversource",
      nationalGridLayer,
      [eversourcePortal, ngridPortal]
    );
    syncUrlState(view);
  }

  async function applyFilters(options = {}) {
    const toggles = getCurrentToggles();
    updateUtilityLists(allLayerMeta, extraLayers, toggles);
    updateStatusList(toggles);
    updateYearList(allLayerMeta, toggles);

    if (compareEnabled && compareUtilityA.value === compareUtilityB.value && compareUtilityB.options.length > 1) {
      const fallbackOption = Array.from(compareUtilityB.options).find((option) => option.value !== compareUtilityA.value);
      if (fallbackOption) compareUtilityB.value = fallbackOption.value;
    }

    const activeUtility = utilitySelect.value;
    const activeYear = yearSelect.value;
    const activeStatus = statusSelect.value;
    const activeRegion = regionSelect.value;
    updateExperienceSummary(Number(document.getElementById("statVisibleFeatures").textContent.replace(/,/g, "")) || 0);
    renderWastewaterCsvSummary(activeStatus, activeUtility);

    gsepGroup.visible = toggles.toggleGsep;
    gasLeakGroup.visible = toggles.toggleLeaks;
    ejLayer.visible = toggles.toggleEJ;
    boreholeLayer.visible = toggles.toggleBorehole;
    wastewaterLayer.visible = toggles.toggleWastewater;
    wastewaterTownLayer.visible = toggles.toggleWastewater;
    nationalGridLayer.visible = toggles.toggleNationalGrid;

    allLayerMeta.forEach((entry) => {
      const utilityMatch = activeUtility === "all" || entry.utility === activeUtility;
      const yearMatch = hasYear(entry.title, activeYear);
      const statusMatch = hasStatus(entry, activeStatus);
      const toggleMatch = (entry.group === "gsep" && toggles.toggleGsep) || (entry.group === "leaks" && toggles.toggleLeaks);
      entry.visible = utilityMatch && yearMatch && statusMatch && toggleMatch;
      entry.layer.visible = entry.visible;
    });

    eversourcePortal.layer.visible = toggles.toggleNationalGrid && (activeUtility === "all" || activeUtility === "Eversource");
    ngridPortal.layer.visible = toggles.toggleNationalGrid && (activeUtility === "all" || activeUtility === "National Grid");
    const wastewaterUtilityMatch = activeUtility === "all" || activeUtility === "MassDEP";
    wastewaterLayer.visible = toggles.toggleWastewater && wastewaterUtilityMatch && (activeStatus === "all" || activeStatus === "ww-major-facilities");
    wastewaterTownLayer.visible = toggles.toggleWastewater && wastewaterUtilityMatch && activeStatus !== "ww-major-facilities" && (activeStatus === "all" || isWastewaterStatus(activeStatus));
    await renderWastewaterTownGraphics(activeStatus, activeUtility);

    const yearWrapper = document.getElementById("yearWrapper");
    if (yearWrapper) {
      yearWrapper.style.display = (toggles.toggleGsep || toggles.toggleLeaks) ? "block" : "none";
    }

    updateSidebarSources(allLayerMeta, extraLayers);
    if (!options.skipGoTo) {
      const target = getRegionTarget(activeRegion);
      view.goTo(target).catch(() => {});
    }
    await refreshAnalytics();
  }

  function applyBookmark(index) {
    const bookmark = appState.bookmarks[index];
    if (!bookmark) return;
    applyStateToControls({
      toggleGsep: bookmark.state.gsep,
      toggleLeaks: bookmark.state.leaks,
      toggleEJ: bookmark.state.ej,
      toggleBorehole: bookmark.state.borehole,
      toggleNationalGrid: bookmark.state.hosting,
      toggleWastewater: bookmark.state.wastewater,
      region: bookmark.state.region,
      theme: bookmark.state.theme
    });
    utilitySelect.value = bookmark.state.utility || "all";
    yearSelect.value = bookmark.state.year || "all";
    statusSelect.value = bookmark.state.status || "all";
    if (compareEnabled) {
      compareUtilityA.value = bookmark.state.compareA || compareUtilityA.value;
      compareUtilityB.value = bookmark.state.compareB || compareUtilityB.value;
    }
    updateThemeUI();
    applyViewTarget(view, bookmark.state, false);
    applyFilters({ skipGoTo: true });
  }

  function removeBookmark(index) {
    appState.bookmarks.splice(index, 1);
    persistBookmarks();
    renderBookmarks(applyBookmark, removeBookmark);
  }

  saveBookmarkBtn.addEventListener("click", () => {
    const name = bookmarkNameInput.value.trim() || `View ${appState.bookmarks.length + 1}`;
    const state = getCurrentState(view);
    const summary = `${safeText(state.utility || "All utilities")} | ${safeText(state.region || "statewide")} | ${safeText(state.status || "all statuses")}`;
    appState.bookmarks.unshift({ name, state, summary });
    appState.bookmarks = appState.bookmarks.slice(0, 8);
    persistBookmarks();
    renderBookmarks(applyBookmark, removeBookmark);
    bookmarkNameInput.value = "";
  });

  shareStateBtn.addEventListener("click", async () => {
    syncUrlState(view);
    try {
      await navigator.clipboard.writeText(window.location.href);
      shareStateBtn.textContent = "Copied";
      setTimeout(() => { shareStateBtn.textContent = "Copy Share Link"; }, 1400);
    } catch (error) {
      shareStateBtn.textContent = "Copy failed";
      setTimeout(() => { shareStateBtn.textContent = "Copy Share Link"; }, 1400);
    }
  });

  view.on("click", async (event) => {
    const response = await view.hitTest(event);
    const hit = response.results.find((result) => result.graphic && result.graphic.layer);
    renderFeatureInspector(hit ? hit.graphic : null);
  });

  initCharts();
  loadBookmarks();
  renderBookmarks(applyBookmark, removeBookmark);
  collectHealth(allLayerMeta.slice(0, 10).concat(extraLayers.filter((entry) => entry.includeInAnalytics)), nationalGridLayer);

  view.when(async () => {
    mapReady = true;
    applyViewTarget(view, appState.pendingState, true);
    setTimeout(() => {
      refreshMapViewSize(view);
      forceHideMapLoader();
    }, 1200);
    await loadWastewaterCsvData();
    applyFilters({ skipGoTo: Boolean(appState.pendingState.center) });
  });

  setTimeout(() => {
    if (mapReady) refreshMapViewSize(view);
    forceHideMapLoader();
  }, 4000);

  [
    "toggleGsep", "toggleLeaks", "toggleEJ", "toggleBorehole", "toggleNationalGrid", "toggleWastewater",
    "utilityFilter", "yearFilter", "statusFilter", "regionFilter",
    "compareUtilityA", "compareUtilityB"
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener("change", () => {
      applyFilters({ skipGoTo: id === "compareUtilityA" || id === "compareUtilityB" });
    });
  });

  view.watch("stationary", (isStationary) => {
    if (isStationary) syncUrlState(view);
  });
}, function () {
  showLoaderError("ArcGIS modules failed to load");
});
