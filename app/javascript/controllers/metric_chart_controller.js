import { Controller } from "@hotwired/stimulus"
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

export default class extends Controller {
  static targets = ["canvas"]
  static values = {
    labels: Array,
    datasets: Array,
    options: Object
  }

  connect() {
    this.options = this.hasOptionsValue ? { ...this.defaultOptions, ...this.optionsValue } : this.defaultOptions

    this.setColors()
    this.formatLabels()


    this.chart = new Chart(this.canvasContext, { type: 'line', data: this.chartData, options: this.options })
  }

  disconnect() {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }

  setColors() {
    this.datasets = this.datasetsValue.map((ds, i) => {
      const [border, background] = this.palette[i % this.palette.length]
      return {
        pointRadius: 2,
        fill: false,
        borderColor: ds.borderColor || border,
        backgroundColor: ds.backgroundColor || background,
        ...ds
      }
    })
  }

  formatLabels() {
    this.formattedLabels = this.labelsValue.map(label => this.formatDateLabel(label))
    this.options.scales ||= {}
    this.options.scales.x ||= {}
    this.options.scales.x.ticks ||= {}

    const labelCount = this.labelsValue.length
    const maxVisibleLabels = 10
    const step = Math.max(1, Math.floor(labelCount / maxVisibleLabels))

    this.options.scales.x.ticks.callback = (value, index) => {
      if (index % step !== 0) return ""
      return this.formattedLabels[index] ?? ""
    }
  }

  formatDateLabel(label) {
    if (!label) return ""

    const date = new Date(label) // handles "YYYY-MM-DD" nicely
    if (Number.isNaN(date.getTime())) return label

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric"
    }).format(date)
  }

  get chartData() {
    return {
      labels: this.formattedLabels,
      datasets: this.datasets
    }
  }

  get aspectRatio() {
    if (window.innerWidth >= 1024) return 2      // lg+
    if (window.innerWidth >= 768) return 1.75    // md
    if (window.innerWidth >= 640) return 1.5     // sm
    return 1.2                                   // mobile
  }

  get defaultOptions() {
    return {
      responsive: true,
      aspectRatio: this.aspectRatio,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { color: "#cbd5e1", font: { family: "League Mono" } }
        }
      },
      scales: {
        x: { grid: { color: "rgba(255, 255, 255, 0.3)" }, ticks: { color: "#cbd5e1" } },
        y: { grid: { color: "rgba(255, 255, 255, 0.3)" }, ticks: { color: "#cbd5e1" } }
      }
    }
  }

  get palette() {
    return [
      ['rgb(59 130 246)', 'rgb(59 130 246 / 0.2)'],      // blue-500
      ['rgb(16 185 129)', 'rgb(16 185 129 / 0.2)'],      // emerald-500
      ['rgb(245 158 11)', 'rgb(245 158 11 / 0.2)'],      // amber-500
      ['rgb(168 85 247)', 'rgb(168 85 247 / 0.2)'],      // purple-500
      ['rgb(244 63 94)', 'rgb(244 63 94 / 0.2)']         // rose-500
    ]
  }

  get canvasContext() {
    return this.canvasTarget.getContext('2d')
  }
}

