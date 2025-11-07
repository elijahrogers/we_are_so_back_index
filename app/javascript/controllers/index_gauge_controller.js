import { Controller } from "@hotwired/stimulus"

const NS = 'http://www.w3.org/2000/svg'

export default class extends Controller {
  static targets = ['svg']
  static values = {
    value: Number,
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    segments: Array, // [{ label, weight, color, image }]
    startAngle: { type: Number, default: -Math.PI },
    endAngle: { type: Number, default: 0 }
  }

  connect() {
    this.render()
  }

  valueValueChanged() {
    this.updateNeedle()
  }

  render() {
    const dims = this._computeDimensions()
    const segments = this._resolveSegments()
    const svg = this.svgTarget

    this._setupSvg(svg, dims)

    const defs = this._appendDefs(svg)
    const slicesGroup = this._appendSlicesGroup(svg)

    this._renderSlices(defs, slicesGroup, dims, segments)
    this._appendNeedle(svg, dims)

    this.updateNeedle()
  }

  updateNeedle() {
    const svg = this.svgTarget
    if (!svg) return
    const deg = this._computeAngleDegForValue(this.valueValue)
    const dims = this._computeDimensions()
    const needleGroup = svg.querySelector('#needle')
    if (needleGroup) needleGroup.setAttribute('transform', `rotate(${deg} ${dims.centerX} ${dims.centerY})`)
  }

  _computeDimensions() {
    const outerRadius = 300

    return {
      width: 1200,
      height: 720,
      centerX: 600,
      centerY: 600,
      outerRadius: 300,
      innerRadius: 62,
      needleLength: outerRadius * 0.92
    }
  }

  _resolveSegments() {
    if (this.segmentsValue?.length) return this.segmentsValue
    return [
      { label: 'Low',  weight: 30, color: '#22c55e' },
      { label: 'Med',  weight: 40, color: '#f59e0b' },
      { label: 'High', weight: 30, color: '#ef4444' }
    ]
  }

  _setupSvg(svg, dims) {
    svg.setAttribute('viewBox', `0 0 ${dims.width} ${dims.height}`)
    svg.innerHTML = ''
  }

  _appendDefs(svg) {
    const defs = this._el('defs')
    svg.appendChild(defs)
    return defs
  }

  _appendSlicesGroup(svg) {
    const g = this._el('g', { 'stroke-linecap': 'round' })
    svg.appendChild(g)
    return g
  }

  _renderSlices(defs, group, dims, segments) {
    const start = this.startAngleValue
    const end = this.endAngleValue
    const circumference = end - start
    const totalWeight = segments.reduce((sum, seg) => sum + (seg.weight ?? 1), 0)

    let current = start
    segments.forEach((seg, index) => {
      const delta = circumference * ((seg.weight ?? 1) / totalWeight)
      const a1 = current
      const a2 = current + delta
      current = a2

      const d = this._pieSlicePathByDims(dims, a1, a2)
      const base = this._el('path', {
        d,
        fill: seg.color || '#e5e7eb',
        stroke: 'white',
        'stroke-width': 2
      })
      group.appendChild(base)

      if (seg.image) this._overlayImageInSlice(defs, group, dims, d, seg.image, index)
    })
  }

  _overlayImageInSlice(defs, group, dims, pathD, imageUrl, index) {
    const clipId = `clip-${index}-${Math.random().toString(36).slice(2)}`
    const clip = this._el('clipPath', { id: clipId })
    clip.appendChild(this._el('path', { d: pathD }))
    defs.appendChild(clip)

    const imgSize = dims.outerRadius * 2
    const img = this._el('image', {
      href: imageUrl,
      x: dims.centerX - dims.outerRadius,
      y: dims.centerY - dims.outerRadius,
      width: imgSize,
      height: imgSize,
      preserveAspectRatio: 'xMidYMid slice',
      'clip-path': `url(#${clipId})`
    })
    group.appendChild(img)

    const edge = this._el('path', {
      d: pathD,
      fill: 'none',
      stroke: 'white',
      'stroke-width': 1.5
    })
    group.appendChild(edge)
  }

  _appendNeedle(svg, dims) {
    const needleLen = dims.outerRadius * 0.92
    const needleGroup = this._el('g', { id: 'needle', style: 'transition: transform .25s ease-out' })
    const needle = this._el('line', {
      x1: dims.centerX, y1: dims.centerY,
      x2: dims.centerX + needleLen, y2: dims.centerY,
      stroke: '#111827',
      'stroke-width': 3
    })
    needleGroup.appendChild(needle)
    const hub = this._el('circle', { cx: dims.centerX, cy: dims.centerY, r: 6, fill: '#111827' })
    needleGroup.appendChild(hub)
    svg.appendChild(needleGroup)
  }

  _computeAngleDegForValue(rawVal) {
    const min = this.minValue
    const max = this.maxValue
    const clamped = Math.max(min, Math.min(max, rawVal ?? min))
    const ratio = (clamped - min) / (max - min)
    const rad = this.startAngleValue + ratio * (this.endAngleValue - this.startAngleValue)
    return rad * 180 / Math.PI
  }

  _pieSlicePathByDims(dims, a1, a2) {
    const [centerX, centerY, outerRadius] = [dims.centerX, dims.centerY, dims.outerRadius]
    const [x1, y1] = [centerX + outerRadius * Math.cos(a1), centerY + outerRadius * Math.sin(a1)]
    const [x2, y2] = [centerX + outerRadius * Math.cos(a2), centerY + outerRadius * Math.sin(a2)]
    const largeArc = (Math.abs(a2 - a1) > Math.PI) ? 1 : 0
    return [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ')
  }

  _el(name, attrs = {}) {
    const el = document.createElementNS(NS, name)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    return el
  }
}



