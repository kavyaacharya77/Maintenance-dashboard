// Shared chart colors
const COLORS = {
    blue:   '#378ADD',
    red:    '#E24B4A',
    amber:  '#BA7517',
    green:  '#639922',
    gray:   '#888780',
    purple: '#7F77DD'
  };
  
  const GRID  = 'rgba(0,0,0,0.07)';
  const TICKS = '#888780';
  
  // Helper: build a legend inside a div
  function makeLegend(id, items) {
    const el = document.getElementById(id);
    el.innerHTML = items.map(i =>
      `<span class="leg-item">
         <span class="leg-dot" style="background:${i.color}"></span>${i.label}
       </span>`
    ).join('');
  }
  
  // ── Load data then build everything ──────────────────────────────
  fetch('dashboard.json')
    .then(res => res.json())
    .then(d => {
      buildKPIs(d);
      buildFailureModes(d.failureModes);
      buildByType(d.allByType, d.failByType);
      const scatterChart = buildScatter(d.scatter, 'type');
      buildToolWear(d.toolWearBuckets, d.toolWearFailBuckets);
      buildTempScatter(d.scatter);
      setupTabs(d.scatter, scatterChart);
    });
  
  // ── KPI cards ────────────────────────────────────────────────────
  function buildKPIs(d) {
    const items = [
      { label: 'Total records',       value: d.totalRecords.toLocaleString(),  sub: 'L · M · H product types', color: '#2c2c2a' },
      { label: 'Total failures',      value: d.totalFailures,                  sub: (d.totalFailures/d.totalRecords*100).toFixed(2)+'% failure rate', color: '#A32D2D' },
      { label: 'Avg tool wear',       value: d.avgToolWear + ' min',           sub: 'Max: ' + d.maxToolWear + ' min', color: '#854F0B' },
      { label: 'Avg rotational speed',value: d.avgRPM.toLocaleString() + ' rpm', sub: 'Avg torque: 40.0 Nm',    color: '#3B6D11' }
    ];
    document.getElementById('kpis').innerHTML = items.map(i => `
      <div class="kpi">
        <div class="kpi-label">${i.label}</div>
        <div class="kpi-value" style="color:${i.color}">${i.value}</div>
        <div class="kpi-sub">${i.sub}</div>
      </div>
    `).join('');
  }
  
  // ── Bar chart: failure modes ──────────────────────────────────────
  function buildFailureModes(modes) {
    const colorMap = { HDF: COLORS.red, OSF: COLORS.amber, PWF: COLORS.blue, TWF: COLORS.green, RNF: COLORS.gray };
    makeLegend('legend-fail', Object.keys(modes).map(k => ({ label: `${k} ${modes[k]}`, color: colorMap[k] })));
    new Chart(document.getElementById('failChart'), {
      type: 'bar',
      data: {
        labels: Object.keys(modes),
        datasets: [{
          data: Object.values(modes),
          backgroundColor: Object.keys(modes).map(k => colorMap[k]),
          borderRadius: 4,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: TICKS, font: { size: 11 } } },
          y: { grid: { color: GRID },    ticks: { color: TICKS, font: { size: 11 } } }
        }
      }
    });
  }
  
  // ── Stacked bar: failures by type ────────────────────────────────
  function buildByType(all, fail) {
    makeLegend('legend-type', [
      { label: 'No failure', color: COLORS.blue },
      { label: 'Failure',    color: COLORS.red  }
    ]);
    const types = ['L', 'M', 'H'];
    new Chart(document.getElementById('typeChart'), {
      type: 'bar',
      data: {
        labels: types.map(t => `Type ${t} (${all[t].toLocaleString()})`),
        datasets: [
          { label: 'No failure', data: types.map(t => all[t] - (fail[t]||0)), backgroundColor: COLORS.blue, borderRadius: 4, borderWidth: 0 },
          { label: 'Failure',    data: types.map(t => fail[t]||0),           backgroundColor: COLORS.red,  borderRadius: 4, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: TICKS, font: { size: 11 } } },
          y: { stacked: true, grid: { color: GRID },    ticks: { color: TICKS, font: { size: 11 } } }
        }
      }
    });
  }
  
  // ── Scatter: torque vs RPM ────────────────────────────────────────
  function getScatterDatasets(scatter, mode) {
    if (mode === 'type') {
      const cfg = { M: COLORS.blue, L: COLORS.green, H: COLORS.red };
      return ['M','L','H'].map(t => ({
        label: `Type ${t}`,
        data: scatter.filter(d => d.type === t).map(d => ({ x: d.rpm, y: d.torque })),
        backgroundColor: cfg[t] + 'BB',
        pointRadius: 4, borderWidth: 0
      }));
    } else {
      return [
        { label: 'Normal',  data: scatter.filter(d => !d.failure).map(d => ({ x: d.rpm, y: d.torque })), backgroundColor: COLORS.blue + 'AA', pointRadius: 3, borderWidth: 0 },
        { label: 'Failure', data: scatter.filter(d =>  d.failure).map(d => ({ x: d.rpm, y: d.torque })), backgroundColor: COLORS.red,         pointRadius: 6, borderWidth: 0 }
      ];
    }
  }
  
  function buildScatter(scatter, mode) {
    makeLegend('legend-scatter', [
      { label: 'Type M', color: COLORS.blue  },
      { label: 'Type L', color: COLORS.green },
      { label: 'Type H', color: COLORS.red   }
    ]);
    return new Chart(document.getElementById('scatterChart'), {
      type: 'scatter',
      data: { datasets: getScatterDatasets(scatter, mode) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: ctx => `RPM: ${Math.round(ctx.parsed.x)}, Torque: ${ctx.parsed.y.toFixed(1)} Nm`
        }}},
        scales: {
          x: { grid: { color: GRID }, ticks: { color: TICKS, font: { size: 10 } },
               title: { display: true, text: 'Rotational speed (rpm)', color: TICKS, font: { size: 11 } }, min: 1100, max: 2100 },
          y: { grid: { color: GRID }, ticks: { color: TICKS, font: { size: 10 } },
               title: { display: true, text: 'Torque (Nm)', color: TICKS, font: { size: 11 } }, min: 10, max: 80 }
        }
      }
    });
  }
  
  // ── Tab switching for scatter ─────────────────────────────────────
  function setupTabs(scatter, chart) {
    document.querySelectorAll('#scatterTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#scatterTabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        // Update legend
        if (mode === 'type') {
          makeLegend('legend-scatter', [
            { label: 'Type M', color: COLORS.blue }, { label: 'Type L', color: COLORS.green }, { label: 'Type H', color: COLORS.red }
          ]);
        } else {
          makeLegend('legend-scatter', [
            { label: 'Normal', color: COLORS.blue }, { label: 'Failure', color: COLORS.red }
          ]);
        }
        chart.data.datasets = getScatterDatasets(scatter, mode);
        chart.update();
      });
    });
  }
  
  // ── Bar chart: tool wear buckets ─────────────────────────────────
  function buildToolWear(buckets, failBuckets) {
    makeLegend('legend-wear', [
      { label: 'All machines', color: COLORS.blue },
      { label: 'Failures',     color: COLORS.red  }
    ]);
    new Chart(document.getElementById('wearChart'), {
      type: 'bar',
      data: {
        labels: ['0–50 min', '50–100', '100–150', '150–200', '200+'],
        datasets: [
          { label: 'Total', data: buckets,     backgroundColor: COLORS.blue + '99', borderRadius: 3, borderWidth: 0 },
          { label: 'Fail',  data: failBuckets, backgroundColor: COLORS.red,         borderRadius: 3, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: TICKS, font: { size: 10 } } },
          y: { grid: { color: GRID },    ticks: { color: TICKS, font: { size: 10 } } }
        }
      }
    });
  }
  
  // ── Scatter: temperature delta vs tool wear ───────────────────────
  function buildTempScatter(scatter) {
    makeLegend('legend-temp', [
      { label: 'Normal',  color: COLORS.blue },
      { label: 'Failure', color: COLORS.red  }
    ]);
    const pts = scatter.map(d => ({ x: d.toolWear, y: +(d.procTemp - d.airTemp).toFixed(2), failure: d.failure }));
    new Chart(document.getElementById('tempChart'), {
      type: 'scatter',
      data: {
        datasets: [
          { label: 'Normal',  data: pts.filter(d => !d.failure).map(d => ({ x: d.x, y: d.y })), backgroundColor: COLORS.blue + '66', pointRadius: 3, borderWidth: 0 },
          { label: 'Failure', data: pts.filter(d =>  d.failure).map(d => ({ x: d.x, y: d.y })), backgroundColor: COLORS.red,         pointRadius: 5, borderWidth: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: ctx => `Tool wear: ${ctx.parsed.x} min, ΔTemp: ${ctx.parsed.y.toFixed(1)} K`
        }}},
        scales: {
          x: { grid: { color: GRID }, ticks: { color: TICKS, font: { size: 10 } },
               title: { display: true, text: 'Tool wear (min)', color: TICKS, font: { size: 11 } } },
          y: { grid: { color: GRID }, ticks: { color: TICKS, font: { size: 10 } },
               title: { display: true, text: 'ΔTemp — process minus air (K)', color: TICKS, font: { size: 11 } }, min: 8, max: 13 }
        }
      }
    });
  }
  async function loadFigma() {
    const token  = document.getElementById('figma-key').value.trim();
    const fileId = document.getElementById('figma-file-id').value.trim();
    const output = document.getElementById('figma-output');
  
    if (!token || !fileId) {
      output.textContent = 'Please enter both your API token and File ID.';
      return;
    }
  
    output.textContent = 'Loading from Figma...';
  
    try {
      const res  = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
        headers: { 'X-Figma-Token': token }
      });
      const data = await res.json();
  
      if (data.err) {
        output.textContent = 'Error: ' + data.err;
        return;
      }
  
      // Pull out useful info from the Figma file
      const fileName   = data.name;
      const lastEdited = new Date(data.lastModified).toLocaleString();
      const pages      = data.document.children;
  
      // Count total components across all pages
      let componentCount = 0;
      let frameCount     = 0;
      pages.forEach(page => {
        page.children && page.children.forEach(node => {
          if (node.type === 'COMPONENT') componentCount++;
          if (node.type === 'FRAME')     frameCount++;
        });
      });
  
      // Display the results
      output.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:1rem;">
          <div class="kpi">
            <div class="kpi-label">File name</div>
            <div class="kpi-value" style="font-size:16px;">${fileName}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Pages</div>
            <div class="kpi-value">${pages.length}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Top-level frames</div>
            <div class="kpi-value">${frameCount}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Last edited</div>
            <div class="kpi-value" style="font-size:14px;">${lastEdited}</div>
          </div>
        </div>
        <table style="width:100%; font-size:13px; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:0.5px solid #ddd;">
              <th style="text-align:left; padding:8px; color:#888; font-weight:500;">Page name</th>
              <th style="text-align:left; padding:8px; color:#888; font-weight:500;">Nodes</th>
              <th style="text-align:left; padding:8px; color:#888; font-weight:500;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${pages.map(p => `
              <tr style="border-bottom:0.5px solid #f0f0f0;">
                <td style="padding:8px;">${p.name}</td>
                <td style="padding:8px;">${p.children ? p.children.length : 0}</td>
                <td style="padding:8px; color:#888;">${p.type}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
  
    } catch (err) {
      output.textContent = 'Something went wrong: ' + err.message;
    }
  }
