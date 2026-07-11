"use client";

import { useMemo, useState } from "react";

type IncomeKey = "salary" | "house" | "business" | "capital" | "other";

const incomeHeads: { key: IncomeKey; icon: string; title: string; note: string; itr: string[] }[] = [
  { key: "salary", icon: "▣", title: "Salary & pension", note: "Form 16, allowances and perquisites", itr: ["ITR-1", "ITR-2", "ITR-3", "ITR-4"] },
  { key: "house", icon: "⌂", title: "House property", note: "Rent, interest and municipal taxes", itr: ["ITR-1", "ITR-2", "ITR-3", "ITR-4"] },
  { key: "business", icon: "◇", title: "Business & profession", note: "Profits or presumptive income", itr: ["ITR-3", "ITR-4"] },
  { key: "capital", icon: "↗", title: "Capital gains", note: "Equity, property and other assets", itr: ["ITR-2", "ITR-3"] },
  { key: "other", icon: "＋", title: "Other sources", note: "Interest, dividend and family pension", itr: ["ITR-1", "ITR-2", "ITR-3", "ITR-4"] },
];

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function Field({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <label className="amount-field">
      <span>{label}</span>
      <div className="amount-input"><b>₹</b><input aria-label={label} inputMode="numeric" value={value || ""} placeholder="0" onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, ""))))} /></div>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function slabTax(income: number) {
  const slabs = [[400000, 0], [800000, .05], [1200000, .10], [1600000, .15], [2000000, .20], [2400000, .25], [Infinity, .30]];
  let previous = 0, tax = 0;
  for (const [limit, rate] of slabs) {
    tax += Math.max(0, Math.min(income, limit) - previous) * rate;
    previous = limit;
    if (income <= limit) break;
  }
  return income <= 1200000 ? 0 : tax;
}

export default function Home() {
  const [itr, setItr] = useState("ITR-1");
  const [regime, setRegime] = useState<"new" | "old">("new");
  const [active, setActive] = useState<IncomeKey>("salary");
  const [values, setValues] = useState<Record<IncomeKey, number>>({ salary: 1250000, house: 0, business: 0, capital: 0, other: 45000 });
  const [deductions, setDeductions] = useState(0);
  const [tds, setTds] = useState(92500);
  const [saved, setSaved] = useState(false);

  const total = Object.values(values).reduce((a, b) => a + b, 0);
  const standardDeduction = values.salary ? (regime === "new" ? 75000 : 50000) : 0;
  const taxable = Math.max(0, total - standardDeduction - (regime === "old" ? deductions : 0));
  const tax = useMemo(() => regime === "new" ? slabTax(taxable) : Math.max(0, taxable > 1000000 ? 112500 + (taxable - 1000000) * .3 : taxable > 500000 ? 12500 + (taxable - 500000) * .2 : Math.max(0, taxable - 250000) * .05), [regime, taxable]);
  const cess = tax * .04;
  const due = Math.max(0, tax + cess - tds);
  const current = incomeHeads.find((h) => h.key === active)!;
  const setValue = (key: IncomeKey, n: number) => setValues((v) => ({ ...v, [key]: n }));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">T</span><div><strong>Tax Studio</strong><small>Income tax workspace</small></div></div>
        <div className="year-pill"><span>●</span> FY 2025–26 <b>AY 2026–27</b></div>
        <div className="top-actions"><button className="icon-button" aria-label="Notifications">○</button><span className="avatar">AK</span><div className="profile"><strong>Arjun Kapoor</strong><small>Individual</small></div></div>
      </header>

      <section className="page-head">
        <div><p className="eyebrow">INCOME TAX COMPUTATION</p><h1>Let’s calculate your taxes.</h1><p>Add your income details and get a clear, real-time estimate.</p></div>
        <div className="head-actions"><button className="button secondary" onClick={() => setSaved(true)}>{saved ? "✓ Draft saved" : "Save draft"}</button><button className="button primary" onClick={() => window.print()}>Review & export <span>→</span></button></div>
      </section>

      <section className="setup-card">
        <div className="setup-copy"><span className="setup-icon">◎</span><div><strong>Set up your computation</strong><small>Choose the return type and tax regime to personalise this workspace.</small></div></div>
        <label><span>ITR FORM</span><select value={itr} onChange={(e) => setItr(e.target.value)}>{[1,2,3,4].map(n => <option key={n}>ITR-{n}</option>)}</select></label>
        <label><span>TAX REGIME</span><div className="segmented"><button className={regime === "new" ? "active" : ""} onClick={() => setRegime("new")}>New regime <em>Default</em></button><button className={regime === "old" ? "active" : ""} onClick={() => setRegime("old")}>Old regime</button></div></label>
      </section>

      <div className="workspace">
        <aside className="income-nav">
          <div className="nav-title"><span>INCOME SOURCES</span><b>{incomeHeads.filter(h => values[h.key] > 0).length}/5 added</b></div>
          {incomeHeads.map((head) => {
            const unavailable = !head.itr.includes(itr);
            return <button key={head.key} disabled={unavailable} className={`${active === head.key ? "selected" : ""} ${unavailable ? "locked" : ""}`} onClick={() => setActive(head.key)}><span className="head-icon">{head.icon}</span><span><strong>{head.title}</strong><small>{unavailable ? `Not available in ${itr}` : head.note}</small></span>{values[head.key] > 0 && !unavailable ? <em>✓</em> : <i>›</i>}</button>
          })}
          <div className="completion"><div><strong>COMPLETION</strong><b>62%</b></div><span><i /></span><p>3 items need your attention</p></div>
        </aside>

        <section className="entry-card">
          <div className="entry-head"><span className="large-icon">{current.icon}</span><div><p>INCOME DETAILS</p><h2>{current.title}</h2><small>{current.note}</small></div><button aria-label="Information">i</button></div>
          <div className="form-grid">
            <Field label={`Gross ${current.title.toLowerCase()}`} value={values[active]} onChange={(n) => setValue(active, n)} hint="Enter the amount before eligible deductions" />
            {active === "salary" && <Field label="Exempt allowances" value={0} onChange={() => {}} hint="HRA, LTA and other exempt allowances" />}
            {active === "house" && <Field label="Interest on borrowed capital" value={0} onChange={() => {}} />}
            {active === "business" && <Field label="Turnover / gross receipts" value={0} onChange={() => {}} />}
            {active === "capital" && <Field label="Cost of acquisition" value={0} onChange={() => {}} />}
            {active === "other" && <Field label="Eligible expenses" value={0} onChange={() => {}} />}
          </div>
          <div className="deduction-strip"><span>✓</span><div><strong>Standard deduction applied</strong><small>{money.format(standardDeduction)} automatically considered under the {regime} regime.</small></div><b>{money.format(standardDeduction)}</b></div>
          {regime === "old" && <div className="extra-field"><Field label="Chapter VI-A deductions" value={deductions} onChange={setDeductions} hint="80C, 80D and other eligible deductions" /></div>}
          <div className="entry-total"><span>Income from {current.title.toLowerCase()}</span><strong>{money.format(values[active])}</strong></div>
          <div className="entry-footer"><button className="text-button" onClick={() => setValue(active, 0)}>Clear details</button><button className="button primary" onClick={() => { const idx = incomeHeads.findIndex(h => h.key === active); const next = incomeHeads.slice(idx + 1).find(h => h.itr.includes(itr)); if (next) setActive(next.key); }}>Save & continue <span>→</span></button></div>
        </section>

        <aside className="summary-card">
          <div className="summary-head"><div><p>LIVE SUMMARY</p><h2>Your tax estimate</h2></div><span>● Updated now</span></div>
          <div className="income-total"><span>GROSS TOTAL INCOME</span><strong>{money.format(total)}</strong><small>Across {Object.values(values).filter(Boolean).length} income sources</small></div>
          <div className="summary-lines"><div><span>Standard deduction</span><b>− {money.format(standardDeduction)}</b></div><div><span>Chapter VI-A deductions</span><b>− {money.format(regime === "old" ? deductions : 0)}</b></div><div className="taxable"><span>Taxable income</span><b>{money.format(taxable)}</b></div><div><span>Income tax</span><b>{money.format(tax)}</b></div><div><span>Health & education cess</span><b>{money.format(cess)}</b></div></div>
          <label className="tds-row"><span>Taxes already paid (TDS/TCS)</span><div className="mini-input"><b>₹</b><input aria-label="Taxes already paid" inputMode="numeric" value={tds || ""} onChange={(e) => setTds(Number(e.target.value.replace(/\D/g, "")))} /></div></label>
          <div className="payable"><span>ESTIMATED TAX PAYABLE</span><strong>{money.format(due)}</strong><small>Includes 4% health & education cess</small></div>
          <div className="insight"><span>↘</span><p><strong>Smart insight</strong>Your effective tax rate is {total ? ((tax + cess) / total * 100).toFixed(1) : "0.0"}%. The new regime is currently selected.</p></div>
          <p className="disclaimer">Indicative estimate for planning. Final liability may vary based on special-rate income, surcharge, marginal relief and filing rules.</p>
        </aside>
      </div>

      <section className="income-summary" aria-labelledby="income-summary-title">
        <div className="income-summary-head">
          <div><p>COMPUTATION OVERVIEW</p><h2 id="income-summary-title">Summary of Income</h2><small>FY 2025–26 · {itr} · {regime === "new" ? "New tax regime" : "Old tax regime"}</small></div>
          <span className="summary-status">✓ Auto-updated</span>
        </div>
        <div className="income-summary-table">
          <div className="income-summary-row heading"><span>Particulars</span><span>Amount</span></div>
          {incomeHeads.map((head) => (
            <div className="income-summary-row" key={head.key}>
              <span><i>{head.icon}</i><span><strong>{head.title}</strong><small>{values[head.key] ? "Income details added" : "No income entered"}</small></span></span>
              <b className={values[head.key] ? "" : "empty-amount"}>{money.format(values[head.key])}</b>
            </div>
          ))}
          <div className="income-summary-row gross"><span>Gross Total Income</span><b>{money.format(total)}</b></div>
          <div className="income-summary-row deduction"><span>Less: Standard deduction</span><b>− {money.format(standardDeduction)}</b></div>
          <div className="income-summary-row deduction"><span>Less: Chapter VI-A deductions</span><b>− {money.format(regime === "old" ? deductions : 0)}</b></div>
          <div className="income-summary-row net"><span><span><strong>Net Total Income</strong><small>Income chargeable to tax</small></span></span><b>{money.format(taxable)}</b></div>
        </div>
        <div className="income-summary-footer">
          <p><span>i</span>This summary updates automatically whenever you change an income amount.</p>
          <button className="button primary" onClick={() => window.print()}>Print computation <span>→</span></button>
        </div>
      </section>
    </main>
  );
}
