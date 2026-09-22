# Chilla Chaska POS

Counter billing for the outlet. Plain HTML/CSS/JS, no build step, no server, no
monthly fee. Works offline once the page has loaded.

```
pos/index.html   the app shell
pos/pos.css      styling, including the thermal-receipt and print rules
pos/pos.js       menu data, cart, GST maths, receipts, reports
```

## Running it at the counter

Serve the project folder and open `/pos/` on the billing device:

```bash
python3 -m http.server 4173
```

On an Android tablet, open it in Chrome and use **⋮ → Add to Home screen** so it
launches full-screen like an app. It keeps working with the wifi down.

## What it does

- **Billing** — tap items, adjust quantities, apply a % or flat discount, pick
  order type (Dine-in / Takeaway / Delivery / Swiggy / Zomato) and payment mode.
- **Tax invoice** — bill number in a proper financial-year series
  (`CC/2026-27/0001`), CGST and SGST split out, round-off line, outlet GSTIN and
  FSSAI number in the header.
- **KOT ticket** — separate kitchen print with short codes in large type, its own
  number series that resets daily.
- **Orders** — every bill for a chosen date, with view/reprint and cancel. A
  cancelled bill keeps its number in the series and drops out of sales totals.
- **Day report** — bills, net sales, average bill, items sold, discount given,
  GST collected; split by order type and payment mode; item-wise sales ranked by
  value. CSV export.
- **Menu editor** — names, prices and short codes, editable in place.

Keyboard: `/` jumps to search, `Ctrl`/`Cmd` + `Enter` settles the bill.

## Set this up before the first real sale

1. **Settings → Outlet** — name, address, phone, GSTIN, FSSAI licence number.
   These print on every bill.
2. **Settings → Tax** — GST is **off** by default. Turn it on once your
   registration is active. "Menu prices include GST" is on, which matches the
   printed menu card; turn it off if you want to add tax on top instead.
3. **Settings → Printing** — pick 58 mm or 80 mm to match your thermal printer.
4. **Invoice prefix** — defaults to `CC`. Set it before you issue bill 0001;
   changing it mid-series is messy at filing time.

Restaurant service is generally 5% GST without input tax credit, split 2.5% CGST
+ 2.5% SGST within UP. Confirm the rate, your registration status and the invoice
series format with your CA before billing a customer.

## Backups — read this

All data lives in **this browser on this device**. Nothing is uploaded anywhere.
That is what makes it fast and offline-capable, and it is also the risk: clearing
the browser's site data, or a dead tablet, takes your bills with it.

At the end of every day:

1. **Day report → Export CSV** — that is your sales record.
2. **Settings → Backup → Show backup → Copy** — paste it into a note, a Drive
   file or a WhatsApp message to yourself. It restores everything.

## What this deliberately does not do

- **No Swiggy/Zomato order push.** Aggregators only give order APIs to approved
  POS partners. Accept app orders on their own merchant tablets and reconcile
  from their dashboards; bill walk-in, takeaway and direct WhatsApp orders here.
  The Swiggy/Zomato order types exist so you *can* punch those orders in for a
  single combined day report if you want that.
- **No inventory or recipe costing.** Food-cost control against the 28–30% target
  needs stock in and stock out, which is a much bigger build than billing.
- **No multi-device sync.** One till, one device.

Those three are the honest reasons to move to a paid POS later. Until then this
covers billing properly and costs nothing.
