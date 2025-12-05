export default class NeedleRenderer {
  constructor(controller) {
    this.svgTarget = controller.svgTarget
    this.dims = controller.dims
    this.minValue = controller.minValue
    this.maxValue = controller.maxValue
    this.idxValue = controller.idxValue
    this.startAngleValue = controller.startAngleValue
    this.endAngleValue = controller.endAngleValue
  }

  draw() {
    this.svgTarget.setAttribute('viewBox', `0 0 ${this.dims.width} ${this.dims.height}`)
    this.svgTarget.querySelector('#needle')?.remove()

    const { centerX, centerY, needleLength } = this.dims
    const x2 = centerX + needleLength

    this.svgTarget.insertAdjacentHTML('beforeend', `
      <g id="needle" style="transition: transform .25s ease-out">
        <line x1="${centerX}" y1="${centerY}" x2="${x2}" y2="${centerY}"
              stroke="#fff" stroke-width="6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        <line x1="${centerX}" y1="${centerY}" x2="${x2}" y2="${centerY}"
              stroke="#000" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        <circle cx="${centerX}" cy="${centerY}" r="6"
                fill="#000" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/>
      </g>
    `)
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
