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
