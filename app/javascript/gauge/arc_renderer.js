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

// Renders arc segments using raw WebGL
export default class ArcRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.gl = null
    this.program = null
    this.textures = []
    this.slices = []
    this.emptyTexture = null
    this.positionBuffer = null
    this.uniformLocations = {}
    this.positionLocation = null
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  init() {
    if (this.gl) return
    this.gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false
    })
    if (!this.gl) {
      console.error('WebGL not supported')
      return
    }
    this.compileProgram()
    this.createBuffers()
    this.cacheUniformLocations()
    this.createEmptyTexture()
  }

  destroy() {
    if (!this.gl) return
    this.textures.forEach(tex => {
      if (tex) this.gl.deleteTexture(tex)
    })
    if (this.emptyTexture) this.gl.deleteTexture(this.emptyTexture)
    if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer)
    if (this.program) this.gl.deleteProgram(this.program)
    this.gl = null
    this.program = null
    this.textures = []
    this.slices = []
    this.emptyTexture = null
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
    if (!this.gl) return
    this.slices.forEach(slice => this.loadTextureForSlice(slice, onTextureLoaded))
  }

  loadTextureForSlice(slice, onTextureLoaded) {
    if (!slice.imageUrl) return
    const img = new Image()
    img.onload = () => {
      this.textures[slice.index] = this.createTextureFromImage(img)
      onTextureLoaded?.()
    }
    img.src = slice.imageUrl
  }

  createTextureFromImage(img) {
    const gl = this.gl
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return texture
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBGL SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  compileProgram() {
    const gl = this.gl
    const vertShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

    this.program = gl.createProgram()
    gl.attachShader(this.program, vertShader)
    gl.attachShader(this.program, fragShader)
    gl.linkProgram(this.program)

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program))
    }

    gl.deleteShader(vertShader)
    gl.deleteShader(fragShader)
  }

  compileShader(type, source) {
    const gl = this.gl
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    }
    return shader
  }

  createBuffers() {
    this.positionBuffer = this.gl.createBuffer()
    this.positionLocation = this.gl.getAttribLocation(this.program, 'position')
  }

  cacheUniformLocations() {
    const gl = this.gl
    const uniforms = [
      'resolution', 'center', 'startAngle', 'endAngle',
      'outerRadius', 'innerRadius', 'hasTexture', 'baseColor',
      'tex', 'imageScale', 'imageOffset', 'imageRotation'
    ]
    uniforms.forEach(name => {
      this.uniformLocations[name] = gl.getUniformLocation(this.program, name)
    })
  }

  createEmptyTexture() {
    const gl = this.gl
    this.emptyTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.emptyTexture)
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
      gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 0])
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAWING
  // ═══════════════════════════════════════════════════════════════════════════

  draw(dims, dpr) {
    if (!this.gl) return
    this.clearCanvas()
    this.gl.useProgram(this.program)
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    this.slices.forEach(slice => this.drawSlice(slice, dims, dpr))
  }

  clearCanvas() {
    const gl = this.gl
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  drawSlice(slice, dims, dpr) {
    const gl = this.gl
    const u = this.uniformLocations

    // Upload positions
    const positions = this.scalePositions(slice.positions, dpr)
    const flatPositions = new Float32Array(positions.flat())
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, flatPositions, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(this.positionLocation)
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0)

    // Set uniforms
    gl.uniform2f(u.resolution, dims.width * dpr, dims.height * dpr)
    gl.uniform2f(u.center, dims.centerX * dpr, dims.centerY * dpr)
    gl.uniform1f(u.startAngle, slice.a1)
    gl.uniform1f(u.endAngle, slice.a2)
    gl.uniform1f(u.outerRadius, dims.outerRadius * dpr)
    gl.uniform1f(u.innerRadius, dims.innerRadius * dpr)
    gl.uniform1f(u.hasTexture, this.textures[slice.index] ? 1 : 0)
    gl.uniform4fv(u.baseColor, slice.color)
    gl.uniform1f(u.imageScale, slice.imageScale)
    gl.uniform2fv(u.imageOffset, slice.imageOffset)
    gl.uniform1f(u.imageRotation, slice.imageRotate)

    // Bind texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.textures[slice.index] || this.emptyTexture)
    gl.uniform1i(u.tex, 0)

    // Draw
    gl.drawArrays(gl.TRIANGLE_FAN, 0, positions.length)
  }

  scalePositions(positions, dpr) {
    return positions.map(([x, y]) => [x * dpr, y * dpr])
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
