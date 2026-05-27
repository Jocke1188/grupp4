const GEOJSON_URL = "https://raw.githubusercontent.com/okfse/sweden-geojson/refs/heads/master/swedish_regions.geojson";

const SCB_DIREKT_URL = "https://statistikdatabasen.scb.se/api/v2/tables/TAB4312/data" +
    "?lang=sv" +
    "&valueCodes[ContentsCode]=000006WZ" +
    "&valueCodes[Region]=01,03,04,05,06,07,08,09,10,12,13,14,17,18,19,20,21,22,23,24,25" +
    "&valueCodes[Exploateringstyp]=BYGGN,JVAG,VAG" +
    "&valueCodes[Tid]=2024";

const SCB_INDIREKT_URL = "https://statistikdatabasen.scb.se/api/v2/tables/TAB4312/data" +
    "?lang=sv" +
    "&valueCodes[ContentsCode]=000006WX" +
    "&valueCodes[Region]=01,03,04,05,06,07,08,09,10,12,13,14,17,18,19,20,21,22,23,24,25" +
    "&valueCodes[Exploateringstyp]=BYGGN,JVAG,VAG" +
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

let leafletMap = null;
let vatmarkGeoLayer = null;
let vatmarkGeoData = null;
let direktData = null;
let indirektData = null;

const ORANGE_SCALE = ['#FFF3E0','#FFCC80','#FFA726','#EF6C00','#BF360C','#7F1900'];

function getColor(value, max) {
    if (max === 0) return ORANGE_SCALE[0];
    const ratio = value / max;
    const index = Math.min(Math.floor(ratio * ORANGE_SCALE.length), ORANGE_SCALE.length - 1);
    return ORANGE_SCALE[index];
}

function parseExplData(json) {
    const regionIndex = json.dimension.Region.category.index;
    const explIndex = json.dimension.Exploateringstyp.category.index;
    const values = json.value;

    const numExpl = Object.keys(explIndex).length;
    const positions = Object.values(regionIndex).sort((a, b) => a - b);
    const offset = positions[0];

    const result = {};
    Object.entries(regionIndex).forEach(([code, regionPos]) => {
        const name = REGION_CODE_MAP[code];
        if (!name) return;
        let total = 0;
        Object.values(explIndex).forEach(explPos => {
            const idx = (regionPos - offset) * numExpl + explPos;
            total += parseInt(values[idx]) || 0;
        });
        result[name] = total;
    });
    return result;
}

function getActiveExplData() {
    const typ = document.getElementById('explTypeSel').value;
    if (typ === 'direkt') return direktData;
    const result = {};
    Object.keys(indirektData).forEach(name => {
        result[name] = (indirektData[name] || 0) - (direktData[name] || 0);
    });
    return result;
}

function drawMap() {
    const typ = document.getElementById('explTypeSel').value;
    const expl = getActiveExplData();

    const vals = Object.keys(VÅTMARK_DATA).map(r => {
        const total = VÅTMARK_DATA[r];
        const explVal = expl[r] || 0;
        return total > 0 ? +((explVal / total) * 100).toFixed(2) : 0;
    });

    const max = Math.max(...vals);

    if (vatmarkGeoLayer) vatmarkGeoLayer.remove();

    vatmarkGeoLayer = L.geoJSON(vatmarkGeoData, {
        style: feature => {
            const name = feature.properties.name;
            const total = VÅTMARK_DATA[name] || 0;
            const explVal = expl[name] || 0;
            const value = total > 0 ? +((explVal / total) * 100).toFixed(2) : 0;

            return {
                fillColor: getColor(value, max),
                weight: 1,
                color: '#fff',
                fillOpacity: 0.85
            };
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties.name;
            const total = VÅTMARK_DATA[name] || 0;
            const explVal = expl[name] || 0;
            const pct = total > 0 ? +((explVal / total) * 100).toFixed(2) : 0;
            const typLabel = typ === 'direkt' ? 'Direkt exploaterad' : 'Indirekt exploaterad';

            layer.bindTooltip(`
                <b>${name}</b><br>
                Total våtmark: ${total.toLocaleString('sv-SE')} ha<br>
                ${typLabel}: ${explVal.toLocaleString('sv-SE')} ha<br>
                Andel: ${pct} %
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
    }).addTo(leafletMap);

    updateLegend(max, typ);
    updateInfo(expl);
}

function updateLegend(max, typ) {
    const title = typ === 'direkt' ? 'Direkt exploaterad (%)' : 'Indirekt exploaterad (%)';

    const existing = document.getElementById('map-legend');
    if (existing) existing.remove();

    const legend = document.createElement('div');
    legend.id = 'map-legend';
    legend.innerHTML = `
        <strong>${title}</strong>
        <div class="legend-content">
            <div class="legend-gradient" style="background: linear-gradient(to top, ${ORANGE_SCALE.join(', ')})"></div>
            <div class="legend-labels">
                <span>${max} %</span>
                <span>0 %</span>
            </div>
        </div>
    `;

    document.getElementById('map').appendChild(legend);
}

function updateInfo(expl) {
    const totalExpl = Object.values(expl).reduce((a, b) => a + b, 0);
    const totalVåtmark = Object.values(VÅTMARK_DATA).reduce((a, b) => a + b, 0);
    document.getElementById('info').textContent =
        `Total våtmark: ${totalVåtmark.toLocaleString('sv-SE')} ha  ·  ` +
        `Total exploaterad: ${totalExpl.toLocaleString('sv-SE')} ha  ·  ` +
        `Källa: NMD2018 + SCB MI1303 2024`;
}

async function loadGeoJSON() {
    const r = await fetch(GEOJSON_URL);
    vatmarkGeoData = await r.json();
}

async function fetchAllData() {
    const [r1, r2] = await Promise.all([
        fetch(SCB_DIREKT_URL),
        fetch(SCB_INDIREKT_URL)
    ]);
    const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
    direktData = parseExplData(j1);
    indirektData = parseExplData(j2);
}

async function init() {
    leafletMap = L.map('map', {
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
    }).addTo(leafletMap);

    await loadGeoJSON();
    await fetchAllData();
    drawMap();
}

document.getElementById('explTypeSel').addEventListener('change', drawMap);

init();