export function initAnimations(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!reduceMotion) initParticles()

  // Stagger siblings: reveal children of the same parent cascade in (max ~4 to keep it snappy).
  const groups = new Map<Element, Element[]>()
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const parent = el.parentElement
    if (!parent) return
    if (!groups.has(parent)) groups.set(parent, [])
    groups.get(parent)!.push(el)
  })
  groups.forEach((items) => {
    if (items.length < 2) return
    items.forEach((el, i) => {
      const delay = Math.min(i, 4) * 0.07 // 70ms cascade, capped
      ;(el as HTMLElement).style.setProperty('--reveal-delay', `${delay}s`)
    })
  })

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          io.unobserve(e.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))

  const syncFaqAria = () => {
    document.querySelectorAll<HTMLButtonElement>('.faq2__q').forEach((btn) => {
      const open = btn.closest('.faq2__item')?.classList.contains('open') ?? false
      btn.setAttribute('aria-expanded', String(open))
    })
  }
  document.querySelectorAll<HTMLButtonElement>('.faq2__q').forEach((q) => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq2__item')
      if (!item) return
      const isOpen = item.classList.contains('open')
      document.querySelectorAll('.faq2__item.open').forEach((i) => i.classList.remove('open'))
      if (!isOpen) item.classList.add('open')
      syncFaqAria()
    })
  })
  syncFaqAria()
}

function initParticles(): void {
  const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement | null
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let w = 0, h = 0
  const LINK_DIST = 120
  const COUNT = 75

  const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = []

  const resize = () => {
    w = canvas.width = canvas.offsetWidth
    h = canvas.height = canvas.offsetHeight
  }
  resize()
  window.addEventListener('resize', resize, { passive: true })

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.8 + 0.4,
      a: Math.random() * 0.5 + 0.15,
    })
  }

  // Pausa el loop cuando el hero sale del viewport o la pestaña se oculta.
  let inView = true
  let running = false
  const setRunning = () => {
    const shouldRun = inView && !document.hidden
    if (shouldRun && !running) {
      running = true
      requestAnimationFrame(draw)
    } else if (!shouldRun) {
      running = false
    }
  }
  const heroVisible = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? true
    setRunning()
  })
  heroVisible.observe(canvas)
  document.addEventListener('visibilitychange', setRunning)

  const draw = () => {
    if (!running) return
    ctx.clearRect(0, 0, w, h)

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < LINK_DIST) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(96,165,250,${0.18 * (1 - dist / LINK_DIST)})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }
    }

    ctx.shadowBlur = 6
    ctx.shadowColor = 'rgba(148,180,255,0.7)'
    particles.forEach((p) => {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0) p.x = w
      if (p.x > w) p.x = 0
      if (p.y < 0) p.y = h
      if (p.y > h) p.y = 0
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(148,180,255,${p.a})`
      ctx.fill()
    })
    ctx.shadowBlur = 0

    requestAnimationFrame(draw)
  }

  running = true
  requestAnimationFrame(draw)
}
