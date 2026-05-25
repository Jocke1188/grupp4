const GEOJSON_URL = "https://raw.githubusercontent.com/okfse/sweden-geojson/refs/heads/master/swedish_regions.geojson";

const SCB_EXPL_URL = "https://statistikdatabasen.scb.se/api/v2/tables/TAB4312/data" +
    "?lang=sv" +
    "&valueCodes[Region]=01,03,04,05,06,07,08,09,10,12,13,14,17,18,19,20,21,22,23,24,25" +
    "&valueCodes[Exploateringstyp]=TOT" +
    "&valueCodes[ContentsCode]=000006WX" +
    "&valueCodes[Tid]=2024";

const REGION_CODE_MAP = {
    '01': 'Stockholm',    '03': 'Uppsala',       '04': 'Södermanland',
    '05': 'Östergötland', '06': 'Jönköping',     '07': 'Kronoberg',
    '08': 'Kalmar',       '09': 'Gotland',        '10': 'Blekinge',
    '12': 'Skåne',        '13': 'Halland',        '14': 'Västra Götaland',
    '17': 'Värmland',     '18': 'Örebro',         '19': 'Västmanland',
    '20': 'Dalarna',      '21': 'Gävleborg',      '22': 'Västernorrland',
    '23': 'Jämtland',     '24': 'Västerbotten',   '25': 'Norrbotten'
};

const VATMARK_DATA = {
    'Stockholm':       12566,
    'Uppsala':         23439,
    'Södermanland':    15652,
    'Östergötland':    23299,
    'Jönköping':       53785,
    'Kronoberg':       46484,
    'Kalmar':          28445,
    'Gotland':         5799,
    'Blekinge':        4615,
    'Skåne':           23129,
    'Halland':         22276,
    'Västra Götaland': 85012,
    'Värmland':        98437,
    'Örebro':          37555,
    'Västmanland':     19794,
    'Dalarna':         284035,
    'Gävleborg':       88144,
    'Västernorrland':  107119,
    'Jämtland':        615654,
    'Västerbotten':    707459,
    'Norrbotten':      1631344
};

let geojsonData = null;
let explData = null;

async function loadGeoJSON() {
    const r = await fetch(GEOJSON_URL);
    geojsonData = await r.json();
}

async function fetchExplData() {
    const r = await fetch(SCB_EXPL_URL);
    if (!r.ok) throw new Error('SCB-fel: ' + r.status);
    const json = await r.json();
    const regionIndex = json.dimension.Region.category.index;
    const values = json.value;
    const result = {};
    Object.entries(regionIndex).forEach(([code, pos]) => {
        const name = REGION_CODE_MAP[code];
        if (name) result[name] = parseInt(values[pos]) || 0;
    });
    return result;
}

function drawMap(metric) {
    const regions = Object.keys(VATMARK_DATA);

    const vals = regions.map(r => {
        const total = VATMARK_DATA[r];
        const expl = explData[r] || 0;
        if (metric === 'expl_ha') return expl;
        if (metric === 'vatmark_ha') return total;
        return total > 0 ? +((expl / total) * 100).toFixed(2) : 0;
    });

    const texts = regions.map(r => {
        const total = VATMARK_DATA[r];
        const expl = explData[r] || 0;
        const pct = total > 0 ? +((expl / total) * 100).toFixed(2) : 0;
        return (
            `<b>${r}</b><br>` +
            `Total våtmark: ${total.toLocaleString('sv-SE')} ha<br>` +
            `Exploaterad våtmark: ${expl.toLocaleString('sv-SE')} ha<br>` +
            `Andel exploaterad: ${pct} %`
        );
    });

    const isExpl = metric !== 'vatmark_ha';
    const colorscale = isExpl ? [
        [0,   '#FFF3E0'],
        [0.2, '#FFCC80'],
        [0.4, '#FFA726'],
        [0.6, '#EF6C00'],
        [0.8, '#BF360C'],
        [1.0, '#7F1900']
    ] : [
        [0,   '#E1F5EE'],
        [0.2, '#9FE1CB'],
        [0.4, '#5DCAA5'],
        [0.6, '#1D9E75'],
        [0.8, '#0F6E56'],
        [1.0, '#085041']
    ];

    const labels = {
        vatmark_ha: 'Total våtmark (ha)',
        expl_ha:    'Exploaterad våtmark (ha)',
        expl_pct:   'Andel exploaterad (%)'
    };

    const trace = {
        type: 'choroplethmap',
        locations: regions,
        z: vals,
        geojson: geojsonData,
        featureidkey: 'properties.name',
        text: texts,
        hovertemplate: '%{text}<extra></extra>',
        colorscale: colorscale,
        marker: { opacity: 0.85, line: { width: 0.8, color: '#fff' } },
        colorbar: {
            title: { text: labels[metric], font: { size: 12 } },
            thickness: 14, len: 0.6,
            tickfont: { size: 11 }
        }
    };

   const layout = {
    map: {
        style: 'carto-positron',
        center: { lon: 17.3, lat: 63 },
        zoom: 3.5
    },
    margin: { t: 8, b: 8, l: 8, r: 8 },
    height: 580,
    paper_bgcolor: 'rgba(0,0,0,0)',
    dragmode: false
};

    Plotly.react('map', [trace], layout, {
        responsive: true,
        displayModeBar: false,
        scrollZoom: false
    });

    document.getElementById('map').on('plotly_relayout', function() {
    Plotly.relayout('map', {
        'map.center': { lon: 17.3, lat: 63 },
        'map.zoom': 3.5
    });
    });

    const totalExpl = Object.values(explData).reduce((a, b) => a + b, 0);
    const totalVatmark = Object.values(VATMARK_DATA).reduce((a, b) => a + b, 0);
    document.getElementById('info').textContent =
        `Total våtmark: ${totalVatmark.toLocaleString('sv-SE')} ha  ·  ` +
        `Total exploaterad: ${totalExpl.toLocaleString('sv-SE')} ha  ·  ` +
        `Källa: NMD2018 + SCB MI1303 2024`;
}

async function init() {
    try {
        document.getElementById('status').textContent = 'Laddar data…';
        await loadGeoJSON();
        explData = await fetchExplData();
        document.getElementById('status').textContent = '';
        drawMap(document.getElementById('metricSel').value);
    } catch(e) {
        document.getElementById('status').textContent = 'Fel: ' + e.message;
        console.error(e);
    }
}

document.getElementById('metricSel').addEventListener('change', () =>
    drawMap(document.getElementById('metricSel').value));

init();