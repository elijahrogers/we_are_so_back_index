import { Controller } from "@hotwired/stimulus"
import createREGL from "regl"

// Renders pie-slice images warped via a fragment shader (polar → UV).
// Keeps a simple SVG needle overlay for readability and easy rotation.

export default class extends Controller {
  static targets = ["canvas", "svg"]
  static values = {
    value: Number,
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    segments: Array, // [{ label, weight, color, image, imageScale, imageOffsetX, imageOffsetY, imageRotate }]
    startAngle: { type: Number, default: -Math.PI },
    endAngle: { type: Number, default: 0 },
    innerRatio: { type: Number, default: 0.68 }, // 0..1 of outerRadius
    labelOffset: { type: Number, default: 16 }
  }

  connect() {
    this._handleResize = () => {
      this._setupAndDraw()
    }
    window.addEventListener('resize', this._handleResize, { passive: true })
    this._setupAndDraw()
  }

  disconnect() {
    window.removeEventListener('resize', this._handleResize)
    this._destroyRegl()
  }

  valueValueChanged() {
    this._updateNeedle()
  }

  // --- Setup & draw ---
  _setupAndDraw() {
    const dims = this._computeDimensions()
    this._sizeCanvas(dims)

    if (!this.regl) this.regl = createREGL({
      canvas: this.canvasTarget,
      attributes: { alpha: true, antialias: true, preserveDrawingBuffer: false }
    })

    this._buildSegmentsGeometry(dims)
    this._compileDrawCommand()
    this._drawAll(dims)
    this._renderLabels(dims)
    this._ensureNeedle(dims)
    this._updateNeedle()
  }

  _computeDimensions() {
    const rect = this.element.getBoundingClientRect()
    const width = Math.max(200, rect.width || 600)
    const height = Math.max(120, Math.round(width * 0.6))
    const centerX = Math.round(width / 2)
    const centerY = height // center at bottom for a half-circle default
    const outerRadius = Math.floor(Math.min(width / 2, height) * 0.92)
    const ratio = Math.max(0, Math.min(0.95, this.innerRatioValue ?? 0.68))
    const innerRadius = Math.floor(outerRadius * ratio)
    const needleLength = Math.round(outerRadius * 0.92)
    return { width, height, centerX, centerY, outerRadius, innerRadius, needleLength }
  }

  _sizeCanvas(dims) {
    const dpr = window.devicePixelRatio || 1
    const c = this.canvasTarget
    c.style.width = '100%'
    c.style.height = `${dims.height}px`
    const w = Math.round(dims.width * dpr)
    const h = Math.round(dims.height * dpr)
    if (c.width !== w) c.width = w
    if (c.height !== h) c.height = h
  }

  _buildSegmentsGeometry(dims) {
    const segments = this._resolveSegments()
    const circumference = this.endAngleValue - this.startAngleValue
    const totalWeight = segments.reduce((s, seg) => s + (seg.weight ?? 1), 0)

    let current = this.startAngleValue
    const slices = []
    segments.forEach((seg, index) => {
      const delta = circumference * ((seg.weight ?? 1) / totalWeight)
      const a1 = current
      const a2 = current + delta
      current = a2

      const positions = this._makeTriangleFan(dims.centerX, dims.centerY, dims.outerRadius, a1, a2, 96)

      slices.push({
        index,
        a1,
        a2,
        positions,
        label: seg.label || "",
        color: this._parseColor(seg.color || '#e5e7eb'),
        imageUrl: seg.image,
        imageScale: seg.imageScale ?? 1,
        imageOffset: [ (seg.imageOffsetX ?? 0) / (dims.outerRadius * 2), (seg.imageOffsetY ?? 0) / (dims.outerRadius * 2) ],
        imageRotate: ((seg.imageRotate ?? 0) * Math.PI) / 180
      })
    })

    this._slices = slices
    this._loadTextures()
  }

  _makeTriangleFan(cx, cy, r, a1, a2, steps) {
    const verts = []
    verts.push([cx, cy])
    const da = (a2 - a1) / steps
    for (let i = 0; i <= steps; i++) {
      const a = a1 + i * da
      verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
    return verts
  }

  _loadTextures() {
    if (!this.regl) return
    this._textures = this._textures || []
    this._slices.forEach(slice => {
      if (!slice.imageUrl) return
      const img = new Image()
      img.onload = () => {
        const tex = this.regl.texture({ data: img })
        this._textures[slice.index] = tex
        this._drawAll(this._computeDimensions())
      }
      img.src = slice.imageUrl
    })
  }

  _compileDrawCommand() {
    if (this._drawWedge) return
    const regl = this.regl
    this._drawWedge = regl({
      attributes: { position: regl.prop('positions') },
      count: regl.prop('count'),
      primitive: 'triangle fan',
      uniforms: {
        resolution: (_, props) => props.resolution,
        center:     (_, props) => props.center,
        startAngle: (_, props) => props.a1,
        endAngle:   (_, props) => props.a2,
        outerRadius:(_, props) => props.outerRadius,
        innerRadius:(_, props) => props.innerRadius,
        hasTexture: (_, props) => props.hasTexture,
        baseColor:  (_, props) => props.baseColor,
        tex:        regl.prop('texture'),
        imageScale: (_, props) => props.imageScale,
        imageOffset:(_, props) => props.imageOffset,
        imageRotation:(_, props) => props.imageRotation
      },
      vert: `
        precision mediump float;
        attribute vec2 position;
        uniform vec2 resolution;
        varying vec2 v_pos;
        void main() {
          vec2 clip = (position / resolution) * 2.0 - 1.0;
          gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
          v_pos = position;
        }
      `,
      frag: `
        precision mediump float;
        varying vec2 v_pos;
        uniform vec2 center;
        uniform float startAngle, endAngle, outerRadius, innerRadius;
        uniform sampler2D tex;
        uniform float hasTexture;
        uniform vec4 baseColor;
        uniform float imageScale;
        uniform vec2 imageOffset;
        uniform float imageRotation;

        void main() {
          vec2 p = v_pos - center;
          float r = length(p);
          if (r < innerRadius - 0.5 || r > outerRadius + 0.5) discard;
          float theta = atan(p.y, p.x);
          float t = clamp((theta - startAngle) / (endAngle - startAngle), 0.0, 1.0);
          float band = max(outerRadius - innerRadius, 1.0);
          float v = clamp(1.0 - (r - innerRadius) / band, 0.0, 1.0);
          vec2 uv = vec2(t, v);

          // transform around center (0.5, 0.5)
          float c = cos(imageRotation), s = sin(imageRotation);
          mat2 rot = mat2(c, -s, s, c);
          vec2 centered = (uv - 0.5) * imageScale;
          centered = rot * centered;
          uv = centered + 0.5 + imageOffset;

          vec4 texColor = texture2D(tex, uv);
          vec4 color = mix(baseColor, texColor, step(0.5, hasTexture));
          gl_FragColor = color;
        }
      `
    })
  }

  _drawAll(dims) {
    if (!this.regl) return
    const dpr = window.devicePixelRatio || 1
    const resolution = [dims.width * dpr, dims.height * dpr]
    this.regl.poll()
    this.regl.clear({ color: [0, 0, 0, 0], depth: 1 })

    for (const slice of this._slices) {
      const positions = slice.positions.map(([x, y]) => [x * dpr, y * dpr])
      this._drawWedge({
        positions,
        count: positions.length,
        resolution,
        center: [dims.centerX * dpr, dims.centerY * dpr],
        a1: slice.a1,
        a2: slice.a2,
        outerRadius: dims.outerRadius * dpr,
        innerRadius: dims.innerRadius * dpr,
        hasTexture: this._textures?.[slice.index] ? 1 : 0,
        baseColor: slice.color,
        texture: this._textures?.[slice.index] || this.regl.texture({ data: new Uint8Array([255,255,255,0]), width: 1, height: 1 }),
        imageScale: slice.imageScale,
        imageOffset: slice.imageOffset,
        imageRotation: slice.imageRotate
      })
    }
  }

  // --- Needle overlay (SVG) ---
  _renderLabels(dims) {
    const svg = this.svgTarget
    if (!svg) return
    const existing = svg.querySelector('#labels')
    if (existing) existing.remove()
    const r = Math.max(4, Math.min(dims.outerRadius + (this.labelOffsetValue ?? 16), dims.centerY - 2))

    const makeArc = (a1, a2) => {
      const p1 = [dims.centerX + r * Math.cos(a1), dims.centerY + r * Math.sin(a1)]
      const p2 = [dims.centerX + r * Math.cos(a2), dims.centerY + r * Math.sin(a2)]
      const largeArc = Math.abs(a2 - a1) > Math.PI ? 1 : 0
      return `M ${p1[0]} ${p1[1]} A ${r} ${r} 0 ${largeArc} 1 ${p2[0]} ${p2[1]}`
    }

    const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    labelsGroup.setAttribute('id', 'labels')
    svg.appendChild(labelsGroup)

    this._slices?.forEach((slice, idx) => {
      const id = `label-path-${idx}-${Math.random().toString(36).slice(2)}`
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('id', id)
      path.setAttribute('d', makeArc(slice.a1, slice.a2))
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', 'none')
      labelsGroup.appendChild(path)

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('fill', '#000000')
      text.setAttribute('stroke', '#ffffff')
      text.setAttribute('stroke-width', '2')
      text.setAttribute('font-weight', '600')
      text.setAttribute('font-size', '14')
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('paint-order', 'stroke fill')
      text.setAttribute('vector-effect', 'non-scaling-stroke')
      text.setAttribute('style', 'pointer-events: none')

      const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath')
      textPath.setAttribute('href', `#${id}`)
      textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${id}`)
      textPath.setAttribute('startOffset', '50%')
      textPath.textContent = `${slice.label ?? ''}`
      text.appendChild(textPath)
      labelsGroup.appendChild(text)
    })
  }

  _ensureNeedle(dims) {
    const svg = this.svgTarget
    svg.setAttribute('viewBox', `0 0 ${dims.width} ${dims.height}`)
    const existing = svg.querySelector('#needle')
    if (existing) existing.remove()

    const needleLen = dims.needleLength
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('id', 'needle')
    g.setAttribute('style', 'transition: transform .25s ease-out')
    const lineOutline = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    lineOutline.setAttribute('x1', `${dims.centerX}`)
    lineOutline.setAttribute('y1', `${dims.centerY}`)
    lineOutline.setAttribute('x2', `${dims.centerX + needleLen}`)
    lineOutline.setAttribute('y2', `${dims.centerY}`)
    lineOutline.setAttribute('stroke', '#ffffff')
    lineOutline.setAttribute('stroke-width', '6')
    lineOutline.setAttribute('stroke-linecap', 'round')
    lineOutline.setAttribute('vector-effect', 'non-scaling-stroke')
    g.appendChild(lineOutline)

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', `${dims.centerX}`)
    line.setAttribute('y1', `${dims.centerY}`)
    line.setAttribute('x2', `${dims.centerX + needleLen}`)
    line.setAttribute('y2', `${dims.centerY}`)
    line.setAttribute('stroke', '#000000')
    line.setAttribute('stroke-width', '3')
    line.setAttribute('stroke-linecap', 'round')
    line.setAttribute('vector-effect', 'non-scaling-stroke')
    g.appendChild(line)
    const hub = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    hub.setAttribute('cx', `${dims.centerX}`)
    hub.setAttribute('cy', `${dims.centerY}`)
    hub.setAttribute('r', '6')
    hub.setAttribute('fill', '#000000')
    hub.setAttribute('stroke', '#ffffff')
    hub.setAttribute('stroke-width', '2')
    hub.setAttribute('vector-effect', 'non-scaling-stroke')
    g.appendChild(hub)
    svg.appendChild(g)
  }

  _updateNeedle() {
    const svg = this.svgTarget
    if (!svg) return
    const dims = this._computeDimensions()
    const min = this.minValue
    const max = this.maxValue
    const raw = this.valueValue ?? min
    const val = Math.max(min, Math.min(max, raw))
    const ratio = (val - min) / (max - min)
    const angle = this.startAngleValue + ratio * (this.endAngleValue - this.startAngleValue)
    const deg = angle * 180 / Math.PI
    const g = svg.querySelector('#needle')
    if (g) g.setAttribute('transform', `rotate(${deg} ${dims.centerX} ${dims.centerY})`)
  }

  // --- Utils ---
  _resolveSegments() {
    if (this.segmentsValue?.length) return this.segmentsValue
    return [
      { label: 'Low',  weight: 30, color: '#22c55e' },
      { label: 'Med',  weight: 40, color: '#f59e0b' },
      { label: 'High', weight: 30, color: '#ef4444' }
    ]
  }

  _parseColor(hex) {
    // Supports #rgb, #rrggbb
    let h = hex.replace('#', '')
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    const r = parseInt(h.slice(0, 2), 16) / 255
    const g = parseInt(h.slice(2, 4), 16) / 255
    const b = parseInt(h.slice(4, 6), 16) / 255
    return [r, g, b, 1]
  }

  _destroyRegl() {
    try { this.regl?.destroy() } catch (_) {}
    this.regl = null
    this._drawWedge = null
    this._textures = null
    this._slices = null
  }
}
