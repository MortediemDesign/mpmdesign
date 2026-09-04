(function () {
  function init() {
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
