// Smooth scrolling for sidebar links + focus target section
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

// Projects dropdown toggle (keeps hover behavior, adds click for touch)
const navGroup = document.querySelector('.nav-group');
if (navGroup) {
  const parent = navGroup.querySelector('.nav-parent');
  parent.addEventListener('click', () => {
    navGroup.classList.add('open');
    parent.setAttribute('aria-expanded', 'true');
  });
}

// Highlight the sidebar link for the section currently in view
const navLinks = document.querySelectorAll('.nav-link');
const subIds = ['tools', 'games', 'designs'];
const spyIds = ['about', ...subIds, 'skills'];
const sections = spyIds
  .map(id => document.getElementById(id))
  .filter(Boolean);

function setActiveSection(id) {
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
  });
  // Keep the projects parent lit while a subsection is in view
  const parent = document.querySelector('.nav-parent');
  if (parent) parent.classList.toggle('active', subIds.includes(id));
}

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) setActiveSection(entry.target.id);
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
