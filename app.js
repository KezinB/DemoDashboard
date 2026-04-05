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
const compareEnabled = Boolean(compareUtilityA && compareUtilityB);

const BOOKMARK_STORAGE_KEY = "platanus-dashboard-bookmarks";
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
    toggleNationalGrid: params.get("hosting")
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
  const utilityLabel = utilitySelect.value === "all" ? "All utilities" : utilitySelect.value;
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
      <span class="badge">${layerMix}</span>
      <span class="badge">${utilityLabel}</span>
      <span class="badge">${yearLabel}</span>
      <span class="badge">${statusLabel}</span>
    `;
  }

  if (summaryNarrative) {
    summaryNarrative.textContent = `${regionLabel} is in focus with ${layerMix.toLowerCase()} visible. The map is currently filtered to ${utilityLabel.toLowerCase()}, ${yearLabel.toLowerCase()}, and ${statusLabel.toLowerCase()}.`;
  }

  if (analyticsSummaryChips) {
    analyticsSummaryChips.innerHTML = `
      <span class="badge">${formatNumber(visibleFeatureCount)} visible features</span>
      <span class="badge">${formatNumber(appState.latestHotspots.length)} hotspots</span>
      <span class="badge">${regionLabel}</span>
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
          <strong>${key}</strong>
          <span>${safeText(value)}</span>
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
      <strong>${layerTitle}</strong>
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
    toggleNationalGrid: document.getElementById("toggleNationalGrid").checked
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
    if ((key === "gsep" || key === "leaks" || key === "ej" || key === "borehole" || key === "hosting") && value === "0") {
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
      <strong>${safeText(bookmark.name)}</strong>
      <span>${safeText(bookmark.summary)}</span>
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
          <strong>${safeText(entry.title)}</strong>
          <span class="status-pill ${pillClass}">${entry.status}</span>
        </div>
        <span>${safeText(entry.detail)}</span>
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
      <strong>${safeText(item.name)}</strong>
      <span>${safeText(item.layerTitle)}<br />${safeText(item.metricLabel)}: ${formatNumber(item.metricValue)}</span>
    </div>
  `).join("");
}

function applyStateToControls(state) {
  if (!state) return;
  if (state.toggleGsep !== null && state.toggleGsep !== undefined) document.getElementById("toggleGsep").checked = state.toggleGsep !== "0";
  if (state.toggleLeaks !== null && state.toggleLeaks !== undefined) document.getElementById("toggleLeaks").checked = state.toggleLeaks !== "0";
  if (state.toggleEJ !== null && state.toggleEJ !== undefined) document.getElementById("toggleEJ").checked = state.toggleEJ !== "0";
  if (state.toggleBorehole !== null && state.toggleBorehole !== undefined) document.getElementById("toggleBorehole").checked = state.toggleBorehole !== "0";
  if (state.toggleNationalGrid !== null && state.toggleNationalGrid !== undefined) document.getElementById("toggleNationalGrid").checked = state.toggleNationalGrid !== "0";
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
    setTimeout(() => mapViewRef.resize(), 60);
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
});
document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab, button));
});

const scheduleMapResize = (() => {
  let timer = null;
  return () => {
    if (!mapReady || !mapViewRef) return;
    clearTimeout(timer);
    timer = setTimeout(() => mapViewRef.resize(), 120);
  };
})();

window.addEventListener("resize", scheduleMapResize);
window.addEventListener("orientationchange", scheduleMapResize);

function initCharts() {
  const palette = getChartPalette();
  const createChart = (id, type, label, bgColor) => {
    return new Chart(document.getElementById(id), {
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

  charts.utility = createChart("chartUtilityDistribution", "bar", "Visible Features", palette.accent);
  charts.status = createChart("chartGsepStatus", "pie", "Project Statuses", palette.series.slice(0, 5));
  charts.hosting = createChart("chartHostingTiers", "doughnut", "Hosting Access", ["#ef4444", "#f59e0b", "#10b981"]);
  charts.timeline = createChart("chartBatchTimeline", "bar", "Projects by Year", "#38bdf8");
  charts.safety = createChart("chartSafetyStatus", "doughnut", "Repair Status", ["#10b981", "#f59e0b"]);
  charts.compare = createChart("chartComparison", "bar", "Comparison", [palette.accent, palette.accentSecondary]);
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
  const categoryMap = { gsep: "toggleGsep", leaks: "toggleLeaks", ej: "toggleEJ", borehole: "toggleBorehole", nationalgrid: "toggleNationalGrid" };

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
    option.textContent = utility;
    utilitySelect.appendChild(option);
  });
  setSelectValue(utilitySelect, currentUtility, "all");

  if (compareEnabled) {
    [compareUtilityA, compareUtilityB].forEach((select) => {
      select.innerHTML = "";
      values.forEach((utility) => {
        const option = document.createElement("option");
        option.value = utility;
        option.textContent = utility;
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
    if (entry.layer && entry.layer.visible && entry.url) {
      if (!uniqueSources.has(entry.url)) {
        uniqueSources.set(entry.url, entry.sidebarTitle || entry.title);
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
    return;
  }

  let firstUrl = null;
  uniqueSources.forEach((title, url) => {
    if (!firstUrl) firstUrl = url;
    const card = document.createElement("div");
    card.className = "source";
    card.innerHTML = `<strong>${title}</strong><a href="${url}" target="_blank" rel="noopener noreferrer">Open source</a>`;
    sourceList.appendChild(card);

    const option = document.createElement("option");
    option.value = url;
    option.textContent = title;
    sourcePicker.appendChild(option);
  });

  if (!sourceFrame.src || !uniqueSources.has(sourceFrame.src)) {
    sourceFrame.src = firstUrl;
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

  appState.health = visibleHealth;
  renderHealth(visibleHealth);
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

function updateChartsFromAnalytics(analytics, compareAValue, compareBValue, hostingLayer, portals) {
  const palette = getChartPalette();
  const utilityCounts = {};
  const statusCounts = {};
  const timelineCounts = {};
  const safetyCounts = { Repaired: 0, Open: 0 };
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

    if (entry.group === "leaks") {
      leakLayers += 1;
      if (entry.statusKind === "repaired") safetyCounts.Repaired += entry.featureCount;
      else safetyCounts.Open += entry.featureCount;
    }
    if (entry.group === "gsep") gsepLayers += 1;

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

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GroupLayer",
  "esri/layers/MapImageLayer",
  "esri/widgets/Legend",
  "esri/widgets/Expand",
  "esri/widgets/Search",
  "esri/widgets/Home"
], function (Map, MapView, FeatureLayer, GroupLayer, MapImageLayer, Legend, Expand, Search, Home) {
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
    { layer: ejLayer, title: ejLayer.title, url: ejLayer.url, utility: "Environmental", categoryToggle: "toggleEJ" },
    { layer: boreholeLayer, title: boreholeLayer.title, url: boreholeLayer.url, utility: "MassDEP", categoryToggle: "toggleBorehole" },
    { layer: nationalGridLayer, title: nationalGridLayer.title, url: nationalGridLayer.url, utility: "National Grid", categoryToggle: "toggleNationalGrid" },
    eversourcePortal,
    ngridPortal
  ];

  map.addMany([nationalGridLayer, ejLayer, boreholeLayer, gasLeakGroup, gsepGroup]);
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

  async function refreshAnalytics() {
    const runId = ++analyticsRunId;
    const visibleFeatureEntries = allLayerMeta.filter((entry) => entry.layer.visible);
    document.getElementById("statVisibleFeatures").textContent = "...";
    updateExperienceSummary(0);
    await buildHotspots(view, visibleFeatureEntries);
    const analytics = await queryFeatureCounts(view, visibleFeatureEntries);
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

    gsepGroup.visible = toggles.toggleGsep;
    gasLeakGroup.visible = toggles.toggleLeaks;
    ejLayer.visible = toggles.toggleEJ;
    boreholeLayer.visible = toggles.toggleBorehole;
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
    const hit = response.results.find((result) => result.graphic && result.graphic.layer && result.graphic.layer.type !== "graphics");
    renderFeatureInspector(hit ? hit.graphic : null);
  });

  initCharts();
  loadBookmarks();
  renderBookmarks(applyBookmark, removeBookmark);
  collectHealth(allLayerMeta.slice(0, 10), nationalGridLayer);

  view.when(() => {
    mapReady = true;
    applyViewTarget(view, appState.pendingState, true);
    setTimeout(() => {
      view.resize();
      forceHideMapLoader();
    }, 1200);
    applyFilters({ skipGoTo: Boolean(appState.pendingState.center) });
  });

  setTimeout(() => {
    if (mapReady) view.resize();
    forceHideMapLoader();
  }, 4000);

  [
    "toggleGsep", "toggleLeaks", "toggleEJ", "toggleBorehole", "toggleNationalGrid",
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
