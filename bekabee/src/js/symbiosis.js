// Symbiosis: slow sunlit water behind a line drawing of a crocodile and the small bird that
// cleans its teeth. Lines draw themselves in on scroll; the bird breathes and pecks.

export function initSymbiosis({ gsap, reduced }) {
  const section = document.querySelector('[data-sym]');
  const canvas = section.querySelector('[data-sym-canvas]');
  const svg = section.querySelector('[data-sym-svg]');
  const c = canvas.getContext('2d');
  let W = 0, H = 0, visible = false;

  const streaks = Array.from({ length: 46 }, () => ({ y: Math.random(), amp: 4 + Math.random() * 14, freq: 0.002 + Math.random() * 0.006, speed: 0.00015 + Math.random() * 0.0004, phase: Math.random() * 10, a: 0.03 + Math.random() * 0.07, w: 0.6 + Math.random() * 1.4 }));

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1510'); g.addColorStop(0.55, '#0c1d15'); g.addColorStop(1, '#07100b');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sun = c.createRadialGradient(W * 0.82, H * 0.05, 0, W * 0.82, H * 0.05, Math.max(W, H) * 0.65);
    sun.addColorStop(0, 'rgba(242,194,48,.22)'); sun.addColorStop(0.4, 'rgba(242,194,48,.05)'); sun.addColorStop(1, 'rgba(242,194,48,0)');
    c.fillStyle = sun; c.fillRect(0, 0, W, H);
    // caustic light streaks drifting across the surface
    streaks.forEach((s) => {
      c.beginPath();
      const y0 = s.y * H;
      for (let x = -20; x <= W + 20; x += 16) {
        const y = y0 + Math.sin(x * s.freq + t * s.speed * 6 + s.phase) * s.amp + Math.sin(x * s.freq * 2.3 - t * s.speed * 4) * s.amp * 0.4;
        x === -20 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      const warm = s.y < 0.5;
      c.strokeStyle = warm ? `rgba(242,194,48,${s.a})` : `rgba(72,184,74,${s.a * 0.8})`;
      c.lineWidth = s.w; c.stroke();
    });
  }

  size();
  window.addEventListener('resize', () => { size(); draw(performance.now()); });
  draw(0);

  const lines = svg.querySelectorAll('.sym__line, .sym__teeth, .sym__waterline');
  if (reduced) return;

  new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(section);
  let last = 0;
  const loop = (t) => { requestAnimationFrame(loop); if (!visible || t - last < 33) return; last = t; draw(t); };
  requestAnimationFrame(loop);

  lines.forEach((el) => { const len = el.getTotalLength(); gsap.set(el, { strokeDasharray: len, strokeDashoffset: len }); });
  const bird = svg.querySelector('.sym__bird');
  gsap.set(bird, { opacity: 0, y: -30 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 70%', end: 'center 45%', scrub: 1 } });
  const wipe = svg.querySelector('.sym__wipe');
  gsap.set(wipe, { attr: { width: 0 } });
  tl.to(wipe, { attr: { width: 600 }, duration: 1, ease: 'power2.inOut' }, 0)
    .to(lines, { strokeDashoffset: 0, duration: 0.8, stagger: 0.05, ease: 'power1.inOut' }, 0.2)
    .from('.sym__eye', { scale: 0, transformOrigin: '50% 50%', duration: 0.2 }, 0.8)
    .to(bird, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.8);

  // the bird's slow work: a gentle bob and an occasional peck
  gsap.to(bird.firstElementChild.children, { y: -1.5, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.timeline({ repeat: -1, repeatDelay: 2.4 })
    .to(bird, { rotation: -12, svgOrigin: '444 284', duration: 0.18, ease: 'power2.in' })
    .to(bird, { rotation: 0, svgOrigin: '444 284', duration: 0.4, ease: 'power2.out' })
    .to(bird, { rotation: -10, svgOrigin: '444 284', duration: 0.16, ease: 'power2.in' }, '+=0.3')
    .to(bird, { rotation: 0, svgOrigin: '444 284', duration: 0.5, ease: 'power2.out' });
  gsap.to('.sym__ripple', { x: 30, duration: 6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.sym__sun', { scale: 1.15, transformOrigin: '50% 50%', duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}
