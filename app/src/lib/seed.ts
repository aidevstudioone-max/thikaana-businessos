// Demo data generator. Runs once per SCHEMA_VERSION (see db.ts) and populates
// every collection with a realistic SME dataset so the product can be demoed with
// no backend. Deterministic RNG => the demo looks identical on every load.
//
// Volumes (per the product brief):
//   50 categories · 4 warehouses · 25 suppliers · 500 products · 100 customers
//   50 employees · 12 months of sales, purchases, payroll and GST.

import { COLLECTIONS, genId, save, saveAll } from './db'
import { defaultModuleStates } from './modules'
import { DEFAULT_ROLES } from './permissions'
import type {
  Account,
  AttendanceRecord,
  Batch,
  Category,
  CommMessage,
  Company,
  CreditNote,
  Customer,
  DeliveryChallan,
  Department,
  DocLine,
  Employee,
  ExpenseRecord,
  FollowUp,
  Invoice,
  JournalEntry,
  Lead,
  LeaveRequest,
  Notification,
  PaymentReceipt,
  PayrollRun,
  Payslip,
  PlatformInvoice,
  PlatformPlan,
  Product,
  ProductVariant,
  PurchaseOrder,
  PurchaseOrderLine,
  Quotation,
  SalesOrder,
  Settings,
  Shift,
  StockLevel,
  StockMove,
  Supplier,
  SupplierPayment,
  SupportTicket,
  User,
  Warehouse,
  Workspace
} from './types'

// ---------------------------------------------------------------------------
// Deterministic RNG + helpers
// ---------------------------------------------------------------------------

let _s = 20260904
function rnd() {
  _s = (_s * 1664525 + 1013904223) % 4294967296
  return _s / 4294967296
}
function pick<T>(a: T[]): T {
  return a[Math.floor(rnd() * a.length)]
}
function sample<T>(a: T[], n: number): T[] {
  const copy = [...a]
  const out: T[] = []
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0])
  return out
}
function int(min: number, max: number) {
  return Math.floor(rnd() * (max - min + 1)) + min
}
function chance(p: number) {
  return rnd() < p
}
function money(n: number) {
  return Math.round(n)
}
function isoDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
function dateDaysAgo(n: number) {
  return isoDaysAgo(n).slice(0, 10)
}
function dateDaysAhead(n: number) {
  return isoDaysAgo(-n).slice(0, 10)
}
function monthKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const FIRST_M = ['Aarav', 'Rohan', 'Aditya', 'Krish', 'Ishaan', 'Arjun', 'Vivaan', 'Kabir', 'Rudra', 'Dev', 'Ayush', 'Sarthak', 'Nikhil', 'Harsh', 'Yash', 'Manish', 'Sundar', 'Rahul', 'Amit', 'Vikram']
const FIRST_F = ['Riya', 'Ananya', 'Isha', 'Sneha', 'Diya', 'Aisha', 'Kavya', 'Meera', 'Tara', 'Nisha', 'Pooja', 'Sanya', 'Aditi', 'Trisha', 'Ira', 'Priya', 'Lata', 'Deepa', 'Nandita', 'Shreya']
const LAST = ['Sen', 'Gupta', 'Sharma', 'Iyer', 'Nair', 'Das', 'Bose', 'Chatterjee', 'Mukherjee', 'Reddy', 'Rao', 'Patel', 'Singh', 'Verma', 'Ghosh', 'Banerjee', 'Agarwal', 'Kulkarni', 'Menon', 'Joshi']
const CITIES: [string, string][] = [
  ['Kolkata', 'West Bengal'],
  ['Howrah', 'West Bengal'],
  ['Durgapur', 'West Bengal'],
  ['Siliguri', 'West Bengal'],
  ['Patna', 'Bihar'],
  ['Ranchi', 'Jharkhand'],
  ['Bhubaneswar', 'Odisha'],
  ['Guwahati', 'Assam'],
  ['Jamshedpur', 'Jharkhand'],
  ['Asansol', 'West Bengal']
]
const BIZ_SUFFIX = ['Traders', 'Enterprises', 'Retail', 'Distributors', 'Agencies', 'Stores', 'Mart', 'Trading Co', 'Sales Corp', '& Sons']

function personName() {
  const isM = chance(0.62)
  return `${pick(isM ? FIRST_M : FIRST_F)} ${pick(LAST)}`
}
function phone() {
  return `+91 9${int(100000000, 999999999)}`
}
function gstin(stateCode = '19') {
  const rand = () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[int(0, 25)]
  return `${stateCode}${rand()}${rand()}${rand()}${rand()}${rand()}${int(1000, 9999)}${rand()}1Z${int(1, 9)}`
}

// ---------------------------------------------------------------------------
// Category & product catalogue definition
// ---------------------------------------------------------------------------

interface CatGroup {
  parent: string
  hsn: string
  subs: string[]
  bases: string[]
  brands: string[]
  unit: Product['unit']
  gst: number
  priceRange: [number, number]
  perishable?: boolean
  serialised?: boolean
  variantised?: boolean
}

const CATALOGUE: CatGroup[] = [
  {
    parent: 'Electronics',
    hsn: '8517',
    subs: ['Mobiles & Accessories', 'Computing', 'Audio', 'Cables & Chargers'],
    bases: ['Smartphone', 'Bluetooth Speaker', 'Power Bank', 'USB-C Cable', 'Wireless Earbuds', 'Laptop', 'Wireless Mouse', 'Mechanical Keyboard', 'HDMI Cable', '65W Charger', 'Webcam', 'Pen Drive 64GB'],
    brands: ['Voltrix', 'Nexa', 'Cortek', 'Zynq', 'AudioOne'],
    unit: 'PCS',
    gst: 18,
    priceRange: [450, 62000],
    serialised: true
  },
  {
    parent: 'Groceries',
    hsn: '2106',
    subs: ['Staples', 'Snacks & Namkeen', 'Beverages', 'Packaged Food', 'Spices'],
    bases: ['Basmati Rice 5kg', 'Toor Dal 1kg', 'Refined Oil 1L', 'Atta 10kg', 'Sugar 1kg', 'Tea 250g', 'Instant Coffee 100g', 'Namkeen Mix 400g', 'Biscuits Pack', 'Turmeric Powder 200g', 'Chilli Powder 200g', 'Salt 1kg', 'Cola 2L', 'Mango Juice 1L'],
    brands: ['Anaaj', 'GharKitchen', 'PureHarvest', 'DailyGold', 'Sparkle'],
    unit: 'PKT',
    gst: 5,
    priceRange: [25, 850],
    perishable: true
  },
  {
    parent: 'Apparel',
    hsn: '6109',
    subs: ["Men's Wear", "Women's Wear", 'Kids Wear', 'Footwear'],
    bases: ['Cotton T-Shirt', 'Formal Shirt', 'Denim Jeans', 'Kurta', 'Saree', 'Track Pants', 'Hoodie', 'Sports Shoes', 'Sandals', 'Kids Frock'],
    brands: ['Threadline', 'UrbanKnit', 'Rangwaala', 'FitForm', 'StepUp'],
    unit: 'PCS',
    gst: 12,
    priceRange: [199, 3800],
    variantised: true
  },
  {
    parent: 'Home & Kitchen',
    hsn: '7323',
    subs: ['Cookware', 'Storage', 'Cleaning', 'Dining'],
    bases: ['Non-stick Pan', 'Pressure Cooker 3L', 'Steel Container Set', 'Casserole', 'Floor Cleaner 1L', 'Dish Wash 500ml', 'Dinner Plate Set', 'Water Bottle 1L', 'Chopping Board', 'Mixer Grinder'],
    brands: ['HomeEase', 'KitchenPro', 'Shine', 'Everyday', 'CookRite'],
    unit: 'PCS',
    gst: 18,
    priceRange: [80, 4200]
  },
  {
    parent: 'Stationery',
    hsn: '4820',
    subs: ['Writing', 'Paper', 'Office Supplies', 'Art'],
    bases: ['Ballpoint Pen (10)', 'A4 Paper Ream', 'Spiral Notebook', 'Stapler', 'File Folder', 'Sticky Notes', 'Permanent Marker', 'Highlighter Set', 'Sketch Pens', 'Glue Stick'],
    brands: ['WriteWell', 'PaperCraft', 'OfficeMate', 'InkFlow', 'Studio'],
    unit: 'PCS',
    gst: 12,
    priceRange: [15, 480]
  },
  {
    parent: 'Hardware & Tools',
    hsn: '8205',
    subs: ['Hand Tools', 'Power Tools', 'Fasteners', 'Electricals'],
    bases: ['Screwdriver Set', 'Claw Hammer', 'Cordless Drill', 'Measuring Tape 5m', 'Wrench Set', 'Screws Box (200)', 'LED Bulb 9W', 'Extension Board', 'Wire Roll 90m', 'Safety Gloves'],
    brands: ['ToughGrip', 'BuildMate', 'Voltguard', 'IronCore', 'ProFix'],
    unit: 'PCS',
    gst: 18,
    priceRange: [45, 6800]
  },
  {
    parent: 'Beauty & Personal Care',
    hsn: '3304',
    subs: ['Skin Care', 'Hair Care', 'Bath & Body', 'Grooming'],
    bases: ['Face Wash 100ml', 'Moisturiser 200ml', 'Shampoo 340ml', 'Hair Oil 200ml', 'Body Lotion 300ml', 'Soap Pack (4)', 'Sunscreen SPF50', 'Beard Trimmer', 'Deodorant 150ml', 'Hand Cream 75ml'],
    brands: ['GlowLab', 'Herbé', 'PureSkin', 'DailyCare', 'Rituals'],
    unit: 'PCS',
    gst: 18,
    priceRange: [55, 1200],
    perishable: true
  },
  {
    parent: 'Pharmacy',
    hsn: '3004',
    subs: ['OTC Medicine', 'Wellness', 'First Aid', 'Devices'],
    bases: ['Paracetamol 500 (15)', 'Antacid Syrup 200ml', 'Vitamin C Tablets', 'ORS Sachet (10)', 'Cough Syrup 100ml', 'Antiseptic 100ml', 'Crepe Bandage', 'Digital Thermometer', 'BP Monitor', 'Glucometer Strips (25)'],
    brands: ['Mediwell', 'CureX', 'VitaPlus', 'FirstAidCo', 'HealthLine'],
    unit: 'PKT',
    gst: 12,
    priceRange: [20, 1800],
    perishable: true
  },
  {
    parent: 'Automotive',
    hsn: '8708',
    subs: ['Lubricants', 'Spares', 'Accessories', 'Care'],
    bases: ['Engine Oil 1L', 'Brake Pad Set', 'Air Filter', 'Wiper Blade Pair', 'Car Perfume', 'Microfibre Cloth (3)', 'Tyre Inflator', 'Seat Cover Set', 'Headlight Bulb', 'Battery Terminal'],
    brands: ['MotoMax', 'DriveLine', 'AutoGrip', 'RoadPro', 'ClearView'],
    unit: 'PCS',
    gst: 28,
    priceRange: [90, 5200]
  },
  {
    parent: 'Sports & Fitness',
    hsn: '9506',
    subs: ['Gym Equipment', 'Outdoor', 'Team Sports', 'Yoga'],
    bases: ['Dumbbell 5kg Pair', 'Resistance Band Set', 'Cricket Bat', 'Football Size 5', 'Yoga Mat 6mm', 'Skipping Rope', 'Badminton Racket', 'Water Bottle 750ml', 'Gym Gloves', 'Foam Roller'],
    brands: ['FlexFit', 'ProPlay', 'CoreStrong', 'ActiveLine', 'PeakGear'],
    unit: 'PCS',
    gst: 18,
    priceRange: [120, 3600]
  },
  {
    parent: 'Toys & Games',
    hsn: '9503',
    subs: ['Educational', 'Action Figures', 'Board Games', 'Outdoor Play'],
    bases: ['Building Blocks 200pc', 'Remote Car', 'Puzzle 500pc', 'Board Game Classic', 'Soft Toy Bear', 'Art & Craft Kit', 'Water Gun', 'Toy Kitchen Set', 'Rubik Cube', 'Kids Cycle 16"'],
    brands: ['PlayNest', 'BrightKids', 'FunZone', 'LearnPlay', 'TinyTots'],
    unit: 'PCS',
    gst: 18,
    priceRange: [99, 4800]
  },
  {
    parent: 'Furniture',
    hsn: '9403',
    subs: ['Office', 'Living', 'Storage', 'Bedroom'],
    bases: ['Office Chair', 'Study Table', 'Bookshelf 4-tier', '2-Seater Sofa', 'Shoe Rack', 'Wardrobe 2-door', 'Coffee Table', 'Folding Bed', 'TV Unit', 'Bar Stool'],
    brands: ['WoodCraft', 'NestLiving', 'DeskWorks', 'HomeStack', 'ComfortLine'],
    unit: 'PCS',
    gst: 18,
    priceRange: [850, 24000]
  }
]

const SIZES = ['S', 'M', 'L', 'XL']
const COLORS = ['Black', 'Navy', 'Grey', 'Maroon', 'White']

// Typical wholesale cost band per catalogue item (₹). Keeps a USB cable cheap and
// a sofa expensive regardless of the parent category's overall range.
const BASE_COST: Record<string, [number, number]> = {
  Smartphone: [7500, 34000], 'Bluetooth Speaker': [700, 3200], 'Power Bank': [550, 2400],
  'USB-C Cable': [60, 260], 'Wireless Earbuds': [600, 4500], Laptop: [26000, 62000],
  'Wireless Mouse': [180, 900], 'Mechanical Keyboard': [900, 4200], 'HDMI Cable': [120, 480],
  '65W Charger': [350, 1600], Webcam: [700, 3200], 'Pen Drive 64GB': [280, 620],
  'Basmati Rice 5kg': [320, 680], 'Toor Dal 1kg': [110, 190], 'Refined Oil 1L': [120, 210],
  'Atta 10kg': [340, 520], 'Sugar 1kg': [40, 62], 'Tea 250g': [110, 260], 'Instant Coffee 100g': [180, 420],
  'Namkeen Mix 400g': [70, 150], 'Biscuits Pack': [20, 90], 'Turmeric Powder 200g': [40, 95],
  'Chilli Powder 200g': [45, 110], 'Salt 1kg': [18, 32], 'Cola 2L': [85, 130], 'Mango Juice 1L': [90, 160],
  'Cotton T-Shirt': [180, 520], 'Formal Shirt': [420, 1200], 'Denim Jeans': [650, 1900], Kurta: [350, 1400],
  Saree: [700, 3600], 'Track Pants': [320, 900], Hoodie: [520, 1600], 'Sports Shoes': [800, 3200],
  Sandals: [250, 900], 'Kids Frock': [220, 700],
  'Non-stick Pan': [280, 1200], 'Pressure Cooker 3L': [900, 2600], 'Steel Container Set': [450, 1800],
  Casserole: [350, 1400], 'Floor Cleaner 1L': [70, 180], 'Dish Wash 500ml': [45, 120],
  'Dinner Plate Set': [400, 1600], 'Water Bottle 1L': [90, 400], 'Chopping Board': [90, 350], 'Mixer Grinder': [1800, 4200],
  'Ballpoint Pen (10)': [40, 120], 'A4 Paper Ream': [220, 360], 'Spiral Notebook': [35, 140], Stapler: [60, 260],
  'File Folder': [20, 80], 'Sticky Notes': [30, 110], 'Permanent Marker': [25, 90], 'Highlighter Set': [70, 220],
  'Sketch Pens': [45, 180], 'Glue Stick': [15, 60],
  'Screwdriver Set': [180, 900], 'Claw Hammer': [180, 600], 'Cordless Drill': [1800, 6800],
  'Measuring Tape 5m': [80, 260], 'Wrench Set': [350, 1600], 'Screws Box (200)': [60, 220],
  'LED Bulb 9W': [45, 140], 'Extension Board': [180, 700], 'Wire Roll 90m': [700, 2400], 'Safety Gloves': [40, 180],
  'Face Wash 100ml': [55, 220], 'Moisturiser 200ml': [120, 480], 'Shampoo 340ml': [95, 380], 'Hair Oil 200ml': [70, 260],
  'Body Lotion 300ml': [110, 420], 'Soap Pack (4)': [80, 200], 'Sunscreen SPF50': [180, 650],
  'Beard Trimmer': [500, 1800], 'Deodorant 150ml': [90, 280], 'Hand Cream 75ml': [60, 200],
  'Paracetamol 500 (15)': [12, 40], 'Antacid Syrup 200ml': [60, 150], 'Vitamin C Tablets': [80, 260],
  'ORS Sachet (10)': [40, 110], 'Cough Syrup 100ml': [55, 160], 'Antiseptic 100ml': [35, 120],
  'Crepe Bandage': [40, 130], 'Digital Thermometer': [120, 420], 'BP Monitor': [900, 2200], 'Glucometer Strips (25)': [400, 900],
  'Engine Oil 1L': [280, 720], 'Brake Pad Set': [450, 1800], 'Air Filter': [180, 700], 'Wiper Blade Pair': [220, 800],
  'Car Perfume': [90, 400], 'Microfibre Cloth (3)': [120, 360], 'Tyre Inflator': [900, 3200],
  'Seat Cover Set': [1200, 4200], 'Headlight Bulb': [120, 600], 'Battery Terminal': [60, 220],
  'Dumbbell 5kg Pair': [400, 1100], 'Resistance Band Set': [180, 700], 'Cricket Bat': [500, 2600],
  'Football Size 5': [300, 1400], 'Yoga Mat 6mm': [250, 900], 'Skipping Rope': [70, 260],
  'Badminton Racket': [350, 1800], 'Water Bottle 750ml': [90, 400], 'Gym Gloves': [150, 550], 'Foam Roller': [300, 1000],
  'Building Blocks 200pc': [350, 1400], 'Remote Car': [450, 2200], 'Puzzle 500pc': [180, 600],
  'Board Game Classic': [250, 1200], 'Soft Toy Bear': [200, 900], 'Art & Craft Kit': [250, 1100],
  'Water Gun': [90, 400], 'Toy Kitchen Set': [500, 2400], 'Rubik Cube': [90, 400], 'Kids Cycle 16"': [2200, 4800],
  'Office Chair': [1800, 8500], 'Study Table': [2200, 9000], 'Bookshelf 4-tier': [1600, 6500],
  '2-Seater Sofa': [9000, 24000], 'Shoe Rack': [700, 2600], 'Wardrobe 2-door': [7000, 20000],
  'Coffee Table': [1400, 5200], 'Folding Bed': [3200, 9000], 'TV Unit': [2600, 9500], 'Bar Stool': [900, 3200]
}

// ===========================================================================
// SEED
// ===========================================================================

export function seedAll(): void {
  // ---- platform / access ----
  saveAll(COLLECTIONS.roles, DEFAULT_ROLES)
  saveAll(COLLECTIONS.moduleStates, defaultModuleStates())

  const company: Company = {
    id: 'company_1',
    name: 'Shakti Traders',
    legalName: 'Shakti Traders Pvt Ltd',
    tagline: 'Wholesale · Retail · Distribution',
    industry: 'Wholesale & Distribution',
    gstin: '19AABCS4321K1Z9',
    pan: 'AABCS4321K',
    address: 'Warehouse Complex, Plot 14, Dankuni Industrial Area',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '712310',
    phone: '+91 98300 45678',
    email: 'accounts@shaktitraders.example',
    website: 'www.shaktitraders.example',
    upiId: 'shaktitraders@okhdfcbank',
    bankName: 'HDFC Bank',
    bankAccount: '50200012345678',
    bankIfsc: 'HDFC0000123',
    financialYear: '2026-27',
    logoEmoji: '🧩'
  }
  save(COLLECTIONS.company, company)

  const settings: Settings = {
    currency: 'INR',
    invoicePrefix: 'ST/INV',
    quotePrefix: 'ST/QT',
    poPrefix: 'ST/PO',
    receiptPrefix: 'ST/RCPT',
    defaultGstRate: 18,
    lowStockGlobalThreshold: 20,
    placeOfSupply: 'West Bengal',
    enableRoundOff: true,
    payslipNote: 'This is a computer-generated payslip and does not require a signature.',
    whatsappSenderName: 'Shakti Traders'
  }
  save(COLLECTIONS.settings, settings)

  // ---- categories (parents + subcategories ~ 50) ----
  const categories: Category[] = []
  for (const g of CATALOGUE) {
    const parent: Category = {
      id: genId('cat'),
      name: g.parent,
      parentId: null,
      hsn: g.hsn,
      createdAt: isoDaysAgo(int(400, 900))
    }
    categories.push(parent)
    for (const s of g.subs) {
      categories.push({
        id: genId('cat'),
        name: s,
        parentId: parent.id,
        hsn: g.hsn,
        createdAt: isoDaysAgo(int(300, 800))
      })
    }
  }
  saveAll(COLLECTIONS.categories, categories)
  const subCatsByParentName: Record<string, Category[]> = {}
  for (const g of CATALOGUE) {
    const parent = categories.find((c) => c.name === g.parent && c.parentId === null)!
    subCatsByParentName[g.parent] = categories.filter((c) => c.parentId === parent.id)
  }

  // ---- warehouses ----
  const warehouses: Warehouse[] = [
    { id: genId('wh'), name: 'Main Warehouse — Dankuni', code: 'WH-DNK', address: 'Plot 14, Dankuni Industrial Area', city: 'Kolkata', isPrimary: true, status: 'ACTIVE' },
    { id: genId('wh'), name: 'City Store — Burrabazar', code: 'WH-BBZ', address: '22 Rabindra Sarani, Burrabazar', city: 'Kolkata', isPrimary: false, status: 'ACTIVE' },
    { id: genId('wh'), name: 'Regional Depot — Siliguri', code: 'WH-SLG', address: 'Sevoke Road, Siliguri', city: 'Siliguri', isPrimary: false, status: 'ACTIVE' },
    { id: genId('wh'), name: 'Overflow Godown — Howrah', code: 'WH-HWH', address: 'Ghusuri, Howrah', city: 'Howrah', isPrimary: false, status: 'ACTIVE' }
  ]
  saveAll(COLLECTIONS.warehouses, warehouses)
  const primaryWh = warehouses[0]

  // ---- suppliers (25) ----
  const suppliers: Supplier[] = Array.from({ length: 25 }).map((_, i) => {
    const [city, state] = pick(CITIES)
    const name = `${pick(LAST)} ${pick(BIZ_SUFFIX)}`
    return {
      id: genId('sup'),
      name,
      contactPerson: personName(),
      phone: phone(),
      email: `sales${i + 1}@${name.toLowerCase().replace(/[^a-z]/g, '')}.example`,
      gstin: gstin(),
      address: `${int(1, 240)}, ${pick(['GT Road', 'Industrial Estate', 'Market Complex', 'Station Road'])}`,
      city,
      state,
      paymentTerms: pick(['Advance', 'Net 7', 'Net 15', 'Net 30', 'Net 45']),
      openingBalance: chance(0.3) ? int(0, 80000) : 0,
      status: chance(0.92) ? 'ACTIVE' : 'INACTIVE',
      createdAt: isoDaysAgo(int(200, 1400))
    }
  })
  saveAll(COLLECTIONS.suppliers, suppliers)
  const activeSuppliers = suppliers.filter((s) => s.status === 'ACTIVE')

  // ---- products (500) ----
  const products: Product[] = []
  let skuCounter = 1000
  for (let i = 0; i < 500; i++) {
    const g = CATALOGUE[i % CATALOGUE.length]
    const sub = pick(subCatsByParentName[g.parent])
    const base = pick(g.bases)
    const brand = pick(g.brands)
    const [lo, hi] = BASE_COST[base] ?? g.priceRange
    const cost = money(lo + rnd() * (hi - lo))
    const margin = 1.12 + rnd() * 0.45
    const selling = money(cost * margin)
    const mrp = money(selling * (1.05 + rnd() * 0.25))
    skuCounter++
    const sku = `${g.parent.slice(0, 3).toUpperCase()}-${skuCounter}`
    const hasVariants = !!g.variantised && chance(0.6)
    const variants: ProductVariant[] = []
    if (hasVariants) {
      const colorSet = sample(COLORS, int(2, 3))
      for (const size of SIZES) {
        for (const color of colorSet) {
          variants.push({
            id: genId('var'),
            sku: `${sku}-${size}-${color.slice(0, 2).toUpperCase()}`,
            barcode: String(890000000000 + int(1, 999999999)),
            attributes: { Size: size, Color: color },
            costPrice: cost,
            sellingPrice: selling,
            mrp
          })
        }
      }
    }
    products.push({
      id: genId('prd'),
      name: `${brand} ${base}`,
      sku,
      barcode: String(890000000000 + int(1, 999999999)),
      categoryId: sub.id,
      brand,
      hsn: g.hsn,
      unit: g.unit,
      gstRate: g.gst,
      costPrice: cost,
      sellingPrice: selling,
      mrp,
      reorderLevel: int(10, 45),
      trackBatches: !!g.perishable,
      trackSerials: !!g.serialised && chance(0.5),
      hasVariants,
      variants,
      primarySupplierId: pick(activeSuppliers).id,
      status: chance(0.95) ? 'ACTIVE' : 'DISCONTINUED',
      createdAt: isoDaysAgo(int(30, 1200))
    })
  }
  saveAll(COLLECTIONS.products, products)
  const sellable = products.filter((p) => p.status === 'ACTIVE')

  // ---- opening stock: levels + moves + running balances ----
  const balance: Record<string, number> = {} // `${productId}|${warehouseId}` -> qty
  const stockMoves: StockMove[] = []
  const stockLevels: StockLevel[] = []
  const batches: Batch[] = []
  const key = (p: string, w: string) => `${p}|${w}`

  for (const p of products) {
    // opening qty concentrated in main warehouse, some spread to 1-2 others
    const spread = [primaryWh, ...sample(warehouses.slice(1), int(0, 2))]
    for (const w of spread) {
      const qty = w.id === primaryWh.id ? int(40, 320) : int(0, 90)
      if (qty === 0) continue
      balance[key(p.id, w.id)] = qty
      stockLevels.push({ id: genId('lvl'), productId: p.id, warehouseId: w.id, onHand: qty, reserved: 0 })
      stockMoves.push({
        id: genId('mv'),
        ts: isoDaysAgo(370),
        productId: p.id,
        warehouseId: w.id,
        type: 'OPENING',
        qty,
        balanceAfter: qty,
        refType: 'Opening',
        refLabel: 'Opening stock',
        userId: 'system',
        userName: 'System'
      })
      if (p.trackBatches) {
        const nBatches = int(1, 3)
        let left = qty
        for (let b = 0; b < nBatches; b++) {
          const bq = b === nBatches - 1 ? left : int(1, Math.max(1, Math.floor(left / 2)))
          left -= bq
          batches.push({
            id: genId('bat'),
            productId: p.id,
            batchNo: `B${dateDaysAgo(int(20, 300)).replace(/-/g, '').slice(2)}-${int(10, 99)}`,
            warehouseId: w.id,
            qty: bq,
            mfgDate: dateDaysAgo(int(60, 320)),
            expiryDate: dateDaysAhead(int(-30, 420)),
            costPrice: p.costPrice,
            receivedAt: isoDaysAgo(int(20, 300))
          })
          if (left <= 0) break
        }
      }
    }
  }

  // ---- customers (100) ----
  const wbCities = CITIES.filter(([, st]) => st === 'West Bengal')
  const customers: Customer[] = Array.from({ length: 100 }).map((_, i) => {
    const [city, state] = chance(0.68) ? pick(wbCities) : pick(CITIES)
    const isBiz = chance(0.6)
    const type: Customer['type'] = isBiz ? pick(['Wholesale', 'Distributor', 'Corporate']) : 'Retail'
    const name = isBiz ? `${pick(LAST)} ${pick(BIZ_SUFFIX)}` : personName()
    const addr = `${int(1, 300)}, ${pick(['Park Street', 'Camac Street', 'MG Road', 'College Street', 'Sarat Bose Road'])}, ${city}`
    return {
      id: genId('cus'),
      name,
      type,
      contactPerson: isBiz ? personName() : name,
      phone: phone(),
      email: `${name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}${i}@mail.example`,
      gstin: isBiz ? gstin() : '',
      billingAddress: addr,
      shippingAddress: addr,
      city,
      state,
      creditLimit: type === 'Retail' ? 0 : int(50000, 600000),
      openingBalance: chance(0.25) ? int(0, 40000) : 0,
      priceTier: type === 'Distributor' ? 'Gold' : type === 'Wholesale' ? 'Silver' : 'Standard',
      notes: chance(0.2) ? pick(['Prefers delivery before noon.', 'Always negotiates on freight.', 'Key account — priority dispatch.', 'Pays on the 5th of every month.']) : '',
      status: chance(0.94) ? 'ACTIVE' : 'INACTIVE',
      createdAt: isoDaysAgo(int(20, 1300))
    }
  })
  saveAll(COLLECTIONS.customers, customers)
  const activeCustomers = customers.filter((c) => c.status === 'ACTIVE')

  // ---- departments + employees (50) ----
  const deptNames = ['Management', 'Sales', 'Purchase', 'Warehouse & Logistics', 'Accounts & Finance', 'Human Resources', 'IT & Systems', 'Customer Support']
  const departments: Department[] = deptNames.map((n) => ({ id: genId('dep'), name: n, headEmployeeId: null }))
  const deptByName = (n: string) => departments.find((d) => d.name === n)!

  const shifts: Shift[] = [
    { id: genId('sh'), name: 'General (10–7)', startTime: '10:00', endTime: '19:00', graceMinutes: 15 },
    { id: genId('sh'), name: 'Warehouse Early (7–4)', startTime: '07:00', endTime: '16:00', graceMinutes: 10 },
    { id: genId('sh'), name: 'Late (12–9)', startTime: '12:00', endTime: '21:00', graceMinutes: 15 }
  ]
  saveAll(COLLECTIONS.shifts, shifts)
  saveAll(COLLECTIONS.departments, departments)

  const designations: Record<string, string[]> = {
    Management: ['Managing Director', 'General Manager', 'Operations Head'],
    Sales: ['Sales Executive', 'Sr. Sales Executive', 'Area Sales Manager', 'Sales Coordinator'],
    Purchase: ['Purchase Officer', 'Purchase Manager', 'Vendor Coordinator'],
    'Warehouse & Logistics': ['Warehouse Supervisor', 'Store Keeper', 'Packer', 'Logistics Coordinator', 'Fork-lift Operator'],
    'Accounts & Finance': ['Accounts Executive', 'Sr. Accountant', 'Finance Manager', 'Billing Clerk'],
    'Human Resources': ['HR Executive', 'HR Manager', 'Recruiter'],
    'IT & Systems': ['IT Support Engineer', 'Systems Administrator'],
    'Customer Support': ['Support Executive', 'Support Team Lead']
  }

  const employees: Employee[] = []
  const empDeptPlan: string[] = [
    'Management', 'Management',
    ...Array(14).fill('Sales'),
    ...Array(6).fill('Purchase'),
    ...Array(12).fill('Warehouse & Logistics'),
    ...Array(7).fill('Accounts & Finance'),
    ...Array(4).fill('Human Resources'),
    ...Array(2).fill('IT & Systems'),
    ...Array(3).fill('Customer Support')
  ]
  for (let i = 0; i < 50; i++) {
    const deptName = empDeptPlan[i] ?? pick(deptNames)
    const dept = deptByName(deptName)
    const name = personName()
    const designation = pick(designations[deptName])
    const ctc = deptName === 'Management' ? int(1800000, 3600000) : /Manager|Head|Lead|Sr\./.test(designation) ? int(720000, 1400000) : int(240000, 620000)
    employees.push({
      id: genId('emp'),
      empCode: `ST-E${String(i + 1).padStart(3, '0')}`,
      name,
      photoUrl: '',
      gender: FIRST_F.some((f) => name.startsWith(f)) ? 'Female' : 'Male',
      dob: dateDaysAgo(int(8000, 20000)),
      email: `${name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}@shaktitraders.example`,
      mobile: phone(),
      address: `${int(1, 200)}, ${pick(['Behala', 'Garia', 'Dumdum', 'Salt Lake', 'Barasat', 'Konnagar'])}`,
      departmentId: dept.id,
      designation,
      reportingManagerId: null,
      employmentType: chance(0.86) ? 'Full-time' : pick(['Part-time', 'Contract', 'Intern']),
      joiningDate: dateDaysAgo(int(60, 2600)),
      ctcAnnual: ctc,
      basicPct: 45,
      hraPct: 20,
      pan: `${'ABCDEFGHJ'[int(0, 8)]}${'ABCDEFGHJ'[int(0, 8)]}${'ABCDEFGHJ'[int(0, 8)]}P${'ABCDEFGHJ'[int(0, 8)]}${int(1000, 9999)}A`,
      pfNumber: chance(0.9) ? `WB/KOL/${int(10000, 99999)}/${int(100, 999)}` : '',
      esiNumber: ctc / 12 < 21000 ? `31${int(10000000, 99999999)}` : '',
      bankAccount: String(int(10000000000, 99999999999)),
      bankIfsc: pick(['HDFC0000123', 'SBIN0001234', 'ICIC0004567', 'AXIS0007890']),
      status: chance(0.9) ? 'ACTIVE' : pick(['ON_NOTICE', 'EXITED']),
      documents: [
        { id: genId('doc'), type: 'Offer Letter', name: 'offer_letter.pdf', uploadedAt: isoDaysAgo(int(60, 2000)) },
        { id: genId('doc'), type: 'PAN', name: 'pan_card.jpg', uploadedAt: isoDaysAgo(int(60, 2000)) },
        { id: genId('doc'), type: 'Aadhaar', name: 'aadhaar.pdf', uploadedAt: isoDaysAgo(int(60, 2000)) }
      ],
      createdAt: isoDaysAgo(int(60, 2600))
    })
  }
  // reporting lines: dept heads report to MD; others report to a manager in their dept
  const md = employees[0]
  for (const d of departments) {
    const inDept = employees.filter((e) => e.departmentId === d.id)
    const head = inDept.find((e) => /Manager|Head|Director|Lead/.test(e.designation)) ?? inDept[0]
    if (head) {
      d.headEmployeeId = head.id
      head.reportingManagerId = head.id === md.id ? null : md.id
      for (const e of inDept) if (e.id !== head.id) e.reportingManagerId = head.id
    }
  }
  saveAll(COLLECTIONS.departments, departments)
  saveAll(COLLECTIONS.employees, employees)
  const activeEmployees = employees.filter((e) => e.status !== 'EXITED')
  const salesEmployees = activeEmployees.filter((e) => e.departmentId === deptByName('Sales').id)

  // ---- leave balances ----
  saveAll(
    COLLECTIONS.leaveBalances,
    employees.map((e) => ({ employeeId: e.id, sick: int(2, 8), casual: int(1, 7), paid: int(0, 15) }))
  )

  // =====================================================================
  // 12 months of PURCHASES  (adds stock)
  // =====================================================================
  const purchaseOrders: PurchaseOrder[] = []
  const supplierPayments: SupplierPayment[] = []
  let poCounter = 1
  for (let m = 12; m >= 1; m--) {
    const posThisMonth = int(4, 7)
    for (let k = 0; k < posThisMonth; k++) {
      const daysAgo = m * 30 - int(0, 27)
      const supplier = pick(activeSuppliers)
      const wh = chance(0.75) ? primaryWh : pick(warehouses)
      const nLines = int(3, 6)
      const lineProducts = sample(sellable, nLines)
      const lines: PurchaseOrderLine[] = lineProducts.map((p) => {
        const qty = int(12, 70)
        return { productId: p.id, qty, receivedQty: 0, rate: money(p.costPrice * (0.9 + rnd() * 0.15)), gstRate: p.gstRate }
      })
      const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0)
      const taxTotal = lines.reduce((s, l) => s + (l.qty * l.rate * l.gstRate) / 100, 0)
      const total = money(subtotal + taxTotal)
      const old = daysAgo > 20
      const status: PurchaseOrder['status'] = old ? (chance(0.9) ? 'RECEIVED' : 'PARTIAL') : pick(['DRAFT', 'ORDERED', 'ORDERED', 'PARTIAL'])
      const po: PurchaseOrder = {
        id: genId('po'),
        poNo: `${settings.poPrefix}/${String(poCounter++).padStart(4, '0')}`,
        supplierId: supplier.id,
        warehouseId: wh.id,
        orderDate: dateDaysAgo(daysAgo),
        expectedDate: dateDaysAgo(daysAgo - int(3, 12)),
        status,
        lines,
        subtotal: money(subtotal),
        taxTotal: money(taxTotal),
        total,
        amountPaid: status === 'RECEIVED' ? (chance(0.8) ? total : money(total * (0.4 + rnd() * 0.4))) : chance(0.3) ? money(total * 0.3) : 0,
        notes: '',
        createdByUserId: 'system',
        createdAt: isoDaysAgo(daysAgo)
      }
      // receive stock for RECEIVED / PARTIAL
      if (status === 'RECEIVED' || status === 'PARTIAL') {
        for (const l of po.lines) {
          const recv = status === 'RECEIVED' ? l.qty : Math.floor(l.qty * (0.4 + rnd() * 0.4))
          l.receivedQty = recv
          if (recv <= 0) continue
          const bkey = key(l.productId, po.warehouseId)
          const nb = (balance[bkey] ?? 0) + recv
          balance[bkey] = nb
          stockMoves.push({
            id: genId('mv'),
            ts: isoDaysAgo(daysAgo - 1),
            productId: l.productId,
            warehouseId: po.warehouseId,
            type: 'PURCHASE',
            qty: recv,
            balanceAfter: nb,
            refType: 'PurchaseOrder',
            refId: po.id,
            refLabel: po.poNo,
            userId: 'system',
            userName: 'System'
          })
        }
      }
      purchaseOrders.push(po)
      if (po.amountPaid > 0) {
        supplierPayments.push({
          id: genId('spay'),
          paymentNo: `ST/SP/${String(supplierPayments.length + 1).padStart(4, '0')}`,
          supplierId: supplier.id,
          purchaseOrderId: po.id,
          amount: po.amountPaid,
          mode: pick(['Bank Transfer', 'UPI', 'Cheque', 'Bank Transfer']),
          reference: `TXN${int(100000, 999999)}`,
          date: dateDaysAgo(daysAgo - int(1, 8)),
          note: '',
          createdByUserId: 'system'
        })
      }
    }
  }
  saveAll(COLLECTIONS.purchaseOrders, purchaseOrders)
  saveAll(COLLECTIONS.supplierPayments, supplierPayments)

  // =====================================================================
  // 12 months of SALES  (removes stock) — invoices, receipts, orders, etc.
  // =====================================================================
  const invoices: Invoice[] = []
  const receipts: PaymentReceipt[] = []
  const quotations: Quotation[] = []
  const salesOrders: SalesOrder[] = []
  const challans: DeliveryChallan[] = []
  const creditNotes: CreditNote[] = []
  let invCounter = 1
  let qtCounter = 1
  let soCounter = 1
  let dcCounter = 1
  let cnCounter = 1
  let rcCounter = 1

  const priceForTier = (p: Product, tier: Customer['priceTier']) => {
    const disc = tier === 'Gold' ? 0.9 : tier === 'Silver' ? 0.95 : 1
    return money(p.sellingPrice * disc)
  }

  for (let m = 12; m >= 0; m--) {
    // gentle upward trend + seasonality
    const seasonal = 1 + 0.18 * Math.sin(((12 - m) / 12) * Math.PI * 2)
    const growth = 1 + (12 - m) * 0.015
    const invThisMonth = Math.max(10, Math.round(int(20, 30) * seasonal * growth))
    for (let k = 0; k < invThisMonth; k++) {
      const daysAgo = m === 0 ? int(0, new Date().getDate() - 1 || 1) : m * 30 - int(0, 27)
      const customer = pick(activeCustomers)
      const salesperson = pick(salesEmployees.length ? salesEmployees : activeEmployees)
      const wh = chance(0.8) ? primaryWh : pick(warehouses)
      const nLines = int(2, 8)
      const chosen = sample(sellable, nLines)
      const lines: DocLine[] = chosen.map((p) => {
        const qty = int(1, customer.type === 'Retail' ? 6 : 40)
        return {
          productId: p.id,
          description: p.name,
          qty,
          rate: priceForTier(p, customer.priceTier),
          discountPct: chance(0.25) ? pick([2, 5, 7.5, 10]) : 0,
          gstRate: p.gstRate
        }
      })
      let subtotal = 0
      let discountTotal = 0
      let taxTotal = 0
      for (const l of lines) {
        const gross = l.qty * l.rate
        const disc = (gross * l.discountPct) / 100
        const taxable = gross - disc
        subtotal += gross
        discountTotal += disc
        taxTotal += (taxable * l.gstRate) / 100
      }
      const interState = customer.state !== company.state
      const cgst = interState ? 0 : money(taxTotal / 2)
      const sgst = interState ? 0 : money(taxTotal / 2)
      const igst = interState ? money(taxTotal) : 0
      const rawTotal = subtotal - discountTotal + cgst + sgst + igst
      const roundedTotal = settings.enableRoundOff ? Math.round(rawTotal) : rawTotal
      const roundOff = money(roundedTotal - rawTotal)
      const isOld = daysAgo > 20
      let status: Invoice['status']
      let amountPaid = 0
      if (isOld) {
        const r = rnd()
        if (r < 0.82) {
          status = 'PAID'
          amountPaid = roundedTotal
        } else if (r < 0.9) {
          status = 'PARTIAL'
          amountPaid = money(roundedTotal * (0.3 + rnd() * 0.4))
        } else {
          status = daysAgo > 45 ? 'OVERDUE' : 'SENT'
        }
      } else {
        status = chance(0.7) ? 'SENT' : 'DRAFT'
      }
      const inv: Invoice = {
        id: genId('inv'),
        invoiceNo: `${settings.invoicePrefix}/26-27/${String(invCounter++).padStart(4, '0')}`,
        type: 'TAX',
        customerId: customer.id,
        salesOrderId: null,
        warehouseId: wh.id,
        date: dateDaysAgo(daysAgo),
        dueDate: dateDaysAgo(daysAgo - 15),
        placeOfSupply: customer.state,
        status,
        lines,
        subtotal: money(subtotal),
        discountTotal: money(discountTotal),
        cgst,
        sgst,
        igst,
        roundOff,
        total: roundedTotal,
        amountPaid: money(amountPaid),
        salespersonEmployeeId: salesperson.id,
        notes: '',
        createdByUserId: 'system',
        createdAt: isoDaysAgo(daysAgo)
      }
      invoices.push(inv)

      // decrement stock for non-draft invoices
      if (status !== 'DRAFT') {
        for (const l of lines) {
          const bkey = key(l.productId, wh.id)
          const nb = (balance[bkey] ?? 0) - l.qty
          balance[bkey] = nb
          stockMoves.push({
            id: genId('mv'),
            ts: isoDaysAgo(daysAgo),
            productId: l.productId,
            warehouseId: wh.id,
            type: 'SALE',
            qty: -l.qty,
            balanceAfter: nb,
            refType: 'Invoice',
            refId: inv.id,
            refLabel: inv.invoiceNo,
            userId: 'system',
            userName: 'System'
          })
        }
      }

      // receipts
      if (amountPaid > 0) {
        receipts.push({
          id: genId('rc'),
          receiptNo: `${settings.receiptPrefix}/${String(rcCounter++).padStart(4, '0')}`,
          invoiceId: inv.id,
          customerId: customer.id,
          amount: inv.amountPaid,
          mode: pick(['UPI', 'Bank Transfer', 'Cash', 'Cheque', 'UPI']),
          reference: `PAY${int(100000, 999999)}`,
          date: dateDaysAgo(Math.max(0, daysAgo - int(0, 12))),
          note: '',
          sentWhatsapp: chance(0.6),
          createdByUserId: 'system'
        })
      }

      // delivery challan for larger orders
      if (status !== 'DRAFT' && customer.type !== 'Retail' && chance(0.5)) {
        challans.push({
          id: genId('dc'),
          challanNo: `ST/DC/${String(dcCounter++).padStart(4, '0')}`,
          invoiceId: inv.id,
          salesOrderId: null,
          customerId: customer.id,
          date: dateDaysAgo(daysAgo),
          vehicleNo: `WB${int(10, 99)}${'ABCDEFGH'[int(0, 7)]}${int(1000, 9999)}`,
          status: isOld ? 'DELIVERED' : pick(['PENDING', 'DISPATCHED']),
          lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
          createdByUserId: 'system'
        })
      }

      // occasional credit note against paid invoices
      if (status === 'PAID' && chance(0.06)) {
        const l = pick(lines)
        const cnTotal = money(l.rate * Math.max(1, Math.floor(l.qty / 2)) * (1 + l.gstRate / 100))
        creditNotes.push({
          id: genId('cn'),
          noteNo: `ST/CN/${String(cnCounter++).padStart(4, '0')}`,
          invoiceId: inv.id,
          customerId: customer.id,
          date: dateDaysAgo(Math.max(0, daysAgo - int(1, 10))),
          reason: pick(['Damaged in transit', 'Short supply adjustment', 'Rate difference', 'Sales return']),
          lines: [{ ...l, qty: Math.max(1, Math.floor(l.qty / 2)) }],
          total: cnTotal,
          createdByUserId: 'system'
        })
      }
    }

    // quotations + sales orders (subset, recent months weighted)
    if (m <= 4) {
      const qCount = int(4, 9)
      for (let k = 0; k < qCount; k++) {
        const daysAgo = m * 30 - int(0, 27)
        const customer = pick(activeCustomers)
        const chosen = sample(sellable, int(1, 5))
        const lines: DocLine[] = chosen.map((p) => ({
          productId: p.id,
          description: p.name,
          qty: int(2, 30),
          rate: priceForTier(p, customer.priceTier),
          discountPct: chance(0.4) ? pick([2, 5, 8]) : 0,
          gstRate: p.gstRate
        }))
        let subtotal = 0
        let discountTotal = 0
        let taxTotal = 0
        for (const l of lines) {
          const gross = l.qty * l.rate
          const disc = (gross * l.discountPct) / 100
          subtotal += gross
          discountTotal += disc
          taxTotal += ((gross - disc) * l.gstRate) / 100
        }
        const total = money(subtotal - discountTotal + taxTotal)
        const qStatus: Quotation['status'] = daysAgo > 20 ? pick(['ACCEPTED', 'DECLINED', 'ACCEPTED', 'SENT']) : pick(['DRAFT', 'SENT', 'SENT'])
        const q: Quotation = {
          id: genId('qt'),
          quoteNo: `${settings.quotePrefix}/${String(qtCounter++).padStart(4, '0')}`,
          customerId: customer.id,
          date: dateDaysAgo(daysAgo),
          validUntil: dateDaysAgo(daysAgo - 15),
          status: qStatus,
          lines,
          subtotal: money(subtotal),
          discountTotal: money(discountTotal),
          taxTotal: money(taxTotal),
          total,
          notes: '',
          createdByUserId: 'system',
          createdAt: isoDaysAgo(daysAgo)
        }
        quotations.push(q)
        if (qStatus === 'ACCEPTED') {
          const soStatus: SalesOrder['status'] = daysAgo > 12 ? pick(['FULFILLED', 'FULFILLED', 'CONFIRMED']) : pick(['CONFIRMED', 'PARTIAL'])
          salesOrders.push({
            id: genId('so'),
            orderNo: `ST/SO/${String(soCounter++).padStart(4, '0')}`,
            customerId: customer.id,
            quotationId: q.id,
            date: dateDaysAgo(daysAgo - int(1, 5)),
            expectedDispatch: dateDaysAgo(daysAgo - int(6, 14)),
            status: soStatus,
            lines,
            subtotal: q.subtotal,
            discountTotal: q.discountTotal,
            taxTotal: q.taxTotal,
            total: q.total,
            notes: '',
            createdByUserId: 'system',
            createdAt: isoDaysAgo(daysAgo - 1)
          })
        }
      }
    }
  }

  // finalise stock levels from running balances
  const levelIndex: Record<string, StockLevel> = {}
  for (const lv of stockLevels) levelIndex[key(lv.productId, lv.warehouseId)] = lv
  for (const [k, qty] of Object.entries(balance)) {
    const [productId, warehouseId] = k.split('|')
    const existing = levelIndex[k]
    const onHand = Math.max(0, qty)
    if (existing) existing.onHand = onHand
    else if (onHand > 0) stockLevels.push({ id: genId('lvl'), productId, warehouseId, onHand, reserved: 0 })
  }
  stockMoves.sort((a, b) => a.ts.localeCompare(b.ts))
  saveAll(COLLECTIONS.stockLevels, stockLevels)
  saveAll(COLLECTIONS.stockMoves, stockMoves.slice(-9000))
  saveAll(COLLECTIONS.batches, batches)
  saveAll(COLLECTIONS.stockTransfers, [])

  saveAll(COLLECTIONS.invoices, invoices)
  saveAll(COLLECTIONS.paymentReceipts, receipts)
  saveAll(COLLECTIONS.quotations, quotations)
  saveAll(COLLECTIONS.salesOrders, salesOrders)
  saveAll(COLLECTIONS.deliveryChallans, challans)
  saveAll(COLLECTIONS.creditNotes, creditNotes)

  // =====================================================================
  // Accounting — chart of accounts + derived journal + expenses
  // =====================================================================
  const acc = (code: string, name: string, type: Account['type'], isSystem = true): Account => ({
    id: genId('acc'),
    code,
    name,
    type,
    parentId: null,
    isSystem
  })
  const accounts: Account[] = [
    acc('1000', 'Cash in Hand', 'ASSET'),
    acc('1010', 'Bank — HDFC Current', 'ASSET'),
    acc('1100', 'Accounts Receivable', 'ASSET'),
    acc('1200', 'Inventory Asset', 'ASSET'),
    acc('1300', 'Input GST Credit', 'ASSET'),
    acc('2000', 'Accounts Payable', 'LIABILITY'),
    acc('2100', 'Output GST Payable', 'LIABILITY'),
    acc('2200', 'Salaries Payable', 'LIABILITY'),
    acc('3000', "Owner's Equity", 'EQUITY'),
    acc('3100', 'Retained Earnings', 'EQUITY'),
    acc('4000', 'Sales Revenue', 'INCOME'),
    acc('4100', 'Other Income', 'INCOME'),
    acc('5000', 'Cost of Goods Sold', 'EXPENSE'),
    acc('5100', 'Salaries & Wages', 'EXPENSE'),
    acc('5200', 'Rent', 'EXPENSE'),
    acc('5300', 'Electricity & Utilities', 'EXPENSE'),
    acc('5400', 'Freight & Transport', 'EXPENSE'),
    acc('5500', 'Marketing & Advertising', 'EXPENSE'),
    acc('5600', 'Office & Admin', 'EXPENSE'),
    acc('5700', 'Repairs & Maintenance', 'EXPENSE'),
    acc('5800', 'Bank Charges', 'EXPENSE'),
    acc('5900', 'Miscellaneous', 'EXPENSE', false)
  ]
  saveAll(COLLECTIONS.accounts, accounts)
  const accId = (code: string) => accounts.find((a) => a.code === code)!.id

  const journal: JournalEntry[] = []
  let jeCounter = 1
  const addJE = (date: string, narration: string, source: JournalEntry['source'], refId: string | null, lines: { code: string; debit?: number; credit?: number }[]) => {
    journal.push({
      id: genId('je'),
      entryNo: `JE-${String(jeCounter++).padStart(5, '0')}`,
      date,
      narration,
      source,
      refId,
      lines: lines.map((l) => ({ accountId: accId(l.code), debit: money(l.debit ?? 0), credit: money(l.credit ?? 0) })),
      createdByUserId: 'system',
      createdAt: new Date(date).toISOString()
    })
  }
  // sales invoices -> AR / Sales / Output GST  (+ COGS / Inventory)
  for (const inv of invoices) {
    if (inv.status === 'DRAFT') continue
    const gst = inv.cgst + inv.sgst + inv.igst
    const net = inv.total - gst - inv.roundOff
    addJE(inv.date, `Sales invoice ${inv.invoiceNo}`, 'INVOICE', inv.id, [
      { code: '1100', debit: inv.total },
      { code: '4000', credit: net },
      { code: '2100', credit: gst }
    ])
    const cogs = money(
      inv.lines.reduce((s, l) => {
        const p = products.find((x) => x.id === l.productId)
        return s + (p ? p.costPrice * l.qty : 0)
      }, 0)
    )
    addJE(inv.date, `COGS for ${inv.invoiceNo}`, 'INVOICE', inv.id, [
      { code: '5000', debit: cogs },
      { code: '1200', credit: cogs }
    ])
  }
  // receipts -> Bank / AR
  for (const r of receipts) {
    addJE(r.date, `Receipt ${r.receiptNo}`, 'PAYMENT', r.id, [
      { code: r.mode === 'Cash' ? '1000' : '1010', debit: r.amount },
      { code: '1100', credit: r.amount }
    ])
  }
  // purchases -> Inventory / Input GST / AP
  for (const po of purchaseOrders) {
    if (po.status === 'DRAFT' || po.status === 'ORDERED' || po.status === 'CANCELLED') continue
    addJE(po.orderDate, `Purchase ${po.poNo}`, 'PURCHASE', po.id, [
      { code: '1200', debit: po.subtotal },
      { code: '1300', debit: po.taxTotal },
      { code: '2000', credit: po.total }
    ])
  }
  for (const sp of supplierPayments) {
    addJE(sp.date, `Supplier payment ${sp.paymentNo}`, 'PAYMENT', sp.id, [
      { code: '2000', debit: sp.amount },
      { code: sp.mode === 'Cash' ? '1000' : '1010', credit: sp.amount }
    ])
  }

  // expenses — recurring monthly + ad-hoc
  const expenses: ExpenseRecord[] = []
  let exCounter = 1
  const recurring: [string, string, [number, number]][] = [
    ['5200', 'Godown & Office Rent', [85000, 85000]],
    ['5300', 'Electricity Bill', [18000, 34000]],
    ['5100', 'Casual Labour Wages', [22000, 40000]],
    ['5400', 'Transporter Freight', [30000, 72000]],
    ['5600', 'Internet & Phone', [4500, 6500]]
  ]
  for (let m = 12; m >= 0; m--) {
    const daysAgo = m * 30 - int(1, 6)
    for (const [code, name, [lo, hi]] of recurring) {
      const amount = money(lo + rnd() * (hi - lo))
      expenses.push({
        id: genId('exp'),
        expenseNo: `ST/EXP/${String(exCounter++).padStart(4, '0')}`,
        date: dateDaysAgo(Math.max(0, daysAgo)),
        categoryAccountId: accId(code),
        paidToName: name,
        amount,
        gstRate: code === '5200' ? 0 : pick([0, 18]),
        mode: pick(['Bank Transfer', 'UPI', 'Cash']),
        reference: `TXN${int(100000, 999999)}`,
        note: '',
        createdByUserId: 'system'
      })
    }
    for (let k = 0; k < int(1, 3); k++) {
      const code = pick(['5500', '5600', '5700', '5800', '5900'])
      const amount = money(1500 + rnd() * 22000)
      expenses.push({
        id: genId('exp'),
        expenseNo: `ST/EXP/${String(exCounter++).padStart(4, '0')}`,
        date: dateDaysAgo(Math.max(0, m * 30 - int(0, 27))),
        categoryAccountId: accId(code),
        paidToName: pick(['Digital Ads Agency', 'Stationery Mart', 'AC Service', 'Bank Charges', 'Sundry']),
        amount,
        gstRate: pick([0, 18]),
        mode: pick(['Bank Transfer', 'UPI', 'Cash', 'Card']),
        reference: `TXN${int(100000, 999999)}`,
        note: '',
        createdByUserId: 'system'
      })
    }
  }
  for (const e of expenses) {
    addJE(e.date, `Expense ${e.expenseNo} — ${e.paidToName}`, 'EXPENSE', e.id, [
      { code: accounts.find((a) => a.id === e.categoryAccountId)!.code, debit: e.amount },
      { code: e.mode === 'Cash' ? '1000' : '1010', credit: e.amount }
    ])
  }
  saveAll(COLLECTIONS.expenses, expenses)

  // =====================================================================
  // HR — attendance (last 62 days), leave requests, payroll (12 months)
  // =====================================================================
  const attendance: AttendanceRecord[] = []
  for (let d = 62; d >= 1; d--) {
    const day = new Date()
    day.setDate(day.getDate() - d)
    const dow = day.getDay()
    const dateStr = day.toISOString().slice(0, 10)
    const isSunday = dow === 0
    for (const e of employees) {
      if (e.status === 'EXITED') continue
      if (new Date(e.joiningDate) > day) continue
      const shift = pick(shifts)
      let status: AttendanceRecord['status']
      if (isSunday) status = 'WEEK_OFF'
      else {
        const r = rnd()
        status = r < 0.9 ? 'PRESENT' : r < 0.94 ? 'LEAVE' : r < 0.97 ? 'HALF_DAY' : 'ABSENT'
      }
      const present = status === 'PRESENT' || status === 'HALF_DAY'
      attendance.push({
        id: genId('att'),
        employeeId: e.id,
        date: dateStr,
        shiftId: shift.id,
        checkIn: present ? `${shift.startTime.slice(0, 2)}:${String(int(0, 40)).padStart(2, '0')}` : '',
        checkOut: present ? (status === 'HALF_DAY' ? '14:30' : `${shift.endTime.slice(0, 2)}:${String(int(0, 55)).padStart(2, '0')}`) : '',
        status,
        source: pick(['WEB', 'MOBILE', 'MOBILE', 'BIOMETRIC']),
        withinGeofence: chance(0.93),
        overtimeHours: present && chance(0.15) ? pick([1, 1.5, 2]) : 0
      })
    }
  }
  saveAll(COLLECTIONS.attendance, attendance.slice(-9000))

  const leaveRequests: LeaveRequest[] = []
  for (let i = 0; i < 60; i++) {
    const e = pick(activeEmployees)
    const from = int(1, 80)
    const days = int(1, 4)
    const status: LeaveRequest['status'] = from > 8 ? pick(['APPROVED', 'APPROVED', 'REJECTED']) : pick(['PENDING', 'PENDING', 'APPROVED'])
    leaveRequests.push({
      id: genId('lv'),
      employeeId: e.id,
      type: pick(['Sick', 'Casual', 'Paid', 'Casual']),
      fromDate: dateDaysAgo(from),
      toDate: dateDaysAgo(from - days + 1),
      days,
      reason: pick(['Fever', 'Family function', 'Personal work', 'Medical check-up', 'Out of town']),
      status,
      approverEmployeeId: e.reportingManagerId,
      appliedAt: isoDaysAgo(from + int(1, 4)),
      decidedAt: status === 'PENDING' ? null : isoDaysAgo(from + int(0, 2))
    })
  }
  saveAll(COLLECTIONS.leaveRequests, leaveRequests)

  const payslips: Payslip[] = []
  const payrollRuns: PayrollRun[] = []
  for (let m = 12; m >= 1; m--) {
    const day = new Date()
    day.setMonth(day.getMonth() - m)
    const period = monthKeyOf(day)
    const workingDays = 26
    let gross = 0
    let ded = 0
    let net = 0
    let count = 0
    for (const e of employees) {
      if (new Date(e.joiningDate) > day) continue
      if (e.status === 'EXITED' && chance(0.7)) continue
      count++
      const monthly = e.ctcAnnual / 12
      const basic = money(monthly * (e.basicPct / 100))
      const hra = money(monthly * (e.hraPct / 100))
      const special = money(monthly - basic - hra)
      const lop = chance(0.15) ? int(1, 2) : 0
      const paidDays = workingDays - lop
      const pf = e.pfNumber ? money(Math.min(basic, 15000) * 0.12) : 0
      const esi = e.esiNumber ? money((basic + hra + special) * 0.0075) : 0
      const tds = monthly > 100000 ? money(monthly * 0.1) : monthly > 60000 ? money(monthly * 0.05) : 0
      const lopDed = lop ? money((monthly / workingDays) * lop) : 0
      const grossEarnings = money((basic + hra + special) * (paidDays / workingDays))
      const totalDeductions = pf + esi + tds + lopDed
      const netPay = grossEarnings - totalDeductions
      gross += grossEarnings
      ded += totalDeductions
      net += netPay
      payslips.push({
        id: genId('ps'),
        employeeId: e.id,
        period,
        workingDays,
        paidDays,
        lopDays: lop,
        earnings: [
          { label: 'Basic', amount: money(basic * (paidDays / workingDays)), kind: 'EARNING' },
          { label: 'HRA', amount: money(hra * (paidDays / workingDays)), kind: 'EARNING' },
          { label: 'Special Allowance', amount: money(special * (paidDays / workingDays)), kind: 'EARNING' }
        ],
        deductions: [
          ...(pf ? [{ label: 'Provident Fund', amount: pf, kind: 'DEDUCTION' as const }] : []),
          ...(esi ? [{ label: 'ESI', amount: esi, kind: 'DEDUCTION' as const }] : []),
          ...(tds ? [{ label: 'TDS', amount: tds, kind: 'DEDUCTION' as const }] : []),
          ...(lopDed ? [{ label: 'Loss of Pay', amount: lopDed, kind: 'DEDUCTION' as const }] : [])
        ],
        grossEarnings,
        totalDeductions,
        netPay,
        status: 'PAID',
        processedAt: isoDaysAgo(m * 30 - 2),
        paidAt: isoDaysAgo(m * 30 - 1)
      })
    }
    payrollRuns.push({
      id: genId('pr'),
      period,
      status: 'PAID',
      employeeCount: count,
      grossTotal: money(gross),
      deductionTotal: money(ded),
      netTotal: money(net),
      processedByUserId: 'system',
      processedAt: isoDaysAgo(m * 30 - 2)
    })
    addJE(dateDaysAgo(m * 30 - 1), `Payroll ${period}`, 'PAYROLL', period, [
      { code: '5100', debit: money(gross) },
      { code: '2200', credit: money(net) },
      { code: '1010', credit: money(ded) }
    ])
  }
  saveAll(COLLECTIONS.payslips, payslips)
  saveAll(COLLECTIONS.payrollRuns, payrollRuns)

  journal.sort((a, b) => a.date.localeCompare(b.date))
  saveAll(COLLECTIONS.journalEntries, journal)

  // =====================================================================
  // CRM — leads, follow-ups, communication log
  // =====================================================================
  const leads: Lead[] = Array.from({ length: 64 }).map(() => {
    const created = int(2, 120)
    const stage: Lead['stage'] = created > 60 ? pick(['WON', 'LOST', 'WON', 'NEGOTIATION']) : pick(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'])
    const isBiz = chance(0.7)
    return {
      id: genId('lead'),
      name: personName(),
      company: isBiz ? `${pick(LAST)} ${pick(BIZ_SUFFIX)}` : '',
      phone: phone(),
      email: `lead${int(100, 999)}@mail.example`,
      source: pick(['Website', 'Referral', 'Cold Call', 'Exhibition', 'WhatsApp', 'Walk-in']),
      stage,
      estimatedValue: int(20000, 900000),
      ownerEmployeeId: pick(salesEmployees.length ? salesEmployees : activeEmployees).id,
      customerId: stage === 'WON' ? pick(activeCustomers).id : null,
      createdAt: isoDaysAgo(created),
      updatedAt: isoDaysAgo(int(0, created))
    }
  })
  saveAll(COLLECTIONS.leads, leads)

  const followUps: FollowUp[] = []
  for (const lead of leads) {
    if (['WON', 'LOST'].includes(lead.stage)) continue
    const n = int(1, 3)
    for (let i = 0; i < n; i++) {
      const due = int(-10, 12)
      followUps.push({
        id: genId('fu'),
        leadId: lead.id,
        dueDate: dateDaysAhead(due),
        channel: pick(['Call', 'Email', 'WhatsApp', 'Meeting']),
        note: pick(['Send updated quotation', 'Discuss credit terms', 'Share product catalogue', 'Confirm sample dispatch', 'Follow up on payment plan']),
        done: due < 0 && chance(0.7),
        createdByUserId: 'system'
      })
    }
  }
  saveAll(COLLECTIONS.followUps, followUps)

  const commMessages: CommMessage[] = Array.from({ length: 40 }).map(() => {
    const daysAgo = int(0, 120)
    return {
      id: genId('cm'),
      ts: isoDaysAgo(daysAgo),
      channel: pick(['whatsapp', 'sms', 'email', 'whatsapp']),
      category: pick(['Payment Reminder', 'Promotion', 'Order Update', 'Lead Follow-up', 'General']),
      audience: pick(['All active customers', 'Overdue customers', 'Distributors', 'Gold tier customers', 'Leads — Proposal stage']),
      recipientCount: int(8, 220),
      body: pick([
        'Gentle reminder: invoice payment is due. Kindly clear at the earliest.',
        'Monsoon offer — flat 7% off on bulk orders above ₹50,000 this week.',
        'Your order has been dispatched and will reach you in 2 days.',
        'Thanks for your enquiry. Our executive will call you shortly.',
        'New stock arrived across Electronics and Home & Kitchen.'
      ]),
      sentByUserId: 'system',
      status: pick(['SENT', 'SENT', 'SENT', 'QUEUED', 'FAILED'])
    }
  })
  saveAll(COLLECTIONS.commMessages, commMessages)

  // =====================================================================
  // Notifications
  // =====================================================================
  const lowStockProducts = stockLevels
    .filter((lv) => lv.warehouseId === primaryWh.id)
    .filter((lv) => {
      const p = products.find((x) => x.id === lv.productId)
      return p && lv.onHand <= p.reorderLevel
    })
    .slice(0, 6)
  const notifications: Notification[] = [
    ...lowStockProducts.map((lv) => {
      const p = products.find((x) => x.id === lv.productId)!
      return {
        id: genId('ntf'),
        ts: isoDaysAgo(int(0, 4)),
        type: 'LOW_STOCK',
        channel: 'in-app' as const,
        title: 'Low stock',
        message: `${p.name} is down to ${lv.onHand} ${p.unit} (reorder at ${p.reorderLevel}).`,
        read: false,
        severity: 'warning' as const,
        link: '/stock/low'
      }
    }),
    {
      id: genId('ntf'),
      ts: isoDaysAgo(1),
      type: 'PAYMENT_OVERDUE',
      channel: 'in-app',
      title: 'Overdue invoices',
      message: `${invoices.filter((i) => i.status === 'OVERDUE').length} invoices are past their due date.`,
      read: false,
      severity: 'critical',
      link: '/invoices'
    },
    {
      id: genId('ntf'),
      ts: isoDaysAgo(2),
      type: 'LEAVE_PENDING',
      channel: 'in-app',
      title: 'Leave approvals pending',
      message: `${leaveRequests.filter((l) => l.status === 'PENDING').length} leave requests await your approval.`,
      read: false,
      severity: 'info',
      link: '/leave'
    },
    {
      id: genId('ntf'),
      ts: isoDaysAgo(3),
      type: 'GST',
      channel: 'in-app',
      title: 'GST filing due',
      message: 'GSTR-1 for last month is ready to review and file.',
      read: true,
      severity: 'info',
      link: '/gst'
    }
  ]
  saveAll(COLLECTIONS.notifications, notifications)

  // =====================================================================
  // Users (demo logins) — one per role, employee linked to a real record
  // =====================================================================
  // Link each demo login to a real employee record so everyone (not just the
  // Employee role) gets the "My Workspace" self-service section.
  const empInDept = (deptName: string) =>
    activeEmployees.find((e) => e.departmentId === deptByName(deptName).id && e.status === 'ACTIVE') ?? activeEmployees[0]
  const empForLogin = empInDept('Warehouse & Logistics')
  const users: User[] = [
    { id: genId('usr'), name: 'Thikaana Platform', username: 'superadmin', email: 'super@thikaana.example', mobile: '9000000001', password: 'super123', roleId: 'role_super_admin', status: 'ACTIVE', createdAt: isoDaysAgo(900) },
    { id: genId('usr'), name: 'Rajesh Agarwal', username: 'owner', email: 'owner@shaktitraders.example', mobile: '9000000002', password: 'owner123', roleId: 'role_owner', linkedEmployeeId: md.id, status: 'ACTIVE', createdAt: isoDaysAgo(800) },
    { id: genId('usr'), name: empInDept('Management').name, username: 'manager', email: 'manager@shaktitraders.example', mobile: '9000000003', password: 'manager123', roleId: 'role_manager', linkedEmployeeId: empInDept('Management').id, status: 'ACTIVE', createdAt: isoDaysAgo(700) },
    { id: genId('usr'), name: empInDept('Human Resources').name, username: 'hr', email: 'hr@shaktitraders.example', mobile: '9000000004', password: 'hr123', roleId: 'role_hr', linkedEmployeeId: empInDept('Human Resources').id, status: 'ACTIVE', createdAt: isoDaysAgo(650) },
    { id: genId('usr'), name: empInDept('Accounts & Finance').name, username: 'accountant', email: 'accounts@shaktitraders.example', mobile: '9000000005', password: 'account123', roleId: 'role_accountant', linkedEmployeeId: empInDept('Accounts & Finance').id, status: 'ACTIVE', createdAt: isoDaysAgo(600) },
    { id: genId('usr'), name: empInDept('Sales').name, username: 'sales', email: 'sales1@shaktitraders.example', mobile: '9000000006', password: 'sales123', roleId: 'role_sales', linkedEmployeeId: empInDept('Sales').id, status: 'ACTIVE', createdAt: isoDaysAgo(500) },
    { id: genId('usr'), name: empForLogin.name, username: 'employee', email: 'employee@shaktitraders.example', mobile: '9000000007', password: 'employee123', roleId: 'role_employee', linkedEmployeeId: empForLogin.id, status: 'ACTIVE', createdAt: isoDaysAgo(400) }
  ]
  saveAll(COLLECTIONS.users, users)

  // =====================================================================
  // Super Admin platform console
  // =====================================================================
  const platformPlans: PlatformPlan[] = [
    { id: genId('pln'), name: 'Starter', pricePerMonth: 1499, seatLimit: 5, moduleLimit: 8, features: ['Inventory + Billing', '1 warehouse', 'GST invoices', 'Email support'] },
    { id: genId('pln'), name: 'Growth', pricePerMonth: 3999, seatLimit: 20, moduleLimit: 16, features: ['Everything in Starter', 'Multi-warehouse', 'Accounting + GST filing', 'HR & Payroll', 'Priority support'] },
    { id: genId('pln'), name: 'Enterprise', pricePerMonth: 8999, seatLimit: -1, moduleLimit: -1, features: ['Everything in Growth', 'CRM + Communication', 'AI forecasting & assistant', 'Dedicated success manager', 'Custom onboarding'] }
  ]
  saveAll(COLLECTIONS.platformPlans, platformPlans)

  const industries = ['Retail Store', 'Distributor', 'Wholesale', 'Manufacturing Unit', 'Service Business', 'Educational Institute', 'Pharmacy Chain', 'Auto Parts', 'FMCG', 'Electronics Retail']
  const workspaces: Workspace[] = Array.from({ length: 14 }).map((_, i) => {
    const plan = pick(platformPlans)
    const [city] = pick(CITIES)
    const status: Workspace['status'] = i === 0 ? 'ACTIVE' : pick(['ACTIVE', 'ACTIVE', 'TRIAL', 'SUSPENDED'])
    return {
      id: genId('ws'),
      companyName: i === 0 ? 'Shakti Traders' : `${pick(LAST)} ${pick(BIZ_SUFFIX)}`,
      ownerName: personName(),
      industry: i === 0 ? 'Wholesale & Distribution' : pick(industries),
      city,
      phone: phone(),
      plan: plan.name,
      seats: plan.seatLimit === -1 ? int(25, 60) : int(2, plan.seatLimit),
      modulesEnabled: plan.moduleLimit === -1 ? int(16, 21) : int(4, plan.moduleLimit),
      status,
      mrr: status === 'TRIAL' ? 0 : plan.pricePerMonth,
      joinedAt: isoDaysAgo(int(20, 900)),
      renewsAt: dateDaysAhead(int(3, 340))
    }
  })
  saveAll(COLLECTIONS.workspaces, workspaces)

  const platformInvoices: PlatformInvoice[] = []
  for (const ws of workspaces) {
    if (ws.status === 'TRIAL') continue
    for (let m = int(2, 8); m >= 1; m--) {
      const day = new Date()
      day.setMonth(day.getMonth() - m)
      platformInvoices.push({
        id: genId('pinv'),
        invoiceNo: `THK/${monthKeyOf(day).replace('-', '')}/${String(platformInvoices.length + 1).padStart(4, '0')}`,
        workspaceId: ws.id,
        amount: ws.mrr,
        period: monthKeyOf(day),
        status: m === 1 && chance(0.3) ? pick(['DUE', 'FAILED']) : 'PAID',
        issuedAt: day.toISOString()
      })
    }
  }
  saveAll(COLLECTIONS.platformInvoices, platformInvoices)

  const supportTickets: SupportTicket[] = Array.from({ length: 18 }).map((_, i) => ({
    id: genId('tkt'),
    ticketNo: `THK-${1000 + i}`,
    workspaceId: pick(workspaces).id,
    subject: pick(['GST report mismatch', 'Cannot add new user', 'Payroll rounding query', 'Barcode scanner setup', 'Import products from Excel', 'Invoice print layout', 'Enable CRM module', 'Bank reconciliation help']),
    priority: pick(['Low', 'Medium', 'High', 'Medium']),
    status: pick(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'RESOLVED']),
    openedAt: isoDaysAgo(int(0, 60))
  }))
  saveAll(COLLECTIONS.supportTickets, supportTickets)
}
