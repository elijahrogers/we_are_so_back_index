const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

export default class NeedleRenderer {
  constructor(controller) {
    this.svgTarget = controller.svgTarget
    this.dims = controller.dims
    this.renderer = controller.renderer
    this.innerRatioValue = controller.innerRatioValue
    this.minValue = controller.minValue
    this.maxValue = controller.maxValue

    this.idxValue = controller.idxValue
    this.startAngleValue = controller.startAngleValue
    this.endAngleValue = controller.endAngleValue
  }

  draw() {
    this.setSvgViewBox()
    this.clearNeedle()
    this.group = this.createNeedleGroup()
    this.createNeedleOutline()
    this.createNeedleLine()
    this.createNeedleHub()
    this.svgTarget.appendChild(this.group)
  }

  setSvgViewBox() {
    this.svgTarget.setAttribute('viewBox', `0 0 ${this.dims.width} ${this.dims.height}`)
  }

  clearNeedle() {
    this.svgTarget.querySelector('#needle')?.remove()
  }

  createNeedleGroup() {
    const g = document.createElementNS(SVG_NS, 'g')
    g.setAttribute('id', 'needle')
    g.setAttribute('style', 'transition: transform .25s ease-out')
    return g
  }

  createNeedleOutline() {
    const line = this.createLine('#ffffff', '6')
    this.group.appendChild(line)
  }

  createNeedleLine() {
    const line = this.createLine('#000000', '3')
    this.group.appendChild(line)
  }

  createLine(stroke, strokeWidth) {
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('x1', `${this.dims.centerX}`)
    line.setAttribute('y1', `${this.dims.centerY}`)
    line.setAttribute('x2', `${this.dims.centerX + this.dims.needleLength}`)
    line.setAttribute('y2', `${this.dims.centerY}`)
    line.setAttribute('stroke', stroke)
    line.setAttribute('stroke-width', strokeWidth)
    line.setAttribute('stroke-linecap', 'round')
    line.setAttribute('vector-effect', 'non-scaling-stroke')
    return line
  }

  createNeedleHub() {
    const hub = document.createElementNS(SVG_NS, 'circle')
    hub.setAttribute('cx', `${this.dims.centerX}`)
    hub.setAttribute('cy', `${this.dims.centerY}`)
    hub.setAttribute('r', '6')
    hub.setAttribute('fill', '#000000')
    hub.setAttribute('stroke', '#ffffff')
    hub.setAttribute('stroke-width', '2')
    hub.setAttribute('vector-effect', 'non-scaling-stroke')
    this.group.appendChild(hub)
  }

  update(dims) {
    if (!this.svgTarget) return
    this.dims = dims
    const angle = this.computeNeedleAngle()
    this.rotateNeedle(angle)
  }

  computeNeedleAngle() {
    const ratio = this.computeValueRatio()
    const angleSpan = this.endAngleValue - this.startAngleValue
    return this.startAngleValue + ratio * angleSpan
  }

  computeValueRatio() {
    const min = this.minValue
    const max = this.maxValue
    const clamped = Math.max(min, Math.min(max, this.idxValue ?? min))
    return (clamped - min) / (max - min)
  }

  rotateNeedle(angle) {
    const deg = this.radiansToDegrees(angle)
    const needle = this.svgTarget.querySelector('#needle')
    if (needle) {
      needle.setAttribute('transform', `rotate(${deg} ${this.dims.centerX} ${this.dims.centerY})`)
    }
  }

  radiansToDegrees(rad) {
    return (rad * 180) / Math.PI
  }
}
