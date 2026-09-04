# Thikaana BusinessOS

> Everything your business needs, in one place.

A sellable demo of a **cloud-style Business Management Platform** for retail stores,
distributors, wholesalers, manufacturing units, service businesses, institutes and
SMEs. It combines **Inventory, Purchasing, Sales & GST Billing, Accounting, GST
filing, HR, Payroll, CRM and Analytics** into one multi-tenant system.

Single-page React app, **no backend**. All data lives in the browser's
`localStorage` and is seeded from a realistic dataset on first load. Every read /
write goes through `src/lib/db.ts`, which is the intended swap seam for a real API
+ PostgreSQL layer later.

## Run locally

```bash
cd app
npm install
npm run dev        # http://localhost:8140
```

## Demo logins

| Role | Username | Password | Lands on |
|------|----------|----------|----------|
| Super Admin (Thikaana) | `superadmin` | `super123` | Platform console — workspaces, plans, billing, support |
| Company Owner | `owner` | `owner123` | Full business admin + modules, users, roles |
| Manager | `manager` | `manager123` | Inventory, purchasing, sales, analytics |
| HR | `hr` | `hr123` | Employees, attendance, leave, payroll |
| Accountant | `accountant` | `account123` | Billing, accounting, expenses, GST |
| Sales Executive | `sales` | `sales123` | Leads, quotations, orders, invoices |
| Employee | `employee` | `employee123` | Self-service portal |

Reset the demo data any time from **Owner → System → Settings → Reset demo data**.

## Seeded dataset

50 categories · 4 warehouses · 25 suppliers · **500 products** (with variants,
batches & serials) · 100 customers · 50 employees across 8 departments ·
**12 months** of purchases, sales, receipts, payroll, expenses and GST · a
platform console with 14 workspaces, 3 plans, billing and support tickets.

## What's inside

- **Inventory** — product master, SKUs, barcodes, variants, multi-warehouse stock,
  stock ledger, adjustments (logged), low-stock alerts, batch & expiry tracking, transfers
- **Purchasing** — suppliers with dues, purchase orders → GRN → supplier payments
- **Sales & Billing** — customers with credit limits, quotations → sales orders →
  delivery challans → **GST tax invoices** (CGST/SGST/IGST, round-off, printable),
  credit notes, payment receipts
- **Finance** — chart of accounts, auto-posted journal, general ledger, P&L,
  balance sheet, cash flow, expenses, **GSTR-1 / GSTR-3B** with input credit and CA export
- **HR & Payroll** — employees, departments, reporting lines, attendance with
  geo-fencing & overtime, leave approval workflow, **payroll runs** with PF / ESI /
  TDS and printable payslips
- **CRM** — lead pipeline (kanban), follow-ups, WhatsApp / SMS / email broadcasts (simulated)
- **Intelligence** — executive analytics, **AI demand forecasting** with reorder
  suggestions, and an **AI business assistant** answering questions over live data
- **Employee portal** — check-in, my attendance, apply for leave, payslips, profile
- **Platform console** — customer workspaces, subscription plans, platform billing, support
- **Admin** — the module engine, users, roles & permissions, company profile, settings, audit log

### Module engine

`src/lib/modules.ts` defines all 21 capabilities, their category, phase and
`dependsOn` graph. A module can't be enabled until its dependencies are, and can't
be disabled while something enabled still needs it. A user's effective access =
**enabled module × role permission × module dependency**. This is what lets the
same product fit a two-person retail shop and a manufacturing SME.

## Stack

React 18 · TypeScript · Vite · Tailwind · React Router (HashRouter) · lucide-react.
Mobile-first and fully responsive. Charts are dependency-free inline SVG.

## Deploy (GitHub Pages, project site)

`app/vite.config.ts` uses `base: '/thikaana-businessos/'` for production builds.
The build is emitted to `dist-site/` and `index.html` + `assets/` are copied to
the repo root (committed) so Pages serves it from the root of the branch:

```bash
cd app && npm run build
cd .. && rm -rf assets && cp -r dist-site/assets assets && cp dist-site/index.html index.html
```
