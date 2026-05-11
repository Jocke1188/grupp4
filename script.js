const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const data = {
  labels: labels,
  datasets: [{
    label: 'Monthly value',
    data: [55, 70, 45, 80, 65, 90, 75, 85, 60, 72, 50, 68],
    backgroundColor: '#44a541',
    borderRadius: 4
  }]
};

const config = {
  type: 'bar',
  data: data,
  options: {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }
};

const canvasElement = document.getElementById('myChart');
const myChart = new Chart(canvasElement, config);