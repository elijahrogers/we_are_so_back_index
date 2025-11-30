// Track mouse position for background spotlight effect
const mouse = { x: -1000, y: -1000 }
const smoothed = { x: -1000, y: -1000 }
const ease = 0.01

let animating = false
let idleTimeout

function animate() {
  if (!animating) return

  smoothed.x += (mouse.x - smoothed.x) * ease
  smoothed.y += (mouse.y - smoothed.y) * ease

  document.body.style.setProperty('--mouse-x', `${smoothed.x}px`)
  document.body.style.setProperty('--mouse-y', `${smoothed.y}px`)

  requestAnimationFrame(animate)
}

document.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX
  mouse.y = e.clientY

  clearTimeout(idleTimeout)

  if (!animating) {
    animating = true
    animate()
  }

  idleTimeout = setTimeout(() => {
    animating = false
  }, 2000)
})

animate()
