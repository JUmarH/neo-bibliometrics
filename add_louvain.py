import os

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_draw = """    if (graphData.nodes.length === 0) {
      canvasContainer.innerHTML = `<div class="text-muted" style="display:flex;justify-content:center;align-items:center;height:100%;font-size:14px;"><i class="fa-solid fa-circle-info" style="margin-right:8px;"></i> Tidak ada jejaring untuk ditampilkan. Kurangi nilai Min. Frekuensi atau ubah filter.</div>`;
      return;
    }
    
    // Theme Colors
    const isDark = document.body.classList.contains('dark-mode');"""

new_draw = """    if (graphData.nodes.length === 0) {
      canvasContainer.innerHTML = `<div class="text-muted" style="display:flex;justify-content:center;align-items:center;height:100%;font-size:14px;"><i class="fa-solid fa-circle-info" style="margin-right:8px;"></i> Tidak ada jejaring untuk ditampilkan. Kurangi nilai Min. Frekuensi atau ubah filter.</div>`;
      return;
    }
    
    // Calculate VOSviewer Clustering (Louvain)
    if (typeof jLouvain !== 'undefined') {
        const nodeIds = graphData.nodes.map(n => n.id);
        const edgeData = graphData.links.map(l => ({ source: l.source, target: l.target, weight: l.weight }));
        try {
            const community = jLouvain().nodes(nodeIds).edges(edgeData);
            const result = community();
            graphData.nodes.forEach(n => {
                n.cluster = result[n.id] || 0;
            });
        } catch(e) {
            console.error('Clustering error:', e);
            graphData.nodes.forEach(n => n.cluster = 0);
        }
    } else {
        graphData.nodes.forEach(n => n.cluster = 0);
    }
    
    // Theme Colors
    const isDark = document.body.classList.contains('dark-mode');"""

js = js.replace(old_draw, new_draw)


old_colors = """      .nodeColor(node => {
         if (node.source === 'etd' && node.role) {
            if (node.role === 'S1') return sourceColors.etd_s1;
            if (node.role === 'S2') return sourceColors.etd_s2;
            if (node.role === 'S3') return sourceColors.etd_s3;
            if (node.role === 'Dosen') return sourceColors.etd_dosen;
         }
         return sourceColors[node.source] || '#64748b';
      })"""

new_colors = """      .nodeColor(node => {
         if (clusterMode) {
             const clusterColors = ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9'];
             return clusterColors[node.cluster % clusterColors.length];
         }
         if (node.source === 'etd' && node.role) {
            if (node.role === 'S1') return sourceColors.etd_s1;
            if (node.role === 'S2') return sourceColors.etd_s2;
            if (node.role === 'S3') return sourceColors.etd_s3;
            if (node.role === 'Dosen') return sourceColors.etd_dosen;
         }
         return sourceColors[node.source] || '#64748b';
      })"""
      
js = js.replace(old_colors, new_colors)

# also fix node canvas object color
old_ctx_fill = """        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
        ctx.fillStyle = sourceColors[node.source] || '#64748b';
        ctx.fill();"""

new_ctx_fill = """        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
        if (clusterMode) {
             const clusterColors = ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9'];
             ctx.fillStyle = clusterColors[node.cluster % clusterColors.length];
        } else {
             let c = sourceColors[node.source] || '#64748b';
             if (node.source === 'etd' && node.role) {
                if (node.role === 'S1') c = sourceColors.etd_s1;
                else if (node.role === 'S2') c = sourceColors.etd_s2;
                else if (node.role === 'S3') c = sourceColors.etd_s3;
                else if (node.role === 'Dosen') c = sourceColors.etd_dosen;
             }
             ctx.fillStyle = c;
        }
        ctx.fill();"""
js = js.replace(old_ctx_fill, new_ctx_fill)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Added louvain clustering to app.js")
