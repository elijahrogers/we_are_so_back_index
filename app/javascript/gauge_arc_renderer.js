import createREGL from "regl"

const VERTEX_SHADER = `
  precision mediump float;
  attribute vec2 position;
  uniform vec2 resolution;
  varying vec2 v_pos;
  void main() {
    vec2 clip = (position / resolution) * 2.0 - 1.0;
    gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
    v_pos = position;
  }
`

const FRAGMENT_SHADER = `
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

// Renders arc segments using WebGL via regl
export default class GaugeArcRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.regl = null
    this.drawWedge = null
    this.textures = []
    this.slices = []
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  init() {
    if (this.regl) return
    this.regl = createREGL({
      canvas: this.canvas,
      attributes: { alpha: true, antialias: true, preserveDrawingBuffer: false }
    })
    this.compileDrawCommand()
  }

  destroy() {
    try { this.regl?.destroy() } catch (_) {}
    this.regl = null
    this.drawWedge = null
    this.textures = []
    this.slices = []
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLICE BUILDING
  // ═══════════════════════════════════════════════════════════════════════════

  buildSlices(segments, dims, startAngle, endAngle, onTextureLoaded) {
    const angleSpan = endAngle - startAngle
    const totalWeight = this.totalSegmentWeight(segments)
    this.slices = this.createSlicesFromSegments(segments, dims, startAngle, angleSpan, totalWeight)
    this.loadTextures(onTextureLoaded)
    return this.slices
  }

  totalSegmentWeight(segments) {
    return segments.reduce((sum, seg) => sum + (seg.weight ?? 1), 0)
  }

  createSlicesFromSegments(segments, dims, startAngle, angleSpan, totalWeight) {
    let currentAngle = startAngle
    return segments.map((seg, index) => {
      const slice = this.createSlice(seg, index, dims, currentAngle, angleSpan, totalWeight)
      currentAngle = slice.a2
      return slice
    })
  }

  createSlice(seg, index, dims, startAngle, angleSpan, totalWeight) {
    const weight = seg.weight ?? 1
    const delta = angleSpan * (weight / totalWeight)
    const a1 = startAngle
    const a2 = startAngle + delta

    return {
      index,
      a1,
      a2,
      positions: this.makeTriangleFan(dims.centerX, dims.centerY, dims.outerRadius, a1, a2, 96),
      label: seg.label || "",
      color: this.hexToFloatArray(seg.color || '#ffffff'),
      imageUrl: seg.image,
      imageScale: seg.imageScale ?? 1,
      imageOffset: this.computeImageOffset(seg, dims),
      imageRotate: this.degreesToRadians(seg.imageRotate ?? 0)
    }
  }

  computeImageOffset(seg, dims) {
    const diameter = dims.outerRadius * 2
    return [
      (seg.imageOffsetX ?? 0) / diameter,
      (seg.imageOffsetY ?? 0) / diameter
    ]
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GEOMETRY
  // ═══════════════════════════════════════════════════════════════════════════

  makeTriangleFan(cx, cy, r, a1, a2, steps) {
    const verts = [[cx, cy]]
    const deltaAngle = (a2 - a1) / steps
    for (let i = 0; i <= steps; i++) {
      const angle = a1 + i * deltaAngle
      verts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
    }
    return verts
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXTURE LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  loadTextures(onTextureLoaded) {
    if (!this.regl) return
    this.slices.forEach(slice => this.loadTextureForSlice(slice, onTextureLoaded))
  }

  loadTextureForSlice(slice, onTextureLoaded) {
    if (!slice.imageUrl) return
    const img = new Image()
    img.onload = () => {
      this.textures[slice.index] = this.regl.texture({ data: img })
      onTextureLoaded?.()
    }
    img.src = slice.imageUrl
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBGL SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  compileDrawCommand() {
    if (this.drawWedge) return
    this.drawWedge = this.regl({
      attributes: { position: this.regl.prop('positions') },
      count: this.regl.prop('count'),
      primitive: 'triangle fan',
      uniforms: this.buildUniforms(),
      vert: VERTEX_SHADER,
      frag: FRAGMENT_SHADER
    })
  }

  buildUniforms() {
    return {
      resolution:    (_, props) => props.resolution,
      center:        (_, props) => props.center,
      startAngle:    (_, props) => props.a1,
      endAngle:      (_, props) => props.a2,
      outerRadius:   (_, props) => props.outerRadius,
      innerRadius:   (_, props) => props.innerRadius,
      hasTexture:    (_, props) => props.hasTexture,
      baseColor:     (_, props) => props.baseColor,
      tex:           this.regl.prop('texture'),
      imageScale:    (_, props) => props.imageScale,
      imageOffset:   (_, props) => props.imageOffset,
      imageRotation: (_, props) => props.imageRotation
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAWING
  // ═══════════════════════════════════════════════════════════════════════════

  draw(dims, dpr) {
    if (!this.regl) return
    this.clearCanvas()
    this.slices.forEach(slice => this.drawSlice(slice, dims, dpr))
  }

  clearCanvas() {
    this.regl.poll()
    this.regl.clear({ color: [0, 0, 0, 0], depth: 1 })
  }

  drawSlice(slice, dims, dpr) {
    this.drawWedge(this.buildSliceProps(slice, dims, dpr))
  }

  buildSliceProps(slice, dims, dpr) {
    return {
      positions: this.scalePositions(slice.positions, dpr),
      count: slice.positions.length,
      resolution: [dims.width * dpr, dims.height * dpr],
      center: [dims.centerX * dpr, dims.centerY * dpr],
      a1: slice.a1,
      a2: slice.a2,
      outerRadius: dims.outerRadius * dpr,
      innerRadius: dims.innerRadius * dpr,
      hasTexture: this.textures[slice.index] ? 1 : 0,
      baseColor: slice.color,
      texture: this.getTextureForSlice(slice.index),
      imageScale: slice.imageScale,
      imageOffset: slice.imageOffset,
      imageRotation: slice.imageRotate
    }
  }

  scalePositions(positions, dpr) {
    return positions.map(([x, y]) => [x * dpr, y * dpr])
  }

  getTextureForSlice(index) {
    return this.textures[index] || this.createEmptyTexture()
  }

  createEmptyTexture() {
    return this.regl.texture({ data: new Uint8Array([255, 255, 255, 0]), width: 1, height: 1 })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  hexToFloatArray(hex) {
    let h = hex.replace('#', '')
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
      1
    ]
  }

  degreesToRadians(deg) {
    return (deg * Math.PI) / 180
  }
}
