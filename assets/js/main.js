/* =========================================================================
   Chilla Chaska — site behaviour
   ========================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- theme */
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); }
    catch (e) { return null; }
  }

  var saved = store('cc-theme');
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = dark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store('cc-theme', next);
      themeBtn.setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
  }

  /* ---------------------------------------------------------- mobile menu */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ------------------------------------------------ header + progress bar */
  var head = document.querySelector('.site-head');
  var progress = document.getElementById('progress');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || 0;
    if (head) head.classList.toggle('is-stuck', y > 8);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ------------------------------------------------------- scroll reveals */
  var revealables = document.querySelectorAll('.reveal, .step, .dot-test');

  if ('IntersectionObserver' in window && !reduced) {
    root.classList.add('js-anim');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
          if (en.target.hasAttribute('data-count')) countUp(en.target);
          var counters = en.target.querySelectorAll('[data-count]');
          Array.prototype.forEach.call(counters, countUp);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    Array.prototype.forEach.call(revealables, function (el) { io.observe(el); });

    /* failsafe: nothing stays hidden if the observer never fires */
    window.setTimeout(function () {
      Array.prototype.forEach.call(revealables, function (el) { el.classList.add('in'); });
    }, 2600);
  } else {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add('in'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el) {
      el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
    });
  }

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced || isNaN(target)) { el.textContent = target + suffix; return; }
    var start = performance.now(), dur = 1100;
    (function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ------------------------------------------------------- active nav link */
  var sections = document.querySelectorAll('section[id]');
  var navLinks = {};
  Array.prototype.forEach.call(document.querySelectorAll('#nav a[href^="#"]'), function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = navLinks[en.target.id];
        if (!link) return;
        if (en.isIntersecting) {
          Object.keys(navLinks).forEach(function (k) { navLinks[k].classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Array.prototype.forEach.call(sections, function (s) { spy.observe(s); });
  }

  /* ============================================================ chilla lab */

  var ICON = {
    besan: 'i-besan', dal: 'i-dal', oats: 'i-oats', paneer: 'i-paneer', cheese: 'i-cheese',
    corn: 'i-corn', onion: 'i-onion', tomato: 'i-tomato', chilli: 'i-chilli', leaf: 'i-leaf',
    capsicum: 'i-capsicum', carrot: 'i-carrot', egg: 'i-egg', curd: 'i-curd', ghee: 'i-ghee',
    spice: 'i-spice', salt: 'i-salt', lemon: 'i-lemon', soya: 'i-soya', sprout: 'i-sprout'
  };

  var CHILLAS = [
    {
      id: 'besan',
      name: 'Besan Chilla',
      price: 69,
      seed: 7,
      tagline: 'The original',
      desc: 'Stone-ground gram flour, carom seed and a fistful of coriander, spread thin on a 210 °C tawa until the rim turns to lace. Nothing else. This is the one we are judged on.',
      spec: { protein: '11 g', kcal: '240', cook: '6 min', heat: 'Mild' },
      groups: [
        { label: 'In the batter', items: [
          ['Besan', 'stone-ground gram flour', 'besan'],
          ['Ajwain', 'carom seed', 'spice'],
          ['Haldi', 'turmeric', 'spice'],
          ['Hing', 'asafoetida', 'spice'],
          ['Rock salt', '', 'salt']
        ]},
        { label: 'Folded in fresh', items: [
          ['Onion', 'fine dice', 'onion'],
          ['Tomato', 'deseeded', 'tomato'],
          ['Green chilli', '', 'chilli'],
          ['Coriander', 'stems included', 'leaf']
        ]},
        { label: 'On the tawa & on the side', items: [
          ['Cold-pressed oil', '5 ml', 'ghee'],
          ['Green chutney', 'coriander · mint · lemon', 'leaf'],
          ['Curd', '60 g, set fresh', 'curd']
        ]}
      ],
      badges: ['Vegan on request', 'Gluten-free', 'No maida', 'No food colour'],
      art: { base: '#F2C14A', edge: '#DE9F2A', flecks: ['#3F7D34', '#C93A2E', '#FFF0C2', '#8A5A1E'], stuffed: false },
      pins: [
        { x: 9,  y: 52, t: 'Lace edge',        d: 'Thin batter meeting a screaming tawa. The rim blisters and sets into a brittle lattice — that crunch is the whole point.' },
        { x: 47, y: 25, t: 'Coriander & chilli', d: 'Chopped and folded in at the last second so they stay green and raw-sharp instead of stewing into the batter.' },
        { x: 68, y: 57, t: 'Ajwain pockets',   d: 'Carom seed blisters as the batter sets. It is the reason a besan chilla never sits heavy an hour later.' },
        { x: 36, y: 74, t: 'Tawa-kissed base', d: 'One face goes matte and toasted. That is the side we lay down in the box so the lace side stays dry.' },
        { x: 84, y: 34, t: 'Chutney well',     d: 'Coriander, mint, green chilli and lemon, ground every morning. Travels in its own sealed pot, never on the chilla.' }
      ]
    },
    {
      id: 'moong',
      name: 'Moong Dal Chilla',
      price: 89,
      seed: 21,
      tagline: 'Soaked, ground, never a powder',
      desc: 'Yellow moong soaked four hours and wet-ground the same morning — no instant flour. It gives a softer, almost savoury-pancake middle with a shatteringly thin edge.',
      spec: { protein: '14 g', kcal: '260', cook: '7 min', heat: 'Mild' },
      groups: [
        { label: 'Ground the same morning', items: [
          ['Yellow moong dal', 'soaked 4 hrs', 'dal'],
          ['Ginger', 'fresh', 'spice'],
          ['Green chilli', '', 'chilli'],
          ['Jeera', 'cumin', 'spice'],
          ['Rock salt', '', 'salt']
        ]},
        { label: 'Folded in fresh', items: [
          ['Onion', '', 'onion'],
          ['Carrot', 'grated', 'carrot'],
          ['Coriander', '', 'leaf']
        ]},
        { label: 'On the tawa & on the side', items: [
          ['Cold-pressed oil', '5 ml', 'ghee'],
          ['Green chutney', '', 'leaf']
        ]}
      ],
      badges: ['Vegan on request', 'Gluten-free', 'No maida', 'Slow-digesting carbs'],
      art: { base: '#E9D26E', edge: '#C9A93C', flecks: ['#E07A2C', '#3F7D34', '#FFF6D0', '#9A7A2A'], stuffed: false },
      pins: [
        { x: 12, y: 44, t: 'Wet-ground batter', d: 'Soaked dal ground with water, not dal flour mixed with water. The difference shows in the texture within one bite.' },
        { x: 52, y: 22, t: 'Carrot shreds',     d: 'Grated fine so they cook through in the same minute the chilla does — sweetness against the ginger.' },
        { x: 70, y: 60, t: 'Jeera & ginger',    d: 'Ground into the batter rather than sprinkled, so the heat is even instead of arriving in bursts.' },
        { x: 33, y: 76, t: 'Soft middle',       d: 'Moong sets softer than besan. We keep the centre slightly thicker so it stays tender on a 30-minute delivery.' },
        { x: 86, y: 38, t: 'Rested 20 minutes', d: 'The batter rests before it hits the tawa. Skip that and the chilla tears when you spread it.' }
      ]
    },
    {
      id: 'oats',
      name: 'Oats Chilla',
      price: 109,
      seed: 34,
      tagline: 'The fibre one',
      desc: 'Rolled oats blitzed coarse, bound with besan and curd, packed with spinach. Nutty, a little chewy, and the one our regulars order on a Monday.',
      spec: { protein: '12 g', kcal: '250', cook: '7 min', heat: 'Mild' },
      groups: [
        { label: 'In the batter', items: [
          ['Rolled oats', 'blitzed coarse', 'oats'],
          ['Besan', 'to bind', 'besan'],
          ['Curd', 'for tang', 'curd'],
          ['Jeera', '', 'spice'],
          ['Rock salt', '', 'salt']
        ]},
        { label: 'Folded in fresh', items: [
          ['Spinach', 'chiffonade', 'leaf'],
          ['Onion', '', 'onion'],
          ['Green chilli', '', 'chilli'],
          ['Coriander', '', 'leaf']
        ]},
        { label: 'On the tawa & on the side', items: [
          ['Ghee', 'brushed, 5 g', 'ghee'],
          ['Curd', '60 g', 'curd']
        ]}
      ],
      badges: ['6 g fibre', 'No maida', 'No added sugar', 'Contains dairy'],
      art: { base: '#DDCBA2', edge: '#BCA478', flecks: ['#2F6B3A', '#8B6A3A', '#FFF6E0', '#5E8F45'], stuffed: false },
      pins: [
        { x: 11, y: 50, t: 'Coarse, not floured', d: 'Oats are pulsed to a rubble, never to powder. You should be able to feel them.' },
        { x: 49, y: 24, t: 'Spinach ribbons',     d: 'Cut into ribbons and folded in cold so they wilt on the tawa and keep their colour.' },
        { x: 71, y: 58, t: 'Curd in the batter',  d: 'A spoon of curd relaxes the oats and gives the batter a faint sourness that carries the salt.' },
        { x: 34, y: 75, t: 'Chewier crumb',       d: 'Oats hold more water, so this one stays soft longer in the box than a thin besan chilla.' },
        { x: 85, y: 36, t: 'Ghee brush',          d: 'Brushed, not poured. Enough to toast the surface without leaving the chilla greasy.' }
      ]
    },
    {
      id: 'paneer',
      name: 'Paneer Chilla',
      price: 129,
      seed: 58,
      tagline: 'Stuffed & folded',
      desc: 'A besan chilla spread wide, loaded with 60 g of paneer crumbled with capsicum, onion and chaat masala, then folded over while the base is still setting.',
      spec: { protein: '22 g', kcal: '380', cook: '9 min', heat: 'Mild' },
      groups: [
        { label: 'In the batter', items: [
          ['Besan', '', 'besan'],
          ['Ajwain', '', 'spice'],
          ['Haldi', '', 'spice'],
          ['Rock salt', '', 'salt']
        ]},
        { label: 'The stuffing', items: [
          ['Fresh paneer', '60 g, crumbled', 'paneer'],
          ['Capsicum', 'fine dice', 'capsicum'],
          ['Onion', '', 'onion'],
          ['Chaat masala', '', 'spice'],
          ['Coriander', '', 'leaf']
        ]},
        { label: 'On the tawa & on the side', items: [
          ['Ghee', 'brushed', 'ghee'],
          ['Green chutney', '', 'leaf'],
          ['Curd', '60 g', 'curd']
        ]}
      ],
      badges: ['22 g protein', 'Gluten-free', 'No maida', 'Contains dairy'],
      art: { base: '#F0BE45', edge: '#D99722', flecks: ['#FFFFFF', '#3F7D34', '#C93A2E', '#7FA13C'], stuffed: true, fill: ['#FFFBF0', '#F3F0E2', '#5E9540', '#E4913A'] },
      pins: [
        { x: 10, y: 46, t: 'Fold line',        d: 'Folded while the base is still tacky so the two halves weld instead of sliding apart in the box.' },
        { x: 50, y: 30, t: 'Paneer crumble',   d: '60 g of paneer set that morning, crumbled rather than cubed so every bite gets some.' },
        { x: 72, y: 62, t: 'Capsicum dice',    d: 'Cut to 4 mm. Big enough to stay crunchy through the fold, small enough not to tear the chilla.' },
        { x: 32, y: 74, t: 'Sealed edge',      d: 'We press the rim down for five seconds. It keeps the stuffing in and gives you a crisp handle.' },
        { x: 86, y: 40, t: 'Chaat masala hit', d: 'Dusted over the stuffing, not the batter — so the sourness lands on the paneer where you notice it.' }
      ]
    },
    {
      id: 'corn',
      name: 'Corn Cheese Chilla',
      price: 149,
      seed: 77,
      tagline: 'The one kids finish',
      desc: 'Sweet corn and mozzarella folded into a besan-and-sooji base, with oregano and chilli flakes. Melty in the middle, crisp at the rim — our easiest sell to a table of four.',
      spec: { protein: '16 g', kcal: '430', cook: '8 min', heat: 'Mild' },
      groups: [
        { label: 'In the batter', items: [
          ['Besan', '', 'besan'],
          ['Fine sooji', 'for extra crisp', 'besan'],
          ['Oregano', '', 'spice'],
          ['Rock salt', '', 'salt']
        ]},
        { label: 'The stuffing', items: [
          ['Sweet corn', 'steamed', 'corn'],
          ['Mozzarella', 'grated', 'cheese'],
          ['Capsicum', '', 'capsicum'],
          ['Chilli flakes', '', 'chilli']
        ]},
        { label: 'On the tawa & on the side', items: [
          ['Butter', 'brushed', 'ghee'],
          ['Green chutney', '', 'leaf']
        ]}
      ],
      badges: ['Kid-friendly', 'No maida', 'Contains dairy', 'Melts best hot'],
      art: { base: '#F5CB5C', edge: '#DFA733', flecks: ['#FFE27A', '#F7F2DA', '#3F7D34', '#D8562F'], stuffed: true, fill: ['#FFD95E', '#FFF4C9', '#F6EFD6', '#5E9540'] },
      pins: [
        { x: 11, y: 48, t: 'Sooji in the mix',   d: 'A quarter part fine sooji. It drinks less oil and holds the crunch longer than besan alone.' },
        { x: 51, y: 27, t: 'Corn, steamed first', d: 'Steamed before it goes in, so it bursts sweet instead of staying starchy.' },
        { x: 71, y: 60, t: 'Mozzarella pull',    d: 'Grated fine and added last, under the fold, where the residual heat melts it without leaking.' },
        { x: 33, y: 75, t: 'Vented for delivery', d: 'This one goes out in a vented box. Trapped steam is what turns a cheese chilla soggy.' },
        { x: 86, y: 37, t: 'Oregano & flakes',   d: 'In the batter, not on top — so the herb flavour survives the fold and the ride.' }
      ]
    },
    {
      id: 'protein',
      name: 'High-Protein Chilla',
      price: 199,
      seed: 99,
      tagline: '32 g, no powder',
      desc: 'Moong dal ground with soya granules, stuffed with paneer and sprouts, finished with cracked pepper. Thirty-two grams of protein from food, not from a scoop.',
      spec: { protein: '32 g', kcal: '410', cook: '10 min', heat: 'Medium' },
      groups: [
        { label: 'Ground the same morning', items: [
          ['Yellow moong dal', 'soaked 4 hrs', 'dal'],
          ['Soya granules', 'rehydrated', 'soya'],
          ['Ginger', '', 'spice'],
          ['Green chilli', '', 'chilli'],
          ['Jeera', '', 'spice']
        ]},
        { label: 'The stuffing', items: [
          ['Fresh paneer', '50 g', 'paneer'],
          ['Moong sprouts', '', 'sprout'],
          ['Onion', '', 'onion'],
          ['Cracked pepper', '', 'spice']
        ]},
        { label: 'On the tawa & on the side', items: [
          ['Ghee', 'brushed', 'ghee'],
          ['Mint chutney', '', 'leaf'],
          ['Curd', '60 g', 'curd']
        ]}
      ],
      badges: ['32 g protein', 'No whey, no powder', 'No maida', 'Contains dairy & soya'],
      art: { base: '#DFC469', edge: '#BC9E3C', flecks: ['#FFFFFF', '#4E7A34', '#2F2F2F', '#C08840'], stuffed: true, fill: ['#FFFDF4', '#8FBF5E', '#F0EBD8', '#4E7A34'] },
      pins: [
        { x: 10, y: 45, t: 'Soya, rehydrated',  d: 'Granules soaked and squeezed dry before grinding. Dry granules make the batter gritty.' },
        { x: 50, y: 28, t: 'Sprouts, raw',      d: 'Added raw under the fold so they keep their snap and their vitamin load.' },
        { x: 73, y: 60, t: 'Paneer, 50 g',      d: 'Half the stuffing by weight. Together with the dal base this is where the 32 g comes from.' },
        { x: 32, y: 76, t: 'Thicker spread',    d: 'Spread a shade thicker than a classic chilla, which is why it takes ten minutes, not six.' },
        { x: 86, y: 38, t: 'Cracked pepper',    d: 'Cracked to order over the stuffing. It is the medium-heat note the milder chillas do not have.' }
      ]
    }
  ];

  /* seeded pseudo-random so the art is stable per variant */
  function seeded(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  var art = document.getElementById('chillaArt');
  var pinLayer = document.getElementById('pinLayer');
  var note = document.getElementById('hotNote');
  var panel = document.getElementById('recipePanel');
  var picker = document.getElementById('variantPicker');

  function drawChilla(v) {
    var a = v.art, rnd = seeded(v.seed), out = [];
    var cx = 160, cy = 165, R = 120;

    function flecks(n, ymin, ymax, scale) {
      var s = '';
      for (var i = 0; i < n; i++) {
        var ang = rnd() * Math.PI * 2;
        var rad = R * 0.94 * Math.sqrt(rnd());
        var x = cx + rad * Math.cos(ang);
        var y = cy + rad * Math.sin(ang);
        if (y < ymin || y > ymax) continue;
        var r = (1.6 + rnd() * 3.2) * (scale || 1);
        var c = a.flecks[(rnd() * a.flecks.length) | 0];
        s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) +
             '" fill="' + c + '" opacity="' + (0.55 + rnd() * 0.45).toFixed(2) + '"/>';
      }
      return s;
    }

    /* pores in the crust */
    function pores(n, ymin, ymax) {
      var s = '';
      for (var i = 0; i < n; i++) {
        var ang = rnd() * Math.PI * 2;
        var rad = R * 0.96 * Math.sqrt(rnd());
        var x = cx + rad * Math.cos(ang);
        var y = cy + rad * Math.sin(ang);
        if (y < ymin || y > ymax) continue;
        s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (1 + rnd() * 2.4).toFixed(1) +
             '" fill="' + a.edge + '" opacity="' + (0.18 + rnd() * 0.22).toFixed(2) + '"/>';
      }
      return s;
    }

    out.push('<ellipse cx="' + cx + '" cy="' + (cy + R - 4) + '" rx="' + (R * 0.86) + '" ry="16" fill="rgba(20,40,26,.16)"/>');

    /* base disc, roughened by the displacement filter */
    out.push('<g filter="url(#lace)">');
    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + a.base + '"/>');
    out.push(pores(70, -999, 999));
    out.push(flecks(a.stuffed ? 34 : 62, -999, 999));
    out.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 3) + '" fill="none" stroke="' + a.edge + '" stroke-width="7" opacity=".85"/>');
    out.push('</g>');

    if (a.stuffed) {
      /* stuffing peeking along the fold line */
      var fill = a.fill || a.flecks, blobs = '';
      for (var i = 0; i < 26; i++) {
        var x = cx - R * 0.82 + rnd() * R * 1.64;
        var y = cy - 6 + rnd() * 30;
        var rx = 6 + rnd() * 10, ry = 4 + rnd() * 7;
        blobs += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + rx.toFixed(1) +
                 '" ry="' + ry.toFixed(1) + '" fill="' + fill[(rnd() * fill.length) | 0] +
                 '" transform="rotate(' + ((rnd() * 60 - 30) | 0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
      }
      out.push('<g filter="url(#soft)">' + blobs + '</g>');

      /* the folded half, laid over the bottom */
      out.push('<g filter="url(#lace)">');
      out.push('<path d="M ' + (cx - R) + ' ' + cy + ' A ' + R + ' ' + R + ' 0 0 0 ' + (cx + R) + ' ' + cy + ' Z" fill="' + a.base + '"/>');
      out.push(pores(46, cy, 999));
      out.push(flecks(30, cy, 999));
      out.push('<path d="M ' + (cx - R) + ' ' + cy + ' A ' + R + ' ' + R + ' 0 0 0 ' + (cx + R) + ' ' + cy + ' Z" fill="none" stroke="' + a.edge + '" stroke-width="7" opacity=".85"/>');
      out.push('</g>');
      out.push('<path d="M ' + (cx - R + 6) + ' ' + cy + ' L ' + (cx + R - 6) + ' ' + cy + '" stroke="' + a.edge + '" stroke-width="3" opacity=".5" stroke-linecap="round"/>');
    }

    /* warm highlight */
    out.push('<ellipse cx="' + (cx - 34) + '" cy="' + (cy - 46) + '" rx="46" ry="26" fill="#FFFFFF" opacity=".16" transform="rotate(-22 ' + (cx - 34) + ' ' + (cy - 46) + ')"/>');

    art.innerHTML = out.join('');
  }

  function iconRef(key) {
    return '<svg aria-hidden="true"><use href="#' + (ICON[key] || 'i-spice') + '"></use></svg>';
  }

  function drawPins(v) {
    pinLayer.innerHTML = v.pins.map(function (p, i) {
      return '<button class="hot" type="button" style="--x:' + p.x + '%;--y:' + p.y + '%;--pd:' + (i * 0.4) + 's" ' +
        'data-i="' + i + '" aria-label="' + p.t + '">' + (i + 1) + '</button>';
    }).join('');
    setNote(v.pins[0]);
  }

  function setNote(p) {
    if (!note) return;
    note.innerHTML = '<b>' + p.t + '</b><p>' + p.d + '</p>';
  }

  function drawPanel(v) {
    var groups = v.groups.map(function (g) {
      return '<h4 class="ing-head">' + g.label + '</h4><ul class="ings">' + g.items.map(function (it) {
        return '<li>' + iconRef(it[2]) + '<span>' + it[0] + (it[1] ? ' <small>' + it[1] + '</small>' : '') + '</span></li>';
      }).join('') + '</ul>';
    }).join('');

    panel.innerHTML =
      '<div class="recipe-top"><div><h3>' + v.name + '</h3>' +
      '<p class="tag" style="margin-top:8px;display:inline-block">' + v.tagline + '</p></div>' +
      '<div class="price rupee">₹' + v.price + '</div></div>' +
      '<p class="recipe-desc">' + v.desc + '</p>' +
      '<dl class="spec">' +
      '<div><dt>Protein</dt><dd>' + v.spec.protein + '</dd></div>' +
      '<div><dt>Energy</dt><dd>' + v.spec.kcal + '<span style="font-size:.6em"> kcal</span></dd></div>' +
      '<div><dt>On the tawa</dt><dd>' + v.spec.cook + '</dd></div>' +
      '<div><dt>Heat</dt><dd>' + v.spec.heat + '</dd></div>' +
      '</dl>' + groups +
      '<div class="allergen">' + v.badges.map(function (b) {
        return '<span class="chip">' + iconRef('leaf') + b + '</span>';
      }).join('') + '</div>';
  }

  function selectVariant(id) {
    var v = CHILLAS.filter(function (c) { return c.id === id; })[0] || CHILLAS[0];
    if (art) drawChilla(v);
    if (pinLayer) drawPins(v);
    if (panel) drawPanel(v);
    if (picker) {
      Array.prototype.forEach.call(picker.querySelectorAll('.variant'), function (b) {
        b.setAttribute('aria-selected', String(b.dataset.v === v.id));
      });
    }
    return v;
  }

  var current = null;

  if (picker) {
    picker.innerHTML = CHILLAS.map(function (c) {
      return '<button class="variant" type="button" role="tab" data-v="' + c.id + '" aria-selected="false">' + c.name + '</button>';
    }).join('');
    picker.addEventListener('click', function (e) {
      var b = e.target.closest('.variant');
      if (b) current = selectVariant(b.dataset.v);
    });
  }

  if (pinLayer) {
    pinLayer.addEventListener('click', function (e) {
      var b = e.target.closest('.hot');
      if (!b || !current) return;
      Array.prototype.forEach.call(pinLayer.querySelectorAll('.hot'), function (h) { h.classList.remove('is-on'); });
      b.classList.add('is-on');
      setNote(current.pins[+b.dataset.i]);
    });
  }

  if (art || panel) current = selectVariant('besan');

  /* ------------------------------------------------------------ menu tabs */
  var tabs = document.getElementById('menuTabs');
  if (tabs) {
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var cat = b.dataset.cat;
      Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-selected', String(x === b));
      });
      var n = 0;
      Array.prototype.forEach.call(document.querySelectorAll('.menu-row'), function (row) {
        var show = cat === 'all' || row.dataset.cat === cat;
        row.hidden = !show;
        if (show) { row.style.animationDelay = (n * 0.035) + 's'; n++; }
      });
      /* restart the stagger */
      var grid = document.getElementById('menuGrid');
      if (grid) { grid.style.animation = 'none'; void grid.offsetWidth; grid.style.animation = ''; }
    });
  }

  /* --------------------------------------------------------------- form */
  var form = document.getElementById('leadForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.querySelector('#leadName') || {}).value || 'there';
      var ok = document.getElementById('formOk');
      if (ok) {
        ok.hidden = false;
        ok.textContent = 'Thanks, ' + name.split(' ')[0] + '. Nothing was sent — this form needs to be wired to your mailer or WhatsApp Business number before launch.';
        ok.focus();
      }
    });
  }

  /* ------------------------------------------------------ smooth anchors */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
  });

  /* -------------------------------------------------------- year stamp */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
