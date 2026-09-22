(function () {
  'use strict';

  // ==== Lemon Squeezy – uprav pouze tyto dvě konstanty ====
  // Vlož sem skutečné odkazy na checkout z Lemon Squeezy (Produkty -> Checkout link).
  var LEMONSQUEEZY_PAID_URL = '[ODKAZ NA PLACENÝ PRODUKT]';
  var LEMONSQUEEZY_FREE_URL = '[ODKAZ NA UKÁZKU ZDARMA]';

  var links = {
    paid: document.querySelectorAll('[data-ls="paid"]'),
    free: document.querySelectorAll('[data-ls="free"]')
  };

  links.paid.forEach(function (el) { el.setAttribute('href', LEMONSQUEEZY_PAID_URL); });
  links.free.forEach(function (el) { el.setAttribute('href', LEMONSQUEEZY_FREE_URL); });

  // ==== Scroll animace knihy (GSAP + ScrollTrigger) ====
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSmallScreen = window.matchMedia('(max-width: 640px)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  if (prefersReducedMotion || !hasGsap) {
    document.documentElement.classList.add('book-static');
    var hint = document.getElementById('bookHint');
    if (hint) { hint.textContent = 'Vectric – praktický průvodce ve 19 kapitolách.'; }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.book-scene',
      start: 'top 80%',
      end: isSmallScreen ? 'bottom 55%' : 'bottom 20%',
      scrub: 1
    }
  });

  // Text s obsahem kapitol leží na ploché .book-spread (nikdy se neotáčí),
  // takže zůstává čitelný po celou animaci – otáčí se jen deska a dva
  // prázdné listy, které ji na začátku zakrývají.
  if (isSmallScreen) {
    // Zjednodušená animace pro mobil – jeden plynulý krok místo postupného listování.
    tl.to('.book', { rotateY: -22, rotateX: 4, duration: 1 })
      .to('.book-cover-front', { rotateY: -150, duration: 1 }, '<0.1')
      .to(['.book-page1', '.book-page2'], { rotateY: -115, duration: 1 }, '<0.1')
      .to('.book-spread', { opacity: 1, duration: 0.6 }, '-=0.4');
  } else {
    tl.to('.book', { rotateY: -28, rotateX: 6, duration: 1 })
      .to('.book-cover-front', { rotateY: -160, duration: 1.2 }, '<')
      .to('.book-page1', { rotateY: -135, duration: 1 }, '-=0.9')
      .to('.book-page2', { rotateY: -115, duration: 1 }, '-=0.8')
      .to('.book-spread', { opacity: 1, duration: 0.6 }, '-=0.4');
  }
})();
