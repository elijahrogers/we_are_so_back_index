export default class LabelRenderer {
  constructor(controller) {
    this.svgTarget = controller.svgTarget
    this.dims = controller.dims
    this.labelOffsetValue = controller.labelOffsetValue
    this.renderer = controller.renderer
  }

  draw() {
    if (!this.svgTarget) return
    this.svgTarget.querySelector('#labels')?.remove()

    const radius = this.computeLabelRadius()
    const labelsSvg = this.renderer?.slices?.map((slice, idx) =>
      this.labelSvg(slice, idx, radius)
    ).join('') ?? ''

    this.svgTarget.insertAdjacentHTML('beforeend', `<g id="labels">${labelsSvg}</g>`)
  }

  computeLabelRadius() {
    const offset = this.labelOffsetValue ?? 16
    return Math.max(4, Math.min(this.dims.outerRadius + offset, this.dims.centerY - 2))
  }

  labelSvg(slice, idx, radius) {
    const pathId = `label-path-${idx}-${Math.random().toString(36).slice(2)}`
    const arcPath = this.makeArcPath(radius, slice.a1, slice.a2)

    return `
      <path id="${pathId}" d="${arcPath}" fill="none" stroke="none"/>
      <text fill="#fff" stroke="#fff" stroke-width="2" font-weight="300" font-size="20"
            text-anchor="middle" paint-order="stroke fill"
            vector-effect="non-scaling-stroke" style="pointer-events: none">
        <textPath href="#${pathId}" startOffset="50%">${slice.label ?? ''}</textPath>
      </text>
    `
  }

  makeArcPath(radius, a1, a2) {
    const { centerX, centerY } = this.dims
    const [x1, y1] = [centerX + radius * Math.cos(a1), centerY + radius * Math.sin(a1)]
    const [x2, y2] = [centerX + radius * Math.cos(a2), centerY + radius * Math.sin(a2)]
    const largeArc = Math.abs(a2 - a1) > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
  }
}
