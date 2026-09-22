/* ============================================================
   MPMDESIGN – kontaktní formulář (Formspree).

   Nastavení: vytvořte formulář na https://formspree.io a vložte
   jeho endpoint sem, místo placeholderu. Formulář pak odesílá
   data přes fetch (bez opuštění stránky) a zobrazí stav odeslání.
   ============================================================ */
(function () {
  'use strict';

  // ==== Sem vložte skutečný Formspree endpoint ====
  var FORMSPREE_ENDPOINT = 'https://formspree.io/f/VÁŠ_FORMULÁŘ';

  var form = document.getElementById('contactForm');
  if (!form) return;

  var status = document.getElementById('contactStatus');
  var submitBtn = form.querySelector('button[type="submit"]');

  // Předvyplnění služby z odkazu, např. index.html#kontakt?sluzba=laser
  var params = new URLSearchParams(window.location.search);
  var presetService = params.get('sluzba');
  if (presetService) {
    var select = form.querySelector('#service');
    if (select) {
      var option = Array.prototype.slice.call(select.options).filter(function (o) { return o.value === presetService; })[0];
      if (option) { option.selected = true; }
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (FORMSPREE_ENDPOINT.indexOf('VÁŠ_FORMULÁŘ') !== -1) {
      status.textContent = 'Formulář zatím není napojený – napište prosím na mpmdesign@outlook.cz.';
      status.className = 'contact-status err';
      return;
    }

    status.textContent = 'Odesílám…';
    status.className = 'contact-status';
    submitBtn.disabled = true;

    fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form)
    })
      .then(function (response) {
        if (response.ok) {
          status.textContent = 'Děkujeme! Poptávka byla odeslána, ozveme se co nejdříve.';
          status.className = 'contact-status ok';
          form.reset();
        } else {
          status.textContent = 'Odeslání se nepovedlo. Zkuste to prosím znovu nebo napište na mpmdesign@outlook.cz.';
          status.className = 'contact-status err';
        }
      })
      .catch(function () {
        status.textContent = 'Odeslání se nepovedlo – zkontrolujte připojení nebo napište na mpmdesign@outlook.cz.';
        status.className = 'contact-status err';
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
})();
