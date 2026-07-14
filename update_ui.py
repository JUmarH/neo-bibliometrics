import os

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Move section-controls out of workspace-network
old_workspace_start = """      <!-- SECTION 1: NETWORK VIEW -->
      <section id="workspace-network" class="workspace-section active">
        <div class="section-controls">
          <div class="control-left">"""
          
new_workspace_start = """      <!-- SHARED CONTROLS -->
      <div class="section-controls" style="margin-bottom: 16px;">
        <div class="control-left">"""

html = html.replace(old_workspace_start, new_workspace_start)

old_controls_end = """            <button id="fit-graph-btn" class="btn btn-icon-only" title="Fit Graph"><i class="fa-solid fa-expand"></i></button>
          </div>
        </div>

        <div class="network-canvas-container">"""

new_controls_end = """            <button id="fit-graph-btn" class="btn btn-icon-only" title="Fit Graph"><i class="fa-solid fa-expand"></i></button>
          </div>
      </div>

      <!-- SECTION 1: NETWORK VIEW -->
      <section id="workspace-network" class="workspace-section active">
        <div class="network-canvas-container">"""

html = html.replace(old_controls_end, new_controls_end)

# 2. Remove the old section-controls from analytics view
old_analytics = """      <!-- SECTION 2: ANALYTICS VIEW -->
      <section id="workspace-analytics" class="workspace-section">
        <div class="section-controls" style="margin-bottom: 20px;">
          <div class="control-left">
            <button id="analytics-etd-btn" class="btn btn-tab active">Statistik ETD</button>
            <button id="analytics-publikasi-btn" class="btn btn-tab">Statistik Publikasi</button>
            <button id="analytics-koran-btn" class="btn btn-tab">Statistik Koran</button>
          </div>
        </div>
        
        <div class="analytics-grid">"""

new_analytics = """      <!-- SECTION 2: ANALYTICS VIEW -->
      <section id="workspace-analytics" class="workspace-section">
        <div class="analytics-grid">"""

html = html.replace(old_analytics, new_analytics)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html updated successfully.")

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update app.js: Replace navAnalyticsBtn and analytics tab logic
# We already removed navAnalyticsBtn from HTML, let's remove it from JS
js = js.replace("const navAnalyticsBtn = document.getElementById('nav-analytics-btn');\n", "")
js = js.replace("navAnalyticsBtn.addEventListener('click', () => switchExplorer('analytics'));\n", "")

old_switch_exp = """    // Handle Tabs
    if (explorerName === 'analytics') {
      activeTab = 'analytics';
      navEtdBtn.classList.remove('active');
      navPublikasiBtn.classList.remove('active');
      navKoranBtn.classList.remove('active');
      navAnalyticsBtn.classList.add('active');
      
      sectionNetwork.style.display = 'none';
      sectionAnalytics.style.display = 'flex';
      
      // Cleanup graph memory when switching to analytics
      if (graphInstance) {
         graphInstance.pauseAnimation();
         graphInstance._destructor();
         graphInstance = null;
      }
      
      renderCharts();
    } else {
      activeTab = 'network';
      navAnalyticsBtn.classList.remove('active');
      sectionAnalytics.style.display = 'none';
      sectionNetwork.style.display = 'flex';
      
      // Update Map Button visibility
      netModeMapBtn.style.display = (explorerName === 'sivitas') ? 'inline-block' : 'none';"""

new_switch_exp = """    // Switch Explorer Context
    activeTab = 'network';
    activeExplorer = explorerName;
    document.getElementById('toggle-analytics-btn').innerHTML = '<i class="fa-solid fa-chart-pie"></i> Analitik';
    document.getElementById('toggle-analytics-btn').classList.remove('active');
    sectionAnalytics.style.display = 'none';
    sectionNetwork.style.display = 'flex';
    
    // Update Map Button visibility
    netModeMapBtn.style.display = (explorerName === 'sivitas') ? 'inline-block' : 'none';"""

js = js.replace(old_switch_exp, new_switch_exp)

# Add Toggle Analytics Event Listener
old_nav_events = """    navKoranBtn.addEventListener('click', () => switchExplorer('koran'));"""
new_nav_events = """    navKoranBtn.addEventListener('click', () => switchExplorer('koran'));
    
    const toggleAnalyticsBtn = document.getElementById('toggle-analytics-btn');
    toggleAnalyticsBtn.addEventListener('click', () => {
       if (activeTab === 'network') {
          activeTab = 'analytics';
          toggleAnalyticsBtn.innerHTML = '<i class="fa-solid fa-network-wired"></i> Jejaring';
          toggleAnalyticsBtn.classList.add('active');
          sectionNetwork.style.display = 'none';
          sectionAnalytics.style.display = 'flex';
          if (graphInstance) {
             graphInstance.pauseAnimation();
          }
          renderCharts();
       } else {
          activeTab = 'network';
          toggleAnalyticsBtn.innerHTML = '<i class="fa-solid fa-chart-pie"></i> Analitik';
          toggleAnalyticsBtn.classList.remove('active');
          sectionAnalytics.style.display = 'none';
          sectionNetwork.style.display = 'flex';
          if (graphInstance) {
             graphInstance.resumeAnimation();
          }
       }
    });"""

js = js.replace(old_nav_events, new_nav_events)

# Add Clustering UI logic
# The cluster button id is 'net-mode-cluster-btn'
# We just add event listener for it. We also add `clusterMode` boolean flag.
old_cluster = """  let activeExplorer = 'etd'; // 'etd', 'sivitas', 'koran'
  let activeTab = 'network'; // 'network', 'analytics'
  let networkMode = 'author'; // 'author', 'keyword', 'map'"""

new_cluster = """  let activeExplorer = 'etd'; // 'etd', 'sivitas', 'koran'
  let activeTab = 'network'; // 'network', 'analytics'
  let networkMode = 'author'; // 'author', 'keyword', 'map'
  let clusterMode = false;"""
  
js = js.replace(old_cluster, new_cluster)

old_cluster_evt = """    netModeMapBtn.addEventListener('click', () => switchNetworkMode('map'));"""
new_cluster_evt = """    netModeMapBtn.addEventListener('click', () => switchNetworkMode('map'));
    
    const netModeClusterBtn = document.getElementById('net-mode-cluster-btn');
    netModeClusterBtn.addEventListener('click', () => {
       clusterMode = !clusterMode;
       if (clusterMode) {
          netModeClusterBtn.classList.add('active');
          netModeClusterBtn.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> Default Colors';
          netModeClusterBtn.style.background = '#a855f7';
          netModeClusterBtn.style.color = 'white';
       } else {
          netModeClusterBtn.classList.remove('active');
          netModeClusterBtn.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> VOSviewer Clustering';
          netModeClusterBtn.style.background = 'rgba(168, 85, 247, 0.1)';
          netModeClusterBtn.style.color = '#a855f7';
       }
       if (activeTab === 'network' && networkMode !== 'map') {
          renderNetwork();
       }
    });"""
js = js.replace(old_cluster_evt, new_cluster_evt)

# Also fix the analytics buttons missing (we removed them but there were event listeners for them in app.js)
# Let's remove the analytics buttons listeners
old_an_btns = """    // Analytics Tabs
    document.getElementById('analytics-etd-btn').addEventListener('click', (e) => {
      document.querySelectorAll('#workspace-analytics .btn-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
    document.getElementById('analytics-publikasi-btn').addEventListener('click', (e) => {
      document.querySelectorAll('#workspace-analytics .btn-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
    document.getElementById('analytics-koran-btn').addEventListener('click', (e) => {
      document.querySelectorAll('#workspace-analytics .btn-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });"""
js = js.replace(old_an_btns, "")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("app.js updated for UI toggle successfully.")
