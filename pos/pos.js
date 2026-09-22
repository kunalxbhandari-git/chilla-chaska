/* =========================================================================
   Chilla Chaska POS — counter billing, KOT and day-end reporting.
   Local-first: everything lives in this browser. No server, works offline.
   ========================================================================= */
(function () {
  'use strict';

  var KEY = 'cc-pos-v1';
  var $ = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------------ defaults */
  var DEFAULT_MENU = [
    ['classic', 'Besan Chilla',          69,  'BC'],
    ['classic', 'Moong Dal Chilla',      89,  'MDC'],
    ['classic', 'Mixed Dal Chilla',      99,  'MIX'],
    ['classic', 'Oats Chilla',           109, 'OAT'],

    ['stuffed', 'Paneer Chilla',         129, 'PAN'],
    ['stuffed', 'Cheese Chilla',         139, 'CHZ'],
    ['stuffed', 'Masala Paneer Chilla',  149, 'MPN'],
    ['stuffed', 'Corn Cheese Chilla',    149, 'CCH'],
    ['stuffed', 'Paneer Tikka Chilla',   179, 'PTK'],

    ['protein', 'Egg Chilla',            139, 'EGG'],
    ['protein', 'Moong + Paneer',        159, 'MPP'],
    ['protein', 'Soya + Paneer',         169, 'SPP'],
    ['protein', 'High-Protein Chilla',   199, 'HPC'],

    ['rolls',   'Masala Chilla Roll',    109, 'MRL'],
    ['rolls',   'Cheese Chilla Roll',    139, 'CRL'],
    ['rolls',   'Paneer Chilla Roll',    149, 'PRL'],

    ['combos',  'Chilla + Chai',         119, 'CCT'],
    ['combos',  '2 Chilla + Curd',       149, '2CC'],
    ['combos',  'Protein Meal',          219, 'PML'],
    ['combos',  '2-Person Breakfast',    249, '2PB'],

    ['addons',  'Extra Chutney',         15,  'CHT'],
    ['addons',  'Curd (100 g)',          29,  'CRD'],
    ['addons',  'Salad',                 29,  'SLD'],
    ['addons',  'Extra Cheese',          39,  'XCH'],
    ['addons',  'Extra Paneer',          49,  'XPN'],

    ['drinks',  'Kulhad Masala Chai',    39,  'CHAI'],
    ['drinks',  'Nimbu Soda',            49,  'NMB'],
    ['drinks',  'Chaas / Buttermilk',    49,  'CHAS'],
    ['drinks',  'Lassi',                 79,  'LSS'],
    ['drinks',  'Fresh Seasonal Juice',  89,  'JUI'],
    ['drinks',  'Cold Coffee',           99,  'CCF'],
    ['drinks',  'Packaged Water',        20,  'WTR']
  ].map(function (r, i) { return { id: 'm' + (i + 1), cat: r[0], name: r[1], price: r[2], code: r[3] }; });

  var CATS = [
    { k: 'all',     n: 'All' },
    { k: 'classic', n: 'Classic' },
    { k: 'stuffed', n: 'Stuffed' },
    { k: 'protein', n: 'Protein' },
    { k: 'rolls',   n: 'Rolls' },
    { k: 'combos',  n: 'Combos' },
    { k: 'addons',  n: 'Add-ons' },
    { k: 'drinks',  n: 'Drinks' }
  ];

  var TYPES = {
    dinein:   { n: 'Dine-in',  pill: 'dine', pack: false, slot: 'Table no.' },
    takeaway: { n: 'Takeaway', pill: 'take', pack: false, slot: 'Token / name' },
    delivery: { n: 'Delivery', pill: 'dlv',  pack: true,  slot: 'Address ref' },
    swiggy:   { n: 'Swiggy',   pill: 'dlv',  pack: true,  slot: 'Swiggy order ID' },
    zomato:   { n: 'Zomato',   pill: 'dlv',  pack: true,  slot: 'Zomato order ID' }
  };

  var PAYS = { cash: 'Cash', upi: 'UPI', card: 'Card' };

  var DEFAULT_SETTINGS = {
    outlet: 'Chilla Chaska — Sector 62',
    address: 'Ground floor, internal market, Sector 62, Noida 201309',
    phone: '+91 98XXX XXXXX',
    gstin: '',
    fssai: '',
    footer: 'Thank you! Good food · Great mood',
    gstOn: false,
    inclusive: true,
    rate: 5,
    pack: 10,
    paper: '80',
    prefix: 'CC'
  };

  /* --------------------------------------------------------------- state */
  var S = {
    settings: Object.assign({}, DEFAULT_SETTINGS),
    menu: DEFAULT_MENU.slice(),
    orders: [],
    counters: { bill: 1, fy: '', kot: 1, kotDate: '' }
  };

  var cart = [];
  var orderType = 'takeaway';
  var payMode = 'cash';
  var activeCat = 'all';
  var query = '';
  var lastReceipt = null;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d.settings) S.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings);
      if (Array.isArray(d.menu) && d.menu.length) S.menu = d.menu;
      if (Array.isArray(d.orders)) S.orders = d.orders;
      if (d.counters) S.counters = Object.assign({}, S.counters, d.counters);
    } catch (e) { /* first run, private window, or blocked storage */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Could not save — browser storage is blocked'); }
  }

  /* --------------------------------------------------------------- utils */
  function money(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function rs(n) { return '₹' + money(n); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function dmy(iso) { var p = iso.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function hhmm(ts) {
    var d = new Date(ts);
    return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fyOf(d) {
    var y = d.getFullYear(), m = d.getMonth();           /* FY starts 1 April */
    var a = m < 3 ? y - 1 : y;
    return a + '-' + String(a + 1).slice(2);
  }

  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2400);
  }

  /* ---------------------------------------------------------------- totals */
  function compute() {
    var st = S.settings;
    var sub = cart.reduce(function (a, l) { return a + l.price * l.qty; }, 0);
    var qty = cart.reduce(function (a, l) { return a + l.qty; }, 0);

    var dType = $('discType').value;
    var dVal = parseFloat($('discVal').value) || 0;
    var disc = dType === 'pct' ? sub * Math.min(dVal, 100) / 100 : (dType === 'flat' ? Math.min(dVal, sub) : 0);

    var packing = TYPES[orderType].pack && cart.length ? (parseFloat(st.pack) || 0) : 0;
    var gross = sub - disc + packing;

    var rate = (parseFloat(st.rate) || 0) / 100;
    var taxable = gross, gst = 0, total = gross;

    if (st.gstOn && rate > 0) {
      if (st.inclusive) { taxable = gross / (1 + rate); gst = gross - taxable; total = gross; }
      else { taxable = gross; gst = gross * rate; total = gross + gst; }
    }

    var grand = Math.round(total);
    return {
      sub: sub, qty: qty, disc: disc, discType: dType, discVal: dVal,
      packing: packing, taxable: taxable, gst: gst,
      cgst: gst / 2, sgst: gst / 2,
      total: total, roundOff: grand - total, grand: grand
    };
  }

  /* -------------------------------------------------------------- catalog */
  function renderCats() {
    $('cats').innerHTML = CATS.map(function (c) {
      return '<button type="button" role="tab" data-c="' + c.k + '" aria-selected="' +
        (c.k === activeCat) + '">' + esc(c.n) + '</button>';
    }).join('');
  }

  function renderItems() {
    var q = query.trim().toLowerCase();
    var list = S.menu.filter(function (m) {
      if (activeCat !== 'all' && m.cat !== activeCat) return false;
      if (!q) return true;
      return m.name.toLowerCase().indexOf(q) > -1 || (m.code || '').toLowerCase().indexOf(q) > -1;
    });

    if (!list.length) {
      $('items').innerHTML = '<p class="empty">Nothing matches “' + esc(query) + '”.</p>';
      return;
    }

    $('items').innerHTML = list.map(function (m) {
      var inCart = cart.filter(function (l) { return l.id === m.id; })[0];
      return '<button class="item' + (inCart ? ' has-q' : '') + '" type="button" data-id="' + m.id + '">' +
        '<span class="nm">' + esc(m.name) + '</span>' +
        '<span class="item-foot"><span class="pr num">₹' + m.price + '</span>' +
        '<span class="cd">' + esc(m.code || '') + '</span></span>' +
        (inCart ? '<span class="qbadge">' + inCart.qty + '</span>' : '') +
        '</button>';
    }).join('');
  }

  /* ----------------------------------------------------------------- cart */
  function addItem(id) {
    var m = S.menu.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    var line = cart.filter(function (l) { return l.id === id; })[0];
    if (line) line.qty++;
    else cart.push({ id: m.id, name: m.name, code: m.code, price: +m.price, qty: 1 });
    renderCart();
    renderItems();
  }

  function setQty(id, d) {
    var i = -1;
    cart.forEach(function (l, k) { if (l.id === id) i = k; });
    if (i < 0) return;
    cart[i].qty += d;
    if (cart[i].qty <= 0) cart.splice(i, 1);
    renderCart();
    renderItems();
  }

  function renderCart() {
    var el = $('cart');
    if (!cart.length) {
      el.innerHTML = '<p class="cart-empty">No items yet.<br>Tap the menu on the left to start a bill.</p>';
    } else {
      el.innerHTML = cart.map(function (l) {
        return '<div class="line" data-id="' + l.id + '">' +
          '<span class="ln">' + esc(l.name) + '</span>' +
          '<span class="lp num">' + rs(l.price * l.qty) + '</span>' +
          '<span class="lb">' +
            '<span class="stepper">' +
              '<button type="button" data-a="dec" aria-label="Reduce quantity">−</button>' +
              '<span class="q num">' + l.qty + '</span>' +
              '<button type="button" data-a="inc" aria-label="Increase quantity">+</button>' +
            '</span>' +
            '<span class="rate num">@ ₹' + l.price + '</span>' +
            '<button class="kill" type="button" data-a="del">Remove</button>' +
          '</span>' +
        '</div>';
      }).join('');
    }
    renderTotals();
  }

  function renderTotals() {
    var t = compute(), st = S.settings, rows = [];
    rows.push('<div><span>Sub total (' + t.qty + ' item' + (t.qty === 1 ? '' : 's') + ')</span><span>' + rs(t.sub) + '</span></div>');
    if (t.disc > 0) rows.push('<div class="disc"><span>Discount</span><span>− ' + rs(t.disc) + '</span></div>');
    if (t.packing > 0) rows.push('<div><span>Packaging</span><span>' + rs(t.packing) + '</span></div>');
    if (st.gstOn && t.gst > 0) {
      rows.push('<div><span>Taxable value</span><span>' + rs(t.taxable) + '</span></div>');
      rows.push('<div><span>CGST ' + (st.rate / 2) + '%</span><span>' + rs(t.cgst) + '</span></div>');
      rows.push('<div><span>SGST ' + (st.rate / 2) + '%</span><span>' + rs(t.sgst) + '</span></div>');
    }
    if (Math.abs(t.roundOff) >= 0.005) {
      rows.push('<div><span>Round off</span><span>' + (t.roundOff > 0 ? '+ ' : '− ') + money(Math.abs(t.roundOff)) + '</span></div>');
    }
    rows.push('<div class="grand"><span>Total</span><span class="num">₹' + t.grand + '</span></div>');
    $('totals').innerHTML = rows.join('');
    $('btnPay').disabled = !cart.length;
    $('btnKot').disabled = !cart.length;
  }

  /* ------------------------------------------------------------- receipts */
  function nextBillNo(now) {
    var fy = fyOf(now);
    if (S.counters.fy !== fy) { S.counters.fy = fy; S.counters.bill = 1; }
    return S.settings.prefix + '/' + fy + '/' + pad(S.counters.bill, 4);
  }
  function nextKot(now) {
    var d = now.toISOString().slice(0, 10);
    if (S.counters.kotDate !== d) { S.counters.kotDate = d; S.counters.kot = 1; }
    return S.counters.kot;
  }

  function billHtml(o) {
    var st = o.snap, p58 = st.paper === '58';
    var h = [];
    h.push('<div class="receipt' + (p58 ? ' p58' : '') + '">');
    h.push('<div class="c big">' + esc(st.outlet) + '</div>');
    if (st.address) h.push('<div class="c">' + esc(st.address) + '</div>');
    if (st.phone) h.push('<div class="c">Ph: ' + esc(st.phone) + '</div>');
    if (st.gstin) h.push('<div class="c">GSTIN: ' + esc(st.gstin) + '</div>');
    if (st.fssai) h.push('<div class="c">FSSAI: ' + esc(st.fssai) + '</div>');
    h.push('<hr>');
    h.push('<div class="c b">' + (st.gstOn ? 'TAX INVOICE' : 'BILL OF SUPPLY') + (o.void ? ' — CANCELLED' : '') + '</div>');
    h.push('<hr>');
    h.push('<div class="row"><span>' + esc(o.billNo) + '</span><span>KOT ' + o.kot + '</span></div>');
    h.push('<div class="row"><span>' + dmy(o.date) + ' ' + hhmm(o.ts) + '</span><span>' + esc(TYPES[o.type].n) + '</span></div>');
    if (o.ref) h.push('<div class="row"><span>' + esc(TYPES[o.type].slot) + '</span><span>' + esc(o.ref) + '</span></div>');
    if (o.phone) h.push('<div class="row"><span>Customer</span><span>' + esc(o.phone) + '</span></div>');
    h.push('<hr>');

    h.push('<table><tr class="b"><td>ITEM</td><td class="r">QTY</td><td class="r">RATE</td><td class="r">AMT</td></tr>');
    o.lines.forEach(function (l) {
      h.push('<tr><td>' + esc(l.name) + '</td><td class="r">' + l.qty + '</td><td class="r">' + l.price +
        '</td><td class="r">' + money(l.price * l.qty) + '</td></tr>');
    });
    h.push('</table><hr>');

    var t = o.totals;
    function row(a, b) { h.push('<div class="row"><span>' + a + '</span><span>' + b + '</span></div>'); }
    row('Sub total', money(t.sub));
    if (t.disc > 0) row('Discount', '- ' + money(t.disc));
    if (t.packing > 0) row('Packaging', money(t.packing));
    if (st.gstOn && t.gst > 0) {
      row('Taxable value', money(t.taxable));
      row('CGST ' + (st.rate / 2) + '%', money(t.cgst));
      row('SGST ' + (st.rate / 2) + '%', money(t.sgst));
    }
    if (Math.abs(t.roundOff) >= 0.005) row('Round off', (t.roundOff > 0 ? '+' : '-') + money(Math.abs(t.roundOff)));
    h.push('<hr>');
    h.push('<div class="row big"><span>TOTAL</span><span>₹' + t.grand + '</span></div>');
    h.push('<hr>');
    h.push('<div class="row"><span>Paid by</span><span>' + esc(PAYS[o.pay] || o.pay) + '</span></div>');
    h.push('<div class="row"><span>Items</span><span>' + t.qty + '</span></div>');
    if (st.gstOn) h.push('<div style="margin-top:4px">GST charged at ' + st.rate + '% on restaurant service, without input tax credit.</div>');
    h.push('<hr>');
    if (st.footer) h.push('<div class="c">' + esc(st.footer) + '</div>');
    h.push('</div>');
    return h.join('');
  }

  function kotHtml(o) {
    var p58 = o.snap.paper === '58';
    var h = [];
    h.push('<div class="receipt' + (p58 ? ' p58' : '') + '">');
    h.push('<div class="c big">*** KOT ' + o.kot + ' ***</div>');
    h.push('<div class="row"><span>' + esc(TYPES[o.type].n) + '</span><span>' + esc(o.ref || '') + '</span></div>');
    h.push('<div class="row"><span>' + dmy(o.date) + '</span><span>' + hhmm(o.ts) + '</span></div>');
    if (o.billNo) h.push('<div class="row"><span>' + esc(o.billNo) + '</span><span></span></div>');
    h.push('<hr>');
    o.lines.forEach(function (l) {
      h.push('<div class="kot-item">' + l.qty + ' × ' + esc(l.code || '') + '  ' + esc(l.name) + '</div>');
    });
    h.push('<hr>');
    h.push('<div class="c">' + o.totals.qty + ' item' + (o.totals.qty === 1 ? '' : 's') + '</div>');
    h.push('</div>');
    return h.join('');
  }

  function showReceipt(title, html) {
    lastReceipt = html;
    $('modalTitle').textContent = title;
    $('modalReceipt').innerHTML = html;
    $('modal').hidden = false;
    $('modalPrint').focus();
  }

  function doPrint(html) {
    var w = S.settings.paper === '58' ? '58mm' : '80mm';
    var styleId = 'pageStyle', st = document.getElementById(styleId);
    if (!st) { st = document.createElement('style'); st.id = styleId; document.head.appendChild(st); }
    st.textContent = '@page{size:' + w + ' auto;margin:0}';
    $('printRoot').innerHTML = html;
    try { window.print(); }
    catch (e) { toast('Printing is blocked here — run the local copy to print'); }
  }

  /* ------------------------------------------------------------ save bill */
  function snapshot() {
    var st = S.settings;
    return {
      outlet: st.outlet, address: st.address, phone: st.phone, gstin: st.gstin,
      fssai: st.fssai, footer: st.footer, gstOn: st.gstOn, rate: st.rate,
      inclusive: st.inclusive, paper: st.paper
    };
  }

  function buildOrder(withBillNo) {
    var now = new Date();
    return {
      billNo: withBillNo ? nextBillNo(now) : '',
      kot: nextKot(now),
      ts: now.getTime(),
      date: today(),
      type: orderType,
      ref: $('fRef').value.trim(),
      phone: $('fPhone').value.trim(),
      pay: payMode,
      lines: cart.map(function (l) { return { name: l.name, code: l.code, price: l.price, qty: l.qty }; }),
      totals: compute(),
      snap: snapshot(),
      void: false
    };
  }

  function payAndPrint() {
    if (!cart.length) return;
    var o = buildOrder(true);
    S.counters.bill++;
    S.counters.kot++;
    S.orders.push(o);
    save();
    showReceipt('Bill ' + o.billNo, billHtml(o));
    clearCart();
    refreshHeader();
    toast('Bill ' + o.billNo + ' saved — ₹' + o.totals.grand);
  }

  function printKot() {
    if (!cart.length) return;
    var o = buildOrder(false);
    S.counters.kot++;
    save();
    showReceipt('KOT ' + o.kot, kotHtml(o));
    refreshHeader();
  }

  function clearCart() {
    cart = [];
    $('fRef').value = '';
    $('fPhone').value = '';
    $('discType').value = 'none';
    $('discVal').value = '0';
    $('discVal').disabled = true;
    renderCart();
    renderItems();
  }

  function refreshHeader() {
    var now = new Date();
    $('tbDate').textContent = dmy(today()) + ' · ' + hhmm(now.getTime());
    var fy = fyOf(now);
    var n = S.counters.fy === fy ? S.counters.bill : 1;
    $('tbBillNo').textContent = 'Next ' + S.settings.prefix + '/' + fy + '/' + pad(n, 4);
    $('tbOutlet').textContent = S.settings.outlet;
  }

  /* --------------------------------------------------------- orders view */
  function ordersFor(date) {
    return S.orders.filter(function (o) { return o.date === date && o.billNo; });
  }

  function renderOrders() {
    var date = $('ordDate').value || today();
    var list = ordersFor(date).slice().reverse();
    var live = list.filter(function (o) { return !o.void; });
    var sum = live.reduce(function (a, o) { return a + o.totals.grand; }, 0);

    $('ordersSub').textContent = list.length
      ? live.length + ' bill' + (live.length === 1 ? '' : 's') + ' · ₹' + sum + (list.length - live.length ? ' · ' + (list.length - live.length) + ' cancelled' : '')
      : 'No bills on this date yet.';

    if (!list.length) { $('ordersTbl').innerHTML = ''; return; }

    $('ordersTbl').innerHTML =
      '<thead><tr><th>Bill</th><th>Time</th><th>Type</th><th>Items</th><th>Pay</th><th class="r">Total</th><th></th></tr></thead><tbody>' +
      list.map(function (o, i) {
        var idx = S.orders.indexOf(o);
        return '<tr>' +
          '<td class="mono">' + esc(o.billNo) + '</td>' +
          '<td class="mono">' + hhmm(o.ts) + '</td>' +
          '<td><span class="pill pill--' + TYPES[o.type].pill + '">' + esc(TYPES[o.type].n) + '</span></td>' +
          '<td>' + o.totals.qty + '</td>' +
          '<td>' + esc(PAYS[o.pay] || o.pay) + '</td>' +
          '<td class="r">' + (o.void ? '<span class="pill pill--void">Cancelled</span>' : '₹' + o.totals.grand) + '</td>' +
          '<td class="r"><button class="btn btn--ghost" data-re="' + idx + '" style="padding:6px 10px;font-size:13px">View</button> ' +
          (o.void ? '' : '<button class="btn btn--ghost btn--danger" data-void="' + idx + '" style="padding:6px 10px;font-size:13px">Cancel</button>') +
          '</td></tr>';
      }).join('') + '</tbody>';
  }

  /* ------------------------------------------------------------ day report */
  function dayData(date) {
    var list = ordersFor(date).filter(function (o) { return !o.void; });
    var d = {
      bills: list.length, gross: 0, disc: 0, gst: 0, net: 0, qty: 0, pack: 0,
      byType: {}, byPay: {}, items: {}
    };
    list.forEach(function (o) {
      var t = o.totals;
      d.gross += t.sub; d.disc += t.disc; d.gst += t.gst; d.net += t.grand;
      d.qty += t.qty; d.pack += t.packing;
      d.byType[o.type] = d.byType[o.type] || { n: 0, v: 0 };
      d.byType[o.type].n++; d.byType[o.type].v += t.grand;
      d.byPay[o.pay] = d.byPay[o.pay] || { n: 0, v: 0 };
      d.byPay[o.pay].n++; d.byPay[o.pay].v += t.grand;
      o.lines.forEach(function (l) {
        var it = d.items[l.name] = d.items[l.name] || { q: 0, v: 0, code: l.code };
        it.q += l.qty; it.v += l.price * l.qty;
      });
    });
    d.aov = d.bills ? d.net / d.bills : 0;
    return d;
  }

  function renderDay() {
    var date = $('dayDate').value || today();
    var d = dayData(date);
    $('daySub').textContent = dmy(date) + ' · cancelled bills excluded';

    $('dayKpis').innerHTML =
      kpi(d.bills, 'Bills', false) +
      kpi('₹' + Math.round(d.net), 'Net sales', true) +
      kpi('₹' + Math.round(d.aov), 'Average bill', true) +
      kpi(d.qty, 'Items sold', false) +
      kpi('₹' + Math.round(d.disc), 'Discount given', false) +
      kpi('₹' + Math.round(d.gst), 'GST collected', false);

    $('dayType').innerHTML = miniTable(
      ['Type', 'Bills', 'Value'],
      Object.keys(d.byType).map(function (k) {
        return [TYPES[k] ? TYPES[k].n : k, d.byType[k].n, '₹' + Math.round(d.byType[k].v)];
      })
    );
    $('dayPay').innerHTML = miniTable(
      ['Mode', 'Bills', 'Value'],
      Object.keys(d.byPay).map(function (k) {
        return [PAYS[k] || k, d.byPay[k].n, '₹' + Math.round(d.byPay[k].v)];
      })
    );

    var names = Object.keys(d.items).sort(function (a, b) { return d.items[b].v - d.items[a].v; });
    $('dayItems').innerHTML = names.length
      ? miniTable(['Item', 'Code', 'Qty', 'Value'], names.map(function (n) {
          return [n, d.items[n].code || '', d.items[n].q, '₹' + Math.round(d.items[n].v)];
        }))
      : '<tbody><tr><td style="color:var(--ink-3)">No sales on this date.</td></tr></tbody>';
  }

  function kpi(v, l, green) {
    return '<div class="kpi' + (green ? ' is-green' : '') + '"><b>' + v + '</b><span>' + l + '</span></div>';
  }
  function miniTable(head, rows) {
    if (!rows.length) return '<tbody><tr><td style="color:var(--ink-3)">Nothing yet.</td></tr></tbody>';
    return '<thead><tr>' + head.map(function (h, i) {
      return '<th' + (i ? ' class="r"' : '') + '>' + esc(h) + '</th>';
    }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
      return '<tr>' + r.map(function (c, i) {
        return '<td' + (i ? ' class="r"' : '') + '>' + esc(c) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
  }

  function buildCsv(date) {
    var list = ordersFor(date), out = [];
    out.push('Chilla Chaska — sales export,' + dmy(date));
    out.push('');
    out.push('BILLS');
    out.push('Bill no,Time,Type,Ref,Phone,Payment,Items,Sub total,Discount,Packaging,Taxable,CGST,SGST,Round off,Total,Status');
    list.forEach(function (o) {
      var t = o.totals;
      out.push([
        o.billNo, hhmm(o.ts), TYPES[o.type].n, q(o.ref), q(o.phone), PAYS[o.pay] || o.pay,
        t.qty, money(t.sub), money(t.disc), money(t.packing), money(t.taxable),
        money(t.cgst), money(t.sgst), money(t.roundOff), t.grand, o.void ? 'CANCELLED' : 'OK'
      ].join(','));
    });
    out.push('');
    out.push('ITEM-WISE (cancelled bills excluded)');
    out.push('Item,Code,Qty,Value');
    var d = dayData(date);
    Object.keys(d.items).sort(function (a, b) { return d.items[b].v - d.items[a].v; })
      .forEach(function (n) { out.push([q(n), d.items[n].code || '', d.items[n].q, money(d.items[n].v)].join(',')); });
    out.push('');
    out.push('SUMMARY');
    out.push('Bills,' + d.bills);
    out.push('Items sold,' + d.qty);
    out.push('Gross of items,' + money(d.gross));
    out.push('Discount,' + money(d.disc));
    out.push('GST collected,' + money(d.gst));
    out.push('Net sales,' + money(d.net));
    out.push('Average bill,' + money(d.aov));
    return out.join('\n');

    function q(s) { s = String(s || ''); return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  }

  /* ----------------------------------------------------------- menu editor */
  function renderMenuEditor() {
    var byCat = {}, out = [];
    S.menu.forEach(function (m) { (byCat[m.cat] = byCat[m.cat] || []).push(m); });
    CATS.filter(function (c) { return c.k !== 'all'; }).forEach(function (c) {
      var items = byCat[c.k] || [];
      out.push('<div class="mcat"><b>' + esc(c.n) + '</b><span class="lbl">' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</span></div>');
      items.forEach(function (m) {
        out.push('<div class="mrow" data-id="' + m.id + '">' +
          '<input data-f="name" value="' + esc(m.name) + '" aria-label="Item name">' +
          '<input class="code-in" data-f="code" value="' + esc(m.code || '') + '" aria-label="Short code">' +
          '<input data-f="price" type="number" min="0" step="1" value="' + m.price + '" aria-label="Price">' +
          '<button class="del" type="button" data-f="del" aria-label="Delete ' + esc(m.name) + '">' +
            '<svg width="16" height="16" aria-hidden="true"><use href="#p-trash"></use></svg></button>' +
        '</div>');
      });
    });
    $('menuEdit').innerHTML = out.join('');
  }

  /* -------------------------------------------------------------- settings */
  var SET_MAP = {
    sOutlet: 'outlet', sAddress: 'address', sPhone: 'phone', sGstin: 'gstin',
    sFssai: 'fssai', sFooter: 'footer', sRate: 'rate', sPack: 'pack',
    sPaper: 'paper', sPrefix: 'prefix'
  };

  function fillSettings() {
    Object.keys(SET_MAP).forEach(function (id) { $(id).value = S.settings[SET_MAP[id]]; });
    $('sGstOn').checked = !!S.settings.gstOn;
    $('sIncl').checked = !!S.settings.inclusive;
  }

  function bindSettings() {
    Object.keys(SET_MAP).forEach(function (id) {
      $(id).addEventListener('input', function () {
        var k = SET_MAP[id];
        S.settings[k] = (k === 'rate' || k === 'pack') ? (parseFloat(this.value) || 0) : this.value;
        save(); refreshHeader(); renderTotals();
      });
    });
    $('sGstOn').addEventListener('change', function () { S.settings.gstOn = this.checked; save(); renderTotals(); });
    $('sIncl').addEventListener('change', function () { S.settings.inclusive = this.checked; save(); renderTotals(); });
  }

  /* ------------------------------------------------------------------ views */
  function showView(v) {
    ['billing', 'orders', 'day', 'menu', 'settings'].forEach(function (x) {
      $('view-' + x).hidden = x !== v;
    });
    Array.prototype.forEach.call($('tabs').querySelectorAll('button'), function (b) {
      b.setAttribute('aria-selected', String(b.dataset.view === v));
    });
    if (v === 'orders') renderOrders();
    if (v === 'day') renderDay();
    if (v === 'menu') renderMenuEditor();
    if (v === 'settings') fillSettings();
  }

  /* ------------------------------------------------------------------ wire */
  function init() {
    load();
    refreshHeader();
    renderCats();
    renderItems();
    renderCart();
    $('ordDate').value = today();
    $('dayDate').value = today();
    $('fRef').placeholder = 'Token / name';
    bindSettings();

    /* theme */
    try {
      var th = localStorage.getItem('cc-theme');
      if (th === 'dark' || th === 'light') document.documentElement.setAttribute('data-theme', th);
    } catch (e) { /* ignore */ }
    $('themeToggle').addEventListener('click', function () {
      var root = document.documentElement;
      var dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = dark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('cc-theme', next); } catch (e) { /* ignore */ }
    });

    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (b) showView(b.dataset.view);
    });

    $('cats').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      activeCat = b.dataset.c; renderCats(); renderItems();
    });

    $('search').addEventListener('input', function () { query = this.value; renderItems(); });

    $('items').addEventListener('click', function (e) {
      var b = e.target.closest('.item'); if (b) addItem(b.dataset.id);
    });

    $('cart').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var id = b.closest('.line').dataset.id;
      if (b.dataset.a === 'inc') setQty(id, 1);
      else if (b.dataset.a === 'dec') setQty(id, -1);
      else { cart = cart.filter(function (l) { return l.id !== id; }); renderCart(); renderItems(); }
    });

    $('orderType').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      orderType = b.dataset.t;
      Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-selected', String(x.dataset.t === orderType));
      });
      $('lblSlot').textContent = TYPES[orderType].slot;
      $('fRef').placeholder = TYPES[orderType].slot;
      renderTotals();
    });

    $('payMode').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      payMode = b.dataset.p;
      Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-pressed', String(x.dataset.p === payMode));
      });
    });

    $('discType').addEventListener('change', function () {
      $('discVal').disabled = this.value === 'none';
      if (this.value === 'none') $('discVal').value = '0';
      renderTotals();
    });
    $('discVal').addEventListener('input', renderTotals);

    $('btnPay').addEventListener('click', payAndPrint);
    $('btnKot').addEventListener('click', printKot);
    $('btnClear').addEventListener('click', function () {
      if (!cart.length) return;
      clearCart(); toast('Cart cleared');
    });

    /* modal */
    $('modalClose').addEventListener('click', closeModal);
    $('modalDone').addEventListener('click', closeModal);
    $('modalPrint').addEventListener('click', function () { doPrint(lastReceipt); });
    $('modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('modal').hidden) closeModal();
    });
    function closeModal() { $('modal').hidden = true; }

    /* orders */
    $('ordDate').addEventListener('change', renderOrders);
    $('ordersTbl').addEventListener('click', function (e) {
      var re = e.target.closest('[data-re]'), vd = e.target.closest('[data-void]');
      if (re) {
        var o = S.orders[+re.dataset.re];
        showReceipt('Bill ' + o.billNo, billHtml(o));
      } else if (vd) {
        var k = +vd.dataset.void, ord = S.orders[k];
        if (window.confirm('Cancel bill ' + ord.billNo + '? The number stays in the series and the bill is excluded from sales.')) {
          ord.void = true; save(); renderOrders(); toast('Bill ' + ord.billNo + ' cancelled');
        }
      }
    });

    /* day report */
    $('dayDate').addEventListener('change', renderDay);
    $('btnCsv').addEventListener('click', function () {
      var date = $('dayDate').value || today();
      var csv = buildCsv(date);
      $('csvOut').value = csv;
      $('csvCard').hidden = false;
      try {
        var blob = new Blob([csv], { type: 'text/csv' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'chilla-chaska-' + date + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      } catch (e) { /* sandbox blocks downloads — the textarea is the fallback */ }
      $('csvCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    $('btnCsvCopy').addEventListener('click', function () { copyFrom($('csvOut')); });
    $('btnCsvClose').addEventListener('click', function () { $('csvCard').hidden = true; });

    /* menu editor */
    $('menuEdit').addEventListener('input', function (e) {
      var inp = e.target.closest('input[data-f]'); if (!inp) return;
      var id = inp.closest('.mrow').dataset.id;
      var m = S.menu.filter(function (x) { return x.id === id; })[0]; if (!m) return;
      var f = inp.dataset.f;
      m[f] = f === 'price' ? (parseFloat(inp.value) || 0) : inp.value;
      save(); renderItems();
    });
    $('menuEdit').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f="del"]'); if (!b) return;
      var id = b.closest('.mrow').dataset.id;
      var m = S.menu.filter(function (x) { return x.id === id; })[0];
      if (window.confirm('Remove “' + m.name + '” from the menu?')) {
        S.menu = S.menu.filter(function (x) { return x.id !== id; });
        cart = cart.filter(function (l) { return l.id !== id; });
        save(); renderMenuEditor(); renderItems(); renderCart();
      }
    });
    $('btnAddItem').addEventListener('click', function () {
      S.menu.push({ id: 'm' + Date.now(), cat: activeCat === 'all' ? 'classic' : activeCat, name: 'New item', price: 0, code: '' });
      save(); renderMenuEditor(); renderItems();
      var rows = $('menuEdit').querySelectorAll('.mrow');
      if (rows.length) { var last = rows[rows.length - 1].querySelector('input'); last.focus(); last.select(); }
    });
    $('btnResetMenu').addEventListener('click', function () {
      if (!window.confirm('Reset the menu to the default Chilla Chaska list? Your price edits will be lost.')) return;
      S.menu = DEFAULT_MENU.slice(); cart = [];
      save(); renderMenuEditor(); renderItems(); renderCart(); toast('Menu reset');
    });

    /* backup */
    $('btnBackup').addEventListener('click', function () {
      $('backupIo').value = JSON.stringify(S);
      toast('Backup ready — copy it somewhere safe');
    });
    $('btnBackupCopy').addEventListener('click', function () {
      if (!$('backupIo').value) $('backupIo').value = JSON.stringify(S);
      copyFrom($('backupIo'));
    });
    $('btnRestore').addEventListener('click', function () {
      var txt = $('backupIo').value.trim();
      if (!txt) { toast('Paste a backup into the box first'); return; }
      try {
        var d = JSON.parse(txt);
        if (!d.settings || !d.menu) throw new Error('bad shape');
        if (!window.confirm('Replace all current data with this backup?')) return;
        S = { settings: Object.assign({}, DEFAULT_SETTINGS, d.settings), menu: d.menu, orders: d.orders || [], counters: d.counters || S.counters };
        save(); cart = [];
        refreshHeader(); renderCats(); renderItems(); renderCart(); fillSettings();
        toast('Backup restored');
      } catch (err) { toast('That does not look like a Chilla Chaska backup'); }
    });

    /* danger zone */
    $('btnWipeDay').addEventListener('click', function () {
      var d = today();
      var n = S.orders.filter(function (o) { return o.date === d; }).length;
      if (!n) { toast('No bills today'); return; }
      if (!window.confirm('Delete all ' + n + " of today's bills? This cannot be undone.")) return;
      S.orders = S.orders.filter(function (o) { return o.date !== d; });
      save(); renderOrders(); renderDay(); toast("Today's bills deleted");
    });
    $('btnWipeAll').addEventListener('click', function () {
      if (!window.confirm('Reset everything — bills, menu edits and settings? This cannot be undone.')) return;
      if (!window.confirm('Really? Export a backup first if you might want this data.')) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      window.location.reload();
    });

    /* keyboard: / focuses search, Ctrl/Cmd+Enter settles the bill */
    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));
      if (e.key === '/' && !typing) { e.preventDefault(); $('search').focus(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !$('view-billing').hidden) {
        e.preventDefault(); payAndPrint();
      }
    });

    setInterval(refreshHeader, 30000);
  }

  function copyFrom(el) {
    el.select();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(el.value);
      } else { document.execCommand('copy'); }
      toast('Copied');
    } catch (e) { toast('Select the text and copy manually'); }
  }

  init();
})();
