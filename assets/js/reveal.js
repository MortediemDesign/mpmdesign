/* ============================================================
   MPMDESIGN – jemné odhalení obsahu při scrollu.
   Lehká náhrada GSAP ScrollTrigger pro běžné obsahové stránky -
   žádná externí knihovna, jen IntersectionObserver. Respektuje
   prefers-reduced-motion (skript se v tom případě vůbec nespustí,
   obsah zůstává normálně vidět).
   ============================================================ */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  function init() {
    var targets = document.querySelectorAll(
      'main.container > section, .card, .gallery figure, .steps li'
    );
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el, i) {
      el.classList.add('reveal-pending');
      el.style.transitionDelay = (Math.min(i % 6, 5) * 0.06) + 's';
      io.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
