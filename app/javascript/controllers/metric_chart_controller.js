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
    const ctx = this.canvasTarget.getContext('2d')

    const palette = [
      ['rgb(59 130 246)', 'rgb(59 130 246 / 0.2)'],      // blue-500
      ['rgb(16 185 129)', 'rgb(16 185 129 / 0.2)'],      // emerald-500
      ['rgb(245 158 11)', 'rgb(245 158 11 / 0.2)'],      // amber-500
      ['rgb(168 85 247)', 'rgb(168 85 247 / 0.2)'],      // purple-500
      ['rgb(244 63 94)', 'rgb(244 63 94 / 0.2)']         // rose-500
    ]

    const incomingDatasets = this.datasetsValue || []
    const datasets = incomingDatasets.map((ds, i) => {
      const [border, background] = palette[i % palette.length]
      return {
        pointRadius: 2,
        fill: false,
        borderColor: ds.borderColor || border,
        backgroundColor: ds.backgroundColor || background,
        ...ds
      }
    })

    const data = {
      labels: this.labelsValue || [],
      datasets
    }

    const defaultOptions = {
      responsive: true,
      plugins: { legend: { display: true } }
    }

    const options = this.hasOptionsValue ? { ...defaultOptions, ...this.optionsValue } : defaultOptions

    this.chart = new Chart(ctx, { type: 'line', data, options })
  }

  disconnect() {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }
}


