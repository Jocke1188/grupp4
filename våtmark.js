const GEOJSON_URL = "https://raw.githubusercontent.com/okfse/sweden-geojson/refs/heads/master/swedish_regions.geojson";

const SCB_EXPL_URL = "https://statistikdatabasen.scb.se/api/v2/tables/TAB4312/data" +
    "?lang=sv" +
    "&valueCodes[Region]=01,03,04,05,06,07,08,09,10,12,13,14,17,18,19,20,21,22,23,24,25" +
    "&valueCodes[Exploateringstyp]=TOT" +
    "&valueCodes[ContentsCode]=000006WZ" +
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

const VÅTMARK_DATA = {
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

let map = null;
let geojsonLayer = null;
let geojsonData = null;
let explData = null;

const GREEN_SCALE = ['#E1F5EE','#9FE1CB','#5DCAA5','#1D9E75','#0F6E56','#085041'];
const ORANGE_SCALE = ['#FFF3E0','#FFCC80','#FFA726','#EF6C00','#BF360C','#7F1900'];

function getColor(value, max, isExpl) {
    const scale = isExpl ? ORANGE_SCALE : GREEN_SCALE;
    if (max === 0) return scale[0];
    const ratio = value / max;
    const index = Math.min(Math.floor(ratio * scale.length), scale.length - 1);
    return scale[index];
}

function getValues(metric) {
    return Object.keys(VÅTMARK_DATA).map(r => {
        const total = VÅTMARK_DATA[r];
        const expl = explData[r] || 0;
        if (metric === 'expl_ha') return expl;
        if (metric === 'våtmark_ha') return total;
        return total > 0 ? +((expl / total) * 100).toFixed(2) : 0;
    });
}

function drawMap(metric) {
    const isExpl = metric !== 'våtmark_ha';
    const vals = getValues(metric);
    const max = Math.max(...vals);

    if (geojsonLayer) geojsonLayer.remove();

    geojsonLayer = L.geoJSON(geojsonData, {
        style: feature => {
            const name = feature.properties.name;
            const total = VÅTMARK_DATA[name] || 0;
            const expl = explData[name] || 0;
            let value;
            if (metric === 'expl_ha') value = expl;
            else if (metric === 'våtmark_ha') value = total;
            else value = total > 0 ? +((expl / total) * 100).toFixed(2) : 0;

            return {
                fillColor: getColor(value, max, isExpl),
                weight: 1,
                color: '#fff',
                fillOpacity: 0.85
            };
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties.name;
            const total = VÅTMARK_DATA[name] || 0;
            const expl = explData[name] || 0;
            const pct = total > 0 ? +((expl / total) * 100).toFixed(2) : 0;

            layer.bindTooltip(`
                <b>${name}</b><br>
                Total våtmark: ${total.toLocaleString('sv-SE')} ha<br>
                Exploaterad våtmark: ${expl.toLocaleString('sv-SE')} ha<br>
                Andel exploaterad: ${pct} %
            `, {
                sticky: true,
                direction: 'right',
                offset: [10, 0]
            });

            layer.on('mousemove', function(e) {
                const mapWidth = document.getElementById('map').offsetWidth;
                const x = e.containerPoint.x;
                const direction = x < mapWidth * 0.45 ? 'right' : 'left';
                layer.getTooltip().options.direction = direction;
            });
        }
    }).addTo(map);

    updateLegend(max, isExpl, metric);
    updateInfo();
}

function updateLegend(max, isExpl, metric) {
    const scale = isExpl ? ORANGE_SCALE : GREEN_SCALE;
    const labels = {
        'våtmark_ha': 'Total våtmark (ha)',
        'expl_ha':    'Exploaterad (ha)',
        'expl_pct':   'Andel exploaterad'
    };

    const isPct = metric === 'expl_pct';
    const maxLabel = isPct ? `${max} %` : max.toLocaleString('sv-SE');
    const minLabel = isPct ? '0 %' : '0';

    const existing = document.getElementById('map-legend');
    if (existing) existing.remove();

    const legend = document.createElement('div');
    legend.id = 'map-legend';
    legend.innerHTML = `
        <strong>${labels[metric]}</strong>
        <div class="legend-content">
            <div class="legend-gradient" style="background: linear-gradient(to top, ${scale.join(', ')})"></div>
            <div class="legend-labels">
                <span>${maxLabel}</span>
                <span>${minLabel}</span>
            </div>
        </div>
    `;

    document.getElementById('map').appendChild(legend);
}

function updateInfo() {
    const totalExpl = Object.values(explData).reduce((a, b) => a + b, 0);
    const totalVåtmark = Object.values(VÅTMARK_DATA).reduce((a, b) => a + b, 0);
    document.getElementById('info').textContent =
        `Total våtmark: ${totalVåtmark.toLocaleString('sv-SE')} ha  ·  ` +
        `Total exploaterad: ${totalExpl.toLocaleString('sv-SE')} ha  ·  ` +
        `Källa: NMD2018 + SCB MI1303 2024`;
}

async function loadGeoJSON() {
    const r = await fetch(GEOJSON_URL);
    geojsonData = await r.json();
}

async function fetchExplData() {
    const r = await fetch(SCB_EXPL_URL);
    const json = await r.json();
    const regionIndex = json.dimension.Region.category.index;
    const values = json.value;
    const positions = Object.values(regionIndex).sort((a, b) => a - b);
    const offset = positions[0];
    const result = {};
    Object.entries(regionIndex).forEach(([code, pos]) => {
        const name = REGION_CODE_MAP[code];
        if (name) result[name] = parseInt(values[pos - offset]) || 0;
    });
    return result;
}

async function init() {
    map = L.map('map', {
        center: [63, 17.3],
        zoom: 5,
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '© CARTO © OpenStreetMap contributors'
    }).addTo(map);

    await loadGeoJSON();
    explData = await fetchExplData();
    drawMap(document.getElementById('metricSel').value);
}

document.getElementById('metricSel').addEventListener('change', () =>
    drawMap(document.getElementById('metricSel').value));

init();