const urlSCB =

  "https://api.scb.se/OV0104/v1/doris/sv/ssd/START/MI/MI1303/MI1303B/ExplVatmark";

// query
const querySCB = {

  query: [
    {
      code: "Region",
      selection: {
        filter: "vs:RegionLän07EjAggr",
        values: [
          "01",
          "03",
          "04",
          "05",
          "06",
          "07",
          "08",
          "09",
          "10",
          "12",
          "13",
          "14",
          "17",
          "18",
          "19",
          "20",
          "21",
          "22",
          "23",
          "24",
          "25"
        ]
      }
    },
    {
      code: "Exploateringstyp",
      selection: {
        filter: "item",
        values: [
          "BYGGN",
          "JVAG",
          "VAG"
        ]
      }
    },
    {
      code: "ContentsCode",
      selection: {
        filter: "item",
        values: [
          "000006WZ"
        ]
      }
    }
  ],
  response: {
    format: "json"
  }
};

// region mapping
const regionMap = {
  "01": "Stockholm",
  "03": "Uppsala",
  "04": "Södermanland",
  "05": "Östergötland",
  "06": "Jönköping",
  "07": "Kronoberg",
  "08": "Kalmar",
  "09": "Gotland",
  "10": "Blekinge",
  "12": "Skåne",
  "13": "Halland",
  "14": "Västra Götaland",
  "17": "Värmland",
  "18": "Örebro",
  "19": "Västmanland",
  "20": "Dalarna",
  "21": "Gävleborg",
  "22": "Västernorrland",
  "23": "Jämtland",
  "24": "Västerbotten",
  "25": "Norrbotten"
};

// fetch
const request = new Request(urlSCB, {
  method: "POST",
  body: JSON.stringify(querySCB)
});

fetch(request)
.then(response => response.json())
.then(dataSCB => {
  printSCBChart(dataSCB);
})
.catch(error => {
  console.error(error);
});

function printSCBChart(dataSCB) {
  console.log(dataSCB);
  const rows = dataSCB.data;
  if (!rows) {
    console.error("Ingen data");
    return;
  }

  // regioner
  const regions = [
    ...new Set(
      rows.map(row => row.key[0])
    )
  ];

  // exploateringstyper
  const types = [
    ...new Set(
      rows.map(row => row.key[1])
    )
  ];

  // datasets
  const datasets = types.map(type => {
    const data = regions.map(region => {
      const match = rows.find(row =>
        row.key[0] === region &&
        row.key[1] === type
      );

      return match
        ? Number(match.values[0])
        : 0;
    });

    return {
      label: type,
      data,
      borderWidth: 2
    };
  });

  new Chart(
    document.getElementById("myChart"),
    {
      type: "bar",
      data: {
        labels: regions.map(region =>
          regionMap[region]
        ),
        datasets
      }
    }
  );
}