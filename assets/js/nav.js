(function () {
  function initDropdowns() {
    var dropdowns = Array.prototype.slice.call(document.querySelectorAll('.nav-dropdown'));
    if (!dropdowns.length) return;

    function closeAll() {
      dropdowns.forEach(function (dropdown) {
        dropdown.classList.remove('open');
        var toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }

    dropdowns.forEach(function (dropdown) {
      var toggle = dropdown.querySelector('.dropdown-toggle');
      if (!toggle) return;

      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var wasOpen = dropdown.classList.contains('open');
        closeAll();
        if (!wasOpen) {
          dropdown.classList.add('open');
          toggle.setAttribute('aria-expanded', 'true');
        }
      });

      dropdown.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          dropdown.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      });
    });

    document.addEventListener('click', closeAll);
  }

  // Hamburger menu na mobilu - aktivuje se jen na strankach, ktere maji
  // tlacitko .nav-toggle a panel #mobileNav (viz index.html pro vzor).
  // Na strankach bez teto znacky se nic nestane.
  function initHamburger() {
    var toggle = document.querySelector('.nav-toggle');
    var panel = document.getElementById('mobileNav');
    if (!toggle || !panel) return;

    function closeMenu() {
      panel.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }

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

  function init() {
    initDropdowns();
    initHamburger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
