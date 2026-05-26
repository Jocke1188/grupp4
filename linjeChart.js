const SCB_LINE_DIREKT = "https://statistikdatabasen.scb.se/api/v2/tables/TAB4312/data" +
    "?lang=sv" +
    "&valueCodes[ContentsCode]=000006WZ" +
    "&valueCodes[Region]=01,03,04,05,06,07,08,09,10,12,13,14,17,18,19,20,21,22,23,24,25" +
    "&valueCodes[Exploateringstyp]=TOT" +
    "&valueCodes[Tid]=2020,2021,2022,2023,2024";

const SCB_LINE_INDIREKT = "https://statistikdatabasen.scb.se/api/v2/tables/TAB4312/data" +
    "?lang=sv" +
    "&valueCodes[ContentsCode]=000006WX" +
    "&valueCodes[Region]=01,03,04,05,06,07,08,09,10,12,13,14,17,18,19,20,21,22,23,24,25" +
    "&valueCodes[Exploateringstyp]=TOT" +
    "&valueCodes[Tid]=2020,2021,2022,2023,2024";

function parseTotalLine(json) {
    const regionIndex = json.dimension.Region.category.index;
    const tidIndex = json.dimension.Tid.category.index;
    const lineValues = json.value;

    const lineYears = Object.keys(tidIndex).sort();
    const numYears = lineYears.length;
    const positions = Object.values(regionIndex).sort((a, b) => a - b);
    const lineOffset = positions[0];

    return lineYears.map((year, yearPos) => {
        return Object.values(regionIndex).reduce((sum, regionPos) => {
            const idx = (regionPos - lineOffset) * numYears + yearPos;
            return sum + (parseInt(lineValues[idx]) || 0);
        }, 0);
    });
}

async function fetchLineData() {
    const [r1, r2] = await Promise.all([
        fetch(SCB_LINE_DIREKT),
        fetch(SCB_LINE_INDIREKT)
    ]);

    const [j1, j2] = await Promise.all([r1.json(), r2.json()]);

    const lineYears = Object.keys(j1.dimension.Tid.category.index).sort();
    const direktTotal = parseTotalLine(j1);
    const indirektTotal = parseTotalLine(j2);
    const indirektEndast = indirektTotal.map((v, i) => v - direktTotal[i]);

    return {
        years: lineYears,
        datasets: [
            {
                label: 'Direkt exploatering (ha)',
                data: direktTotal,
                backgroundColor: 'rgba(191,54,12,0.8)',
                borderColor: '#BF360C',
                borderWidth: 1
            },
            {
                label: 'Indirekt exploatering (ha)',
                data: indirektEndast,
                backgroundColor: 'rgba(8,80,65,0.8)',
                borderColor: '#085041',
                borderWidth: 1
            }
        ]
    };
}

async function initLineChart() {
    const { years, datasets } = await fetchLineData();

    const ctx = document.getElementById('lineChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 12 },
                        boxWidth: 14
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        footer: (items) => {
                            const total = items.reduce((sum, i) => sum + i.parsed.y, 0);
                            return `Totalt: ${total.toLocaleString('sv-SE')} ha`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'År'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hektar (ha)'
                    }
                }
            }
        }
    });
}

initLineChart();