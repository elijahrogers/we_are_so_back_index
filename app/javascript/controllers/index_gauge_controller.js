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
    this.updateCenterLabel()
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
    this._appendCenterLabel(svg, dims)

    this.updateNeedle()
    this.updateCenterLabel()
  }

  updateNeedle() {
    const svg = this.svgTarget
    if (!svg) return
    const deg = this._computeAngleDegForValue(this.valueValue)
    const needleGroup = svg.querySelector('#needle')
    if (needleGroup) needleGroup.setAttribute('transform', `rotate(${deg} 100 100)`)
  }

  updateCenterLabel() {
    const svg = this.svgTarget
    if (!svg) return
    const label = svg.querySelector('#center-label')
    if (label) label.textContent = `${Math.round(this.valueValue ?? this.minValue)}`
  }

  _computeDimensions() {
    return { width: 200, height: 120, cx: 100, cy: 100, rOuter: 90, rInner: 62 }
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

      const d = this._donutSlicePathByDims(dims, a1, a2)
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

    const imgSize = dims.rOuter * 2
    const img = this._el('image', {
      href: imageUrl,
      x: dims.cx - dims.rOuter,
      y: dims.cy - dims.rOuter,
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
    const needleLen = dims.rOuter * 0.92
    const needleGroup = this._el('g', { id: 'needle', style: 'transition: transform .25s ease-out' })
    const needle = this._el('line', {
      x1: dims.cx, y1: dims.cy,
      x2: dims.cx + needleLen, y2: dims.cy,
      stroke: '#111827',
      'stroke-width': 3
    })
    needleGroup.appendChild(needle)
    const hub = this._el('circle', { cx: dims.cx, cy: dims.cy, r: 6, fill: '#111827' })
    needleGroup.appendChild(hub)
    svg.appendChild(needleGroup)
  }

  _appendCenterLabel(svg, dims) {
    const label = this._el('text', {
      id: 'center-label',
      x: dims.cx,
      y: dims.cy - (dims.rOuter - dims.rInner) * 0.35,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: '#111827'
    })
    label.style.font = '600 16px ui-sans-serif, system-ui, -apple-system'
    svg.appendChild(label)
  }

  _computeAngleDegForValue(rawVal) {
    const min = this.minValue
    const max = this.maxValue
    const clamped = Math.max(min, Math.min(max, rawVal ?? min))
    const ratio = (clamped - min) / (max - min)
    const rad = this.startAngleValue + ratio * (this.endAngleValue - this.startAngleValue)
    return rad * 180 / Math.PI
  }

  _donutSlicePathByDims(dims, a1, a2) {
    const [cx, cy, rOuter, rInner] = [dims.cx, dims.cy, dims.rOuter, dims.rInner]
    const [x1, y1] = [cx + rOuter * Math.cos(a1), cy + rOuter * Math.sin(a1)]
    const [x2, y2] = [cx + rOuter * Math.cos(a2), cy + rOuter * Math.sin(a2)]
    const [x3, y3] = [cx + rInner * Math.cos(a2), cy + rInner * Math.sin(a2)]
    const [x4, y4] = [cx + rInner * Math.cos(a1), cy + rInner * Math.sin(a1)]
    const largeArc = (Math.abs(a2 - a1) > Math.PI) ? 1 : 0
    return [
      `M ${x1} ${y1}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ')
  }

  _el(name, attrs = {}) {
    const el = document.createElementNS(NS, name)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    return el
  }
}



