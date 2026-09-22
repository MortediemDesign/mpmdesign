/* ============================================================
   MPMDESIGN – hlavní stránka: společný základ.
   Registruje GSAP pluginy, spouští plynulý scroll (Lenis),
   řeší hamburger menu a hladké posouvání na kotvy. Ostatní
   home-*.js soubory na toto navazují přes window.MPM_HOME.
   ============================================================ */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  var html = document.documentElement;
  html.classList.add(prefersReducedMotion ? 'motion-reduced' : 'motion-full');
  if (!hasGsap) { html.classList.add('no-gsap'); }

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (typeof window.MotionPathPlugin !== 'undefined') {
      gsap.registerPlugin(MotionPathPlugin);
    }
  }

  // --- Lenis: plynulý scroll. Vypnuto při prefers-reduced-motion,
  // na mobilu necháváme nativní scroll (lehčí a předvídatelnější dotyk). ---
  var lenis = null;
  if (!prefersReducedMotion && !isMobile && hasGsap && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  window.MPM_HOME = {
    prefersReducedMotion: prefersReducedMotion,
    isMobile: isMobile,
    hasGsap: hasGsap,
    lenis: lenis
  };

  html.classList.add('js-ready');

  // --- Hamburger menu ---
  var toggle = document.querySelector('.nav-toggle');
  var panel = document.getElementById('mobileNav');
  if (toggle && panel) {
    var closeMenu = function () {
      panel.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    };
    toggle.addEventListener('click', function () {
      var open = !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('nav-open', open);
    });
    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  // --- Hladké posouvání na kotvy (funguje i bez Lenis/GSAP) ---
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -70 });
      } else {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
})();
