"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type IncomeKey = "salary" | "house" | "capital" | "business" | "presumptive" | "other";
type NavKey = IncomeKey | "deductions" | "tdsTcs" | "advanceTax" | "selfAssessment" | "interestFee" | "taxCalculation";

const incomeHeads: { key: IncomeKey; icon: string; title: string; note: string; itr: string[] }[] = [
  { key: "salary", icon: "▣", title: "Salary & Pension", note: "Form 16, allowances and perquisites", itr: ["ITR-1", "ITR-2", "ITR-3", "ITR-4"] },
  { key: "house", icon: "⌂", title: "House Property", note: "Rent, interest and municipal taxes", itr: ["ITR-1", "ITR-2", "ITR-3", "ITR-4"] },
  { key: "capital", icon: "↗", title: "Capital Gains", note: "Equity, property and other assets", itr: ["ITR-2", "ITR-3"] },
  { key: "business", icon: "◇", title: "Business Income", note: "Profits from business or profession", itr: ["ITR-3"] },
  { key: "presumptive", icon: "%", title: "Presumptive Income", note: "Sections 44AD, 44ADA and 44AE", itr: ["ITR-3", "ITR-4"] },
  { key: "other", icon: "＋", title: "Other Sources", note: "Interest, dividend and family pension", itr: ["ITR-1", "ITR-2", "ITR-3", "ITR-4"] },
];

const utilityHeads = [
  { key: "deductions" as NavKey, icon: "VI", title: "Chapter VI-A Deductions", note: "Eligible deductions based on regime" },
  { key: "tdsTcs" as NavKey, icon: "TD", title: "TDS / TCS", note: "Tax deducted or collected at source" },
  { key: "advanceTax" as NavKey, icon: "AT", title: "Advance Tax", note: "Tax paid during the financial year" },
  { key: "selfAssessment" as NavKey, icon: "SA", title: "Self-Assessment Tax", note: "Tax paid before filing the return" },
  { key: "interestFee" as NavKey, icon: "IF", title: "Interest & Fee", note: "Interest u/s 234A, 234B, 234C and fee u/s 234F" },
  { key: "taxCalculation" as NavKey, icon: "₹", title: "View Tax Calculation", note: "Detailed tax, rebate, cess and liability" },
];

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function Field({ label, value, onChange, hint, disabled = false }: { label: string; value: number; onChange: (n: number) => void; hint?: string; disabled?: boolean }) {
  return (
    <label className="amount-field">
      <span>{label}</span>
      <div className="amount-input"><b>₹</b><input aria-label={label} inputMode="numeric" value={value || ""} placeholder="0" disabled={disabled} onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, ""))))} /></div>
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
  return tax;
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
  const [interest234A, setInterest234A] = useState(0);
  const [interest234B, setInterest234B] = useState(0);
  const [interest234C, setInterest234C] = useState(0);
  const [fee234F, setFee234F] = useState(0);
  const [propertyType, setPropertyType] = useState("");
  const [rentReceived, setRentReceived] = useState(0);
  const [municipalTax, setMunicipalTax] = useState(0);
  const [houseInterest, setHouseInterest] = useState(0);
  const [capitalSection, setCapitalSection] = useState("");
  const [capitalTerm, setCapitalTerm] = useState<"" | "short" | "long">("");
  const [saleValue, setSaleValue] = useState(0);
  const [transferExpenses, setTransferExpenses] = useState(0);
  const [capitalCost, setCapitalCost] = useState(0);
  const [indexedCost, setIndexedCost] = useState(0);
  const [deduction80C, setDeduction80C] = useState(0);
  const [deduction80D, setDeduction80D] = useState(0);
  const [deductionInterest, setDeductionInterest] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState<Array<{ section: string; amount: number }>>([]);
  const [otherDeductionSection, setOtherDeductionSection] = useState("");
  const [customDeductionSection, setCustomDeductionSection] = useState("");
  const [otherDeductionAmount, setOtherDeductionAmount] = useState(0);
  const [presumptiveSection, setPresumptiveSection] = useState("");
  const [businessReceipts, setBusinessReceipts] = useState(0);
  const [professionalReceipts, setProfessionalReceipts] = useState(0);
  const [vehicleIncome, setVehicleIncome] = useState(0);
  const [offeredPresumptiveIncome, setOfferedPresumptiveIncome] = useState(0);
  const [dividendIncome, setDividendIncome] = useState(0);
  const [interestIncome, setInterestIncome] = useState(45000);
  const [otherIncome, setOtherIncome] = useState(0);
  const [otherDescription, setOtherDescription] = useState("");
  const [advanceQ1, setAdvanceQ1] = useState(0);
  const [advanceQ2, setAdvanceQ2] = useState(0);
  const [advanceQ3, setAdvanceQ3] = useState(0);
  const [advanceQ4, setAdvanceQ4] = useState(0);
  const [houseEntries, setHouseEntries] = useState<Array<{ type: string; rent: number; municipalTax: number; interest: number; netRent: number }>>([]);
  const [capitalEntries, setCapitalEntries] = useState<Array<{ term: "short" | "long"; section: string; saleValue: number; transferExpenses: number; netConsideration: number; cost: number; indexedCost: number; gain: number }>>([]);
  const [presumptiveEntries, setPresumptiveEntries] = useState<Array<{ section: string; businessReceipts: number; professionalReceipts: number; vehicleIncome: number; offeredIncome: number; income: number }>>([]);
  const [filingDate, setFilingDate] = useState("2026-07-12");
  const [personal, setPersonal] = useState({ name: "Arjun Kapoor", pan: "ABCDE1234F", aadhaar: "", dob: "1990-08-15", mobile: "", email: "", address: "" });
  const [saved, setSaved] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [statementDate, setStatementDate] = useState("2026-07-11");
  const [exportOpen, setExportOpen] = useState(false);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const grossRent = !propertyType || propertyType === "self" ? 0 : Math.max(0, rentReceived - municipalTax);
  const houseStandardDeduction = grossRent * .30;
  const netRent = grossRent - houseStandardDeduction - houseInterest;
  const indexationAllowed = capitalSection === "112";
  const netConsideration = Math.max(0, saleValue - transferExpenses);
  const capitalGain = netConsideration - (indexationAllowed ? indexedCost : capitalCost);
  const minimumPresumptiveIncome = presumptiveSection === "44AD" ? businessReceipts * .08 : presumptiveSection === "44ADA" ? professionalReceipts * .50 : presumptiveSection === "44AE" ? vehicleIncome : presumptiveSection === "both" ? businessReceipts * .08 + professionalReceipts * .50 : 0;
  const presumptiveIncome = !presumptiveSection ? 0 : presumptiveSection === "44AE" ? vehicleIncome : offeredPresumptiveIncome;
  useEffect(() => { const amount = houseEntries.reduce((sum, entry) => sum + entry.netRent, 0) + netRent; setValues(v => v.house === amount ? v : { ...v, house: amount }); }, [netRent, houseEntries]);
  useEffect(() => { const amount = capitalEntries.reduce((sum, entry) => sum + entry.gain, 0) + capitalGain; setValues(v => v.capital === amount ? v : { ...v, capital: amount }); }, [capitalGain, capitalEntries]);
  useEffect(() => { const amount = presumptiveEntries.reduce((sum, entry) => sum + entry.income, 0) + presumptiveIncome; setValues(v => v.presumptive === amount ? v : { ...v, presumptive: amount }); }, [presumptiveIncome, presumptiveEntries]);
  useEffect(() => { const other = dividendIncome + interestIncome + otherIncome; setValues(v => v.other === other ? v : { ...v, other }); }, [dividendIncome, interestIncome, otherIncome]);
  useEffect(() => { setDeductions(deduction80C + deduction80D + deductionInterest); }, [deduction80C, deduction80D, deductionInterest]);
  useEffect(() => { setAdvanceTax(advanceQ1 + advanceQ2 + advanceQ3 + advanceQ4); }, [advanceQ1, advanceQ2, advanceQ3, advanceQ4]);

  const total = Object.values(values).reduce((a, b) => a + b, 0);
  const standardDeduction = values.salary ? (regime === "new" ? 75000 : 50000) : 0;
  const otherDeductionTotal = otherDeductions.reduce((sum, entry) => sum + entry.amount, 0) + otherDeductionAmount;
  const chapterVIA = npsEmployer + agniveer + (regime === "old" ? deductions + otherDeductionTotal : 0);
  const salaryIncome = Math.max(0, values.salary - standardDeduction);
  const grossTotalIncome = Math.max(0, total - standardDeduction);
  const taxable = Math.max(0, total - standardDeduction - chapterVIA);
  const specialIncome = ["111A", "112A", "112"].includes(capitalSection) ? Math.max(0, Math.min(values.capital, taxable)) : 0;
  const normalIncome = Math.max(0, taxable - specialIncome);
  const grossNormalTax = useMemo(() => regime === "new" ? slabTax(normalIncome) : Math.max(0, normalIncome > 1000000 ? 112500 + (normalIncome - 1000000) * .3 : normalIncome > 500000 ? 12500 + (normalIncome - 500000) * .2 : Math.max(0, normalIncome - 250000) * .05), [regime, normalIncome]);
  const rebate87A = regime === "new" && taxable <= 1200000 ? Math.min(grossNormalTax, 60000) : regime === "old" && taxable <= 500000 ? Math.min(grossNormalTax, 12500) : 0;
  const tax = Math.max(0, grossNormalTax - rebate87A);
  const specialRate = capitalSection === "111A" ? .20 : capitalSection === "112A" || capitalSection === "112" ? .125 : 0;
  const specialTaxableBase = capitalSection === "112A" ? Math.max(0, specialIncome - 125000) : specialIncome;
  const specialRateTax = specialTaxableBase * specialRate;
  const grossTaxLiability = tax + specialRateTax;
  const surchargeRate = taxable > 50000000 ? (regime === "old" ? .37 : .25) : taxable > 20000000 ? .25 : taxable > 10000000 ? .15 : taxable > 5000000 ? .10 : 0;
  const surcharge = grossTaxLiability * surchargeRate;
  const cess = (grossTaxLiability + surcharge) * .04;
  const taxBeforeInterest = grossTaxLiability + surcharge + cess;
  const assessedTax = Math.max(0, taxBeforeInterest - tds - tcs);
  const filing = filingDate ? new Date(`${filingDate}T00:00:00`) : new Date("2026-07-12T00:00:00");
  const dueDate = new Date("2026-07-31T00:00:00");
  const delayedMonths = filing > dueDate ? Math.max(1, Math.ceil((filing.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0;
  const suggested234A = Math.round(Math.max(0, assessedTax - advanceTax - selfAssessmentTax) * .01 * delayedMonths);
  const monthsFromApril = Math.max(1, (filing.getFullYear() - 2026) * 12 + filing.getMonth() - 3 + 1);
  const suggested234B = advanceTax < assessedTax * .90 ? Math.round(Math.max(0, assessedTax - advanceTax) * .01 * monthsFromApril) : 0;
  const suggested234C = Math.round(Math.max(0, assessedTax * .15 - advanceQ1) * .03 + Math.max(0, assessedTax * .45 - advanceQ1 - advanceQ2) * .03 + Math.max(0, assessedTax * .75 - advanceQ1 - advanceQ2 - advanceQ3) * .03 + Math.max(0, assessedTax - advanceTax) * .01);
  const suggested234F = filing > dueDate ? (taxable <= 500000 ? 1000 : 5000) : 0;
  useEffect(() => { setInterest234A(suggested234A); setInterest234B(suggested234B); setInterest234C(suggested234C); setFee234F(suggested234F); }, [suggested234A, suggested234B, suggested234C, suggested234F]);
  const totalInterest = interest234A + interest234B + interest234C;
  const totalTaxLiability = grossTaxLiability + surcharge + cess + totalInterest + fee234F;
  const due = Math.max(0, totalTaxLiability - tds - tcs - advanceTax - selfAssessmentTax);
  const netBalance = totalTaxLiability - tds - tcs - advanceTax - selfAssessmentTax;
  const slabBreakdown = (regime === "new" ? [[0,400000,0],[400000,800000,.05],[800000,1200000,.10],[1200000,1600000,.15],[1600000,2000000,.20],[2000000,2400000,.25],[2400000,Infinity,.30]] : [[0,250000,0],[250000,500000,.05],[500000,1000000,.20],[1000000,Infinity,.30]]).map(([from,to,rate]) => ({ from, to, rate, amount: Math.max(0, Math.min(normalIncome,to) - from) * rate })).filter(row => row.amount > 0 || (row.rate === 0 && normalIncome > 0));
  const completedHeads = incomeHeads.filter(h => values[h.key] !== 0).length + (chapterVIA > 0 ? 1 : 0) + (tds + tcs > 0 ? 1 : 0) + (advanceTax > 0 ? 1 : 0) + (selfAssessmentTax > 0 ? 1 : 0) + (totalInterest + fee234F > 0 ? 1 : 0);
  const progressPercent = Math.round(completedHeads / 11 * 100);
  const current = incomeHeads.find((h) => h.key === active);
  const setValue = (key: IncomeKey, n: number) => setValues((v) => ({ ...v, [key]: n }));
  const updateHouseEntry = (index: number, patch: Partial<(typeof houseEntries)[number]>) => setHouseEntries(entries => entries.map((entry, i) => { if (i !== index) return entry; const next = { ...entry, ...patch }; const gross = next.type === "self" ? 0 : Math.max(0, next.rent - next.municipalTax); return { ...next, netRent: gross - gross * .30 - next.interest }; }));
  const updateCapitalEntry = (index: number, patch: Partial<(typeof capitalEntries)[number]>) => setCapitalEntries(entries => entries.map((entry, i) => { if (i !== index) return entry; const next = { ...entry, ...patch }; const net = Math.max(0, next.saleValue - next.transferExpenses); return { ...next, netConsideration: net, gain: net - (next.section === "112" ? next.indexedCost : next.cost) }; }));
  const updatePresumptiveEntry = (index: number, patch: Partial<(typeof presumptiveEntries)[number]>) => setPresumptiveEntries(entries => entries.map((entry, i) => { if (i !== index) return entry; const next = { ...entry, ...patch }; return { ...next, income: next.section === "44AE" ? next.vehicleIncome : next.offeredIncome }; }));
  const resetComputation = () => { setItr("ITR-1"); setRegime("new"); setActive("salary"); setValues({ salary:0, house:0, capital:0, business:0, presumptive:0, other:0 }); setDeductions(0); setTds(0); setTcs(0); setNpsEmployer(0); setAgniveer(0); setAdvanceTax(0); setAdvanceQ1(0); setAdvanceQ2(0); setAdvanceQ3(0); setAdvanceQ4(0); setSelfAssessmentTax(0); setInterest234A(0); setInterest234B(0); setInterest234C(0); setFee234F(0); setPropertyType(""); setRentReceived(0); setMunicipalTax(0); setHouseInterest(0); setHouseEntries([]); setCapitalTerm(""); setCapitalSection(""); setSaleValue(0); setTransferExpenses(0); setCapitalCost(0); setIndexedCost(0); setCapitalEntries([]); setDeduction80C(0); setDeduction80D(0); setDeductionInterest(0); setPresumptiveSection(""); setBusinessReceipts(0); setProfessionalReceipts(0); setVehicleIncome(0); setPresumptiveEntries([]); setDividendIncome(0); setInterestIncome(0); setOtherIncome(0); setOtherDescription(""); setFilingDate(""); setPersonal({ name:"", pan:"", aadhaar:"", dob:"", mobile:"", email:"", address:"" }); setStatementDate(""); setSaved(false); setShowReview(false); setExportOpen(false); setShowNewConfirm(false); };
  const formatDate = (date: string) => date ? date.split("-").reverse().join("-") : "—";
  useEffect(() => { const close = (event: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(event.target as Node)) setExportOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  const exportComputation = (format: "word" | "excel" | "pdf") => {
    setExportOpen(false); if (format === "pdf") { window.print(); return; }
    const rows: (string | number)[][] = [["INCOME TAX COMPUTATION", ""], ["Financial Year", "2025-26"], ["Client Name", personal.name], ["PAN Number", personal.pan], ["Date of Birth", formatDate(personal.dob)], ["Mobile Number", personal.mobile], ["Email ID", personal.email], ["Tax Regime", regime === "new" ? "New Regime" : "Old Regime"], ["ITR Form", itr], ...(salaryIncome ? [["Income from Salary", salaryIncome] as (string | number)[]] : []), ...(values.house ? [["Income from House Property", values.house] as (string | number)[]] : []), ...(values.business + values.presumptive ? [["Business Income", values.business + values.presumptive] as (string | number)[]] : []), ...(values.capital ? [["Capital Gain", values.capital] as (string | number)[]] : []), ...(values.other ? [["Other Sources", values.other] as (string | number)[]] : []), ["Gross Total Income", grossTotalIncome], ...(regime === "old" || chapterVIA > 0 ? [["Deduction under Chapter VI-A", chapterVIA] as (string | number)[]] : []), ["Total Income", taxable], ["Normal Income", normalIncome], ["Special Income", specialIncome], ["Tax on Normal Income", grossNormalTax], ["Tax on Special Income", specialRateTax], ...(rebate87A ? [["Less: Rebate u/s 87A", rebate87A] as (string | number)[]] : []), ["Gross Tax Liability", grossTaxLiability], ...(surcharge ? [["Surcharge", surcharge] as (string | number)[]] : []), ["Add: Health & Education Cess", cess], ...(interest234A ? [["Interest u/s 234A", interest234A] as (string | number)[]] : []), ...(interest234B ? [["Interest u/s 234B", interest234B] as (string | number)[]] : []), ...(interest234C ? [["Interest u/s 234C", interest234C] as (string | number)[]] : []), ...(fee234F ? [["Fee u/s 234F", fee234F] as (string | number)[]] : []), ["Total Tax Liability", totalTaxLiability], ["Less: TDS", tds], ...(tcs ? [["Less: TCS", tcs] as (string | number)[]] : []), ...(advanceTax ? [["Less: Advance Tax", advanceTax] as (string | number)[]] : []), ...(selfAssessmentTax ? [["Less: Self Assessment Tax Paid", selfAssessmentTax] as (string | number)[]] : []), ["Refund / Balance", Math.abs(netBalance)]];
    rows[rows.length - 1][0] = netBalance > 0 ? "Tax Payable" : "Refund / Balance";
    const esc = (v: string | number) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const importantRows = new Set(["Gross Total Income", "Total Income", "Gross Tax Liability", "Total Tax Liability", "Tax Payable", "Refund / Balance"]);
    const content = `<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#102b26;margin:32px}h1{text-align:center;font-family:Georgia,serif;font-size:24px;border-bottom:3px solid #175b4d;padding-bottom:14px}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:10px 12px;border-bottom:1px solid #d8e3df}td:last-child{text-align:right;font-weight:700}.major td{font-weight:800;background:#edf5f1;border-top:2px solid #175b4d}.label{color:#5f736d}</style></head><body><h1>INCOME TAX COMPUTATION</h1><table>${rows.slice(1).map(r => `<tr class="${importantRows.has(String(r[0])) ? "major" : ""}"><td class="label">${esc(r[0])}</td><td>${typeof r[1] === "number" ? money.format(r[1]) : esc(r[1])}</td></tr>`).join("")}</table></body></html>`;
    const blob = new Blob([content], { type: format === "excel" ? "application/vnd.ms-excel" : "application/msword" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `income-tax-computation.${format === "excel" ? "xls" : "doc"}`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">T</span><div><strong>Tax Studio</strong><small>Income tax workspace</small></div></div>
        <div className="year-pill"><span>●</span> FY 2025–26 <b>AY 2026–27</b></div>
        {showReview ? <button className="button back-button" onClick={() => { setShowReview(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>←</span> Back to Computation</button> : <div className="top-actions"><button className="icon-button" aria-label="Notifications">○</button><span className="avatar">{personal.name ? personal.name.split(/\s+/).map(n => n[0]).slice(0,2).join("").toUpperCase() : "—"}</span><div className="profile"><strong>{personal.name || "New Client"}</strong><small>Individual</small></div></div>}
      </header>

      {!showReview && <>
      <section className="page-head">
        <div><p className="eyebrow">Income Tax Computation</p><h1>Let’s Calculate Your Taxes.</h1><p>Add your income details and get a clear, real-time estimate.</p></div>
        <div className="head-toolbar"><button className="button secondary">Client Master</button><button className="button secondary" onClick={() => setShowNewConfirm(true)}>＋ New</button><button className="button secondary" onClick={() => setSaved(true)}>{saved ? "✓ Draft Saved" : "Save Draft"}</button><button className="button save-button" onClick={() => setSaved(true)}>Save</button><button className="button primary" onClick={() => { setShowReview(true); setTimeout(() => document.getElementById("computation-review")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}>View Computation <span>→</span></button></div>
      </section>

      <section className="personal-card" aria-labelledby="personal-title">
        <div className="personal-card-head">
          <div className="personal-heading-icon">AK</div>
          <div><p>Assessee Profile</p><h2 id="personal-title">PERSONAL DETAILS</h2><small>Information used in your income tax computation.</small></div>
          <span>7 details</span>
        </div>
        <div className="personal-grid">
          <label className="personal-field name-field"><span>Full Name</span><input value={personal.name} placeholder="Enter full name" autoComplete="name" onChange={(e) => setPersonal({ ...personal, name: e.target.value })} /></label>
          <label className="personal-field"><span>PAN</span><input value={personal.pan} placeholder="ABCDE1234F" maxLength={10} className="uppercase" onChange={(e) => setPersonal({ ...personal, pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} /></label>
          <label className="personal-field"><span>AADHAAR</span><input value={personal.aadhaar} placeholder="0000 0000 0000" inputMode="numeric" maxLength={14} onChange={(e) => { const n = e.target.value.replace(/\D/g, "").slice(0, 12); setPersonal({ ...personal, aadhaar: n.replace(/(\d{4})(?=\d)/g, "$1 ") }); }} /></label>
          <label className="personal-field"><span>Date of Birth</span><input type="date" value={personal.dob} onChange={(e) => setPersonal({ ...personal, dob: e.target.value })} /></label>
          <label className="personal-field"><span>Mobile</span><div className="phone-input"><b>+91</b><input value={personal.mobile} placeholder="98765 43210" inputMode="tel" maxLength={10} autoComplete="tel" onChange={(e) => setPersonal({ ...personal, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></div></label>
          <label className="personal-field"><span>Email</span><input type="email" value={personal.email} placeholder="name@example.com" autoComplete="email" onChange={(e) => setPersonal({ ...personal, email: e.target.value })} /></label>
          <label className="personal-field address-field"><span>Address</span><input value={personal.address} placeholder="House no., street, city, state and PIN" autoComplete="street-address" onChange={(e) => setPersonal({ ...personal, address: e.target.value })} /></label>
        </div>
      </section>

      <section className="setup-card">
        <div className="setup-copy"><span className="setup-icon">◎</span><div><strong>Set up your computation</strong><small>Choose the return type and tax regime to personalise this workspace.</small></div></div>
        <label><span>ITR Form</span><select value={itr} onChange={(e) => setItr(e.target.value)}>{[1,2,3,4].map(n => <option key={n}>ITR-{n}</option>)}</select></label>
        <label><span>Tax Regime</span><div className="segmented"><button className={regime === "new" ? "active" : ""} onClick={() => setRegime("new")}>New regime <em>Default</em></button><button className={regime === "old" ? "active" : ""} onClick={() => setRegime("old")}>Old regime</button></div></label>
      </section>
      <section className="setup-progress"><div><span>Computation Progress</span><strong>{progressPercent}% Complete</strong></div><div className="progress-track"><i style={{ width: `${progressPercent}%` }} /></div><p>{completedHeads} of 11 computation heads completed.</p></section>

      <div className="workspace">
        <aside className="income-nav">
          <div className="nav-title"><span>INCOME SOURCES</span><b>{incomeHeads.filter(h => values[h.key] > 0).length}/6 added</b></div>
          {incomeHeads.map((head) => {
            const unavailable = !head.itr.includes(itr);
            return <button key={head.key} disabled={unavailable} className={`${active === head.key ? "selected" : ""} ${unavailable ? "locked" : ""}`} onClick={() => setActive(head.key)}><span className="head-icon">{head.icon}</span><span><strong>{head.title}</strong><small>{unavailable ? `Not available in ${itr}` : head.note}</small></span>{values[head.key] > 0 && !unavailable ? <em>✓</em> : <i>›</i>}</button>
          })}
          <div className="nav-title nav-group"><span>Deductions</span><b>{chapterVIA > 0 ? "1 added" : "0 added"}</b></div>
          {utilityHeads.filter(h => h.key === "deductions").map((head) => <button key={head.key} className={active === head.key ? "selected" : ""} onClick={() => setActive(head.key)}><span className="head-icon text-icon">{head.icon}</span><span><strong>Chapter VI-A deductions</strong><small>{head.note}</small></span>{chapterVIA > 0 ? <em>✓</em> : <i>›</i>}</button>)}
          <div className="nav-title nav-group"><span>Tax Paid</span><b>{money.format(tds + tcs + advanceTax + selfAssessmentTax)}</b></div>
          {utilityHeads.filter(h => !["deductions","taxCalculation","interestFee"].includes(h.key)).map((head) => { const amount = head.key === "tdsTcs" ? tds + tcs : head.key === "advanceTax" ? advanceTax : selfAssessmentTax; return <button key={head.key} className={active === head.key ? "selected" : ""} onClick={() => setActive(head.key)}><span className="head-icon text-icon">{head.icon}</span><span><strong>{head.title}</strong><small>{head.note}</small></span>{amount > 0 ? <em>✓</em> : <i>›</i>}</button>; })}
          <div className="nav-title nav-group"><span>Interest &amp; Fee</span><b>{money.format(totalInterest + fee234F)}</b></div>
          <button className={active === "interestFee" ? "selected" : ""} onClick={() => setActive("interestFee")}><span className="head-icon text-icon">IF</span><span><strong>Interest &amp; Fee</strong><small>Sections 234A, 234B, 234C and 234F</small></span>{totalInterest + fee234F > 0 ? <em>✓</em> : <i>›</i>}</button>
          <div className="nav-title nav-group"><span>Tax Calculation</span></div>
          <button className={active === "taxCalculation" ? "selected" : ""} onClick={() => setActive("taxCalculation")}><span className="head-icon text-icon">₹</span><span><strong>View Tax Calculation</strong><small>Detailed tax, rebate, cess and liability</small></span><i>›</i></button>
        </aside>

        {current ? <section className="entry-card">
          <div className="entry-head"><span className="large-icon">{current.icon}</span><div><p>Income Details</p><h2>{active === "salary" ? "Salary & Pension" : active === "house" ? "House Property" : current.title}</h2><small>{current.note}</small></div><button aria-label="Information">i</button></div>
          {active === "capital" && <>{capitalEntries.map((entry, index) => <div className="saved-property saved-capital editable-entry" key={`capital-${index}`}><h3>{entry.term === "short" ? "Short-Term Capital Gain" : "Long-Term Capital Gain"} {index + 1}</h3><label className="select-field"><span>Applicable Section</span><select value={entry.section} onChange={(e) => updateCapitalEntry(index, { section: e.target.value })}>{entry.term === "short" ? <><option value="111A">STCG u/s 111A</option><option value="stcgOther">STCG Other Than Section 111A</option></> : <><option value="112A">LTCG u/s 112A</option><option value="112">LTCG u/s 112</option></>}</select></label><div className="source-table capital-table"><div className="source-row"><span>Sale Value</span><Field label="Sale Value" value={entry.saleValue} onChange={(n) => updateCapitalEntry(index, { saleValue: n })} /></div><div className="source-row"><span>Transfer Expenses</span><Field label="Transfer Expenses" value={entry.transferExpenses} onChange={(n) => updateCapitalEntry(index, { transferExpenses: n })} /></div><div className="source-row calculated"><span>Net Consideration</span><b>{money.format(entry.netConsideration)}</b></div><div className="source-row"><span>Cost</span><Field label="Cost" value={entry.cost} onChange={(n) => updateCapitalEntry(index, { cost: n })} /></div><div className={`source-row ${entry.section !== "112" ? "frozen" : ""}`}><span>Indexed Cost {entry.section !== "112" && <small>Not applicable</small>}</span><Field label="Indexed Cost" value={entry.indexedCost} onChange={(n) => updateCapitalEntry(index, { indexedCost: n })} disabled={entry.section !== "112"} /></div><div className="source-row total"><span>Gain / Loss</span><b>{money.format(entry.gain)}</b></div></div></div>)}<div className="capital-term-choice"><button className={capitalTerm === "short" ? "active" : ""} onClick={() => { setCapitalTerm("short"); setCapitalSection(""); }}>Short-Term Capital Gain<small>Sections 111A and other STCG</small></button><button className={capitalTerm === "long" ? "active" : ""} onClick={() => { setCapitalTerm("long"); setCapitalSection(""); }}>Long-Term Capital Gain<small>Sections 112A and 112</small></button></div></>}
          {active === "salary" && <div className="form-grid"><Field label="Gross Salary & Pension" value={values.salary} onChange={(n) => setValue("salary", n)} hint="Enter salary and pension before standard deduction" /><Field label="Exempt Allowances" value={0} onChange={() => {}} hint="HRA, LTA and other exempt allowances" /></div>}
          {active === "house" && <div className="source-calculation">{houseEntries.map((entry, index) => { const gross = entry.type === "self" ? 0 : Math.max(0, entry.rent - entry.municipalTax); return <div className="saved-property editable-entry" key={`house-${index}`}><h3>House Property {index + 1}</h3><label className="select-field"><span>Type of Property</span><select value={entry.type} onChange={(e) => updateHouseEntry(index, { type: e.target.value })}><option value="self">Self Occupied</option><option value="let">Let Out</option><option value="deemed">Deemed Let Out</option></select></label><div className="source-table"><div className="source-row"><span>Rent Received</span><Field label="Rent Received" value={entry.rent} onChange={(n) => updateHouseEntry(index, { rent: n })} disabled={entry.type === "self"} /></div><div className="source-row"><span>Municipal Tax Paid</span><Field label="Municipal Tax Paid" value={entry.municipalTax} onChange={(n) => updateHouseEntry(index, { municipalTax: n })} disabled={entry.type === "self"} /></div><div className="source-row calculated"><span>Gross Rent</span><b>{money.format(gross)}</b></div><div className="source-row calculated less"><span>Standard Deduction (30%)</span><b>− {money.format(gross * .30)}</b></div><div className="source-row"><span>Interest on House Loan</span><Field label="Interest on House Loan" value={entry.interest} onChange={(n) => updateHouseEntry(index, { interest: n })} /></div><div className="source-row total"><span>Net Rent</span><b>{money.format(entry.netRent)}</b></div></div></div>})}<div className="saved-property current-property"><h3>House Property {houseEntries.length + 1}</h3><label className="select-field"><span>Type of Property</span><select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}><option value="" disabled>Select Property Type</option><option value="self">Self Occupied</option><option value="let">Let Out</option><option value="deemed">Deemed Let Out</option></select></label>{propertyType && <div className="source-table"><div className="source-row"><span>Rent Received</span><Field label="Rent Received" value={rentReceived} onChange={setRentReceived} disabled={propertyType === "self"} /></div><div className="source-row"><span>Municipal Tax Paid</span><Field label="Municipal Tax Paid" value={municipalTax} onChange={setMunicipalTax} disabled={propertyType === "self"} /></div><div className="source-row calculated"><span>Gross Rent</span><b>{money.format(grossRent)}</b></div><div className="source-row calculated less"><span>Standard Deduction (30%)</span><b>− {money.format(houseStandardDeduction)}</b></div><div className="source-row"><span>Interest on House Loan</span><Field label="Interest on House Loan" value={houseInterest} onChange={setHouseInterest} /></div><div className="source-row total"><span>Net Rent</span><b>{money.format(netRent)}</b></div></div>}</div></div>}
          {active === "capital" && capitalTerm && <div className="source-calculation"><label className="select-field"><span>{capitalTerm === "short" ? "Short-Term Capital Gain Section" : "Long-Term Capital Gain Section"}</span><select value={capitalSection} onChange={(e) => setCapitalSection(e.target.value)}><option value="" disabled>Select Applicable Section</option>{capitalTerm === "short" ? <><option value="111A">STCG u/s 111A</option><option value="stcgOther">STCG Other Than Section 111A</option></> : <><option value="112A">LTCG u/s 112A</option><option value="112">LTCG u/s 112</option></>}</select></label>{capitalSection && <div className="source-table capital-table"><div className="source-row"><span>Sale Value</span><Field label="Sale Value" value={saleValue} onChange={setSaleValue} /></div><div className="source-row"><span>Transfer Expenses</span><Field label="Transfer Expenses" value={transferExpenses} onChange={setTransferExpenses} /></div><div className="source-row calculated"><span>Net Consideration</span><b>{money.format(netConsideration)}</b></div><div className="source-row"><span>Cost</span><Field label="Cost" value={capitalCost} onChange={setCapitalCost} /></div><div className={`source-row ${!indexationAllowed ? "frozen" : ""}`}><span>Indexed Cost {!indexationAllowed && <small>Not applicable</small>}</span><Field label="Indexed Cost" value={indexedCost} onChange={setIndexedCost} disabled={!indexationAllowed} /></div><div className="source-row total"><span>Gain / Loss</span><b>{money.format(capitalGain)}</b></div></div>}</div>}
          {active === "business" && <div className="form-grid"><Field label="Business Income" value={values.business} onChange={(n) => setValue("business", n)} hint="Enter the taxable business or professional income" /></div>}
          {active === "presumptive" && <div className="source-calculation">{presumptiveEntries.map((entry, index) => <div className="saved-property editable-entry" key={`presumptive-${index}`}><h3>Presumptive Income {index + 1}</h3><label className="select-field"><span>Presumptive Section</span><select value={entry.section} onChange={(e) => updatePresumptiveEntry(index, { section: e.target.value })}><option value="44AD">Section 44AD — Eligible Business</option><option value="44ADA">Section 44ADA — Specified Profession</option><option value="44AE">Section 44AE — Goods Carriages</option><option value="both">Business &amp; Profession — 44AD + 44ADA</option></select></label><div className="form-grid">{(entry.section === "44AD" || entry.section === "both") && <Field label="Business Turnover / Receipts" value={entry.businessReceipts} onChange={(n) => updatePresumptiveEntry(index, { businessReceipts: n })} hint="Presumptive income calculated at 8%" />}{(entry.section === "44ADA" || entry.section === "both") && <Field label="Professional Gross Receipts" value={entry.professionalReceipts} onChange={(n) => updatePresumptiveEntry(index, { professionalReceipts: n })} hint="Presumptive income calculated at 50%" />}{entry.section === "44AE" && <Field label="Presumptive Income from Goods Carriages" value={entry.vehicleIncome} onChange={(n) => updatePresumptiveEntry(index, { vehicleIncome: n })} />}</div><div className="saved-entry-total"><span>Presumptive Income</span><b>{money.format(entry.income)}</b></div></div>)}<div className="saved-property current-property"><h3>Presumptive Income {presumptiveEntries.length + 1}</h3><label className="select-field"><span>Presumptive Section</span><select value={presumptiveSection} onChange={(e) => setPresumptiveSection(e.target.value)}><option value="" disabled>Select Applicable Section</option><option value="44AD">Section 44AD — Eligible Business</option><option value="44ADA">Section 44ADA — Specified Profession</option><option value="44AE">Section 44AE — Goods Carriages</option><option value="both">Business &amp; Profession — 44AD + 44ADA</option></select></label><div className="form-grid">{(presumptiveSection === "44AD" || presumptiveSection === "both") && <Field label="Business Turnover / Receipts" value={businessReceipts} onChange={setBusinessReceipts} hint="Presumptive income calculated at 8%" />}{(presumptiveSection === "44ADA" || presumptiveSection === "both") && <Field label="Professional Gross Receipts" value={professionalReceipts} onChange={setProfessionalReceipts} hint="Presumptive income calculated at 50%" />}{presumptiveSection === "44AE" && <Field label="Presumptive Income from Goods Carriages" value={vehicleIncome} onChange={setVehicleIncome} />}</div></div></div>}
          {active === "other" && <><div className="form-grid"><Field label="Dividend Income" value={dividendIncome} onChange={setDividendIncome} /><Field label="Interest Income" value={interestIncome} onChange={setInterestIncome} /><Field label="Other Income" value={otherIncome} onChange={setOtherIncome} hint="Income other than dividend and interest" /></div><label className="description-field"><span>Details of Other Income</span><textarea value={otherDescription} onChange={(e) => setOtherDescription(e.target.value)} placeholder="Describe the nature and source of other income, for example family pension, gifts, winnings or miscellaneous receipts." /></label></>}
          {active === "house" && propertyType && <div className="repeat-entry"><span>{houseEntries.length} saved propert{houseEntries.length === 1 ? "y" : "ies"}</span><button onClick={() => { setHouseEntries(v => [...v, { type: propertyType, rent: rentReceived, municipalTax, interest: houseInterest, netRent }]); setPropertyType(""); setRentReceived(0); setMunicipalTax(0); setHouseInterest(0); }}>＋ Add More House Property Income</button></div>}
          {active === "capital" && capitalSection && capitalTerm && <div className="repeat-entry"><span>{capitalEntries.length} saved capital-gain entr{capitalEntries.length === 1 ? "y" : "ies"}</span><button onClick={() => { setCapitalEntries(v => [...v, { term: capitalTerm, section: capitalSection, saleValue, transferExpenses, netConsideration, cost: capitalCost, indexedCost, gain: capitalGain }]); setCapitalTerm(""); setCapitalSection(""); setSaleValue(0); setTransferExpenses(0); setCapitalCost(0); setIndexedCost(0); }}>＋ Add More Capital Gain</button></div>}
          {active === "presumptive" && <div className="offered-income-panel">{presumptiveEntries.map((entry, index) => { const minimum = entry.section === "44AD" ? entry.businessReceipts * .08 : entry.section === "44ADA" ? entry.professionalReceipts * .50 : entry.section === "both" ? entry.businessReceipts * .08 + entry.professionalReceipts * .50 : 0; return entry.section !== "44AE" && <div key={`offered-${index}`}><Field label={`Income Offered — Presumptive Income ${index + 1}`} value={entry.offeredIncome} onChange={(n) => updatePresumptiveEntry(index, { offeredIncome: n })} hint="You may offer income above the minimum presumptive income" />{entry.offeredIncome < minimum && <p className="validation-error">Income offered cannot be lower than {money.format(minimum)}.</p>}</div>})}{presumptiveSection && presumptiveSection !== "44AE" && <><div className="minimum-income"><span>Minimum Presumptive Income</span><b>{money.format(minimumPresumptiveIncome)}</b></div><div><Field label="Income Offered" value={offeredPresumptiveIncome} onChange={setOfferedPresumptiveIncome} hint="Enter the income you wish to offer" />{offeredPresumptiveIncome < minimumPresumptiveIncome && <p className="validation-error">Income offered cannot be lower than {money.format(minimumPresumptiveIncome)}.</p>}</div></>}</div>}
          {active === "presumptive" && presumptiveSection && <div className="repeat-entry"><span>{presumptiveEntries.length} saved presumptive entr{presumptiveEntries.length === 1 ? "y" : "ies"}</span><button onClick={() => { setPresumptiveEntries(v => [...v, { section: presumptiveSection, businessReceipts, professionalReceipts, vehicleIncome, offeredIncome: offeredPresumptiveIncome, income: presumptiveIncome }]); setPresumptiveSection(""); setBusinessReceipts(0); setProfessionalReceipts(0); setVehicleIncome(0); setOfferedPresumptiveIncome(0); }}>＋ Add More Presumptive Income</button></div>}
          {active === "salary" && <div className="deduction-strip"><span>✓</span><div><strong>Standard Deduction Applied</strong><small>{money.format(standardDeduction)} automatically considered under the {regime} regime.</small></div><b>{money.format(standardDeduction)}</b></div>}
          <div className="entry-total"><span>{active === "salary" ? "Income from Salary & Pension" : active === "house" ? "Income from House Property" : active === "capital" ? "Income from Capital Gains" : `Income from ${current.title}`}</span><strong>{money.format(active === "salary" ? salaryIncome : values[current.key])}</strong></div>
          <div className="entry-footer"><button className="text-button" onClick={() => { if (current.key === "house") { setRentReceived(0); setMunicipalTax(0); setHouseInterest(0); } else if (current.key === "capital") { setSaleValue(0); setTransferExpenses(0); setCapitalCost(0); setIndexedCost(0); } else setValue(current.key, 0); }}>Clear Details</button><button className="button primary" onClick={() => { const idx = incomeHeads.findIndex(h => h.key === current.key); const next = incomeHeads.slice(idx + 1).find(h => h.itr.includes(itr)); if (next) setActive(next.key); else setActive("deductions"); }}>Save & Continue <span>→</span></button></div>
        </section> : <section className="entry-card utility-entry">
          <div className="entry-head"><span className="large-icon">{utilityHeads.find(h => h.key === active)?.icon}</span><div><p>Computation Details</p><h2>{utilityHeads.find(h => h.key === active)?.title}</h2><small>{utilityHeads.find(h => h.key === active)?.note}</small></div></div>
          {active === "deductions" && <><p className="utility-note">{regime === "new" ? "Only deductions available under the new regime are displayed." : "Enter each eligible Chapter VI-A deduction separately."}</p><div className="form-grid"><Field label="80CCD(2) — Employer NPS Contribution" value={npsEmployer} onChange={setNpsEmployer} /><Field label="80CCH — Agniveer Corpus Fund" value={agniveer} onChange={setAgniveer} />{regime === "old" && <><Field label="Section 80C" value={deduction80C} onChange={setDeduction80C} hint="Eligible investments and payments" /><Field label="Section 80D" value={deduction80D} onChange={setDeduction80D} hint="Eligible health insurance and medical payments" /><Field label="Section 80TTA / 80TTB" value={deductionInterest} onChange={setDeductionInterest} hint="Applicable deduction on eligible interest income" /></>}</div>{regime === "old" && <div className="other-deductions"><h3>Other Deductions</h3>{otherDeductions.map((entry, index) => <div className="other-deduction-row" key={`deduction-${index}`}><input value={entry.section} onChange={(e) => setOtherDeductions(items => items.map((item, i) => i === index ? { ...item, section: e.target.value } : item))} aria-label={`Deduction section ${index + 1}`} /><Field label="Deduction Amount" value={entry.amount} onChange={(n) => setOtherDeductions(items => items.map((item, i) => i === index ? { ...item, amount: n } : item))} /></div>)}<div className="other-deduction-row"><div><select value={otherDeductionSection} onChange={(e) => setOtherDeductionSection(e.target.value)}><option value="">Select Section</option><option value="80E">Section 80E</option><option value="80G">Section 80G</option><option value="80GG">Section 80GG</option><option value="80U">Section 80U</option><option value="other">Write Other Section</option></select>{otherDeductionSection === "other" && <input value={customDeductionSection} onChange={(e) => setCustomDeductionSection(e.target.value)} placeholder="Enter section, e.g. 80DD" />}</div><Field label="Deduction Amount" value={otherDeductionAmount} onChange={setOtherDeductionAmount} /></div><button className="add-deduction" disabled={!otherDeductionAmount || !(otherDeductionSection === "other" ? customDeductionSection : otherDeductionSection)} onClick={() => { setOtherDeductions(items => [...items, { section: otherDeductionSection === "other" ? customDeductionSection : otherDeductionSection, amount: otherDeductionAmount }]); setOtherDeductionSection(""); setCustomDeductionSection(""); setOtherDeductionAmount(0); }}>＋ Add More Deduction</button></div>}</>}
          {active === "tdsTcs" && <div className="form-grid"><Field label="Tax Deducted at Source (TDS)" value={tds} onChange={setTds} /><Field label="Tax Collected at Source (TCS)" value={tcs} onChange={setTcs} /></div>}
          {active === "advanceTax" && <><p className="utility-note">Enter advance-tax payments quarter-wise as per the statutory instalment dates.</p><div className="form-grid"><Field label="Q1 — Paid up to 15 June" value={advanceQ1} onChange={setAdvanceQ1} /><Field label="Q2 — Paid from 16 June to 15 September" value={advanceQ2} onChange={setAdvanceQ2} /><Field label="Q3 — Paid from 16 September to 15 December" value={advanceQ3} onChange={setAdvanceQ3} /><Field label="Q4 — Paid from 16 December to 15 March" value={advanceQ4} onChange={setAdvanceQ4} /></div></>}
          {active === "selfAssessment" && <div className="form-grid"><Field label="Self-assessment tax paid" value={selfAssessmentTax} onChange={setSelfAssessmentTax} hint="Enter tax paid before filing the return" /></div>}
          {active === "interestFee" && <div className="interest-workings"><label className="filing-date"><span>Return Filing Date</span><input type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} /></label><p className="utility-note">Amounts are calculated automatically from the computation and tax-payment details. You may edit the final amounts below.</p><div className="interest-steps"><div><strong>Interest u/s 234A</strong><span>Outstanding tax {money.format(assessedTax)} × 1% × {delayedMonths} month(s)</span><b>{money.format(suggested234A)}</b></div><div><strong>Interest u/s 234B</strong><span>Advance-tax shortfall × 1% × {monthsFromApril} month(s)</span><b>{money.format(suggested234B)}</b></div><div><strong>Interest u/s 234C</strong><span>Deferment against the 15%, 45%, 75% and 100% instalment milestones</span><b>{money.format(suggested234C)}</b></div><div><strong>Fee u/s 234F</strong><span>{delayedMonths ? `Return filed after the statutory due date; fee based on total income of ${money.format(taxable)}` : "No delay beyond the statutory due date"}</span><b>{money.format(suggested234F)}</b></div></div><h3>Final Amounts</h3><div className="form-grid"><Field label="Interest u/s 234A" value={interest234A} onChange={setInterest234A} /><Field label="Interest u/s 234B" value={interest234B} onChange={setInterest234B} /><Field label="Interest u/s 234C" value={interest234C} onChange={setInterest234C} /><Field label="Fee u/s 234F" value={fee234F} onChange={setFee234F} /></div></div>}
          {active === "taxCalculation" && <div className="tax-detail-panel"><div className="tax-subhead"><span>Normal Income — Slab-Wise Calculation</span><b>{money.format(normalIncome)}</b></div>{slabBreakdown.map((row, index) => <div key={index}><span>{row.to === Infinity ? `Above ${money.format(row.from)}` : `${money.format(row.from)} – ${money.format(row.to)}`} @ {(row.rate * 100).toFixed(0)}%</span><b>{money.format(row.amount)}</b></div>)}<div><span>Tax on Normal Income</span><b>{money.format(grossNormalTax)}</b></div>{specialIncome > 0 && <><div className="tax-subhead"><span>Special Income — {capitalSection === "111A" ? "Section 111A" : capitalSection === "112A" ? "Section 112A" : "Section 112"}</span><b>{money.format(specialIncome)}</b></div><div><span>Taxable Amount @ {(specialRate * 100).toFixed(1)}%</span><b>{money.format(specialRateTax)}</b></div></>}{rebate87A > 0 && <div className="less"><span>Less: Rebate u/s 87A</span><b>− {money.format(rebate87A)}</b></div>}<div><span>Gross Tax Liability</span><b>{money.format(grossTaxLiability)}</b></div>{surcharge > 0 && <div><span>Surcharge</span><b>{money.format(surcharge)}</b></div>}<div><span>Health &amp; Education Cess</span><b>{money.format(cess)}</b></div><div className="total"><span>Total Tax Liability</span><b>{money.format(totalTaxLiability)}</b></div></div>}
          <div className="entry-total"><span>{active === "taxCalculation" ? "Total Tax Liability" : "Total Entered"}</span><strong>{money.format(active === "deductions" ? chapterVIA : active === "tdsTcs" ? tds + tcs : active === "advanceTax" ? advanceTax : active === "selfAssessment" ? selfAssessmentTax : active === "interestFee" ? totalInterest + fee234F : totalTaxLiability)}</strong></div>
        </section>}

        <aside className="summary-card">
          <div className="summary-head"><div><p>Live Summary</p><h2>Your Tax Estimate</h2></div><span>● Updated now</span></div>
          <div className="income-total"><span>GROSS TOTAL INCOME</span><strong>{money.format(total)}</strong><small>Across {Object.values(values).filter(Boolean).length} income sources</small></div>
          <div className="summary-lines"><div><span>Chapter VI-A Deductions</span><b>− {money.format(chapterVIA)}</b></div><div className="taxable"><span>Taxable Income</span><b>{money.format(taxable)}</b></div><div><span>Income Tax</span><b>{money.format(tax)}</b></div><div><span>Health &amp; Education Cess</span><b>{money.format(cess)}</b></div></div>
          <div className="tax-paid-summary"><span>Tax Paid</span><strong>{money.format(tds + tcs + advanceTax + selfAssessmentTax)}</strong><small>TDS {money.format(tds)} · TCS {money.format(tcs)} · Advance Tax {money.format(advanceTax)} · Self-Assessment Tax {money.format(selfAssessmentTax)}</small></div>
          <div className="payable"><span>ESTIMATED TAX PAYABLE</span><strong>{money.format(due)}</strong><small>Includes 4% health & education cess</small></div>
          <div className="insight"><span>↘</span><p><strong>Smart insight</strong>Your effective tax rate is {total ? ((tax + cess) / total * 100).toFixed(1) : "0.0"}%. The new regime is currently selected.</p></div>
          <p className="disclaimer">Indicative estimate for planning. Final liability may vary based on special-rate income, surcharge, marginal relief and filing rules.</p>
        </aside>
      </div>
      </>}

      {showReview && <section id="computation-review" className="income-summary review-reveal" aria-labelledby="income-summary-title">
        <div className="statement-head">
          <div className="statement-brand"><span>TP</span><div><strong>TaxPro CA Suite</strong><small>Professional tax workspace</small></div></div>
          <div className="statement-title"><p>Computation Statement</p><h2 id="income-summary-title">INCOME TAX COMPUTATION</h2></div>
          <span className="summary-status">✓ Auto-updated</span>
        </div>
        <div className="statement-subheading"><div><strong>Client Information</strong><small>Taxpayer and filing particulars</small></div></div>
        <div className="client-statement-grid">
          <div><span>Financial Year</span><strong>2025–26</strong></div>
          <div><span>Client Name</span><strong>{personal.name || "—"}</strong></div>
          <div><span>PAN Number</span><strong>{personal.pan || "—"}</strong></div>
          <div><span>Date of Birth</span><strong>{formatDate(personal.dob)}</strong></div>
          <div><span>Mobile Number</span><strong>{personal.mobile ? `+91 ${personal.mobile}` : "—"}</strong></div>
          <div><span>Email ID</span><strong>{personal.email || "—"}</strong></div>
          <div><span>Tax Regime</span><strong>{regime === "new" ? "New Regime" : "Old Regime"}</strong></div>
          <div><span>ITR FORM</span><strong>{itr}</strong></div>
        </div>
        <div className="statement-subheading computation-heading"><div><strong>COMPUTATION OF TOTAL INCOME</strong><small>Income, deductions and tax liability</small></div></div>
        <div className="income-summary-table computation-table statement-table">
          <div className="income-summary-row heading"><span>Particulars</span><span>Amount</span></div>
          <div className="computation-section-title"><span>01</span> Income Details</div>
          {salaryIncome > 0 && <div className="computation-row"><span>Income from Salary</span><b>{money.format(salaryIncome)}</b></div>}
          {values.house > 0 && <div className="computation-row"><span>Income from House Property</span><b>{money.format(values.house)}</b></div>}
          {values.business + values.presumptive > 0 && <div className="computation-row"><span>Business Income</span><b>{money.format(values.business + values.presumptive)}</b></div>}
          {values.capital > 0 && <div className="computation-row"><span>Capital Gain</span><b>{money.format(values.capital)}</b></div>}
          {values.other > 0 && <div className="computation-row"><span>Other Sources</span><b>{money.format(values.other)}</b></div>}
          <div className="computation-row subtotal"><span>Gross Total Income</span><b>{money.format(grossTotalIncome)}</b></div>
          {(regime === "old" || chapterVIA > 0) && <div className="computation-row less"><span>Deduction under Chapter VI-A</span><b>− {money.format(chapterVIA)}</b></div>}
          <div className="computation-row major"><span>Total Income</span><b>{money.format(taxable)}</b></div>
          <div className="income-classification"><div><span>NORMAL INCOME</span><strong>{money.format(normalIncome)}</strong></div><div><span>SPECIAL INCOME</span><strong>{money.format(specialIncome)}</strong></div></div>

          <div className="computation-section-title"><span>02</span> Tax Calculation</div>
          <div className="computation-row"><span>Tax on Normal Income</span><b>{money.format(grossNormalTax)}</b></div>
          <div className="computation-row"><span>Tax on Special Income</span><b>{money.format(specialRateTax)}</b></div>
          {rebate87A > 0 && <div className="computation-row less rebate-row"><span>Less: Rebate u/s 87A</span><b>− {money.format(rebate87A)}</b></div>}
          <div className="computation-row major"><span>Gross Tax Liability</span><b>{money.format(grossTaxLiability)}</b></div>
          {surcharge > 0 && <div className="computation-row"><span>Surcharge</span><b>{money.format(surcharge)}</b></div>}
          <div className="computation-row"><span>Add: Health &amp; Education Cess</span><b>{money.format(cess)}</b></div>
          {interest234A > 0 && <div className="computation-row"><span>Interest u/s 234A</span><b>{money.format(interest234A)}</b></div>}
          {interest234B > 0 && <div className="computation-row"><span>Interest u/s 234B</span><b>{money.format(interest234B)}</b></div>}
          {interest234C > 0 && <div className="computation-row"><span>Interest u/s 234C</span><b>{money.format(interest234C)}</b></div>}
          {fee234F > 0 && <div className="computation-row"><span>Fee u/s 234F</span><b>{money.format(fee234F)}</b></div>}
          <div className="computation-row major"><span>Total Tax Liability</span><b>{money.format(totalTaxLiability)}</b></div>
          <div className="computation-row less"><span>Less: TDS</span><b>− {money.format(tds)}</b></div>
          {tcs > 0 && <div className="computation-row less"><span>Less: TCS</span><b>− {money.format(tcs)}</b></div>}
          {advanceTax > 0 && <div className="computation-row less"><span>Less: Advance Tax</span><b>− {money.format(advanceTax)}</b></div>}
          {selfAssessmentTax > 0 && <div className="computation-row less"><span>Less: Self Assessment Tax Paid</span><b>− {money.format(selfAssessmentTax)}</b></div>}
          <div className={`computation-result ${netBalance <= 0 ? "refund" : "payable-result"}`}><span><small>{netBalance <= 0 ? "REFUND DUE" : "TAX PAYABLE"}</small>{netBalance > 0 ? "Tax Payable" : "Refund / Balance"}</span><b>{money.format(Math.abs(netBalance))}</b></div>
        </div>
        <div className="statement-signoff">
          <label><span>Date</span><input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} /></label>
        </div>
        <div className="income-summary-footer">
          <p><span>i</span>This summary updates automatically whenever you change an income amount.</p>
          <div className="export-menu" ref={exportRef}><button className="button primary export-trigger" onClick={() => setExportOpen(v => !v)} aria-expanded={exportOpen}>Export <span>⌄</span></button>{exportOpen && <div><button onClick={() => exportComputation("word")}><b>W</b><span>Word<small>.doc document</small></span></button><button onClick={() => exportComputation("excel")}><b>X</b><span>Excel<small>.xls workbook</small></span></button><button onClick={() => exportComputation("pdf")}><b>P</b><span>PDF<small>Print-ready PDF</small></span></button></div>}</div>
        </div>
      </section>}
      {showNewConfirm && <div className="confirm-overlay" role="presentation" onMouseDown={() => setShowNewConfirm(false)}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="new-title" onMouseDown={(e) => e.stopPropagation()}><div className="confirm-icon">＋</div><h2 id="new-title">Create New Computation?</h2><p>Are you sure you want to create a new computation? All unsaved information will be reset to NIL.</p><div><button className="button secondary" onClick={() => setShowNewConfirm(false)}>No</button><button className="button primary" onClick={resetComputation}>Yes, Create New</button></div></section></div>}
    </main>
  );
}
