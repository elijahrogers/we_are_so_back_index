import { Controller } from "@hotwired/stimulus"
import GaugeArcRenderer from "gauge/arc_renderer"
import GaugeDimensions from "gauge/dimensions"
import GaugeLabelRenderer from "gauge/label_renderer"
import NeedleRenderer from "gauge/needle_renderer"

// Renders pie-slice images warped via a fragment shader (polar → UV).
// Keeps a simple SVG needle overlay for readability and easy rotation.

export default class extends Controller {
  static targets = ["canvas", "svg"]
  static values = {
    idx: Number,
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    segments: Array, // [{ label, weight, color, image, imageScale, imageOffsetX, imageOffsetY, imageRotate }]
    startAngle: { type: Number, default: -Math.PI },
    endAngle: { type: Number, default: 0 },
    innerRatio: { type: Number, default: 0.68 }, // 0..1 of outerRadius
    labelOffset: { type: Number, default: 16 }
  }

  connect() {
    this.handleResize = () => this.redraw()
    window.addEventListener('resize', this.handleResize, { passive: true })

    this.setup()
    this.draw()
  }

  disconnect() {
    window.removeEventListener('resize', this.handleResize)
    this.renderer?.destroy()
    this.renderer = null
  }

  idxChanged() {
    this.needleRenderer.update(this.dims)
  }

  setup() {
    this.dims = new GaugeDimensions(this.element.getBoundingClientRect(), this.innerRatioValue)
    this.sizeCanvas()
    this.renderer = new GaugeArcRenderer(this.canvasTarget)
    this.renderer.init()
    this.labelRenderer = new GaugeLabelRenderer(this)
    this.needleRenderer = new NeedleRenderer(this)
  }

  draw() {
    this.buildAndDrawSlices()
    this.labelRenderer.draw()
    this.needleRenderer.draw()
    this.needleRenderer.update(this.dims)
  }

  redraw() {
    this.setup()
    this.draw()
  }

  sizeCanvas() {
    this.setCanvasCssSize()
    this.setCanvasPixelSize()
  }

  setCanvasCssSize() {
    this.canvasTarget.style.width = '100%'
    this.canvasTarget.style.height = `${this.dims.height}px`
  }

  setCanvasPixelSize() {
    const w = Math.round(this.dims.width * this.devicePixelRatio * this.devicePixelRatio)
    const h = Math.round(this.dims.height * this.devicePixelRatio * this.devicePixelRatio)
    if (this.canvasTarget.width !== w) this.canvasTarget.width = w
    if (this.canvasTarget.height !== h) this.canvasTarget.height = h
  }

  buildAndDrawSlices() {
    const onTextureLoaded = () => this.renderer.draw(this.dims, this.devicePixelRatio)
    this.renderer.buildSlices(
      this.segmentsValue,
      this.dims,
      this.startAngleValue,
      this.endAngleValue,
      onTextureLoaded
    )
    this.renderer.draw(this.dims, this.devicePixelRatio)
  }

  get devicePixelRatio() {
    return window.devicePixelRatio || 1
  }
}
