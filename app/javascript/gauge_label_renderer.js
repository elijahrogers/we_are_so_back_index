const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

export default class GaugeLabelRenderer {
  constructor(controller) {
    this.svgTarget = controller.svgTarget
    this.dims = controller.dims
    this.labelOffsetValue = controller.labelOffsetValue
    this.renderer = controller.renderer
  }

  draw() {
    if (!this.svgTarget) return
    this.clearLabels()

    const labelsGroup = this.createLabelsGroup()
    const labelRadius = this.computeLabelRadius()

    this.renderer?.slices?.forEach((slice, idx) => {
      this.renderLabelForSlice(labelsGroup, slice, idx, labelRadius)
    })
  }

  clearLabels() {
    this.svgTarget.querySelector('#labels')?.remove()
  }

  createLabelsGroup() {
    const group = document.createElementNS(SVG_NS, 'g')
    group.setAttribute('id', 'labels')
    this.svgTarget.appendChild(group)
    return group
  }

  computeLabelRadius() {
    const offset = this.labelOffsetValue ?? 16
    return Math.max(4, Math.min(this.dims.outerRadius + offset, this.dims.centerY - 2))
  }

  renderLabelForSlice(group, slice, idx, radius) {
    const pathId = this.createLabelPath(group, slice, radius, idx)
    this.createLabelText(group, pathId, slice.label)
  }

  createLabelPath(group, slice, radius, idx) {
    const id = `label-path-${idx}-${Math.random().toString(36).slice(2)}`
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('id', id)
    path.setAttribute('d', this.makeArcPath(radius, slice.a1, slice.a2))
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'none')
    group.appendChild(path)
    return id
  }

  makeArcPath(radius, a1, a2) {
    const p1 = this.polarToCartesian(this.dims.centerX, this.dims.centerY, radius, a1)
    const p2 = this.polarToCartesian(this.dims.centerX, this.dims.centerY, radius, a2)
    const largeArc = Math.abs(a2 - a1) > Math.PI ? 1 : 0
    return `M ${p1[0]} ${p1[1]} A ${radius} ${radius} 0 ${largeArc} 1 ${p2[0]} ${p2[1]}`
  }

  polarToCartesian(cx, cy, radius, angle) {
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
  }

  createLabelText(group, pathId, label) {
    const text = this.createTextElement()
    const textPath = this.createTextPath(pathId, label)
    text.appendChild(textPath)
    group.appendChild(text)
  }

  createTextElement() {
    const text = document.createElementNS(SVG_NS, 'text')
      text.setAttribute('fill', '#ffffff')
      text.setAttribute('stroke', '#ffffff')
      text.setAttribute('stroke-width', '2')
      text.setAttribute('font-weight', '300')
      text.setAttribute('font-size', '20')
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('paint-order', 'stroke fill')
      text.setAttribute('vector-effect', 'non-scaling-stroke')
      text.setAttribute('style', 'pointer-events: none')
    return text
  }

  createTextPath(pathId, label) {
    const textPath = document.createElementNS(SVG_NS, 'textPath')
    textPath.setAttribute('href', `#${pathId}`)
    textPath.setAttributeNS(XLINK_NS, 'xlink:href', `#${pathId}`)
    textPath.setAttribute('startOffset', '50%')
    textPath.textContent = label ?? ''
    return textPath
  }
}
