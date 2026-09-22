/* ============================================================
   MPMDESIGN – hero: "CNC frézuje logo".
   Fréza (vřeteno) při scrollu objíždí dráhu skutečného loga
   (logo1.svg, vykreslené inline v HTML) přes stroke-dashoffset,
   za sebou nechává odlétat třísky (canvas), na konci se logo
   vyplní barvami a objeví se slogan s tlačítky.

   PŘEPÍNÁNÍ NA SEKVENCI SNÍMKŮ Z BLENDERU
   ----------------------------------------
   Až budou hotové vyrenderované WebP snímky, stačí:
     1) uložit je do assets/hero-frames/ pojmenované podle
        HERO_FRAMES.pattern (výchozí: frame-0001.webp, frame-0002.webp, …)
     2) nastavit HERO_FRAMES.count na skutečný počet snímků
     3) přepnout HERO_MODE na 'frames'
   Pokud snímky chybí nebo se nepodaří načíst, skript se sám
   vrátí na SVG verzi (žádné rozbité canvasy).
   ============================================================ */
(function () {
  'use strict';

  // ==== Sem se přepíná režim hera – jedna konstanta ====
  var HERO_MODE = 'svg'; // 'svg' | 'frames'

  var HERO_FRAMES = {
    folder: 'assets/hero-frames/',
    count: 90,
    pad: 4, // frame-0001.webp
    ext: 'webp'
  };

  var hero = document.getElementById('hero');
  if (!hero) return;

  var state = window.MPM_HOME || {
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isMobile: window.matchMedia('(max-width: 768px)').matches,
    hasGsap: typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'
  };

  var copy = hero.querySelector('.hero-copy');

  // Statická/bez-GSAP varianta: finální stav rovnou, žádné piny.
  if (state.prefersReducedMotion || !state.hasGsap) {
    if (copy) { copy.style.opacity = '1'; copy.style.transform = 'none'; }
    var staticPaths = hero.querySelectorAll('.hero-svg path');
    staticPaths.forEach(function (p) {
      p.style.fill = p.getAttribute('data-fill') || '#1B4B9B';
      p.style.stroke = 'transparent';
    });
    return;
  }

  if (HERO_MODE === 'frames') {
    initFrameSequence();
  } else {
    initSvgDraw();
  }

  /* ---------- Režim A: SVG kreslí frézu skutečné logo ---------- */
  function initSvgDraw() {
    var svg = hero.querySelector('.hero-svg');
    var paths = Array.prototype.slice.call(hero.querySelectorAll('.hero-svg path'));
    var spindle = hero.querySelector('.hero-spindle');
    var canvas = hero.querySelector('.hero-canvas');
    if (!svg || !paths.length) return;

    // Připravit každou dráhu jako skrytou (stroke-dashoffset = celá délka).
    paths.forEach(function (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });

    var particles = initParticles(canvas, svg);
    var useParticles = !state.isMobile && !!particles;
    var useMotionPath = typeof window.MotionPathPlugin !== 'undefined' && spindle;

    var tl = gsap.timeline({
      scrollTrigger: state.isMobile
        ? { trigger: hero, start: 'top 75%', once: true }
        : {
            trigger: hero,
            start: 'top top',
            end: '+=' + Math.max(window.innerHeight * 1.6, 1400),
            scrub: 1,
            pin: true,
            anticipatePin: 1
          }
    });

    if (useMotionPath) { tl.set(spindle, { opacity: 1 }); }

    paths.forEach(function (p, i) {
      var len = parseFloat(p.style.strokeDasharray);
      var pos = i === 0 ? 0 : '-=0.05';
      tl.to(p, { strokeDashoffset: 0, duration: 1, ease: 'none' }, pos);
      if (useMotionPath) {
        tl.to(spindle, {
          motionPath: { path: p, align: p, alignOrigin: [0.5, 0.5], autoRotate: true },
          duration: 1,
          ease: 'none',
          onUpdate: useParticles ? function () { particles.spawnFromElement(spindle); } : undefined
        }, '<');
      }
      // Bez MotionPath aspoň naznačíme postup třískami podél délky dráhy.
      if (!useMotionPath && useParticles) {
        var proxy = { d: len };
        tl.to(proxy, {
          d: 0,
          duration: 1,
          ease: 'none',
          onUpdate: function () {
            var pt = p.getPointAtLength(len - proxy.d);
            particles.spawnAt(pt.x, pt.y, svg);
          }
        }, '<');
      }
    });

    tl.to(paths, {
      fill: function (i, target) { return target.getAttribute('data-fill') || '#1B4B9B'; },
      stroke: 'transparent',
      duration: 0.6
    }, '+=0.05');

    if (spindle) { tl.to(spindle, { opacity: 0, duration: 0.3 }, '<'); }
    if (particles) { tl.call(particles.stop); }

    tl.to(copy, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.2');

    var hint = hero.querySelector('.hero-scroll-hint');
    if (hint && !state.isMobile) {
      gsap.to(hint, { opacity: 0, scrollTrigger: { trigger: hero, start: 'top top', end: '+=200', scrub: true } });
    }
  }

  /* ---------- Lehký canvas systém třísek ---------- */
  function initParticles(canvas, svg) {
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext('2d');
    var list = [];
    var running = true;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      var rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function svgPointToLocal(x, y) {
      // Body z SVG viewBoxu převedeme na procenta -> pixely canvasu (stejný rozměr jako SVG).
      var vb = svg.viewBox.baseVal;
      var rect = canvas.getBoundingClientRect();
      return {
        x: ((x - vb.x) / vb.width) * rect.width,
        y: ((y - vb.y) / vb.height) * rect.height
      };
    }

    function spawnAt(svgX, svgY) {
      if (!running || list.length > 60) return;
      var p = svgPointToLocal(svgX, svgY);
      for (var i = 0; i < 2; i++) {
        list.push({
          x: p.x, y: p.y,
          vx: (Math.random() - 0.5) * 2.4,
          vy: -Math.random() * 1.8 - 0.4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          size: 2 + Math.random() * 3,
          life: 1
        });
      }
    }

    function spawnFromElement(el) {
      var svgRect = svg.getBoundingClientRect();
      var elRect = el.getBoundingClientRect();
      var vb = svg.viewBox.baseVal;
      var localX = ((elRect.left + elRect.width / 2 - svgRect.left) / svgRect.width) * vb.width + vb.x;
      var localY = ((elRect.top + elRect.height / 2 - svgRect.top) / svgRect.height) * vb.height + vb.y;
      spawnAt(localX, localY);
    }

    function tick() {
      if (!running) return;
      var rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#F5921E';
      for (var i = list.length - 1; i >= 0; i--) {
        var pt = list[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.08; pt.rot += pt.vr; pt.life -= 0.022;
        if (pt.life <= 0) { list.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(pt.life, 0);
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size * 0.6);
        ctx.restore();
      }
    }
    gsap.ticker.add(tick);

    return {
      spawnAt: spawnAt,
      spawnFromElement: spawnFromElement,
      stop: function () {
        running = false;
        gsap.ticker.remove(tick);
        var rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
      }
    };
  }

  /* ---------- Režim B: sekvence snímků z Blenderu ---------- */
  function initFrameSequence() {
    var canvas = hero.querySelector('.hero-canvas');
    var svgWrap = hero.querySelector('.hero-svg');
    if (!canvas) { initSvgDraw(); return; }

    var urls = [];
    for (var i = 1; i <= HERO_FRAMES.count; i++) {
      var n = String(i).padStart(HERO_FRAMES.pad, '0');
      urls.push(HERO_FRAMES.folder + 'frame-' + n + '.' + HERO_FRAMES.ext);
    }

    var images = new Array(urls.length);
    var loaders = urls.map(function (url, idx) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { images[idx] = img; resolve(true); };
        img.onerror = function () { resolve(false); };
        img.src = url;
      });
    });

    Promise.all(loaders).then(function (results) {
      var allOk = results.every(Boolean) && images[0];
      if (!allOk) {
        console.warn('MPMDESIGN: snímky heroFrames nenalezeny, vracím se na SVG hero.');
        initSvgDraw();
        return;
      }

      if (svgWrap) { svgWrap.style.display = 'none'; }
      var ctx = canvas.getContext('2d');
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resize() {
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        render(Math.round(frameProxy.frame));
      }

      function render(index) {
        var img = images[index] || images[0];
        var rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      }

      var frameProxy = { frame: 0 };
      window.addEventListener('resize', resize);
      resize();

      if (state.isMobile) {
        render(images.length - 1);
        if (copy) { copy.style.opacity = '1'; copy.style.transform = 'none'; }
        return;
      }

      gsap.to(frameProxy, {
        frame: images.length - 1,
        snap: 'frame',
        ease: 'none',
        onUpdate: function () { render(Math.round(frameProxy.frame)); },
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '+=' + Math.max(window.innerHeight * 1.6, 1400),
          scrub: 1,
          pin: true,
          anticipatePin: 1
        }
      });

      gsap.to(copy, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=' + Math.max(window.innerHeight * 1.6, 1400), scrub: 1 }
      });
    });
  }
})();
