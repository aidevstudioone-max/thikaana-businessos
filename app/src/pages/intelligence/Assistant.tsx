import React, { useState } from 'react'
import {
  inventoryHealthScore,
  lowStockItems,
  monthlySales,
  payables,
  receivables,
  topCustomers,
  topProducts,
  totalStockValue
} from '../../lib/selectors'
import { currency, currencyK } from '../../lib/format'
import { Card, PageHeader } from '../../components/ui'

interface Msg {
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTIONS = [
  'How are sales trending?',
  'What should I reorder?',
  'Who owes me the most money?',
  'What is my gross margin?',
  'Which products sell best?',
  'How healthy is my inventory?'
]

function answer(q: string): string {
  const s = q.toLowerCase()
  const ms = monthlySales()
  const rev = ms.reduce((a, m) => a + m.revenue, 0)
  const profit = ms.reduce((a, m) => a + m.grossProfit, 0)
  if (/trend|sales|revenue|growth/.test(s)) {
    const last = ms[ms.length - 1].revenue
    const prev = ms[ms.length - 2]?.revenue ?? last
    const chg = prev ? Math.round(((last - prev) / prev) * 100) : 0
    return `Revenue over the last 12 months is ${currencyK(rev)}. This month is ${currencyK(last)}, ${chg >= 0 ? 'up' : 'down'} ${Math.abs(chg)}% versus last month. The strongest month was ${currencyK(Math.max(...ms.map((m) => m.revenue)))}.`
  }
  if (/reorder|replenish|stock out|buy|purchase/.test(s)) {
    const low = lowStockItems().slice(0, 5)
    if (!low.length) return 'Nothing is below its reorder level right now — inventory is well covered.'
    return `Top items to reorder: ${low.map((l) => `${l.product.name} (${l.onHand} left, reorder at ${l.product.reorderLevel})`).join('; ')}. Turn on AI Demand Forecasting for exact quantities.`
  }
  if (/owe|receivable|outstanding|collect|due/.test(s)) {
    const ar = receivables()
    const top = topCustomers(3)
    return `Total receivables are ${currency(ar.total)}, of which ${currency(ar.overdue)} is overdue. Biggest accounts overall: ${top.map((t) => `${t.customer.name} (${currencyK(t.revenue)} lifetime)`).join(', ')}.`
  }
  if (/margin|profit|profitab/.test(s)) {
    const m = rev ? Math.round((profit / rev) * 100) : 0
    return `Gross profit over 12 months is ${currencyK(profit)} on ${currencyK(rev)} of revenue — a gross margin of about ${m}%.`
  }
  if (/best|top product|selling|popular/.test(s)) {
    const tp = topProducts(5)
    return `Best sellers by revenue: ${tp.map((t) => `${t.product.name} (${currencyK(t.revenue)}, ${t.qty} units)`).join('; ')}.`
  }
  if (/inventory|health|stock value|dead stock/.test(s)) {
    const h = inventoryHealthScore()
    const v = totalStockValue()
    return `Inventory health score is ${h.score}/100. Stock is worth ${currency(v.cost)} at cost (${currency(v.retail)} at retail). ${h.parts.map((p) => `${p.label}: ${p.value}%`).join(' · ')}.`
  }
  if (/pay|payable|supplier/.test(s)) {
    return `You owe suppliers ${currency(payables().total)} across open purchase orders.`
  }
  return `I can answer questions about sales trends, margins, receivables, payables, best-selling products, what to reorder and inventory health. Try one of the suggestions above.`
}

export default function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'Hi! I can answer questions about your business using your live data. Ask me anything, or tap a suggestion.' }
  ])
  const [input, setInput] = useState('')

  const ask = (q: string) => {
    if (!q.trim()) return
    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'assistant', text: answer(q) }])
    setInput('')
  }

  return (
    <div>
      <PageHeader title="AI Business Assistant" subtitle="Ask-anything over your live data. Invoice OCR capture also lives here." />
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} className="text-xs bg-white border border-slate-200 hover:border-brand-400 rounded-full px-3 py-1.5 text-slate-600">
            {s}
          </button>
        ))}
      </div>
      <Card className="p-4">
        <div className="space-y-3 max-h-[46vh] overflow-y-auto mb-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{m.text}</div>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}
          className="flex gap-2"
        >
          <input
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="Ask about sales, stock, cash…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="bg-brand-600 text-white text-sm rounded-lg px-4 font-medium hover:bg-brand-700">Ask</button>
        </form>
      </Card>
      <Card className="p-4 mt-4">
        <h3 className="font-semibold text-slate-800 mb-1">📸 Invoice OCR</h3>
        <p className="text-sm text-slate-500">Drop a supplier bill and the assistant drafts a purchase entry with line items, GST and totals pre-filled. (Demo placeholder — no upload wired.)</p>
        <button className="mt-3 border-2 border-dashed border-slate-200 rounded-lg w-full py-8 text-sm text-slate-400 hover:border-brand-300">Drop or click to upload a bill</button>
      </Card>
    </div>
  )
}
