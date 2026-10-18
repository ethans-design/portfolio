// Smooth scrolling for nav links + focus target section
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    const id = link.getAttribute('href');
    const target = document.querySelector(id);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

// Project filters: pick a category, pick it again to show everything
const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.project-card');

filters.forEach(btn => {
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    filters.forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', String(on));
    cards.forEach(card => {
      card.hidden = on && card.dataset.category !== btn.dataset.filter;
    });
  });
});

// Highlight the nav link for the section currently in view
const navLinks = document.querySelectorAll('.nav-link');
const sections = ['about', 'projects', 'skills']
  .map(id => document.getElementById(id))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
    });
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(section => sectionObserver.observe(section));

// Lightbox for image-only projects
const lightbox = document.getElementById('lightbox');

if (lightbox) {
  const lightboxImg = lightbox.querySelector('img');
  const lightboxCaption = lightbox.querySelector('figcaption');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  let lastTrigger = null;

  const openLightbox = (trigger) => {
    lastTrigger = trigger;
    lightboxImg.src = trigger.dataset.image;
    lightboxImg.alt = trigger.dataset.caption || '';
    lightboxCaption.textContent = trigger.dataset.caption || '';
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    if (lastTrigger) lastTrigger.focus();
  };

  document.querySelectorAll('.lightbox-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => openLightbox(trigger));
  });

  closeBtn.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });
}

// A little hiker walks the ridge, and every so often stops at a flat spot
// to pitch a tent and sit by a fire before packing up and moving on.
const trail = document.getElementById('trail');
const ridgePath = document.querySelector('.ridge-front');

if (trail && ridgePath) {
  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // Ground height along the ridge, smoothed so footsteps don't jitter
  const raw = [];
  ridgePath.getAttribute('d').replace(/L(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, (_, x, y) => {
    raw[Math.round(+x)] = +y;
  });
  const width = raw.length - 1;
  const ground = raw.map((_, i) => {
    let sum = 0, n = 0;
    for (let j = i - 3; j <= i + 3; j++) if (raw[j] !== undefined) { sum += raw[j]; n++; }
    return sum / n;
  });
  const groundAt = x => {
    const i = Math.max(0, Math.min(width - 1, Math.floor(x)));
    const t = x - i;
    return ground[i] * (1 - t) + ground[i + 1] * t;
  };
  // How uneven the ground is where the tent and fire would go
  const bumpiness = x => {
    let lo = Infinity, hi = -Infinity;
    for (let i = x - 12; i <= x + 7; i++) {
      const y = groundAt(i);
      lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
    return hi - lo;
  };

  // Camp: tent behind the hiker, fire in front
  const camp = make('g', { class: 'camp' }, trail);
  const tent = make('g', {}, camp);
  make('path', { d: 'M-4.5 0L0 -6L4.5 0Z', class: 'trail-ink' }, tent);
  make('path', { d: 'M-1.2 0L0 -3.4L1.2 0Z', class: 'tent-door' }, tent);
  const fire = make('g', {}, camp);
  const glow = make('circle', { r: 7, cy: -1.5, fill: 'url(#fire-glow)' }, fire);
  make('path', { d: 'M-1.8 0.2L1.8 -0.6M-1.8 -0.6L1.8 0.2', class: 'trail-ink logs' }, fire);
  const flameOuter = make('path', { d: 'M0 -4.2C1.6 -2.4 1.5 -0.6 0 -0.4C-1.5 -0.6 -1.6 -2.4 0 -4.2Z', class: 'flame' }, fire);
  const flameInner = make('path', { d: 'M0 -2.6C0.8 -1.6 0.8 -0.7 0 -0.6C-0.8 -0.7 -0.8 -1.6 0 -2.6Z', class: 'flame-core' }, fire);
  const smoke = [0, 1, 2].map(() => make('circle', { r: 0.8, class: 'smoke' }, fire));

  // Hiker: head, pack, body, two arms, two legs (drawn as lines from hip and shoulder)
  const hiker = make('g', { class: 'hiker' }, trail);
  const head = make('circle', { r: 1.25, class: 'trail-ink' }, hiker);
  const pack = make('rect', { width: 1.9, height: 3.2, rx: 0.5, class: 'trail-ink' }, hiker);
  const limb = () => make('line', { class: 'trail-ink limb' }, hiker);
  const torso = limb(), armA = limb(), armB = limb(), legA = limb(), legB = limb();

  const setLine = (el, x1, y1, x2, y2) => {
    el.setAttribute('x1', x1); el.setAttribute('y1', y1);
    el.setAttribute('x2', x2); el.setAttribute('y2', y2);
  };
  const reach = (x, y, len, angle) => [x + Math.sin(angle) * len, y + Math.cos(angle) * len];

  function pose(phase, sit) {
    if (sit) {
      const hip = -1.8;
      setLine(torso, 0, hip, -0.3, hip - 3.6);
      head.setAttribute('cx', 0); head.setAttribute('cy', hip - 5);
      pack.setAttribute('x', -3.6); pack.setAttribute('y', -3.2);   // set down beside him
      setLine(legA, 0, hip, 2.2, hip - 0.4); setLine(legB, 2.2, hip - 0.4, 2.8, 0);
      setLine(armA, -0.2, hip - 2.8, 1.8, hip - 1.4); setLine(armB, -0.2, hip - 2.8, 1.6, hip - 1.8);
      return;
    }
    const hip = -3.7, shoulder = -6.6, swing = Math.sin(phase) * 0.55;
    setLine(torso, 0, hip, 0.25, shoulder - 0.8);
    head.setAttribute('cx', 0.5); head.setAttribute('cy', shoulder - 2.2);
    pack.setAttribute('x', -2.1); pack.setAttribute('y', shoulder - 0.6);
    setLine(legA, 0, hip, ...reach(0, hip, 3.7, swing));
    setLine(legB, 0, hip, ...reach(0, hip, 3.7, -swing));
    setLine(armA, 0.15, shoulder, ...reach(0.15, shoulder, 2.8, -swing * 0.8));
    setLine(armB, 0.15, shoulder, ...reach(0.15, shoulder, 2.8, swing * 0.8));
  }

  const place = (el, x, scale = 1, tilt = 0) =>
    el.setAttribute('transform', `translate(${x.toFixed(2)} ${groundAt(x).toFixed(2)}) rotate(${tilt.toFixed(1)}) scale(${scale.toFixed(3)})`);

  // State machine: walk → pitch tent → light fire → rest → douse fire → pack tent → walk
  let x = rand(20, 120), phase = 0, campX = 0;
  let state = 'walk', t0 = 0, restFor = 0;
  let nextStop = x + rand(110, 300);
  let tentScale = 0, fireScale = 0;

  function go(next, now) { state = next; t0 = now; }

  function frame(now, dt) {
    const since = (now - t0) / 1000;

    if (state === 'walk') {
      const slope = (groundAt(x + 1) - groundAt(x - 1)) / 2;
      x += dt * 8 / (1 + Math.abs(slope) * 1.6);
      phase += dt * 7;
      if (x > width - 6) {           // reached the end of the range: start over on the left
        x = 6; nextStop = rand(110, 300);
      }
      // Past the planned stop, he takes the first spot that's level enough,
      // getting less picky the further he goes
      if (x >= nextStop && bumpiness(x) < 4 + (x - nextStop) * 0.08) { campX = x; go('pitch', now); }
      pose(phase, false);
      place(hiker, x, 1, Math.atan(slope) * 180 / Math.PI * 0.35);
    } else if (state === 'pitch') {
      tentScale = ease(Math.min(1, since / 1.8));
      pose(0, false);
      if (since >= 1.8) go('light', now);
    } else if (state === 'light') {
      fireScale = ease(Math.min(1, since / 1.2));
      pose(0, true);
      if (since >= 1.2) { restFor = rand(6, 14); go('rest', now); }
    } else if (state === 'rest') {
      pose(0, true);
      if (since >= restFor) go('douse', now);
    } else if (state === 'douse') {
      fireScale = 1 - ease(Math.min(1, since / 1));
      pose(0, true);
      if (since >= 1) go('pack', now);
    } else if (state === 'pack') {
      tentScale = 1 - ease(Math.min(1, since / 1.5));
      pose(0, false);
      if (since >= 1.5) { nextStop = x + rand(110, 300); go('walk', now); }
    }

    if (state !== 'walk') place(hiker, campX);
    camp.style.display = tentScale > 0 || fireScale > 0 ? '' : 'none';
    place(tent, campX - 8, Math.max(tentScale, 0.001));
    place(fire, campX + 5, Math.max(fireScale, 0.001));

    // Flicker the flames and drift a little smoke while the fire is going
    const flick = 0.85 + Math.sin(now / 90) * 0.08 + Math.random() * 0.1;
    flameOuter.setAttribute('transform', `scale(${flick.toFixed(3)} ${(flick * 1.05).toFixed(3)})`);
    flameInner.setAttribute('transform', `scale(${(flick * 0.95).toFixed(3)})`);
    glow.setAttribute('opacity', (0.7 + Math.random() * 0.3).toFixed(2));
    smoke.forEach((puff, i) => {
      const p = ((now / 2600) + i / 3) % 1;
      puff.setAttribute('cx', (Math.sin(p * 5 + i) * 1.2).toFixed(2));
      puff.setAttribute('cy', (-4.5 - p * 9).toFixed(2));
      puff.setAttribute('r', (0.6 + p * 1.2).toFixed(2));
      puff.setAttribute('opacity', (state === 'rest' ? (1 - p) * 0.35 : 0).toFixed(2));
    });
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // No animation: he's already camped at a flat spot
    x = 140;
    while (x < width - 20 && bumpiness(x) > 4.5) x++;
    campX = x; tentScale = 1; fireScale = 1; state = 'rest'; restFor = Infinity;
    frame(0, 0);
  } else {
    let last = performance.now();
    t0 = last;
    const tick = now => {
      const dt = Math.min(0.1, (now - last) / 1000);  // cap the step after a hidden tab
      last = now;
      frame(now, dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
