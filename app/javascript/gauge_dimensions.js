export default class GaugeDimensions {
  constructor(rect, innerRatio = 0.68) {
    this.innerRatio = innerRatio
    this.rect = rect
    this.width = this.computeWidth()
    this.height = this.computeHeight()
    this.centerX = Math.round(this.width / 2)
    this.centerY = this.height
    this.outerRadius = this.computeOuterRadius()
    this.innerRadius = this.computeInnerRadius()
    this.needleLength = Math.round(this.outerRadius * 0.92)
  }

  computeWidth() {
    return Math.max(200, this.rect.width)
  }

  computeHeight() {
    return Math.max(120, Math.round(this.width * 0.6))
  }

  computeOuterRadius() {
    return Math.floor(Math.min(this.width / 2, this.height) * 0.92)
  }

  computeInnerRadius() {
    const ratio = Math.max(0, Math.min(0.95, this.innerRatio ?? 0.68))
    return Math.floor(this.outerRadius * ratio)
  }
}
