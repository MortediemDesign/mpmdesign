/* ============================================================
   MPMDESIGN – sekce Služby: horizontální scroll s mikroanimacemi.
   Na desktopu se sekce přišpendlí a svislý scroll posouvá karty
   do strany; každá karta má vlastní krátkou animaci vázanou na
   scroll (containerAnimation). Na mobilu jsou karty svisle pod
   sebou a animace se přehraje jednou při vstupu do viewportu.
   ============================================================ */
(function () {
  'use strict';

  var pinWrap = document.querySelector('.services-pin');
  var track = document.querySelector('.services-track');
  if (!pinWrap || !track) return;

  var cards = Array.prototype.slice.call(track.querySelectorAll('.service-card'));
  var state = window.MPM_HOME || {
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    hasGsap: typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'
  };

  // Statická varianta: nic neanimujeme, CSS pravidla pro
  // html.motion-reduced / html.no-gsap už ukazují hotový stav.
  if (state.prefersReducedMotion || !state.hasGsap) return;

  /* ---------- Mikroanimace jednotlivých karet ---------- */
  function buildCardTimeline(card, scrollTrigger) {
    var svc = card.dataset.service;
    var tl = gsap.timeline({ scrollTrigger: scrollTrigger });

    if (svc === 'cnc') {
      var pocket = card.querySelector('.cnc-pocket');
      var tool = card.querySelector('.cnc-tool');
      tl.to(pocket, { scaleY: 1, duration: 1, ease: 'none' }, 0);
      if (tool) { tl.to(tool, { x: 48, y: 26, duration: 1, ease: 'none' }, 0); }
    }

    if (svc === '3d-tisk') {
      var layers = card.querySelectorAll('.print-layer');
      tl.to(layers, { scaleY: 1, duration: 0.9, ease: 'none', stagger: 0.12 }, 0);
    }

    if (svc === 'laser') {
      var path = card.querySelector('.laser-path');
      var dot = card.querySelector('.laser-dot');
      var smoke = card.querySelector('.laser-smoke');
      if (path) {
        var len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        tl.to(path, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0);
      }
      if (dot) {
        tl.set(dot, { opacity: 1 }, 0);
        if (typeof window.MotionPathPlugin !== 'undefined' && path) {
          tl.to(dot, { motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5] }, duration: 1, ease: 'none' }, 0);
        }
      }
      if (smoke) {
        tl.to(smoke, { opacity: 0.5, y: -10, duration: 0.5, ease: 'none' }, 0.15)
          .to(smoke, { opacity: 0, y: -22, duration: 0.5, ease: 'none' }, 0.55);
      }
    }

    if (svc === 'polepy') {
      var outline = card.querySelector('.polepy-outline');
      if (outline) {
        var ol = outline.getTotalLength();
        outline.style.strokeDasharray = ol;
        outline.style.strokeDashoffset = ol;
        tl.to(outline, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0);
      }
    }

    if (svc === 'samolepky') {
      var stOutline = card.querySelector('.sticker-outline');
      var peel = card.querySelector('.sticker-peel');
      if (stOutline) {
        var sl = stOutline.getTotalLength();
        stOutline.style.strokeDasharray = sl;
        stOutline.style.strokeDashoffset = sl;
        tl.to(stOutline, { strokeDashoffset: 0, duration: 0.85, ease: 'none' }, 0);
      }
      if (peel) { tl.to(peel, { rotate: -16, transformOrigin: '96px 96px', duration: 0.3, ease: 'none' }, 0.85); }
    }

    if (svc === 'dtf') {
      var press = card.querySelector('.dtf-press');
      var motif = card.querySelector('.dtf-motif');
      if (press) {
        tl.fromTo(press, { y: -10 }, { y: 44, duration: 0.6, ease: 'none' }, 0)
          .to(press, { y: -10, duration: 0.4, ease: 'none' }, 0.6);
      }
      if (motif) { tl.to(motif, { opacity: 1, scale: 1, duration: 0.4, ease: 'none' }, 0.5); }
    }

    if (svc === 'weby') {
      var lines = card.querySelectorAll('.web-line');
      var browser = card.querySelector('.web-browser');
      tl.to(lines, { scaleX: 1, duration: 0.6, ease: 'none', stagger: 0.12 }, 0);
      if (browser) {
        tl.to(lines, { opacity: 0, duration: 0.3, ease: 'none' }, 0.75)
          .to(browser, { opacity: 1, duration: 0.35, ease: 'none' }, 0.75);
      }
    }

    return tl;
  }

  /* ---------- Responzivní větev: desktop pin vs. mobilní karty ---------- */
  var mm = gsap.matchMedia();

  mm.add('(min-width: 861px)', function () {
    var scrollLength = function () { return Math.max(track.scrollWidth - window.innerWidth, 0); };

    var horizontalTween = gsap.to(track, {
      x: function () { return -scrollLength(); },
      ease: 'none',
      scrollTrigger: {
        trigger: pinWrap,
        start: 'top top',
        end: function () { return '+=' + scrollLength(); },
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    cards.forEach(function (card) {
      buildCardTimeline(card, {
        trigger: card,
        containerAnimation: horizontalTween,
        start: 'left 82%',
        end: 'left 35%',
        scrub: true
      });
    });

    return function () { /* GSAP matchMedia úklid řeší samo (revert) */ };
  });

  mm.add('(max-width: 860px)', function () {
    cards.forEach(function (card) {
      buildCardTimeline(card, {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none none'
      });
    });
    return function () { };
  });
})();
