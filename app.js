/**
 * Neo-Bibliometrics Explorer - App Logic
 * Technology Stack: HTML5, Vanilla CSS, Vanilla JS
 * Libraries: force-graph (CDN), Chart.js (CDN)
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE VARIABLES ---
  let allDocs = [];
  let filteredDocs = [];
  let activeTab = 'network'; // 'network' or 'analytics'
  let activeExplorer = 'etd'; // 'etd', 'sivitas', or 'koran'
  let networkMode = 'author'; // 'author' or 'keyword'
  
  // Chart instances
  let charts = {
    trend: null,
    authors: null,
    sdg: null,
    depts: null,
    publisher: null
  };
  
  // Force Graph instance
  let graphInstance = null;
  
  // Leaflet Map state
  let leafletMap = null;
  let leafletLayerGroup = null;
  
  // ResearchRabbit cascading panel state
  let rabbitCards = []; // Array of card objects: { type, id, title, data }
  
  // Country centroids for world map visualization
  const COUNTRY_COORDS = {
    'indonesia': [-0.7893, 113.9213],
    'netherlands': [52.1326, 5.2913],
    'united kingdom': [55.3781, -3.4360],
    'uk': [55.3781, -3.4360],
    'united states': [37.0902, -95.7129],
    'usa': [37.0902, -95.7129],
    'australia': [-25.2744, 133.7751],
    'japan': [36.2048, 138.2529],
    'germany': [51.1657, 10.4515],
    'singapore': [1.3521, 103.8198],
    'malaysia': [4.2105, 101.9758],
    'china': [35.8617, 104.1954],
    'france': [46.2276, 2.2137],
    'belgium': [50.5039, 4.4699],
    'switzerland': [46.8182, 8.2275],
    'sweden': [60.1282, 18.6435],
    'norway': [60.4720, 8.4689],
    'finland': [61.9241, 25.7482],
    'denmark': [56.2639, 9.5018],
    'austria': [47.5162, 14.5501],
    'italy': [41.8719, 12.5674],
    'spain': [40.4637, -3.7492],
    'portugal': [39.3999, -8.2245],
    'russia': [61.5240, 105.3188],
    'turkey': [38.9637, 35.2433],
    'brazil': [-14.2350, -51.9253],
    'mexico': [23.6345, -102.5528],
    'argentina': [-38.4161, -63.6167],
    'south africa': [-30.5595, 22.9375],
    'egypt': [26.8206, 30.8025],
    'saudi arabia': [23.8859, 45.0792],
    'uae': [23.4241, 53.8478],
    'iran': [32.4279, 53.6880],
    'thailand': [15.8700, 100.9925],
    'vietnam': [14.0583, 108.2772],
    'philippines': [12.8797, 121.7740],
    'india': [20.5937, 78.9629],
    'south korea': [35.9078, 127.7669],
    'taiwan': [23.6978, 120.9605],
    'canada': [56.1304, -106.3468],
    'new zealand': [-40.9006, 174.8860],
    'hong kong': [22.3193, 114.1694]
  };
  
  // --- DOM ELEMENTS ---
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingProgress = document.getElementById('loading-progress');
  
  const searchInput = document.getElementById('global-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  
  // Year sliders
  const filterYearMin = document.getElementById('filter-year-min');
  const filterYearMax = document.getElementById('filter-year-max');
  const yearRangeLabel = document.getElementById('year-range-label');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  
  // Navigation / Tabs
  const navEtdBtn = document.getElementById('nav-etd-btn');
  const navPubBtn = document.getElementById('nav-publikasi-btn');
  const navKoranBtn = document.getElementById('nav-koran-btn');
  const navAnalyticsBtn = document.getElementById('nav-analytics-btn');
  
  // Sub-filter wrappers
  const subEtdSection = document.getElementById('sub-filters-etd');
  const subPubSection = document.getElementById('sub-filters-publikasi');
  const subKoranSection = document.getElementById('sub-filters-koran');
  
  // Sub-filter inputs
  const filterEtdType = document.getElementById('filter-etd-type');
  const filterEtdDept = document.getElementById('filter-etd-dept');
  
  const filterPubDept = document.getElementById('filter-pub-dept');
  const filterPubCountry = document.getElementById('filter-pub-country');
  
  const filterKoranSource = document.getElementById('filter-koran-source');
  const filterKoranTopic = document.getElementById('filter-koran-topic');
  
  // Statistics Overview
  const statDocs = document.querySelector('#stat-docs .stat-num');
  const statAuthors = document.querySelector('#stat-authors .stat-num');
  const statKeywords = document.querySelector('#stat-keywords .stat-num');
  
  const sectionNetwork = document.getElementById('workspace-network');
  const sectionAnalytics = document.getElementById('workspace-analytics');
  const mapContainer = document.getElementById('map-container');
  const graphCanvas = document.getElementById('network-graph-canvas');
  
  const netModeAuthorBtn = document.getElementById('net-mode-author-btn');
  const netModeKeywordBtn = document.getElementById('net-mode-keyword-btn');
  const netModeMapBtn = document.getElementById('net-mode-map-btn');
  const nodeFreqSlider = document.getElementById('node-freq-slider');
  const freqValLabel = document.getElementById('freq-val');
  const fitGraphBtn = document.getElementById('fit-graph-btn');
  const graphLimitWarning = document.getElementById('graph-limit-warning');
  
  const rabbitContainer = document.getElementById('researchrabbit-container');
  const rabbitScrollArea = document.getElementById('rabbit-scroll-area');
  const closeRabbitBtn = document.getElementById('close-rabbit-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  
  // --- INITIALIZATION ---
  init();
  
  async function init() {
    setupEventListeners();
    await loadData();
  }
  
  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Explorer & Tab switching
    navEtdBtn.addEventListener('click', () => switchExplorer('etd'));
    navPubBtn.addEventListener('click', () => switchExplorer('sivitas'));
    navKoranBtn.addEventListener('click', () => switchExplorer('koran'));
    navAnalyticsBtn.addEventListener('click', () => switchTab('analytics'));
    
    // Analytics sub-tabs
    const analyticsEtdBtn = document.getElementById('analytics-etd-btn');
    const analyticsPubBtn = document.getElementById('analytics-publikasi-btn');
    const analyticsKoranBtn = document.getElementById('analytics-koran-btn');
    
    if (analyticsEtdBtn) analyticsEtdBtn.addEventListener('click', () => switchExplorer('etd'));
    if (analyticsPubBtn) analyticsPubBtn.addEventListener('click', () => switchExplorer('sivitas'));
    if (analyticsKoranBtn) analyticsKoranBtn.addEventListener('click', () => switchExplorer('koran'));
    
    // Search
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim() !== '') {
        clearSearchBtn.style.display = 'block';
      } else {
        clearSearchBtn.style.display = 'none';
      }
      applyFilters();
    });
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      applyFilters();
    });
    
    // Bind all sub-filter triggers
    [
      filterEtdType, filterEtdDept,
      filterPubDept, filterPubCountry,
      filterKoranSource, filterKoranTopic
    ].forEach(el => {
      if (el) el.addEventListener('change', applyFilters);
    });
    
    filterYearMin.addEventListener('input', handleYearSliderChange);
    filterYearMax.addEventListener('input', handleYearSliderChange);
    
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Network Graph Controls
    netModeAuthorBtn.addEventListener('click', () => switchNetworkMode('author'));
    netModeKeywordBtn.addEventListener('click', () => switchNetworkMode('keyword'));
    netModeMapBtn.addEventListener('click', () => switchNetworkMode('map'));
    nodeFreqSlider.addEventListener('input', () => {
      freqValLabel.textContent = nodeFreqSlider.value;
      renderNetwork();
    });
    fitGraphBtn.addEventListener('click', () => {
      if (graphInstance) graphInstance.zoomToFit(400);
    });
    
    // ResearchRabbit Controls
    closeRabbitBtn.addEventListener('click', closeRabbitPanel);
    
    // Theme Toggle
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  
  // --- THEME MANAGEMENT ---
  function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('dark-mode')) {
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    }
    // Redraw charts for appropriate text contrast
    if (activeTab === 'analytics') {
      renderCharts();
    }
  }
  
  // --- TAB & EXPLORER SWITCHING ---
  function switchExplorer(explorerName) {
    activeExplorer = explorerName;
    
    // Update active nav button
    [navEtdBtn, navPubBtn, navKoranBtn].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (explorerName === 'etd' && activeTab !== 'analytics') navEtdBtn.classList.add('active');
    else if (explorerName === 'sivitas' && activeTab !== 'analytics') navPubBtn.classList.add('active');
    else if (explorerName === 'koran' && activeTab !== 'analytics') navKoranBtn.classList.add('active');
    
    // If in analytics tab, update active sub-button state
    if (activeTab === 'analytics') {
      [
        document.getElementById('analytics-etd-btn'),
        document.getElementById('analytics-publikasi-btn'),
        document.getElementById('analytics-koran-btn')
      ].forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      
      let targetBtn = null;
      if (explorerName === 'etd') targetBtn = document.getElementById('analytics-etd-btn');
      else if (explorerName === 'sivitas') targetBtn = document.getElementById('analytics-publikasi-btn');
      else if (explorerName === 'koran') targetBtn = document.getElementById('analytics-koran-btn');
      if (targetBtn) targetBtn.classList.add('active');
    } else {
      activeTab = 'network';
      navAnalyticsBtn.classList.remove('active');
      sectionAnalytics.style.display = 'none';
      sectionNetwork.style.display = 'flex';
      
      // Update Map Button visibility
      netModeMapBtn.style.display = (explorerName === 'sivitas') ? 'inline-block' : 'none';
      
      // Auto-switch modes when navigating
      if (explorerName === 'sivitas') {
         if (networkMode !== 'map' && networkMode !== 'author' && networkMode !== 'keyword') {
            networkMode = 'map';
         }
      } else {
         if (networkMode === 'map') {
            networkMode = 'author';
         }
      }
      
      // Show/hide relevant legends
      document.getElementById('legend-etd').style.display = (explorerName === 'etd') ? 'flex' : 'none';
      document.getElementById('legend-sivitas').style.display = (explorerName === 'sivitas') ? 'flex' : 'none';
      document.getElementById('legend-koran').style.display = (explorerName === 'koran') ? 'flex' : 'none';
      
      // Force UI sync
      const currentMode = networkMode;
      networkMode = null; 
      switchNetworkMode(currentMode);
    }
    
    // Show/hide sub-filters
    subEtdSection.style.display = (explorerName === 'etd') ? 'flex' : 'none';
    subPubSection.style.display = (explorerName === 'sivitas') ? 'flex' : 'none';
    subKoranSection.style.display = (explorerName === 'koran') ? 'flex' : 'none';
    
    // Update network mode text based on explorer
    netModeAuthorBtn.innerText = (explorerName === 'koran') ? 'Jejaring Penulis Berita' : 'Co-Authorship';
    
    closeRabbitPanel();
    applyFilters();
  }
  
  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'analytics') {
      navAnalyticsBtn.classList.add('active');
      [navEtdBtn, navPubBtn, navKoranBtn].forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      
      sectionNetwork.style.display = 'none';
      sectionAnalytics.style.display = 'block';
      
      // Synchronize active sub-tab inside analytics
      switchExplorer(activeExplorer);
    }
  }
  
  // --- DATA LOADING & PARSING ---
  async function loadData() {
    try {
      loadingOverlay.style.display = 'flex';
      loadingProgress.textContent = '0%';
      
      const response = await fetch('data/unified_publications.json?v=' + Date.now());
      if (!response.ok) {
        throw new Error('Gagal mengambil data unified_publications.json');
      }
      
      // Reading stream progress (premium micro-interaction)
      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length') || 36000000; // fallback length (approx 34MB)
      let receivedLength = 0;
      let chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        const progress = Math.min(99, Math.round((receivedLength / contentLength) * 100));
        loadingProgress.textContent = `${progress}%`;
      }
      
      loadingProgress.textContent = '100%';
      
      // Concatenate chunks
      let chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }
      
      // Decode
      let result = new TextDecoder("utf-8").decode(chunksAll);
      allDocs = JSON.parse(result);
      
      // Complete Loading
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
        }, 300);
      }, 500);
      
      // Initialize dynamic range bounds based on data
      const years = allDocs.map(d => d.year).filter(y => y && y > 1900);
      const minYear = Math.min(...years, 1990);
      const maxYear = Math.max(...years, 2026);
      
      filterYearMin.min = minYear;
      filterYearMin.max = maxYear;
      filterYearMin.value = minYear;
      
      filterYearMax.min = minYear;
      filterYearMax.max = maxYear;
      filterYearMax.value = maxYear;
      
      yearRangeLabel.textContent = `${minYear} - ${maxYear}`;
      
      // Populate dropdown values dynamically for publications
      populatePubFilters();
      
      switchExplorer('etd');
    } catch (e) {
      console.error(e);
      loadingProgress.innerHTML = `<span style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error loading data.</span>`;
    }
  }
  
  function populatePubFilters() {
    const countries = new Set();
    
    allDocs.forEach(d => {
      if (d.source === 'sivitas') {
        if (d.countries) d.countries.forEach(c => countries.add(c));
      }
    });
    
    populateSelect(filterPubCountry, Array.from(countries).sort());
  }
  
  function populateSelect(selectEl, list) {
    if (!selectEl) return;
    // Keep the "all" option
    selectEl.innerHTML = selectEl.options[0].outerHTML;
    list.forEach(val => {
      if (val && val !== 'Unknown' && val !== 'Indonesia' && val !== 'Universitas Gadjah Mada') {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        selectEl.appendChild(opt);
      }
    });
  }
  
  // --- FILTER MANAGEMENT ---
  function handleYearSliderChange() {
    let valMin = parseInt(filterYearMin.value);
    let valMax = parseInt(filterYearMax.value);
    
    // Constraint min must be <= max
    if (valMin > valMax) {
      if (this.id === 'filter-year-min') {
        filterYearMax.value = valMin;
        valMax = valMin;
      } else {
        filterYearMin.value = valMax;
        valMin = valMax;
      }
    }
    
    yearRangeLabel.textContent = `${valMin} - ${valMax}`;
    applyFilters();
  }
  
  function resetFilters() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    
    if (filterEtdType) filterEtdType.value = 'all';
    if (filterEtdDept) filterEtdDept.value = 'all';
    
    if (filterPubDept) filterPubDept.value = 'all';
    if (filterPubCountry) filterPubCountry.value = 'all';
    
    if (filterKoranSource) filterKoranSource.value = 'all';
    if (filterKoranTopic) filterKoranTopic.value = 'all';
    
    const minYear = filterYearMin.min;
    const maxYear = filterYearMax.max;
    filterYearMin.value = minYear;
    filterYearMax.value = maxYear;
    yearRangeLabel.textContent = `${minYear} - ${maxYear}`;
    
    applyFilters();
  }
  
  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    
    // Year range
    const minYear = parseInt(filterYearMin.value);
    const maxYear = parseInt(filterYearMax.value);
    
    filteredDocs = allDocs.filter(d => {
      // 1. Source check
      if (d.source !== activeExplorer) return false;
      
      // 2. Year check
      if (d.year < minYear || d.year > maxYear) return false;
      
      // 3. Search Query check
      if (query !== '') {
        const titleMatch = d.title && d.title.toLowerCase().includes(query);
        const authorMatch = d.authors && d.authors.some(a => a.toLowerCase().includes(query));
        const keywordMatch = d.keywords && d.keywords.some(k => k.toLowerCase().includes(query));
        const abstractMatch = d.abstract && d.abstract.toLowerCase().includes(query);
        const publisherMatch = d.publisher && d.publisher.toLowerCase().includes(query);
        
        if (!titleMatch && !authorMatch && !keywordMatch && !abstractMatch && !publisherMatch) return false;
      }
      
      // 4. Explorer-specific sub-filters
      if (activeExplorer === 'etd') {
        const type = filterEtdType.value;
        if (type !== 'all' && d.type !== type) return false;
        
        const dept = filterEtdDept.value;
        if (dept !== 'all' && (!d.departments || !d.departments.includes(dept))) return false;
        
      } else if (activeExplorer === 'sivitas') {
        const dept = filterPubDept.value;
        if (dept !== 'all' && (!d.departments || !d.departments.includes(dept))) return false;
        
        const country = filterPubCountry.value;
        if (country !== 'all' && (!d.countries || !d.countries.includes(country))) return false;
        
      } else if (activeExplorer === 'koran') {
        const source = filterKoranSource.value;
        if (source !== 'all' && d.publisher !== source) return false;
        
        const topic = filterKoranTopic.value;
        if (topic !== 'all' && d.topic !== topic) return false;
      }
      
      return true;
    });
    
    updateStats();
    
    if (activeTab === 'network') {
      if (activeExplorer === 'sivitas') {
        renderMap();
      } else {
        renderNetwork();
      }
    } else {
      renderCharts();
    }
  }
  
  function updateStats() {
    // Total documents
    statDocs.textContent = filteredDocs.length.toLocaleString('id-ID');
    
    // Count unique authors
    const authors = new Set();
    filteredDocs.forEach(d => {
      if (d.authors) d.authors.forEach(a => authors.add(a));
    });
    statAuthors.textContent = authors.size.toLocaleString('id-ID');
    
    // Count unique keywords
    const keywords = new Set();
    filteredDocs.forEach(d => {
      if (d.keywords) d.keywords.forEach(k => keywords.add(k));
    });
    statKeywords.textContent = keywords.size.toLocaleString('id-ID');
  }
  
  function switchNetworkMode(mode) {
    if (networkMode === mode) return;
    networkMode = mode;
    
    netModeAuthorBtn.classList.remove('active');
    netModeKeywordBtn.classList.remove('active');
    netModeMapBtn.classList.remove('active');
    
    if (mode === 'author') {
      netModeAuthorBtn.classList.add('active');
      nodeFreqSlider.min = 1;
      nodeFreqSlider.max = 15;
      nodeFreqSlider.value = 3;
      freqValLabel.textContent = "3";
    } else if (mode === 'keyword') {
      netModeKeywordBtn.classList.add('active');
      nodeFreqSlider.min = 2;
      nodeFreqSlider.max = 30;
      nodeFreqSlider.value = 5;
      freqValLabel.textContent = "5";
    } else if (mode === 'map') {
      netModeMapBtn.classList.add('active');
    }
    
    // Update canvas visibility based on mode
    if (mode === 'map') {
      mapContainer.style.display = 'block';
      graphCanvas.style.display = 'none';
      document.querySelector('.graph-legend').style.display = 'none';
      document.querySelector('.frequency-control').style.visibility = 'hidden';
      if (!mapInstance) initMap();
      else setTimeout(() => mapInstance.invalidateSize(), 100);
    } else {
      mapContainer.style.display = 'none';
      graphCanvas.style.display = 'block';
      document.querySelector('.graph-legend').style.display = 'flex';
      document.querySelector('.frequency-control').style.visibility = 'visible';
    }
    
    // Re-render
    if (mode === 'map') {
       renderMap();
    } else {
       renderNetwork();
    }
  }
  
  // --- WORLD MAP RENDERING (Leaflet) ---
  function renderMap() {
    // 1. Initialize Map if it doesn't exist
    if (!leafletMap) {
      // Yogyakarta coordinates [-7.7712, 110.3776]
      leafletMap = L.map('map-container', {
        center: [15, 60], // centered to see global connections better
        zoom: 2,
        minZoom: 2,
        maxBounds: [[-90, -180], [90, 180]]
      });
      
      // Use premium CartoDB Positron Dark Matter tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(leafletMap);
      
      leafletLayerGroup = L.layerGroup().addTo(leafletMap);
    } else {
      // Clear existing markers and lines
      leafletLayerGroup.clearLayers();
    }
    
    // 2. Count collaborations per country in filteredDocs (source === 'sivitas')
    const countryCounts = {};
    filteredDocs.forEach(d => {
      if (d.source === 'sivitas' && d.countries) {
        d.countries.forEach(c => {
          const normCountry = c.toLowerCase().trim();
          if (normCountry !== 'indonesia') {
            countryCounts[normCountry] = (countryCounts[normCountry] || 0) + 1;
          }
        });
      }
    });
    
    // Yogyakarta coordinates
    const jogjaCoords = [-7.7712, 110.3776];
    
    // Draw Yogyakarta central hub marker
    const jogjaPulse = L.circleMarker(jogjaCoords, {
      radius: 10,
      color: '#06b6d4',
      fillColor: '#06b6d4',
      fillOpacity: 0.7,
      weight: 2
    }).addTo(leafletLayerGroup);
    
    jogjaPulse.bindPopup("<b>FISIPOL UGM</b><br>Pusat Kolaborasi Riset");
    
    // Draw each collaborating country marker and link
    Object.keys(countryCounts).forEach(country => {
      const coords = COUNTRY_COORDS[country];
      if (!coords) return; // skip if no coordinates defined
      
      const count = countryCounts[country];
      const radius = Math.min(25, Math.max(5, Math.sqrt(count) * 1.5 + 4));
      
      // Draw country marker
      const marker = L.circleMarker(coords, {
        radius: radius,
        color: '#a855f7', // purple
        fillColor: '#a855f7',
        fillOpacity: 0.5,
        weight: 1
      }).addTo(leafletLayerGroup);
      
      // Capitalize country name
      const capCountry = country.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      marker.bindPopup(`<b>${capCountry}</b><br>${count} Kolaborasi Riset`);
      
      // Hover effects
      marker.on('mouseover', function (e) {
        this.openPopup();
        this.setStyle({ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.8 });
      });
      marker.on('mouseout', function (e) {
        this.setStyle({ color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.5 });
      });
      
      // Click filter effect
      marker.on('click', function(e) {
        filterPubCountry.value = capCountry;
        applyFilters();
        
        // Find authors associated with this country and open Rabbit panel
        const authorsForCountry = new Set();
        filteredDocs.forEach(d => {
          if (d.source === 'sivitas' && d.countries && d.countries.includes(capCountry)) {
            if (d.authors) d.authors.forEach(a => authorsForCountry.add(a));
          }
        });
        
        const authorsList = Array.from(authorsForCountry);
        if (authorsList.length > 0) {
           rabbitContainer.classList.add('open');
           rabbitScrollArea.innerHTML = '';
           rabbitCards = [];
           appendAuthorsListCard(authorsList, `Peneliti di ${capCountry}`, 0);
        }
      });
      
      // Draw link line from Yogyakarta to country
      const linkLine = L.polyline([jogjaCoords, coords], {
        color: 'rgba(6, 182, 212, 0.8)', // solid and more opaque cyan
        weight: Math.min(6, Math.max(2, count / 5))
      }).addTo(leafletLayerGroup);
      
      linkLine.bindPopup(`Jalur Kolaborasi: UGM &harr; ${capCountry} (${count} Karya)`);
    });
    
    // Invalidate Leaflet size to handle container visibility transitions correctly
    setTimeout(() => {
      leafletMap.invalidateSize();
    }, 100);
  }
  
  // --- NETWORK GRAPH RENDERING (force-graph) ---
  function renderNetwork() {
    const minFreq = parseInt(nodeFreqSlider.value);
    const canvasContainer = document.getElementById('network-graph-canvas');
    canvasContainer.innerHTML = ''; // clear
    
    let graphData = { nodes: [], links: [] };
    
    // Show limit warning if dataset size is massive
    const sizeLimit = 1500;
    let docsToProcess = filteredDocs;
    if (filteredDocs.length > sizeLimit) {
      graphLimitWarning.style.display = 'block';
      if (networkMode === 'keyword') {
        const withKws = filteredDocs.filter(d => d.keywords && d.keywords.length > 0);
        docsToProcess = [...withKws].sort((a, b) => b.year - a.year).slice(0, sizeLimit);
      } else {
        const withAuths = filteredDocs.filter(d => d.authors && d.authors.length > 0);
        docsToProcess = [...withAuths].sort((a, b) => b.year - a.year).slice(0, sizeLimit);
      }
    } else {
      graphLimitWarning.style.display = 'none';
      // Still sort by year descending to ensure newer publications are processed first if same size
      docsToProcess = [...filteredDocs].sort((a, b) => b.year - a.year);
    }
    
    if (networkMode === 'author') {
      // Co-authorship
      const authorFreq = {};
      const authorDocSources = {}; // store source databases mapped to authors
      const authorEtdRole = {};
      
      // Calculate author frequency
      docsToProcess.forEach(d => {
        if (!d.authors) return;
        d.authors.forEach((auth, index) => {
          authorFreq[auth] = (authorFreq[auth] || 0) + 1;
          
          if (!authorDocSources[auth]) authorDocSources[auth] = new Set();
          authorDocSources[auth].add(d.source);
          
          if (d.source === 'etd') {
              authorEtdRole[auth] = authorEtdRole[auth] || { s1:0, s2:0, s3:0, dosen:0 };
              if (index === 0) {
                 if (d.type === 'Skripsi') authorEtdRole[auth].s1++;
                 else if (d.type === 'Tesis') authorEtdRole[auth].s2++;
                 else if (d.type === 'Disertasi') authorEtdRole[auth].s3++;
                 else authorEtdRole[auth].s1++; // default to s1
              } else {
                 authorEtdRole[auth].dosen++;
              }
          }
        });
      });
      
      // Filter authors by min frequency
      const validAuthors = Object.keys(authorFreq).filter(auth => authorFreq[auth] >= minFreq);
      const validAuthorsSet = new Set(validAuthors);
      
      // Build Nodes
      validAuthors.forEach(auth => {
        // Determine primary source
        const sources = Array.from(authorDocSources[auth]);
        let primarySource = 'mixed';
        if (sources.length === 1) {
          primarySource = sources[0];
        }
        
        let role = null;
        if (primarySource === 'etd' && authorEtdRole[auth]) {
           const r = authorEtdRole[auth];
           const maxRole = Object.keys(r).reduce((a, b) => r[a] > r[b] ? a : b);
           if (maxRole === 's1') role = 'S1';
           else if (maxRole === 's2') role = 'S2';
           else if (maxRole === 's3') role = 'S3';
           else if (maxRole === 'dosen') role = 'Dosen';
        }
        
        graphData.nodes.push({
          id: auth,
          name: auth,
          val: authorFreq[auth], // size
          source: primarySource,
          role: role,
          count: authorFreq[auth]
        });
      });
      
      // Build links (Co-authorship edges)
      const coauthorships = {};
      docsToProcess.forEach(d => {
        if (!d.authors) return;
        // Get valid authors in this document
        const docAuths = d.authors.filter(a => validAuthorsSet.has(a));
        if (docAuths.length < 2) return;
        
        // Connect all pairs
        for (let i = 0; i < docAuths.length; i++) {
          for (let j = i + 1; j < docAuths.length; j++) {
            const pair = [docAuths[i], docAuths[j]].sort();
            const key = pair.join(' && ');
            coauthorships[key] = (coauthorships[key] || 0) + 1;
          }
        }
      });
      
      Object.keys(coauthorships).forEach(key => {
        const [source, target] = key.split(' && ');
        graphData.links.push({
          source,
          target,
          weight: coauthorships[key]
        });
      });
      
    } else {
      // Keyword Co-occurrence
      const kwFreq = {};
      const kwDocSources = {};
      
      docsToProcess.forEach(d => {
        if (!d.keywords) return;
        d.keywords.forEach(kw => {
          kwFreq[kw] = (kwFreq[kw] || 0) + 1;
          if (!kwDocSources[kw]) kwDocSources[kw] = new Set();
          kwDocSources[kw].add(d.source);
        });
      });
      
      const validKws = Object.keys(kwFreq).filter(kw => kwFreq[kw] >= minFreq);
      const validKwsSet = new Set(validKws);
      
      // Build Nodes
      validKws.forEach(kw => {
        const sources = Array.from(kwDocSources[kw]);
        let primarySource = 'mixed';
        if (sources.length === 1) {
          primarySource = sources[0];
        }
        
        graphData.nodes.push({
          id: kw,
          name: kw,
          val: kwFreq[kw] * 1.5, // size scalar
          source: primarySource,
          count: kwFreq[kw]
        });
      });
      
      // Build Links
      const cooccurrences = {};
      docsToProcess.forEach(d => {
        if (!d.keywords) return;
        const docKws = d.keywords.filter(k => validKwsSet.has(k));
        if (docKws.length < 2) return;
        
        for (let i = 0; i < docKws.length; i++) {
          for (let j = i + 1; j < docKws.length; j++) {
            const pair = [docKws[i], docKws[j]].sort();
            const key = pair.join(' && ');
            cooccurrences[key] = (cooccurrences[key] || 0) + 1;
          }
        }
      });
      
      Object.keys(cooccurrences).forEach(key => {
        const [source, target] = key.split(' && ');
        graphData.links.push({
          source,
          target,
          weight: cooccurrences[key]
        });
      });
    }
    
    document.getElementById('graph-nodes-count').textContent = `Nodes: ${graphData.nodes.length} | Edges: ${graphData.links.length}`;
    
    if (graphData.nodes.length === 0) {
      canvasContainer.innerHTML = `<div class="text-muted" style="display:flex;justify-content:center;align-items:center;height:100%;font-size:14px;"><i class="fa-solid fa-circle-info" style="margin-right:8px;"></i> Tidak ada jejaring untuk ditampilkan. Kurangi nilai Min. Frekuensi atau ubah filter.</div>`;
      return;
    }
    
    // Theme Colors
    const isDark = document.body.classList.contains('dark-mode');
    const nodeTextColor = isDark ? '#f8fafc' : '#0f172a';
    const linkColor = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(71, 85, 105, 0.15)';
    const linkHoverColor = isDark ? 'rgba(6, 182, 212, 0.5)' : 'rgba(14, 116, 144, 0.5)';
    
    const sourceColors = {
      etd: '#06b6d4',      // Default ETD (Cyan)
      etd_s1: '#3b82f6',   // Blue for S1
      etd_s2: '#22c55e',   // Green for S2
      etd_s3: '#eab308',   // Yellow for S3
      etd_dosen: '#ef4444',// Red for Dosen/Pembimbing
      sivitas: '#a855f7',  // Purple
      koran: '#f97316',    /* Orange */
      mixed: '#64748b'     /* Gray */
    };
    
    // Draw force-graph
    graphInstance = ForceGraph()(canvasContainer)
      .graphData(graphData)
      .nodeId('id')
      .nodeVal('val')
      .nodeLabel(node => {
         let roleStr = '';
         if (node.source === 'etd') {
            if (node.role === 'S1') roleStr = ' - Mahasiswa S1';
            else if (node.role === 'S2') roleStr = ' - Mahasiswa S2';
            else if (node.role === 'S3') roleStr = ' - Mahasiswa S3';
            else if (node.role === 'Dosen') roleStr = ' - Dosen/Pembimbing';
         }
         return `${node.name}${roleStr} (${node.count} dokumen)`;
      })
      .nodeColor(node => {
         if (node.source === 'etd' && node.role) {
            if (node.role === 'S1') return sourceColors.etd_s1;
            if (node.role === 'S2') return sourceColors.etd_s2;
            if (node.role === 'S3') return sourceColors.etd_s3;
            if (node.role === 'Dosen') return sourceColors.etd_dosen;
         }
         return sourceColors[node.source] || '#64748b';
      })
      .linkLabel(link => `Kolaborasi: ${link.weight} kali`)
      .linkColor(() => linkColor)
      .linkWidth(link => Math.min(6, Math.sqrt(link.weight)))
      // Custom node draw (draw text label alongside/inside the node)
      .nodeCanvasObject((node, ctx, globalScale) => {
        const label = node.name;
        const fontSize = Math.max(3, 12 / globalScale);
        ctx.font = `${fontSize}px Inter`;
        
        // Draw Dot
        const r = Math.max(2, Math.sqrt(node.val) * 1.5);
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
        ctx.fillStyle = sourceColors[node.source] || '#64748b';
        ctx.fill();
        
        // Draw Glowing border if zoomed in
        if (globalScale > 1.5) {
          ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
        
        // Draw Text Label
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = nodeTextColor;
        
        // Draw text slightly offset below dot
        ctx.fillText(label, node.x, node.y + r + fontSize + 0.5);
      })
      .onNodeClick(node => {
        openResearchRabbitPanel(node.name, networkMode === 'author' ? 'author' : 'keyword');
      });
      
    // Set Forces
    graphInstance.d3Force('charge').strength(-150);
    graphInstance.d3Force('link').distance(80);
  }
  
  // --- ANALYTICS CHARTS RENDERING (Chart.js) ---
  function renderCharts() {
    const isDark = document.body.classList.contains('dark-mode');
    
    // Chart Color configs
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(71, 85, 105, 0.08)';
    const accentColor = '#06b6d4'; // Cyan
    const accentSecondary = '#a855f7'; // Purple
    
    Chart.defaults.color = textColor;
    Chart.defaults.font.family = 'Inter';
    
    // --- 1. Publication Trend (Line Chart Comparing Datasets) ---
    const yearsMap = {};
    
    filteredDocs.forEach(d => {
      if (!d.year) return;
      yearsMap[d.year] = yearsMap[d.year] || { total: 0 };
      yearsMap[d.year].total++;
    });
    
    const sortedYears = Object.keys(yearsMap).map(Number).sort((a,b) => a - b);
    const trendData = sortedYears.map(y => yearsMap[y].total || 0);
    
    let datasetLabel = '';
    let dsColor = '';
    let dsBg = '';
    
    if (activeExplorer === 'etd') {
       datasetLabel = 'Tren Tugas Akhir (ETD)';
       dsColor = '#06b6d4';
       dsBg = 'rgba(6, 182, 212, 0.05)';
    } else if (activeExplorer === 'sivitas') {
       datasetLabel = 'Tren Publikasi Sivitas';
       dsColor = '#a855f7';
       dsBg = 'rgba(168, 85, 247, 0.05)';
    } else {
       datasetLabel = 'Tren Koran Digital';
       dsColor = '#f97316';
       dsBg = 'rgba(249, 115, 22, 0.05)';
    }
    
    if (charts.trend) charts.trend.destroy();
    charts.trend = new Chart(document.getElementById('chart-trend'), {
      type: 'line',
      data: {
        labels: sortedYears,
        datasets: [
          {
            label: datasetLabel,
            data: trendData,
            borderColor: dsColor,
            backgroundColor: dsBg,
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { grid: { color: gridColor } },
          y: { grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
    
    // --- 2. Top Authors (Horizontal Bar Chart) ---
    const authorFreq = {};
    filteredDocs.forEach(d => {
      if (d.authors) {
        d.authors.forEach(auth => {
          authorFreq[auth] = (authorFreq[auth] || 0) + 1;
        });
      }
    });
    
    const sortedAuthors = Object.keys(authorFreq)
      .map(k => ({ name: k, count: authorFreq[k] }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 10); // top 10
      
    if (charts.authors) charts.authors.destroy();
    charts.authors = new Chart(document.getElementById('chart-authors'), {
      type: 'bar',
      data: {
        labels: sortedAuthors.map(a => a.name),
        datasets: [{
          label: 'Jumlah Karya',
          data: sortedAuthors.map(a => a.count),
          backgroundColor: 'rgba(168, 85, 247, 0.75)',
          borderColor: '#a855f7',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, beginAtZero: true },
          y: { grid: { display: false } }
        }
      }
    });
    
    // --- 3. SDGs Distribution (for ETD/Publikasi) or Topics Distribution (for Koran) ---
    const chartSdgEl = document.getElementById('chart-sdg');
    const chartSdgCard = chartSdgEl.closest('.analytics-card');
    const chartSdgHeader = chartSdgCard.querySelector('h3');
    
    if (activeExplorer === 'koran') {
      chartSdgHeader.innerHTML = '<i class="fa-solid fa-tags"></i> Sebaran Topik Utama';
      const topicsMap = {};
      filteredDocs.forEach(d => {
        if (d.topic) topicsMap[d.topic] = (topicsMap[d.topic] || 0) + 1;
      });
      const topicLabels = Object.keys(topicsMap);
      const topicCounts = Object.values(topicsMap);
      
      if (charts.sdg) charts.sdg.destroy();
      charts.sdg = new Chart(chartSdgEl, {
        type: 'bar',
        data: {
          labels: topicLabels,
          datasets: [{
            label: 'Jumlah Artikel',
            data: topicCounts,
            backgroundColor: 'rgba(249, 115, 22, 0.75)',
            borderColor: '#f97316',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor }, beginAtZero: true }
          }
        }
      });
    } else {
      chartSdgHeader.innerHTML = '<i class="fa-solid fa-seedling"></i> Distribusi SDG (Sustainable Development Goals)';
      const sdgMap = {};
      filteredDocs.forEach(d => {
        if (d.sdgs) {
          d.sdgs.forEach(s => {
            sdgMap[s] = (sdgMap[s] || 0) + 1;
          });
        }
      });
      
      const sdgLabels = [];
      const sdgCounts = [];
      for (let i = 1; i <= 17; i++) {
        if (sdgMap[i]) {
          sdgLabels.push(`SDG ${i}`);
          sdgCounts.push(sdgMap[i]);
        }
      }
      
      if (charts.sdg) charts.sdg.destroy();
      charts.sdg = new Chart(chartSdgEl, {
        type: 'bar',
        data: {
          labels: sdgLabels,
          datasets: [{
            label: 'Dokumen',
            data: sdgCounts,
            backgroundColor: 'rgba(34, 197, 94, 0.75)',
            borderColor: '#22c55e',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor }, beginAtZero: true }
          }
        }
      });
    }
    
    // --- 4. Department Distribution (for ETD/Publikasi) or Sentiment Distribution (for Koran) ---
    const chartDeptsEl = document.getElementById('chart-depts');
    const chartDeptsCard = chartDeptsEl.closest('.analytics-card');
    const chartDeptsHeader = chartDeptsCard.querySelector('h3');
    
    if (activeExplorer === 'koran') {
      chartDeptsHeader.innerHTML = '<i class="fa-solid fa-face-smile"></i> Sebaran Sentimen Berita';
      const sentimentMap = { 'positif': 0, 'negatif': 0, 'netral': 0 };
      filteredDocs.forEach(d => {
        if (d.sentiment) sentimentMap[d.sentiment] = (sentimentMap[d.sentiment] || 0) + 1;
      });
      
      if (charts.depts) charts.depts.destroy();
      charts.depts = new Chart(chartDeptsEl, {
        type: 'doughnut',
        data: {
          labels: ['Positif', 'Negatif', 'Netral'],
          datasets: [{
            data: [sentimentMap.positif, sentimentMap.negatif, sentimentMap.netral],
            backgroundColor: ['#22c55e', '#ef4444', '#64748b'],
            borderWidth: isDark ? 2 : 1,
            borderColor: isDark ? '#131a2c' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      });
    } else {
      chartDeptsHeader.innerHTML = '<i class="fa-solid fa-users-gear"></i> Sebaran Departemen';
      const deptsMap = {};
      filteredDocs.forEach(d => {
        if (d.departments) {
          d.departments.forEach(dept => {
            deptsMap[dept] = (deptsMap[dept] || 0) + 1;
          });
        }
      });
      
      const deptLabels = Object.keys(deptsMap);
      const deptCounts = Object.values(deptsMap);
      const deptColors = ['#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#f43f5e', '#eab308'];
      
      if (charts.depts) charts.depts.destroy();
      charts.depts = new Chart(chartDeptsEl, {
        type: 'doughnut',
        data: {
          labels: deptLabels,
          datasets: [{
            data: deptCounts,
            backgroundColor: deptColors,
            borderWidth: isDark ? 2 : 1,
            borderColor: isDark ? '#131a2c' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { boxWidth: 12, font: { size: 11 } }
            }
          }
        }
      });
    }
    
    // --- 5. Tipe Tugas Akhir (for ETD) or Top Jurnal (for Publikasi) or Top Sumber Berita (for Koran) ---
    const chartPublisherEl = document.getElementById('chart-publisher');
    const chartPublisherCard = chartPublisherEl.closest('.analytics-card');
    const chartPublisherHeader = chartPublisherCard.querySelector('h3');
    
    if (activeExplorer === 'etd') {
      chartPublisherHeader.innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Tipe Tugas Akhir';
      const typeMap = {};
      filteredDocs.forEach(d => {
        if (d.type) typeMap[d.type] = (typeMap[d.type] || 0) + 1;
      });
      const typeLabels = Object.keys(typeMap);
      const typeCounts = Object.values(typeMap);
      
      if (charts.publisher) charts.publisher.destroy();
      charts.publisher = new Chart(chartPublisherEl, {
        type: 'bar',
        data: {
          labels: typeLabels,
          datasets: [{
            label: 'Jumlah Dokumen',
            data: typeCounts,
            backgroundColor: 'rgba(6, 182, 212, 0.75)',
            borderColor: '#06b6d4',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, beginAtZero: true },
            y: { grid: { display: false } }
          }
        }
      });
    } else if (activeExplorer === 'sivitas') {
      chartPublisherHeader.innerHTML = '<i class="fa-solid fa-print"></i> Top Jurnal & Penerbit';
      const publisherMap = {};
      filteredDocs.forEach(d => {
        if (d.publisher && d.publisher !== 'Sivitas FISIPOL') {
          publisherMap[d.publisher] = (publisherMap[d.publisher] || 0) + 1;
        }
      });
      
      const sortedPublisher = Object.keys(publisherMap)
        .map(k => ({ name: k, count: publisherMap[k] }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 10);
        
      if (charts.publisher) charts.publisher.destroy();
      charts.publisher = new Chart(chartPublisherEl, {
        type: 'bar',
        data: {
          labels: sortedPublisher.map(p => p.name.length > 25 ? p.name.slice(0, 25) + '...' : p.name),
          datasets: [{
            label: 'Jumlah Dokumen',
            data: sortedPublisher.map(p => p.count),
            backgroundColor: 'rgba(168, 85, 247, 0.75)',
            borderColor: '#a855f7',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, beginAtZero: true },
            y: { grid: { display: false } }
          }
        }
      });
    } else if (activeExplorer === 'koran') {
      chartPublisherHeader.innerHTML = '<i class="fa-solid fa-newspaper"></i> Top Sumber Berita';
      const publisherMap = {};
      filteredDocs.forEach(d => {
        if (d.publisher) {
          publisherMap[d.publisher] = (publisherMap[d.publisher] || 0) + 1;
        }
      });
      
      const sortedPublisher = Object.keys(publisherMap)
        .map(k => ({ name: k, count: publisherMap[k] }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 10);
        
      if (charts.publisher) charts.publisher.destroy();
      charts.publisher = new Chart(chartPublisherEl, {
        type: 'bar',
        data: {
          labels: sortedPublisher.map(p => p.name),
          datasets: [{
            label: 'Jumlah Berita',
            data: sortedPublisher.map(p => p.count),
            backgroundColor: 'rgba(249, 115, 22, 0.75)',
            borderColor: '#f97316',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, beginAtZero: true },
            y: { grid: { display: false } }
          }
        }
      });
    }
  }
  
  // --- RESEARCHRABBIT CASCADING RELATIONAL SLIDER LOGIC ---
  
  function openResearchRabbitPanel(id, type) {
    rabbitContainer.classList.add('open');
    rabbitScrollArea.innerHTML = '';
    rabbitCards = [];
    
    // Append first card
    if (type === 'author') {
      appendAuthorCard(id, 0);
    } else if (type === 'keyword') {
      appendKeywordCard(id, 0);
    } else {
      appendDocumentCard(id, 0);
    }
  }
  
  function closeRabbitPanel() {
    rabbitContainer.classList.remove('open');
    rabbitScrollArea.innerHTML = '';
    rabbitCards = [];
  }
  
  function truncateCards(index) {
    // Remove all cards at index > target index
    while (rabbitCards.length > index + 1) {
      const card = rabbitCards.pop();
      const el = document.getElementById(card.elementId);
      if (el) el.remove();
    }
  }
  
  // Auto scroll horizontal to last card
  function scrollToLastCard() {
    setTimeout(() => {
      rabbitScrollArea.scrollTo({
        left: rabbitScrollArea.scrollWidth,
        behavior: 'smooth'
      });
    }, 100);
  }
  
  // 1. Author Detail Card
  function appendAuthorCard(authorName, parentIndex) {
    truncateCards(parentIndex - 1);
    
    const cardId = `rabbit-card-author-${Date.now()}`;
    const works = filteredDocs.filter(d => d.authors && d.authors.includes(authorName));
    
    const cardObj = {
      elementId: cardId,
      type: 'author',
      id: authorName,
      title: authorName
    };
    rabbitCards.push(cardObj);
    
    // Build Card HTML
    const cardHtml = `
      <div class="rabbit-card" id="${cardId}">
        <div class="rabbit-card-header">
          <div class="rabbit-card-title">${authorName}</div>
          <span class="badge badge-sivitas">Penulis</span>
        </div>
        
        <div class="rabbit-card-meta">
          <div class="meta-row"><i class="fa-solid fa-book"></i> Total Karya: ${works.length} dokumen</div>
        </div>
        
        <div class="rabbit-relations">
          <h4>Karya Ilmiah (${works.length})</h4>
          <div class="rabbit-list-container">
            ${works.slice(0, 30).map(w => `
              <div class="list-item-card" data-doc-id="${w.id}">
                <div class="list-item-title">${w.title}</div>
                <div class="list-item-meta">
                  <span>${w.year} | ${w.source.toUpperCase()}</span>
                </div>
              </div>
            `).join('')}
            ${works.length > 30 ? '<div class="text-muted" style="font-size:11px;text-align:center;">Menampilkan 30 karya teratas...</div>' : ''}
          </div>
        </div>
      </div>
    `;
    
    rabbitScrollArea.insertAdjacentHTML('beforeend', cardHtml);
    
    // Bind click events on list items
    const cardEl = document.getElementById(cardId);
    cardEl.querySelectorAll('.list-item-card').forEach(item => {
      item.addEventListener('click', () => {
        const docId = item.getAttribute('data-doc-id');
        const currentIndex = rabbitCards.findIndex(c => c.elementId === cardId);
        appendDocumentCard(docId, currentIndex + 1);
      });
    });
    
    scrollToLastCard();
  }
  
  // 2. Keyword Detail Card
  function appendKeywordCard(keyword, parentIndex) {
    truncateCards(parentIndex - 1);
    
    const cardId = `rabbit-card-keyword-${Date.now()}`;
    const relatedDocs = filteredDocs.filter(d => d.keywords && d.keywords.includes(keyword));
    
    const cardObj = {
      elementId: cardId,
      type: 'keyword',
      id: keyword,
      title: keyword
    };
    rabbitCards.push(cardObj);
    
    const cardHtml = `
      <div class="rabbit-card" id="${cardId}">
        <div class="rabbit-card-header">
          <div class="rabbit-card-title">Kata Kunci: #${keyword}</div>
          <span class="badge badge-etd">Keyword</span>
        </div>
        
        <div class="rabbit-card-meta">
          <div class="meta-row"><i class="fa-solid fa-file-invoice"></i> Muncul di: ${relatedDocs.length} dokumen</div>
        </div>
        
        <div class="rabbit-relations">
          <h4>Dokumen Terkait (${relatedDocs.length})</h4>
          <div class="rabbit-list-container">
            ${relatedDocs.slice(0, 30).map(d => `
              <div class="list-item-card" data-doc-id="${d.id}">
                <div class="list-item-title">${d.title}</div>
                <div class="list-item-author">${d.authors ? d.authors[0] : 'Unknown'}</div>
                <div class="list-item-meta">
                  <span>${d.year} | ${d.source.toUpperCase()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    rabbitScrollArea.insertAdjacentHTML('beforeend', cardHtml);
    
    const cardEl = document.getElementById(cardId);
    cardEl.querySelectorAll('.list-item-card').forEach(item => {
      item.addEventListener('click', () => {
        const docId = item.getAttribute('data-doc-id');
        const currentIndex = rabbitCards.findIndex(c => c.elementId === cardId);
        appendDocumentCard(docId, currentIndex + 1);
      });
    });
    
    scrollToLastCard();
  }
  
  // 3. Document Detail Card
  function appendDocumentCard(docId, parentIndex) {
    truncateCards(parentIndex - 1);
    
    const cardId = `rabbit-card-doc-${Date.now()}`;
    const doc = allDocs.find(d => d.id === docId);
    if (!doc) return;
    
    const cardObj = {
      elementId: cardId,
      type: 'document',
      id: docId,
      title: doc.title
    };
    rabbitCards.push(cardObj);
    
    // Find relations counts
    // Co-authors
    const mainAuthor = doc.authors ? doc.authors[0] : null;
    const coauthorsCount = doc.authors ? doc.authors.length - 1 : 0;
    
    // Similar documents: sharing at least one keyword (excluding the document itself)
    const docKws = doc.keywords || [];
    const similarDocs = filteredDocs.filter(d => 
      d.id !== doc.id && 
      d.keywords && 
      d.keywords.some(k => docKws.includes(k))
    );
    
    const cardHtml = `
      <div class="rabbit-card" id="${cardId}">
        <div class="rabbit-card-header">
          <div class="rabbit-card-title">${doc.title}</div>
          <span class="badge badge-${doc.source}">${doc.source}</span>
        </div>
        
        <div class="rabbit-card-meta">
          ${doc.authors && doc.authors.length > 0 ? `
            <div class="meta-row"><i class="fa-solid fa-user-pen"></i> Penulis: 
              ${doc.authors.map(a => `<span class="author-link" style="color:var(--accent);text-decoration:underline;cursor:pointer;margin-right:5px;">${a}</span>`).join(', ')}
            </div>
          ` : ''}
          <div class="meta-row"><i class="fa-solid fa-calendar"></i> Tahun: ${doc.year}</div>
          ${doc.departments && doc.departments.length > 0 ? `<div class="meta-row"><i class="fa-solid fa-building-columns"></i> Departemen: ${doc.departments.join(', ')}</div>` : ''}
          <div class="meta-row"><i class="fa-solid fa-newspaper"></i> Publisher: ${doc.publisher || 'N/A'}</div>
          ${doc.sdgs && doc.sdgs.length > 0 ? `<div class="meta-row"><i class="fa-solid fa-seedling"></i> SDG Targets: ${doc.sdgs.map(s => `SDG ${s}`).join(', ')}</div>` : ''}
          ${doc.sentiment && doc.source === 'koran' ? `<div class="meta-row"><i class="fa-solid fa-face-smile"></i> Sentiment: <span style="text-transform:capitalize;font-weight:600;color:${doc.sentiment === 'positif' ? '#22c55e' : (doc.sentiment === 'negatif' ? '#ef4444' : 'var(--text-secondary)')}">${doc.sentiment}</span></div>` : ''}
        </div>
        
        ${doc.abstract ? `
          <div class="rabbit-card-abstract">
            <strong>Abstrak:</strong><br>
            ${doc.abstract}
          </div>
        ` : ''}
        
        ${doc.link ? `
          <div class="meta-row" style="margin-top:8px;">
            <a href="${doc.link}" target="_blank" class="btn btn-secondary" style="width:100%;justify-content:center;font-size:12px;padding:8px 12px;">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Tautan Asli
            </a>
          </div>
        ` : ''}
        
        <div class="rabbit-relations">
          <h4>Relasi & Rekomendasi</h4>
          
          ${coauthorsCount > 0 ? `
            <button class="relation-item-btn" id="${cardId}-btn-coauthors">
              <span><i class="fa-solid fa-users"></i> Kolaborator / Pembimbing</span>
              <span class="count-badge">${coauthorsCount}</span>
            </button>
          ` : ''}
          
          ${docKws.length > 0 ? `
            <button class="relation-item-btn" id="${cardId}-btn-keywords">
              <span><i class="fa-solid fa-tags"></i> Kata Kunci Terkait</span>
              <span class="count-badge">${docKws.length}</span>
            </button>
          ` : ''}
          
          <button class="relation-item-btn" id="${cardId}-btn-similar">
            <span><i class="fa-solid fa-file-invoice"></i> Dokumen Serupa (Keywords)</span>
            <span class="count-badge">${similarDocs.length}</span>
          </button>
        </div>
      </div>
    `;
    
    rabbitScrollArea.insertAdjacentHTML('beforeend', cardHtml);
    
    const cardEl = document.getElementById(cardId);
    
    // Bind author links click
    cardEl.querySelectorAll('.author-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const authName = e.target.textContent.trim();
        const currentIndex = rabbitCards.findIndex(c => c.elementId === cardId);
        appendAuthorCard(authName, currentIndex + 1);
      });
    });
    
    // Bind relation buttons click
    // 1. Co-authors
    const btnCoauthors = document.getElementById(`${cardId}-btn-coauthors`);
    if (btnCoauthors) {
      btnCoauthors.addEventListener('click', () => {
        const coauthorsList = doc.authors.slice(1); // skip main author
        const currentIndex = rabbitCards.findIndex(c => c.elementId === cardId);
        appendAuthorsListCard(coauthorsList, 'Kolaborator & Pembimbing', currentIndex + 1);
      });
    }
    
    // 2. Keywords list
    const btnKeywords = document.getElementById(`${cardId}-btn-keywords`);
    if (btnKeywords) {
      btnKeywords.addEventListener('click', () => {
        const currentIndex = rabbitCards.findIndex(c => c.elementId === cardId);
        appendKeywordsListCard(docKws, currentIndex + 1);
      });
    }
    
    // 3. Similar documents list
    const btnSimilar = document.getElementById(`${cardId}-btn-similar`);
    if (btnSimilar) {
      btnSimilar.addEventListener('click', () => {
        const currentIndex = rabbitCards.findIndex(c => c.elementId === cardId);
        appendDocsListCard(similarDocs.slice(0, 30), 'Dokumen Serupa', currentIndex + 1);
      });
    }
    
    scrollToLastCard();
  }
  
  // 4. Authors List Card (reusable list card)
  function appendAuthorsListCard(authorsList, title, parentIndex) {
    truncateCards(parentIndex - 1);
    
    const cardId = `rabbit-card-authlist-${Date.now()}`;
    const cardObj = {
      elementId: cardId,
      type: 'author-list',
      id: cardId,
      title: title
    };
    rabbitCards.push(cardObj);
    
    const cardHtml = `
      <div class="rabbit-card" id="${cardId}">
        <div class="rabbit-card-header">
          <div class="rabbit-card-title">${title}</div>
          <span class="badge badge-sivitas">List</span>
        </div>
        
        <div class="rabbit-relations" style="margin-top:10px;">
          <div class="rabbit-list-container">
            ${authorsList.map(auth => `
              <div class="list-item-card author-item" data-author-name="${auth}">
                <div class="list-item-title">${auth}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    rabbitScrollArea.insertAdjacentHTML('beforeend', cardHtml);
    
    const cardEl = document.getElementById(cardId);
    cardEl.querySelectorAll('.author-item').forEach(item => {
      item.addEventListener('click', () => {
        const authName = item.getAttribute('data-author-name');
        const currentIndex = rabbitCards.findIndex(c => c.elementId === cardId);
        appendAuthorCard(authName, currentIndex + 1);
      });
    });
    
    scrollToLastCard();
  }
  
  // 5. Keywords List Card
  function appendKeywordsListCard(keywordsList, parentIndex) {
    truncateCards(parentIndex - 1);
    
    const cardId = `rabbit-card-kwlist-${Date.now()}`;
    const cardObj = {
      elementId: cardId,
      type: 'keyword-list',
      id: cardId,
      title: 'Kata Kunci'
    };
    rabbitCards.push(cardObj);
    
    const cardHtml = `
      <div class="rabbit-card" id="${cardId}">
        <div class="rabbit-card-header">
          <div class="rabbit-card-title">Kata Kunci Terkait</div>
          <span class="badge badge-etd">List</span>
        </div>
        
        <div class="rabbit-relations" style="margin-top:10px;">
          <div class="rabbit-list-container">
            ${keywordsList.map(kw => `
              <div class="list-item-card keyword-item" data-keyword="${kw}">
                <div class="list-item-title">#${kw}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    rabbitScrollArea.insertAdjacentHTML('beforeend', cardHtml);
    
    const cardEl = document.getElementById(cardId);
    cardEl.querySelectorAll('.keyword-item').forEach(item => {
      item.addEventListener('click', () => {
        const kw = item.getAttribute('data-keyword');
        const currentIndex = rabbitCards.findIndex(c => c.elementId === cardId);
        appendKeywordCard(kw, currentIndex + 1);
      });
    });
    
    scrollToLastCard();
  }
  
  // 6. Documents List Card
  function appendDocsListCard(docsList, title, parentIndex) {
    truncateCards(parentIndex - 1);
    
    const cardId = `rabbit-card-doclist-${Date.now()}`;
    const cardObj = {
      elementId: cardId,
      type: 'document-list',
      id: cardId,
      title: title
    };
    rabbitCards.push(cardObj);
    
    const cardHtml = `
      <div class="rabbit-card" id="${cardId}">
        <div class="rabbit-card-header">
          <div class="rabbit-card-title">${title}</div>
          <span class="badge badge-etd">List</span>
        </div>
        
        <div class="rabbit-relations" style="margin-top:10px;">
          <div class="rabbit-list-container">
            ${docsList.map(doc => `
              <div class="list-item-card doc-item" data-doc-id="${doc.id}">
                <div class="list-item-title">${doc.title}</div>
                <div class="list-item-author">${doc.authors ? doc.authors[0] : 'Unknown'}</div>
                <div class="list-item-meta">
                  <span>${doc.year} | ${doc.source.toUpperCase()}</span>
                </div>
              </div>
            `).join('')}
            ${docsList.length === 0 ? '<div class="text-muted" style="font-size:12px;text-align:center;">Tidak ada dokumen relasi ditemukan.</div>' : ''}
          </div>
        </div>
      </div>
    `;
    
    rabbitScrollArea.insertAdjacentHTML('beforeend', cardHtml);
    
    const cardEl = document.getElementById(cardId);
    cardEl.querySelectorAll('.doc-item').forEach(item => {
      item.addEventListener('click', () => {
        const docId = item.getAttribute('data-doc-id');
        const currentIndex = rabbitCards.findIndex(c => c.elementId === cardId);
        appendDocumentCard(docId, currentIndex + 1);
      });
    });
    
    scrollToLastCard();
  }
});
