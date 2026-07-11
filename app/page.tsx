"use client";

import { useMemo, useState } from "react";

type IncomeKey = "salary" | "house" | "capital" | "business" | "presumptive" | "other";
type NavKey = IncomeKey | "deductions" | "tdsTcs" | "advanceTax" | "selfAssessment";

const incomeHeads: { key: IncomeKey; icon: string; title: string; note: string; itr: string[] }[] = [
  { key: "salary", icon: "▣", title: "Salary & pension", note: "Form 16, allowances and perquisites", itr: ["ITR-1", "ITR-2", "ITR-3", "ITR-4"] },
  { key: "house", icon: "⌂", title: "House property", note: "Rent, interest and municipal taxes", itr: ["ITR-1", "ITR-2", "ITR-3", "ITR-4"] },
  { key: "capital", icon: "↗", title: "Capital gains", note: "Equity, property and other assets", itr: ["ITR-2", "ITR-3"] },
  { key: "business", icon: "◇", title: "Business income", note: "Profits from business or profession", itr: ["ITR-3"] },
  { key: "presumptive", icon: "%", title: "Presumptive income", note: "Sections 44AD, 44ADA and 44AE", itr: ["ITR-3", "ITR-4"] },
  { key: "other", icon: "＋", title: "Other sources", note: "Interest, dividend and family pension", itr: ["ITR-1", "ITR-2", "ITR-3", "ITR-4"] },
];

const utilityHeads = [
  { key: "deductions" as NavKey, icon: "VI", title: "Chapter VI-A deductions", note: "Eligible deductions based on regime" },
  { key: "tdsTcs" as NavKey, icon: "TD", title: "TDS / TCS", note: "Tax deducted or collected at source" },
  { key: "advanceTax" as NavKey, icon: "AT", title: "Advance tax", note: "Tax paid during the financial year" },
  { key: "selfAssessment" as NavKey, icon: "SA", title: "Self-assessment tax", note: "Tax paid before filing the return" },
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
  const [active, setActive] = useState<NavKey>("salary");
  const [values, setValues] = useState<Record<IncomeKey, number>>({ salary: 1250000, house: 0, capital: 0, business: 0, presumptive: 0, other: 45000 });
  const [deductions, setDeductions] = useState(0);
  const [tds, setTds] = useState(92500);
  const [tcs, setTcs] = useState(0);
  const [npsEmployer, setNpsEmployer] = useState(0);
  const [agniveer, setAgniveer] = useState(0);
  const [advanceTax, setAdvanceTax] = useState(0);
  const [selfAssessmentTax, setSelfAssessmentTax] = useState(0);
  const [interest, setInterest] = useState(0);
  const [personal, setPersonal] = useState({ name: "Arjun Kapoor", pan: "ABCDE1234F", aadhaar: "", dob: "1990-08-15", mobile: "", email: "", address: "" });
  const [saved, setSaved] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [preparedBy, setPreparedBy] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [statementDate, setStatementDate] = useState("2026-07-11");

  const total = Object.values(values).reduce((a, b) => a + b, 0);
  const standardDeduction = values.salary ? (regime === "new" ? 75000 : 50000) : 0;
  const chapterVIA = npsEmployer + agniveer + (regime === "old" ? deductions : 0);
  const taxable = Math.max(0, total - standardDeduction - chapterVIA);
  const tax = useMemo(() => regime === "new" ? slabTax(taxable) : Math.max(0, taxable > 1000000 ? 112500 + (taxable - 1000000) * .3 : taxable > 500000 ? 12500 + (taxable - 500000) * .2 : Math.max(0, taxable - 250000) * .05), [regime, taxable]);
  const cess = tax * .04;
  const due = Math.max(0, tax + cess + interest - tds - tcs - advanceTax - selfAssessmentTax);
  const specialRateTax = 0;
  const surcharge = 0;
  const grossTaxLiability = tax + specialRateTax + surcharge + cess + interest;
  const netBalance = grossTaxLiability - tds - tcs - advanceTax - selfAssessmentTax;
  const current = incomeHeads.find((h) => h.key === active);
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
        <div className="head-actions"><button className="button secondary" onClick={() => setSaved(true)}>{saved ? "✓ Draft saved" : "Save draft"}</button><button className="button primary" onClick={() => { setShowReview(true); setTimeout(() => document.getElementById("computation-review")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}>Review computation <span>→</span></button></div>
      </section>

      <section className="personal-card" aria-labelledby="personal-title">
        <div className="personal-card-head">
          <div className="personal-heading-icon">AK</div>
          <div><p>ASSESSEE PROFILE</p><h2 id="personal-title">Personal Details</h2><small>Information used in your income tax computation.</small></div>
          <span>7 details</span>
        </div>
        <div className="personal-grid">
          <label className="personal-field name-field"><span>FULL NAME</span><input value={personal.name} placeholder="Enter full name" autoComplete="name" onChange={(e) => setPersonal({ ...personal, name: e.target.value })} /></label>
          <label className="personal-field"><span>PAN</span><input value={personal.pan} placeholder="ABCDE1234F" maxLength={10} className="uppercase" onChange={(e) => setPersonal({ ...personal, pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} /></label>
          <label className="personal-field"><span>AADHAAR</span><input value={personal.aadhaar} placeholder="0000 0000 0000" inputMode="numeric" maxLength={14} onChange={(e) => { const n = e.target.value.replace(/\D/g, "").slice(0, 12); setPersonal({ ...personal, aadhaar: n.replace(/(\d{4})(?=\d)/g, "$1 ") }); }} /></label>
          <label className="personal-field"><span>DATE OF BIRTH</span><input type="date" value={personal.dob} onChange={(e) => setPersonal({ ...personal, dob: e.target.value })} /></label>
          <label className="personal-field"><span>MOBILE</span><div className="phone-input"><b>+91</b><input value={personal.mobile} placeholder="98765 43210" inputMode="tel" maxLength={10} autoComplete="tel" onChange={(e) => setPersonal({ ...personal, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></div></label>
          <label className="personal-field"><span>EMAIL</span><input type="email" value={personal.email} placeholder="name@example.com" autoComplete="email" onChange={(e) => setPersonal({ ...personal, email: e.target.value })} /></label>
          <label className="personal-field address-field"><span>ADDRESS</span><input value={personal.address} placeholder="House no., street, city, state and PIN" autoComplete="street-address" onChange={(e) => setPersonal({ ...personal, address: e.target.value })} /></label>
        </div>
      </section>

      <section className="setup-card">
        <div className="setup-copy"><span className="setup-icon">◎</span><div><strong>Set up your computation</strong><small>Choose the return type and tax regime to personalise this workspace.</small></div></div>
        <label><span>ITR FORM</span><select value={itr} onChange={(e) => setItr(e.target.value)}>{[1,2,3,4].map(n => <option key={n}>ITR-{n}</option>)}</select></label>
        <label><span>TAX REGIME</span><div className="segmented"><button className={regime === "new" ? "active" : ""} onClick={() => setRegime("new")}>New regime <em>Default</em></button><button className={regime === "old" ? "active" : ""} onClick={() => setRegime("old")}>Old regime</button></div></label>
      </section>

      <div className="workspace">
        <aside className="income-nav">
          <div className="nav-title"><span>INCOME SOURCES</span><b>{incomeHeads.filter(h => values[h.key] > 0).length}/6 added</b></div>
          {incomeHeads.map((head) => {
            const unavailable = !head.itr.includes(itr);
            return <button key={head.key} disabled={unavailable} className={`${active === head.key ? "selected" : ""} ${unavailable ? "locked" : ""}`} onClick={() => setActive(head.key)}><span className="head-icon">{head.icon}</span><span><strong>{head.title}</strong><small>{unavailable ? `Not available in ${itr}` : head.note}</small></span>{values[head.key] > 0 && !unavailable ? <em>✓</em> : <i>›</i>}</button>
          })}
          <div className="nav-title nav-group"><span>DEDUCTIONS</span><b>{chapterVIA > 0 ? "1 added" : "0 added"}</b></div>
          {utilityHeads.filter(h => h.key === "deductions").map((head) => <button key={head.key} className={active === head.key ? "selected" : ""} onClick={() => setActive(head.key)}><span className="head-icon text-icon">{head.icon}</span><span><strong>Chapter VI-A deductions</strong><small>{head.note}</small></span>{chapterVIA > 0 ? <em>✓</em> : <i>›</i>}</button>)}
          <div className="nav-title nav-group"><span>TAX PAID</span><b>{money.format(tds + tcs + advanceTax + selfAssessmentTax)}</b></div>
          {utilityHeads.filter(h => h.key !== "deductions").map((head) => { const amount = head.key === "tdsTcs" ? tds + tcs : head.key === "advanceTax" ? advanceTax : selfAssessmentTax; return <button key={head.key} className={active === head.key ? "selected" : ""} onClick={() => setActive(head.key)}><span className="head-icon text-icon">{head.icon}</span><span><strong>{head.title}</strong><small>{head.note}</small></span>{amount > 0 ? <em>✓</em> : <i>›</i>}</button>; })}
          <div className="completion"><div><strong>COMPLETION</strong><b>62%</b></div><span><i /></span><p>Complete each head to finish computation</p></div>
        </aside>

        {current ? <section className="entry-card">
          <div className="entry-head"><span className="large-icon">{current.icon}</span><div><p>INCOME DETAILS</p><h2>{current.title}</h2><small>{current.note}</small></div><button aria-label="Information">i</button></div>
          <div className="form-grid">
            <Field label={`Gross ${current.title.toLowerCase()}`} value={values[current.key]} onChange={(n) => setValue(current.key, n)} hint="Enter the amount before eligible deductions" />
            {active === "salary" && <Field label="Exempt allowances" value={0} onChange={() => {}} hint="HRA, LTA and other exempt allowances" />}
            {active === "house" && <Field label="Interest on borrowed capital" value={0} onChange={() => {}} />}
            {active === "business" && <Field label="Turnover / gross receipts" value={0} onChange={() => {}} />}
            {active === "presumptive" && <Field label="Gross turnover / receipts" value={0} onChange={() => {}} hint="Applicable under section 44AD, 44ADA or 44AE" />}
            {active === "capital" && <Field label="Cost of acquisition" value={0} onChange={() => {}} />}
            {active === "other" && <Field label="Eligible expenses" value={0} onChange={() => {}} />}
          </div>
          <div className="deduction-strip"><span>✓</span><div><strong>Standard deduction applied</strong><small>{money.format(standardDeduction)} automatically considered under the {regime} regime.</small></div><b>{money.format(standardDeduction)}</b></div>
          <div className="entry-total"><span>Income from {current.title.toLowerCase()}</span><strong>{money.format(values[current.key])}</strong></div>
          <div className="entry-footer"><button className="text-button" onClick={() => setValue(current.key, 0)}>Clear details</button><button className="button primary" onClick={() => { const idx = incomeHeads.findIndex(h => h.key === current.key); const next = incomeHeads.slice(idx + 1).find(h => h.itr.includes(itr)); if (next) setActive(next.key); else setActive("deductions"); }}>Save & continue <span>→</span></button></div>
        </section> : <section className="entry-card utility-entry">
          <div className="entry-head"><span className="large-icon">{utilityHeads.find(h => h.key === active)?.icon}</span><div><p>COMPUTATION DETAILS</p><h2>{utilityHeads.find(h => h.key === active)?.title}</h2><small>{utilityHeads.find(h => h.key === active)?.note}</small></div></div>
          {active === "deductions" && <><p className="utility-note">{regime === "new" ? "Only deductions available under the new regime are displayed." : "Enter eligible Chapter VI-A deductions."}</p><div className="form-grid"><Field label="80CCD(2) — Employer NPS contribution" value={npsEmployer} onChange={setNpsEmployer} /><Field label="80CCH — Agniveer Corpus Fund" value={agniveer} onChange={setAgniveer} />{regime === "old" && <Field label="80C, 80D and other deductions" value={deductions} onChange={setDeductions} />}</div></>}
          {active === "tdsTcs" && <div className="form-grid"><Field label="Tax Deducted at Source (TDS)" value={tds} onChange={setTds} /><Field label="Tax Collected at Source (TCS)" value={tcs} onChange={setTcs} /></div>}
          {active === "advanceTax" && <div className="form-grid"><Field label="Advance tax paid" value={advanceTax} onChange={setAdvanceTax} hint="Enter total challan amount paid during FY 2025–26" /></div>}
          {active === "selfAssessment" && <div className="form-grid"><Field label="Self-assessment tax paid" value={selfAssessmentTax} onChange={setSelfAssessmentTax} hint="Enter tax paid before filing the return" /></div>}
          <div className="entry-total"><span>Total entered</span><strong>{money.format(active === "deductions" ? chapterVIA : active === "tdsTcs" ? tds + tcs : active === "advanceTax" ? advanceTax : selfAssessmentTax)}</strong></div>
        </section>}

        <aside className="summary-card">
          <div className="summary-head"><div><p>LIVE SUMMARY</p><h2>Your tax estimate</h2></div><span>● Updated now</span></div>
          <div className="income-total"><span>GROSS TOTAL INCOME</span><strong>{money.format(total)}</strong><small>Across {Object.values(values).filter(Boolean).length} income sources</small></div>
          <div className="summary-lines"><div><span>Standard deduction</span><b>− {money.format(standardDeduction)}</b></div><div><span>Chapter VI-A deductions</span><b>− {money.format(chapterVIA)}</b></div><div className="taxable"><span>Taxable income</span><b>{money.format(taxable)}</b></div><div><span>Income tax</span><b>{money.format(tax)}</b></div><div><span>Health & education cess</span><b>{money.format(cess)}</b></div></div>
          <label className="tds-row"><span>Taxes already paid (TDS/TCS)</span><div className="mini-input"><b>₹</b><input aria-label="Taxes already paid" inputMode="numeric" value={tds || ""} onChange={(e) => setTds(Number(e.target.value.replace(/\D/g, "")))} /></div></label>
          <div className="payable"><span>ESTIMATED TAX PAYABLE</span><strong>{money.format(due)}</strong><small>Includes 4% health & education cess</small></div>
          <div className="insight"><span>↘</span><p><strong>Smart insight</strong>Your effective tax rate is {total ? ((tax + cess) / total * 100).toFixed(1) : "0.0"}%. The new regime is currently selected.</p></div>
          <p className="disclaimer">Indicative estimate for planning. Final liability may vary based on special-rate income, surcharge, marginal relief and filing rules.</p>
        </aside>
      </div>

      {showReview && <section id="computation-review" className="income-summary review-reveal" aria-labelledby="income-summary-title">
        <div className="statement-head">
          <div className="statement-brand"><span>TP</span><div><strong>TAXPRO CA SUITE</strong><small>Professional tax workspace</small></div></div>
          <div className="statement-title"><p>INCOME TAX COMPUTATION</p><h2 id="income-summary-title">Computation of Total Income</h2></div>
          <span className="summary-status">✓ Auto-updated</span>
        </div>
        <div className="client-statement-grid">
          <div><span>FINANCIAL YEAR</span><strong>2025–26</strong></div>
          <div><span>ASSESSMENT YEAR</span><strong>2026–27</strong></div>
          <div><span>CLIENT NAME</span><strong>{personal.name || "—"}</strong></div>
          <div><span>PAN</span><strong>{personal.pan || "—"}</strong></div>
        </div>
        <div className="income-summary-table computation-table statement-table">
          <div className="income-summary-row heading"><span>Particulars</span><span>Amount</span></div>
          <div className="computation-section-title"><span>01</span> Income Details</div>
          <div className="computation-row"><span>Income from Salary</span><b>{money.format(values.salary)}</b></div>
          <div className="computation-row"><span>Income from House Property</span><b>{money.format(values.house)}</b></div>
          <div className="computation-row"><span>Business Income</span><b>{money.format(values.business + values.presumptive)}</b></div>
          <div className="computation-row"><span>Capital Gain</span><b>{money.format(values.capital)}</b></div>
          <div className="computation-row"><span>Other Sources</span><b>{money.format(values.other)}</b></div>
          <div className="computation-row subtotal"><span>Gross Total Income</span><b>{money.format(total)}</b></div>
          <div className="computation-row less"><span>Less Deductions</span><b>− {money.format(standardDeduction + chapterVIA)}</b></div>
          <div className="computation-row major"><span>Total Income</span><b>{money.format(taxable)}</b></div>

          <div className="computation-section-title"><span>02</span> Tax Calculation</div>
          <div className="computation-row"><span>Tax Calculation</span><b>{money.format(tax + specialRateTax)}</b></div>
          <div className="computation-row"><span>Surcharge</span><b>{money.format(surcharge)}</b></div>
          <div className="computation-row"><span>Cess</span><b>{money.format(cess)}</b></div>
          <label className="computation-row editable"><span>Interest</span><div className="summary-edit"><span>₹</span><input aria-label="Interest" inputMode="numeric" value={interest || ""} placeholder="0" onChange={(e) => setInterest(Number(e.target.value.replace(/\D/g, "")))} /></div></label>
          <div className="computation-row major"><span>Total Liability</span><b>{money.format(grossTaxLiability)}</b></div>
          <div className="computation-row less"><span>Less TDS / TCS</span><b>− {money.format(tds + tcs)}</b></div>
          <div className="computation-row less"><span>Less Advance Tax</span><b>− {money.format(advanceTax)}</b></div>
          <div className={`computation-result ${netBalance <= 0 ? "refund" : "payable-result"}`}><span><small>{netBalance <= 0 ? "REFUND DUE" : "BALANCE PAYABLE"}</small>Refund / Balance</span><b>{money.format(Math.abs(netBalance))}</b></div>
        </div>
        <div className="statement-signoff">
          <label><span>PREPARED BY</span><input value={preparedBy} placeholder="Name of preparer" onChange={(e) => setPreparedBy(e.target.value)} /></label>
          <label><span>REVIEWED BY</span><input value={reviewedBy} placeholder="Name of reviewer" onChange={(e) => setReviewedBy(e.target.value)} /></label>
          <label><span>DATE</span><input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} /></label>
        </div>
        <div className="income-summary-footer">
          <p><span>i</span>This summary updates automatically whenever you change an income amount.</p>
          <button className="button primary" onClick={() => window.print()}>Print computation <span>→</span></button>
        </div>
      </section>}
    </main>
  );
}
