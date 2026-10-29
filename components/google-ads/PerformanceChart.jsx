import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineController,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useEffect } from 'react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineController, LineElement, Tooltip, Legend, Filler)

export default function PerformanceChart({ title, labels, datasets, loading = false, height = 'h-60' }) {
  const defaultColors = {
    spend: { border: '#4285F4', bg: 'rgba(66, 133, 244, 0.08)' },
    clicks: { border: '#4285f4', bg: 'rgba(66, 133, 244, 0.08)' },
    conversions: { border: '#34a853', bg: 'rgba(52, 168, 83, 0.08)' },
  }

  const safeDatasets = datasets && datasets.length > 0 ? datasets : []

  const chartData = {
    labels,
    datasets: safeDatasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.borderColor || defaultColors[ds.key]?.border || '#4285F4',
      backgroundColor: ds.backgroundColor || defaultColors[ds.key]?.bg || 'rgba(66, 133, 244, 0.08)',
      borderWidth: 2,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: ds.borderColor || '#4285F4',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
      tension: 0.4,
      ...ds,
    })),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: safeDatasets.length > 1,
        position: 'top',
        labels: {
          font: { family: 'Inter, Arial, sans-serif', size: 12 },
          color: '#718096',
          usePointStyle: true,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#4285F4',
        titleFont: { family: 'Inter, Arial, sans-serif', size: 12 },
        bodyFont: { family: 'Inter, Arial, sans-serif', size: 13, weight: 'bold' },
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { font: { family: 'Inter, Arial, sans-serif', size: 11 }, color: '#718096' },
      },
      y: {
        grid: { color: '#e6e5e4', drawBorder: false, borderDash: [4, 4] },
        ticks: {
          font: { family: 'Inter, Arial, sans-serif', size: 11 },
          color: '#718096',
          callback: (value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()),
        },
        beginAtZero: true,
      },
    },
    interaction: { intersect: false, mode: 'index' },
  }

  return (
    <div className={`bg-surface-container-lowest border border-surface-variant rounded-xl p-5 shadow-soft ${height}`}>
      {title && (
        <h3 className="font-headline-sm text-headline-sm text-primary mb-4">{title}</h3>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  )
}
