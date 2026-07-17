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

function ageOn(date: string, asOf = new Date("2026-03-31T00:00:00")) {
  if (!date) return 0;
  const dob = new Date(`${date}T00:00:00`);
  let age = asOf.getFullYear() - dob.getFullYear();
  const birthdayThisYear = new Date(asOf.getFullYear(), dob.getMonth(), dob.getDate());
  if (asOf < birthdayThisYear) age -= 1;
  return age;
}

function basicExemptionLimit(regime: "new" | "old", dob: string) {
  if (regime === "new") return 400000;
  const age = ageOn(dob);
  if (age >= 80) return 500000;
  if (age >= 60) return 300000;
  return 250000;
}

function normalTaxFor(regime: "new" | "old", income: number, basicExemption: number) {
  if (regime === "new") return slabTax(income);
  const fivePercentBand = Math.max(0, Math.min(income, 500000) - basicExemption) * .05;
  const twentyPercentBand = Math.max(0, Math.min(income, 1000000) - 500000) * .20;
  const thirtyPercentBand = Math.max(0, income - 1000000) * .30;
  return fivePercentBand + twentyPercentBand + thirtyPercentBand;
}

function rebate87AFor(regime: "new" | "old", normalIncome: number, normalTax: number) {
  if (regime === "new") {
    if (normalIncome <= 1200000) return Math.min(normalTax, 60000);
    const marginalRelief = normalTax - Math.max(0, normalIncome - 1200000);
    return Math.max(0, Math.min(normalTax, marginalRelief));
  }
  return normalIncome <= 500000 ? Math.min(normalTax, 12500) : 0;
}

export default function Home() {
  const [itr, setItr] = useState("ITR-1");
  const [regime, setRegime] = useState<"new" | "old">("new");
  const [returnType, setReturnType] = useState("139(1) — Original Return");
  const [active, setActive] = useState<NavKey>("salary");
  const [values, setValues] = useState<Record<IncomeKey, number>>({ salary: 1250000, house: 0, capital: 0, business: 0, presumptive: 0, other: 45000 });
  const [deductions, setDeductions] = useState(0);
  const [tds, setTds] = useState(92500);
  const [tdsSalary, setTdsSalary] = useState(92500);
  const [tdsOther, setTdsOther] = useState(0);
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
  const [depositInterest, setDepositInterest] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [otherDescription, setOtherDescription] = useState("");
  const [advanceQ1, setAdvanceQ1] = useState(0);
  const [advanceQ2, setAdvanceQ2] = useState(0);
  const [advanceQ3, setAdvanceQ3] = useState(0);
  const [advanceQ4, setAdvanceQ4] = useState(0);
  const [houseEntries, setHouseEntries] = useState<Array<{ type: string; rent: number; municipalTax: number; interest: number; netRent: number }>>([]);
  const [capitalEntries, setCapitalEntries] = useState<Array<{ term: "short" | "long"; section: string; saleValue: number; transferExpenses: number; netConsideration: number; cost: number; indexedCost: number; gain: number }>>([]);
  const [presumptiveEntries, setPresumptiveEntries] = useState<Array<{ section: string; businessReceipts: number; professionalReceipts: number; vehicleIncome: number; offeredIncome: number; income: number }>>([]);
  const [filingDate, setFilingDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [personal, setPersonal] = useState({ name: "Arjun Kapoor", pan: "ABCDE1234F", aadhaar: "", dob: "1990-08-15", mobile: "", email: "", address: "" });
  const [saved, setSaved] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [statementDate, setStatementDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [exportOpen, setExportOpen] = useState(false);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const [savedHeads, setSavedHeads] = useState<NavKey[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [form26asSuccess, setForm26asSuccess] = useState(false);
  const [showPortalImport, setShowPortalImport] = useState(false);
  const [portalUserId, setPortalUserId] = useState("");
  const [portalScopes, setPortalScopes] = useState({ personal: true, form26as: true, aisTis: true });
  const [committedValues, setCommittedValues] = useState<Record<IncomeKey, number>>({ salary: 0, house: 0, capital: 0, business: 0, presumptive: 0, other: 0 });
  const [committedTaxData, setCommittedTaxData] = useState({ chapterVIA: 0, tds: 0, tcs: 0, advanceTax: 0, selfAssessmentTax: 0, interest234A: 0, interest234B: 0, interest234C: 0, fee234F: 0, capitalSection: "" });
  const exportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const form26asRef = useRef<HTMLInputElement>(null);
  const importingRef = useRef(false);
  useEffect(() => { if (showReview && !statementDate) setStatementDate(new Date().toLocaleDateString("en-CA")); }, [showReview, statementDate]);

  const grossRent = !propertyType || propertyType === "self" ? 0 : Math.max(0, rentReceived - municipalTax);
  const houseStandardDeduction = grossRent * .30;
  const netRent = grossRent - houseStandardDeduction - houseInterest;
  const summaryHouseEntries = [...houseEntries, ...(propertyType ? [{ type: propertyType, rent: rentReceived, municipalTax, interest: houseInterest, netRent }] : [])];
  const indexationAllowed = capitalSection === "112";
  const netConsideration = Math.max(0, saleValue - transferExpenses);
  const capitalGain = netConsideration - (indexationAllowed ? indexedCost : capitalCost);
  const minimumPresumptiveIncome = presumptiveSection === "44AD" ? businessReceipts * .08 : presumptiveSection === "44ADA" ? professionalReceipts * .50 : presumptiveSection === "44AE" ? vehicleIncome : presumptiveSection === "both" ? businessReceipts * .08 + professionalReceipts * .50 : 0;
  const presumptiveIncome = !presumptiveSection ? 0 : presumptiveSection === "44AE" ? vehicleIncome : offeredPresumptiveIncome;
  useEffect(() => { const amount = houseEntries.reduce((sum, entry) => sum + entry.netRent, 0) + netRent; setValues(v => v.house === amount ? v : { ...v, house: amount }); }, [netRent, houseEntries]);
  useEffect(() => { const amount = capitalEntries.reduce((sum, entry) => sum + entry.gain, 0) + capitalGain; setValues(v => v.capital === amount ? v : { ...v, capital: amount }); }, [capitalGain, capitalEntries]);
  useEffect(() => { const amount = presumptiveEntries.reduce((sum, entry) => sum + entry.income, 0) + presumptiveIncome; setValues(v => v.presumptive === amount ? v : { ...v, presumptive: amount }); }, [presumptiveIncome, presumptiveEntries]);
  useEffect(() => { const other = dividendIncome + interestIncome + depositInterest + otherIncome; setValues(v => v.other === other ? v : { ...v, other }); }, [dividendIncome, interestIncome, depositInterest, otherIncome]);
  useEffect(() => { setDeductions(deduction80C + deduction80D + deductionInterest); }, [deduction80C, deduction80D, deductionInterest]);
  useEffect(() => { setAdvanceTax(advanceQ1 + advanceQ2 + advanceQ3 + advanceQ4); }, [advanceQ1, advanceQ2, advanceQ3, advanceQ4]);
  useEffect(() => { setTds(tdsSalary + tdsOther); }, [tdsSalary, tdsOther]);
  useEffect(() => { if (!personal.name && !personal.pan && Object.values(values).every(value => value === 0)) { setDepositInterest(0); setTdsSalary(0); setTdsOther(0); } }, [personal.name, personal.pan, values]);
  const taxpayerAge = ageOn(personal.dob);
  const houseIncomeForComputation = regime === "new" ? Math.max(0, committedValues.house) : Math.max(committedValues.house, -200000);
  const total = committedValues.salary + houseIncomeForComputation + committedValues.capital + committedValues.business + committedValues.presumptive + committedValues.other;
  const standardDeduction = committedValues.salary ? (regime === "new" ? 75000 : 50000) : 0;
  const draftStandardDeduction = values.salary ? (regime === "new" ? 75000 : 50000) : 0;
  const otherDeductionTotal = otherDeductions.reduce((sum, entry) => sum + entry.amount, 0) + otherDeductionAmount;
  const capped80C = Math.min(deduction80C, 150000);
  const capped80D = Math.min(deduction80D, 100000);
  const cappedInterestDeduction = Math.min(deductionInterest, taxpayerAge >= 60 ? 50000 : 10000);
  const cappedOldRegimeDeductions = capped80C + capped80D + cappedInterestDeduction + otherDeductionTotal;
  const draftChapterVIA = npsEmployer + agniveer + (regime === "old" ? cappedOldRegimeDeductions : 0);
  const chapterVIA = committedTaxData.chapterVIA;
  useEffect(() => { setCommittedValues(values); }, [values]);
  useEffect(() => { setCommittedTaxData({ chapterVIA: draftChapterVIA, tds, tcs, advanceTax, selfAssessmentTax, interest234A, interest234B, interest234C, fee234F, capitalSection }); }, [draftChapterVIA, tds, tcs, advanceTax, selfAssessmentTax, interest234A, interest234B, interest234C, fee234F, capitalSection]);
  const salaryIncome = Math.max(0, committedValues.salary - standardDeduction);
  const grossTotalIncome = Math.max(0, total - standardDeduction);
  const taxable = Math.max(0, total - standardDeduction - chapterVIA);
  const summaryCapitalEntries = [...capitalEntries, ...(capitalSection ? [{ term: capitalTerm || (capitalSection.startsWith("11") && capitalSection !== "111A" ? "long" : "short"), section: capitalSection, saleValue, transferExpenses, netConsideration, cost: capitalCost, indexedCost, gain: capitalGain }] : [])];
  const specialCapitalBySection = (section: string) => summaryCapitalEntries.filter(entry => entry.section === section).reduce((sum, entry) => sum + Math.max(0, entry.gain), 0);
  const specialCapital111A = committedValues.capital !== 0 ? specialCapitalBySection("111A") : 0;
  const specialCapital112A = committedValues.capital !== 0 ? specialCapitalBySection("112A") : 0;
  const specialCapital112 = committedValues.capital !== 0 ? specialCapitalBySection("112") : 0;
  const detailedSpecialIncome = specialCapital111A + specialCapital112A + specialCapital112;
  const fallbackSpecialIncome = ["111A", "112A", "112"].includes(committedTaxData.capitalSection) ? Math.max(0, committedValues.capital) : 0;
  const specialIncome = Math.max(0, Math.min(detailedSpecialIncome || fallbackSpecialIncome, taxable));
  const normalIncome = Math.max(0, taxable - specialIncome);
  const basicExemption = basicExemptionLimit(regime, personal.dob);
  const specialBasicExemptionAdjustment = Math.min(specialIncome, Math.max(0, basicExemption - normalIncome));
  const grossNormalTax = useMemo(() => normalTaxFor(regime, normalIncome, basicExemption), [regime, normalIncome, basicExemption]);
  const rebate87A = rebate87AFor(regime, normalIncome, grossNormalTax);
  const tax = Math.max(0, grossNormalTax - rebate87A);
  const fallbackSpecialRate = committedTaxData.capitalSection === "111A" ? .20 : committedTaxData.capitalSection === "112A" || committedTaxData.capitalSection === "112" ? .125 : 0;
  const specialRate = fallbackSpecialRate;
  const specialAdjustment111A = Math.min(specialCapital111A, specialBasicExemptionAdjustment);
  const remainingSpecialAdjustmentAfter111A = Math.max(0, specialBasicExemptionAdjustment - specialAdjustment111A);
  const specialAdjustment112 = Math.min(specialCapital112, remainingSpecialAdjustmentAfter111A);
  const remainingSpecialAdjustmentAfter112 = Math.max(0, remainingSpecialAdjustmentAfter111A - specialAdjustment112);
  const specialAdjustment112A = Math.min(Math.max(0, specialCapital112A - 125000), remainingSpecialAdjustmentAfter112);
  const detailedSpecialBeneficialAdjustment = specialAdjustment111A + specialAdjustment112 + specialAdjustment112A;
  const fallbackSpecialBeneficialAdjustment = committedTaxData.capitalSection === "112A" ? Math.min(Math.max(0, specialIncome - 125000), specialBasicExemptionAdjustment) : specialBasicExemptionAdjustment;
  const specialBeneficialExemptionAdjustment = detailedSpecialIncome > 0 ? detailedSpecialBeneficialAdjustment : fallbackSpecialBeneficialAdjustment;
  const fallbackSpecialTaxableBase = committedTaxData.capitalSection === "112A" ? Math.max(0, specialIncome - 125000 - fallbackSpecialBeneficialAdjustment) : Math.max(0, specialIncome - fallbackSpecialBeneficialAdjustment);
  const detailedSpecialRateTax = Math.max(0, specialCapital111A - specialAdjustment111A) * .20 + Math.max(0, specialCapital112A - 125000 - specialAdjustment112A) * .125 + Math.max(0, specialCapital112 - specialAdjustment112) * .125;
  const specialRateTax = detailedSpecialIncome > 0 ? detailedSpecialRateTax : fallbackSpecialTaxableBase * fallbackSpecialRate;
  const grossTaxLiability = tax + specialRateTax;
  const surchargeRate = taxable > 50000000 ? (regime === "old" ? .37 : .25) : taxable > 20000000 ? .25 : taxable > 10000000 ? .15 : taxable > 5000000 ? .10 : 0;
  const surcharge = grossTaxLiability * surchargeRate;
  const cess = (grossTaxLiability + surcharge) * .04;
  const taxBeforeInterest = grossTaxLiability + surcharge + cess;
  const assessedTax = Math.max(0, taxBeforeInterest - committedTaxData.tds - committedTaxData.tcs);
  const normalTaxAt = (income: number) => normalTaxFor(regime, income, basicExemption);
  const normalCapitalGain = committedValues.capital !== 0 ? Math.max(0, specialCapitalBySection("stcgOther")) : 0;
  const lastQuarterNormalIncome = Math.min(normalIncome, Math.max(0, dividendIncome) + normalCapitalGain);
  const lastQuarterNormalTax = Math.max(0, grossNormalTax - normalTaxAt(Math.max(0, normalIncome - lastQuarterNormalIncome)));
  const lastQuarterIncomeTax = Math.min(assessedTax, Math.round((specialRateTax + lastQuarterNormalTax) * (1 + surchargeRate) * 1.04));
  const regularAssessedTax = Math.max(0, assessedTax - lastQuarterIncomeTax);
  const filing = filingDate ? new Date(`${filingDate}T00:00:00`) : new Date("2026-07-12T00:00:00");
  const dueDate = new Date("2026-07-31T00:00:00");
  const delayedMonths = filing > dueDate ? Math.max(1, Math.ceil((filing.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0;
  const hasBusinessOrProfessionIncome = committedValues.business + committedValues.presumptive > 0;
  const advanceTaxApplicable = assessedTax >= 10000 && !(taxpayerAge >= 60 && !hasBusinessOrProfessionIncome);
  const suggested234A = Math.round(Math.floor(Math.max(0, assessedTax - committedTaxData.advanceTax - committedTaxData.selfAssessmentTax) / 100) * 100 * .01 * delayedMonths);
  const monthsFromApril = Math.max(1, (filing.getFullYear() - 2026) * 12 + filing.getMonth() - 3 + 1);
  const interest234BShortfall = Math.floor(Math.max(0, assessedTax - committedTaxData.advanceTax) / 100) * 100;
  const suggested234B = advanceTaxApplicable && committedTaxData.advanceTax < assessedTax * .90 ? Math.round(interest234BShortfall * .01 * monthsFromApril) : 0;
  const presumptiveAdvanceTaxSingleInstalment = committedValues.presumptive > 0 && committedValues.business === 0;
  const interest234CTargets = presumptiveAdvanceTaxSingleInstalment ? [0, 0, 0, assessedTax] : [regularAssessedTax * .15, regularAssessedTax * .45, regularAssessedTax * .75, assessedTax];
  const interest234CPaid = [advanceQ1, advanceQ1 + advanceQ2, advanceQ1 + advanceQ2 + advanceQ3, advanceTax];
  const interest234CMonths = [3, 3, 3, 1];
  const suggested234C = advanceTaxApplicable ? Math.round(interest234CTargets.reduce((sum, target, index) => sum + Math.floor(Math.max(0, target - interest234CPaid[index]) / 100) * 100 * .01 * interest234CMonths[index], 0)) : 0;
  const suggested234F = filing > dueDate ? (taxable <= 500000 ? 1000 : 5000) : 0;
  useEffect(() => {
    setInterest234A(suggested234A);
    setInterest234B(suggested234B);
    setInterest234C(suggested234C);
    setFee234F(suggested234F);
    setCommittedTaxData(current => (
      current.interest234A === suggested234A &&
      current.interest234B === suggested234B &&
      current.interest234C === suggested234C &&
      current.fee234F === suggested234F
        ? current
        : { ...current, interest234A: suggested234A, interest234B: suggested234B, interest234C: suggested234C, fee234F: suggested234F }
    ));
  }, [suggested234A, suggested234B, suggested234C, suggested234F]);
  const draftTotalInterest = interest234A + interest234B + interest234C;
  const liveTotalInterest = suggested234A + suggested234B + suggested234C;
  const totalInterest = liveTotalInterest;
  const totalTaxLiability = grossTaxLiability + surcharge + cess + totalInterest + suggested234F;
  const due = Math.max(0, totalTaxLiability - committedTaxData.tds - committedTaxData.tcs - committedTaxData.advanceTax - committedTaxData.selfAssessmentTax);
  const netBalance = totalTaxLiability - committedTaxData.tds - committedTaxData.tcs - committedTaxData.advanceTax - committedTaxData.selfAssessmentTax;
  const roundedNetBalance = Math.sign(netBalance) * Math.round(Math.abs(netBalance) / 10) * 10;
  const roundOffAdjustment = roundedNetBalance - netBalance;
  const shortTermCapitalGain = summaryCapitalEntries.filter(entry => entry.term === "short").reduce((sum, entry) => sum + entry.gain, 0);
  const longTermCapitalGain = summaryCapitalEntries.filter(entry => entry.term === "long").reduce((sum, entry) => sum + entry.gain, 0);
  const capitalGainBySection = (section: string) => summaryCapitalEntries.filter(entry => entry.section === section).reduce((sum, entry) => sum + entry.gain, 0);
  const stcg111A = capitalGainBySection("111A");
  const stcgOther = capitalGainBySection("stcgOther");
  const ltcg112A = capitalGainBySection("112A");
  const ltcg112 = capitalGainBySection("112");
  const summaryPresumptiveEntries = [...presumptiveEntries, ...(presumptiveSection ? [{ section: presumptiveSection, businessReceipts, professionalReceipts, vehicleIncome, offeredIncome: offeredPresumptiveIncome, income: presumptiveIncome }] : [])];
  const presumptiveBySection = (section: string) => summaryPresumptiveEntries.filter(entry => entry.section === section).reduce((sum, entry) => sum + entry.income, 0);
  const presumptive44AD = presumptiveBySection("44AD");
  const presumptive44ADA = presumptiveBySection("44ADA");
  const presumptive44AE = presumptiveBySection("44AE");
  const presumptiveBoth = presumptiveBySection("both");
  const turnover44AD = summaryPresumptiveEntries.filter(entry => entry.section === "44AD").reduce((sum, entry) => sum + entry.businessReceipts, 0);
  const receipts44ADA = summaryPresumptiveEntries.filter(entry => entry.section === "44ADA").reduce((sum, entry) => sum + entry.professionalReceipts, 0);
  const turnoverBoth = summaryPresumptiveEntries.filter(entry => entry.section === "both").reduce((sum, entry) => sum + entry.businessReceipts, 0);
  const receiptsBoth = summaryPresumptiveEntries.filter(entry => entry.section === "both").reduce((sum, entry) => sum + entry.professionalReceipts, 0);
  const grossTaxBeforeRebate = grossNormalTax + specialRateTax;
  const taxAfterRebate = Math.max(0, grossTaxBeforeRebate - rebate87A);
  const totalTaxAfterSurcharge = taxAfterRebate + surcharge;
  const summaryTaxBeforeTds = totalTaxAfterSurcharge + cess;
  const summaryTaxBeforeAdvance = summaryTaxBeforeTds - committedTaxData.tds - committedTaxData.tcs;
  const summaryTaxBeforeInterest = summaryTaxBeforeAdvance - committedTaxData.advanceTax - committedTaxData.selfAssessmentTax;
  useEffect(() => {
    const autoSavedHeads: NavKey[] = [];
    const add = (condition: boolean, key: NavKey) => { if (condition) autoSavedHeads.push(key); };
    add(values.salary > 0, "salary");
    add(values.house !== 0 || houseEntries.length > 0 || !!propertyType, "house");
    add(values.capital !== 0 || capitalEntries.length > 0 || !!capitalSection, "capital");
    add(values.business !== 0, "business");
    add(values.presumptive !== 0 || presumptiveEntries.length > 0 || !!presumptiveSection, "presumptive");
    add(values.other > 0 || !!otherDescription.trim(), "other");
    add(draftChapterVIA > 0 || otherDeductions.length > 0, "deductions");
    add(tds + tcs > 0, "tdsTcs");
    add(advanceTax > 0, "advanceTax");
    add(selfAssessmentTax > 0, "selfAssessment");
    add(interest234A + interest234B + interest234C + fee234F > 0, "interestFee");
    add(totalTaxLiability > 0, "taxCalculation");
    setSavedHeads(current => current.length === autoSavedHeads.length && current.every((head, index) => head === autoSavedHeads[index]) ? current : autoSavedHeads);
  }, [values, houseEntries, propertyType, capitalEntries, capitalSection, presumptiveEntries, presumptiveSection, otherDescription, draftChapterVIA, otherDeductions, tds, tcs, advanceTax, selfAssessmentTax, interest234A, interest234B, interest234C, fee234F, totalTaxLiability]);
  const slabBreakdown = (regime === "new" ? [[0,400000,0],[400000,800000,.05],[800000,1200000,.10],[1200000,1600000,.15],[1600000,2000000,.20],[2000000,2400000,.25],[2400000,Infinity,.30]] : [[0,basicExemption,0],[basicExemption,500000,.05],[500000,1000000,.20],[1000000,Infinity,.30]]).map(([from,to,rate]) => { const taxableAmount = Math.max(0, Math.min(normalIncome,to) - from); return { from, to, rate, taxableAmount, amount: taxableAmount * rate }; }).filter(row => row.taxableAmount > 0 || (row.rate === 0 && normalIncome > 0));
  const specialTaxWorking = detailedSpecialIncome > 0 ? [
    ...(specialCapital111A > 0 ? [{ label: "Short-Term Capital Gain u/s 111A", income: specialCapital111A, exemption: specialAdjustment111A, threshold: 0, rate: .20, tax: Math.max(0, specialCapital111A - specialAdjustment111A) * .20 }] : []),
    ...(specialCapital112A > 0 ? [{ label: "Long-Term Capital Gain u/s 112A", income: specialCapital112A, exemption: specialAdjustment112A, threshold: Math.min(125000, Math.max(0, specialCapital112A - specialAdjustment112A)), rate: .125, tax: Math.max(0, specialCapital112A - specialAdjustment112A - 125000) * .125 }] : []),
    ...(specialCapital112 > 0 ? [{ label: "Long-Term Capital Gain u/s 112", income: specialCapital112, exemption: specialAdjustment112, threshold: 0, rate: .125, tax: Math.max(0, specialCapital112 - specialAdjustment112) * .125 }] : []),
  ] : specialIncome > 0 ? [{ label: committedTaxData.capitalSection === "111A" ? "Short-Term Capital Gain u/s 111A" : committedTaxData.capitalSection === "112A" ? "Long-Term Capital Gain u/s 112A" : "Long-Term Capital Gain u/s 112", income: specialIncome, exemption: fallbackSpecialBeneficialAdjustment, threshold: committedTaxData.capitalSection === "112A" ? Math.min(125000, Math.max(0, specialIncome - fallbackSpecialBeneficialAdjustment)) : 0, rate: fallbackSpecialRate, tax: specialRateTax }] : [];
  const interest234ABase = Math.floor(Math.max(0, assessedTax - committedTaxData.advanceTax - committedTaxData.selfAssessmentTax) / 100) * 100;
  const interest234BBase = advanceTaxApplicable && committedTaxData.advanceTax < assessedTax * .90 ? interest234BShortfall : 0;
  const interest234CWorking = [
    { label: "Up to 15 June 2025", percent: 15, required: regularAssessedTax * .15, paid: advanceQ1, months: 3 },
    { label: "Up to 15 September 2025", percent: 45, required: regularAssessedTax * .45, paid: advanceQ1 + advanceQ2, months: 3 },
    { label: "Up to 15 December 2025", percent: 75, required: regularAssessedTax * .75, paid: advanceQ1 + advanceQ2 + advanceQ3, months: 3 },
    { label: "Up to 15 March 2026", percent: 100, required: assessedTax, paid: advanceTax, months: 1 },
  ].map(row => { const shortfall = advanceTaxApplicable ? Math.floor(Math.max(0, row.required - row.paid) / 100) * 100 : 0; return { ...row, required: advanceTaxApplicable ? row.required : 0, shortfall, interest: Math.round(shortfall * .01 * row.months) }; });
  const current = incomeHeads.find((h) => h.key === active);
  const setValue = (key: IncomeKey, n: number) => setValues((v) => ({ ...v, [key]: n }));
  const capitalRowsForSection = (section: string, label: string, total: number) => {
    const entries = summaryCapitalEntries.filter(entry => entry.section === section);
    return (
      <>
        {total !== 0 && <div className="computation-row source-subrow capital-subtotal"><span>{label}</span><b></b></div>}
        {entries.map((entry, index) => {
          const costLabel = entry.section === "112" ? "Indexed Cost" : "Cost of Acquisition";
          const costAmount = entry.section === "112" ? entry.indexedCost : entry.cost;
          return (
            <div className="capital-preview" key={`summary-capital-${section}-${index}`}>
              {entries.length > 1 && <div className="capital-preview-label"><span>{label} {index + 1}</span><b></b></div>}
              <div><span>Net Consideration</span><b>{money.format(entry.netConsideration)}</b></div>
              <div><span>{costLabel}</span><b>{money.format(-costAmount)}</b></div>
              <div className="capital-preview-total"><span>Capital {entry.gain < 0 ? "Loss" : "Gain"}</span><b><span className="capital-total-amount">{money.format(entry.gain)}</span></b></div>
            </div>
          );
        })}
      </>
    );
  };
  const updateHouseEntry = (index: number, patch: Partial<(typeof houseEntries)[number]>) => setHouseEntries(entries => entries.map((entry, i) => { if (i !== index) return entry; const next = { ...entry, ...patch }; const gross = next.type === "self" ? 0 : Math.max(0, next.rent - next.municipalTax); return { ...next, netRent: gross - gross * .30 - next.interest }; }));
  const updateCapitalEntry = (index: number, patch: Partial<(typeof capitalEntries)[number]>) => setCapitalEntries(entries => entries.map((entry, i) => { if (i !== index) return entry; const next = { ...entry, ...patch }; const net = Math.max(0, next.saleValue - next.transferExpenses); return { ...next, netConsideration: net, gain: net - (next.section === "112" ? next.indexedCost : next.cost) }; }));
  const updatePresumptiveEntry = (index: number, patch: Partial<(typeof presumptiveEntries)[number]>) => setPresumptiveEntries(entries => entries.map((entry, i) => { if (i !== index) return entry; const next = { ...entry, ...patch }; return { ...next, income: next.section === "44AE" ? next.vehicleIncome : next.offeredIncome }; }));
  const resetComputation = () => { const today = new Date().toLocaleDateString("en-CA"); setItr("ITR-1"); setRegime("new"); setActive("salary"); setValues({ salary:0, house:0, capital:0, business:0, presumptive:0, other:0 }); setDeductions(0); setTds(0); setTcs(0); setNpsEmployer(0); setAgniveer(0); setAdvanceTax(0); setAdvanceQ1(0); setAdvanceQ2(0); setAdvanceQ3(0); setAdvanceQ4(0); setSelfAssessmentTax(0); setInterest234A(0); setInterest234B(0); setInterest234C(0); setFee234F(0); setPropertyType(""); setRentReceived(0); setMunicipalTax(0); setHouseInterest(0); setHouseEntries([]); setCapitalTerm(""); setCapitalSection(""); setSaleValue(0); setTransferExpenses(0); setCapitalCost(0); setIndexedCost(0); setCapitalEntries([]); setDeduction80C(0); setDeduction80D(0); setDeductionInterest(0); setPresumptiveSection(""); setBusinessReceipts(0); setProfessionalReceipts(0); setVehicleIncome(0); setPresumptiveEntries([]); setDividendIncome(0); setInterestIncome(0); setOtherIncome(0); setOtherDescription(""); setFilingDate(today); setPersonal({ name:"", pan:"", aadhaar:"", dob:"", mobile:"", email:"", address:"" }); setStatementDate(today); setSaved(false); setShowReview(false); setExportOpen(false); setShowNewConfirm(false); };
  const formatDate = (date: string) => date ? date.split("-").reverse().join("-") : "—";
  const computationFileName = `${(personal.name || "Income Tax").trim().replace(/[<>:"/\\|?*]/g, "-")}_Tax Computation_FY 2025-26`;
  const computationData = () => ({ version: 1, savedAt: new Date().toISOString(), itr, regime, returnType, active, values, deductions, tds, tdsSalary, tdsOther, tcs, npsEmployer, agniveer, advanceTax, selfAssessmentTax, interest234A, interest234B, interest234C, fee234F, propertyType, rentReceived, municipalTax, houseInterest, capitalSection, capitalTerm, saleValue, transferExpenses, capitalCost, indexedCost, deduction80C, deduction80D, deductionInterest, otherDeductions, otherDeductionSection, customDeductionSection, otherDeductionAmount, presumptiveSection, businessReceipts, professionalReceipts, vehicleIncome, offeredPresumptiveIncome, dividendIncome, interestIncome, depositInterest, otherIncome, otherDescription, advanceQ1, advanceQ2, advanceQ3, advanceQ4, houseEntries, capitalEntries, presumptiveEntries, filingDate, personal, statementDate, savedHeads });
  const saveJsonFile = async () => { const blob = new Blob([JSON.stringify(computationData(), null, 2)], { type: "application/json" }); const filename = `${personal.name || "income-tax"}-computation-FY-2025-26.json`; try { const picker = (window as unknown as { showSaveFilePicker?: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker; if (picker) { const handle = await picker({ suggestedName: filename, types: [{ description: "JSON computation file", accept: { "application/json": [".json"] } }] }); const writable = await handle.createWritable(); await writable.write(blob); await writable.close(); } else { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); } setSaved(true); } catch (error) { if ((error as Error).name !== "AbortError") console.error(error); } };
  const importJsonFile = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()); if (data.version !== 1) throw new Error("Unsupported computation file"); const today = new Date().toLocaleDateString("en-CA"); setItr(data.itr); setRegime(data.regime); setActive(data.active || "salary"); setValues(data.values); setDeductions(data.deductions || 0); setTds(data.tds || 0); setTcs(data.tcs || 0); setNpsEmployer(data.npsEmployer || 0); setAgniveer(data.agniveer || 0); setSelfAssessmentTax(data.selfAssessmentTax || 0); setInterest234A(data.interest234A || 0); setInterest234B(data.interest234B || 0); setInterest234C(data.interest234C || 0); setFee234F(data.fee234F || 0); setPropertyType(data.propertyType || ""); setRentReceived(data.rentReceived || 0); setMunicipalTax(data.municipalTax || 0); setHouseInterest(data.houseInterest || 0); setCapitalSection(data.capitalSection || ""); setCapitalTerm(data.capitalTerm || ""); setSaleValue(data.saleValue || 0); setTransferExpenses(data.transferExpenses || 0); setCapitalCost(data.capitalCost || 0); setIndexedCost(data.indexedCost || 0); setDeduction80C(data.deduction80C || 0); setDeduction80D(data.deduction80D || 0); setDeductionInterest(data.deductionInterest || 0); setOtherDeductions(data.otherDeductions || []); setOtherDeductionSection(data.otherDeductionSection || ""); setCustomDeductionSection(data.customDeductionSection || ""); setOtherDeductionAmount(data.otherDeductionAmount || 0); setPresumptiveSection(data.presumptiveSection || ""); setBusinessReceipts(data.businessReceipts || 0); setProfessionalReceipts(data.professionalReceipts || 0); setVehicleIncome(data.vehicleIncome || 0); setOfferedPresumptiveIncome(data.offeredPresumptiveIncome || 0); setDividendIncome(data.dividendIncome || 0); setInterestIncome(data.interestIncome || 0); setOtherIncome(data.otherIncome || 0); setOtherDescription(data.otherDescription || ""); setAdvanceQ1(data.advanceQ1 || 0); setAdvanceQ2(data.advanceQ2 || 0); setAdvanceQ3(data.advanceQ3 || 0); setAdvanceQ4(data.advanceQ4 || 0); setHouseEntries(data.houseEntries || []); setCapitalEntries(data.capitalEntries || []); setPresumptiveEntries(data.presumptiveEntries || []); setFilingDate(data.filingDate || today); setPersonal(data.personal); setStatementDate(data.statementDate || today); setSavedHeads(data.savedHeads || []); setSaved(true); setShowReview(false); } catch { alert("This JSON file is not a valid TaxPro computation backup."); } finally { event.target.value = ""; } };
  const buildBackupPdf = (data: ReturnType<typeof computationData>) => { const clean = (value: unknown) => String(value ?? "").replace(/[^\x20-\x7E]/g, " "); const lines: string[] = ["TAXPRO CA SUITE - INCOME TAX COMPUTATION", "FY 2025-26 / AY 2026-27", "", "PERSONAL DETAILS", `Name: ${clean(data.personal.name)}`, `PAN: ${clean(data.personal.pan)}`, `Aadhaar: ${clean(data.personal.aadhaar)}`, `Date of Birth: ${clean(data.personal.dob)}`, `Mobile: ${clean(data.personal.mobile)}`, `Email: ${clean(data.personal.email)}`, `Address: ${clean(data.personal.address)}`, `Tax Regime: ${clean(data.regime)}`, `ITR Form: ${clean(data.itr)}`, "", "INCOME SOURCES", `Salary and Pension: Rs. ${data.values.salary}`, `House Property: Rs. ${data.values.house}`, `Business Income: Rs. ${data.values.business}`, `Presumptive Income: Rs. ${data.values.presumptive}`, `Capital Gains: Rs. ${data.values.capital}`, `Other Sources: Rs. ${data.values.other}`, "", "HOUSE PROPERTY SCHEDULES", ...data.houseEntries.flatMap((entry, i) => [`Property ${i + 1} - ${clean(entry.type)}`, `Rent: Rs. ${entry.rent}; Municipal Tax: Rs. ${entry.municipalTax}; Interest: Rs. ${entry.interest}; Net: Rs. ${entry.netRent}`]), "", "CAPITAL GAINS SCHEDULES", ...data.capitalEntries.flatMap((entry, i) => [`Capital Gain ${i + 1} - ${clean(entry.term)} / ${clean(entry.section)}`, `Sale: Rs. ${entry.saleValue}; Transfer Expenses: Rs. ${entry.transferExpenses}; Cost: Rs. ${entry.cost}; Indexed Cost: Rs. ${entry.indexedCost}; Gain: Rs. ${entry.gain}`]), "", "PRESUMPTIVE INCOME SCHEDULES", ...data.presumptiveEntries.flatMap((entry, i) => [`Entry ${i + 1} - Section ${clean(entry.section)}`, `Business Receipts: Rs. ${entry.businessReceipts}; Professional Receipts: Rs. ${entry.professionalReceipts}; Vehicle Income: Rs. ${entry.vehicleIncome}; Income Offered: Rs. ${entry.offeredIncome}`]), "", "CHAPTER VI-A DEDUCTIONS", `Section 80C: Rs. ${data.deduction80C}`, `Section 80D: Rs. ${data.deduction80D}`, `Section 80TTA/80TTB: Rs. ${data.deductionInterest}`, `Employer NPS: Rs. ${data.npsEmployer}`, `Agniveer Corpus Fund: Rs. ${data.agniveer}`, ...data.otherDeductions.map(entry => `${clean(entry.section)}: Rs. ${entry.amount}`), "", "TAX PAID", `TDS: Rs. ${data.tds}`, `TCS: Rs. ${data.tcs}`, `Advance Tax Q1/Q2/Q3/Q4: Rs. ${data.advanceQ1} / ${data.advanceQ2} / ${data.advanceQ3} / ${data.advanceQ4}`, `Self-Assessment Tax: Rs. ${data.selfAssessmentTax}`, "", "INTEREST AND FEE", `234A: Rs. ${data.interest234A}; 234B: Rs. ${data.interest234B}; 234C: Rs. ${data.interest234C}; 234F: Rs. ${data.fee234F}`, `Return Filing Date: ${clean(data.filingDate)}`]; const pages = Array.from({ length: Math.ceil(lines.length / 48) }, (_, i) => lines.slice(i * 48, (i + 1) * 48)); const objects: string[] = ["", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]; const pageIds: number[] = []; pages.forEach(page => { const pageId = objects.length + 1; const contentId = pageId + 1; pageIds.push(pageId); const content = `BT /F1 9 Tf 38 805 Td 14 TL ${page.map(line => `(${clean(line).replace(/([\\()])/g, "\\$1")}) Tj T*`).join(" ")} ET`; objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`); }); objects[0] = "<< /Type /Catalog /Pages 2 0 R >>"; objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`; let pdf = "%PDF-1.4\n"; const offsets = [0]; objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }); const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`; const bytes = new TextEncoder().encode(JSON.stringify(data)); let binary = ""; bytes.forEach(byte => { binary += String.fromCharCode(byte); }); return new Blob([pdf, `\n%TAXPRO_DATA_BEGIN\n${btoa(binary)}\n%TAXPRO_DATA_END\n`], { type: "application/pdf" }); };
  const savePdfBackup = async () => { const data = computationData(); const blob = buildBackupPdf(data); const safeName = (personal.name || "Income Tax").trim().replace(/[<>:"/\\|?*]/g, "-"); const filename = `Draft_${safeName}_Computation_FY 25-26.pdf`; try { const picker = (window as unknown as { showSaveFilePicker?: (options: unknown) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }> }).showSaveFilePicker; if (picker) { const handle = await picker({ suggestedName: filename, types: [{ description: "TaxPro PDF computation backup", accept: { "application/pdf": [".pdf"] } }] }); const writable = await handle.createWritable(); await writable.write(blob); await writable.close(); } else { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); } setSaved(true); } catch (error) { if ((error as Error).name !== "AbortError") console.error(error); } };
  const importPdfBackup = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { const raw = new TextDecoder("latin1").decode(await file.arrayBuffer()); const encoded = raw.match(/%TAXPRO_DATA_BEGIN\s*([A-Za-z0-9+/=]+)\s*%TAXPRO_DATA_END/)?.[1]; if (!encoded) throw new Error("Missing TaxPro data"); const binary = atob(encoded); const bytes = Uint8Array.from(binary, character => character.charCodeAt(0)); const decoded = new TextDecoder().decode(bytes); const restored = JSON.parse(decoded); const jsonFile = new File([decoded], "import.json", { type: "application/json" }); await importJsonFile({ target: { files: [jsonFile], value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>); setReturnType(restored.returnType || "139(1) — Original Return"); setDepositInterest(restored.depositInterest || 0); setTdsSalary(restored.tdsSalary ?? restored.tds ?? 0); setTdsOther(restored.tdsOther || 0); setImportSuccess(true); setTimeout(() => setImportSuccess(false), 3500); } catch { alert("This PDF is not a TaxPro computation backup or its embedded data is damaged."); } finally { event.target.value = ""; } };
  const importForm26AS = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { const text = await file.text(); const number = (value?: string) => Number((value || "0").replace(/[^\d.-]/g, "")) || 0; const findAmount = (patterns: RegExp[]) => { for (const pattern of patterns) { const match = text.match(pattern); if (match) return number(match[1]); } return 0; }; let importedTds = findAmount([/total\s+(?:amount\s+of\s+)?tax\s+deducted[^\d]*([\d,]+(?:\.\d+)?)/i, /total\s+tds[^\d]*([\d,]+(?:\.\d+)?)/i]); let importedTcs = findAmount([/total\s+(?:amount\s+of\s+)?tax\s+collected[^\d]*([\d,]+(?:\.\d+)?)/i, /total\s+tcs[^\d]*([\d,]+(?:\.\d+)?)/i]); if (file.name.toLowerCase().endsWith(".json")) { const source = JSON.parse(text); const totals: Record<string, number> = {}; const walk = (value: unknown, key = "") => { if (typeof value === "number" && /(total.*tds|tds.*total|taxdeducted)/i.test(key)) totals.tds = Math.max(totals.tds || 0, value); if (typeof value === "number" && /(total.*tcs|tcs.*total|taxcollected)/i.test(key)) totals.tcs = Math.max(totals.tcs || 0, value); if (value && typeof value === "object") Object.entries(value).forEach(([childKey, child]) => walk(child, childKey)); }; walk(source); importedTds ||= totals.tds || 0; importedTcs ||= totals.tcs || 0; } const pan = text.match(/\b[A-Z]{5}\d{4}[A-Z]\b/i)?.[0]?.toUpperCase(); const assesseeName = text.match(/(?:name\s+of\s+(?:the\s+)?assessee|assessee\s+name)\s*[:\-]?\s*([^\r\n,]+)/i)?.[1]?.trim(); if (!importedTds && !importedTcs && !pan) throw new Error("No recognisable Form 26AS data"); setTds(importedTds); setTcs(importedTcs); if (pan || assesseeName) setPersonal(current => ({ ...current, pan: pan || current.pan, name: assesseeName || current.name })); setSavedHeads(heads => heads.filter(head => head !== "tdsTcs")); setActive("tdsTcs"); setForm26asSuccess(true); setTimeout(() => setForm26asSuccess(false), 4000); } catch { alert("The selected file could not be read as Form 26AS. Please use a downloaded text, CSV or JSON statement."); } finally { event.target.value = ""; } };
  const goNextHead = () => { const order: NavKey[] = [...incomeHeads.filter(h => h.itr.includes(itr)).map(h => h.key), "deductions", "tdsTcs", "advanceTax", "selfAssessment", "interestFee", "taxCalculation"]; const next = order[order.indexOf(active) + 1]; if (next) setActive(next); };
  useEffect(() => { const close = (event: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(event.target as Node)) setExportOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  const exportComputation = (format: "word" | "excel" | "pdf") => {
    setExportOpen(false); if (format === "pdf") { const previousTitle = document.title; document.title = computationFileName; window.print(); setTimeout(() => { document.title = previousTitle; }, 500); return; }
    const rows: (string | number)[][] = [["INCOME TAX COMPUTATION", ""], ["Financial Year", "2025-26"], ["Client Name", personal.name], ["PAN Number", personal.pan], ["Date of Birth", formatDate(personal.dob)], ["Mobile Number", personal.mobile], ["Email ID", personal.email], ["Tax Regime", regime === "new" ? "New Regime" : "Old Regime"], ["ITR Form", itr], ...(salaryIncome ? [["Income from Salary", salaryIncome] as (string | number)[]] : []), ...(values.house ? [["Income from House Property", values.house] as (string | number)[]] : []), ...(values.business + values.presumptive ? [["Business Income", values.business + values.presumptive] as (string | number)[]] : []), ...(values.capital ? [["Capital Gain", values.capital] as (string | number)[]] : []), ...(values.other ? [["Other Sources", values.other] as (string | number)[]] : []), ["Gross Total Income", grossTotalIncome], ...(regime === "old" || chapterVIA > 0 ? [["Deduction under Chapter VI-A", chapterVIA] as (string | number)[]] : []), ["Total Income", taxable], ["Normal Income", normalIncome], ["Special Income", specialIncome], ["Tax on Normal Income", grossNormalTax], ["Tax on Special Income", specialRateTax], ...(rebate87A ? [["Less: Rebate u/s 87A", rebate87A] as (string | number)[]] : []), ["Gross Tax Liability", grossTaxLiability], ...(surcharge ? [["Surcharge", surcharge] as (string | number)[]] : []), ["Add: Health & Education Cess", cess], ...(interest234A ? [["Interest u/s 234A", interest234A] as (string | number)[]] : []), ...(interest234B ? [["Interest u/s 234B", interest234B] as (string | number)[]] : []), ...(interest234C ? [["Interest u/s 234C", interest234C] as (string | number)[]] : []), ...(fee234F ? [["Fee u/s 234F", fee234F] as (string | number)[]] : []), ["Total Tax Liability", totalTaxLiability], ["Less: TDS", tds], ...(tcs ? [["Less: TCS", tcs] as (string | number)[]] : []), ...(advanceTax ? [["Less: Advance Tax", advanceTax] as (string | number)[]] : []), ...(selfAssessmentTax ? [["Less: Self Assessment Tax Paid", selfAssessmentTax] as (string | number)[]] : []), [netBalance > 0 ? "Net Tax Payable Before Round Off" : "Net Tax Refundable Before Round Off", Math.abs(netBalance)], ["Round off u/s 288B", roundOffAdjustment], [netBalance > 0 ? "Rounded Net Tax Payable" : "Rounded Net Tax Refundable", Math.abs(roundedNetBalance)]];
    const esc = (v: string | number) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const importantRows = new Set(["Gross Total Income", "Total Income", "Gross Tax Liability", "Tax after Rebate", "Total Tax", "Tax Before TDS", "Tax Before Advance Tax", "Tax Before Interest", "Total Tax Liability", "Tax Payable", "Refund / Balance", "Net Tax Payable", "Net Tax Refundable", "Net Tax Payable Before Round Off", "Net Tax Refundable Before Round Off", "Rounded Net Tax Payable", "Rounded Net Tax Refundable"]);
    const clientRows: (string | number)[][] = [...rows.slice(1, 9), ["Return Type", returnType], ["", ""]];
    const wordClientCell = (label: string, value: string, width: string, last = false) => `<td style="width:${width};padding:9pt 10pt;border-right:${last ? "0" : "1pt solid #d5e0dc"};border-bottom:1pt solid #d5e0dc;vertical-align:top"><span style="display:block;color:#667773;font-size:7.5pt;font-weight:bold;letter-spacing:.6pt;text-transform:uppercase">${esc(label)}</span><b style="display:block;margin-top:4pt;color:#142e29;font-size:9.5pt;line-height:12pt;overflow-wrap:anywhere">${esc(value || "—")}</b></td>`;
    const wordClientGrid = `<table style="width:100%;table-layout:fixed;border-collapse:collapse;background:#f6f8f7;margin-bottom:10pt"><tr>${wordClientCell("Financial Year", "2025–26", "25%")}${wordClientCell("Client Name", personal.name, "25%")} ${wordClientCell("PAN Number", personal.pan, "25%")} ${wordClientCell("Date of Birth", formatDate(personal.dob), "25%", true)}</tr><tr>${wordClientCell("Mobile Number", personal.mobile ? `+91 ${personal.mobile}` : "", "50%")} ${wordClientCell("Email ID", personal.email, "50%", true)}</tr><tr>${wordClientCell("Tax Regime", regime === "new" ? "New Regime" : "Old Regime", "33.33%")} ${wordClientCell("ITR Form", itr, "33.33%")} ${wordClientCell("Return Type", returnType, "33.34%", true)}</tr></table>`;
    const computationRows = rows.slice(9).flatMap((row): (string | number)[][] => {
      const label = String(row[0]);
      if (label === "Income from Salary") return [row, ["Gross Salary & Pension", committedValues.salary], ["Less: Standard Deduction", -standardDeduction]];
      if (label === "Income from House Property") return [row, ...summaryHouseEntries.map((entry, index): (string | number)[] => [`Property ${index + 1} — ${entry.type === "self" ? "Interest on House Loan (Self Occupied)" : entry.type === "let" ? "Income from Let Out Property" : "Income from Deemed Let Out Property"}`, entry.netRent])];
      if (label === "Business Income") return [["Profits and Gains from Business or Profession", row[1]], ...(committedValues.business ? [["Business Income under Regular Provisions", committedValues.business] as (string | number)[]] : []), ...summaryPresumptiveEntries.flatMap((entry): (string | number)[][] => entry.section === "44AD" ? [["Turnover u/s 44AD", entry.businessReceipts], ["Presumptive Business Income u/s 44AD", entry.income]] : entry.section === "44ADA" ? [["Gross Receipts u/s 44ADA", entry.professionalReceipts], ["Presumptive Professional Income u/s 44ADA", entry.income]] : entry.section === "44AE" ? [["Presumptive Income from Goods Carriages u/s 44AE", entry.income]] : [["Turnover u/s 44AD", entry.businessReceipts], ["Gross Receipts u/s 44ADA", entry.professionalReceipts], ["Presumptive Income u/s 44AD and 44ADA", entry.income]])];
      if (label === "Capital Gain") return [row, ...(stcg111A ? [[`Short-Term Capital ${stcg111A < 0 ? "Loss" : "Gain"} u/s 111A`, stcg111A] as (string | number)[]] : []), ...(stcgOther ? [[`Short-Term Capital ${stcgOther < 0 ? "Loss" : "Gain"} Other Than u/s 111A`, stcgOther] as (string | number)[]] : []), ...(ltcg112A ? [[`Long-Term Capital ${ltcg112A < 0 ? "Loss" : "Gain"} u/s 112A`, ltcg112A] as (string | number)[]] : []), ...(ltcg112 ? [[`Long-Term Capital ${ltcg112 < 0 ? "Loss" : "Gain"} u/s 112`, ltcg112] as (string | number)[]] : [])];
      if (label === "Other Sources") return [row, ...(interestIncome ? [["Interest from Savings Bank", interestIncome] as (string | number)[]] : []), ...(depositInterest ? [["Interest from Deposit", depositInterest] as (string | number)[]] : []), ...(dividendIncome ? [["Dividend Income", dividendIncome] as (string | number)[]] : []), ...(otherIncome ? [[`Any Other Income${otherDescription.trim() ? ` — ${otherDescription.trim()}` : ""}`, otherIncome] as (string | number)[]] : [])];
      return [row];
    });
    const totalIncomeRow = computationRows.findIndex(row => row[0] === "Total Income");
    if (totalIncomeRow >= 0) computationRows.splice(totalIncomeRow + 1, 0, ["__SPACE_AFTER_TOTAL__", ""]);
    const taxCalculationStart = computationRows.findIndex(row => row[0] === "Tax on Normal Income");
    if (taxCalculationStart >= 0) {
      const taxExportRows: (string | number)[][] = [
        ["__SPACE_BEFORE_TAX__", ""],
        ["TAX CALCULATION", ""],
        ["Tax on Normal Income", grossNormalTax],
        ["Tax on Special Income", specialRateTax],
        ["Gross Tax Liability", grossTaxBeforeRebate],
        ...(rebate87A > 0 ? [["Less: Rebate u/s 87A", -rebate87A], ["Tax after Rebate", taxAfterRebate]] as (string | number)[][] : []),
        ...(surcharge > 0 ? [["Add: Surcharge", surcharge], ["Total Tax", totalTaxAfterSurcharge]] as (string | number)[][] : []),
        ["Add: Education Cess", cess],
        ["Tax Before TDS", summaryTaxBeforeTds],
        ["Less: TDS / TCS", -(committedTaxData.tds + committedTaxData.tcs)],
        ["Tax Before Advance Tax", summaryTaxBeforeAdvance],
        ["Less: Advance Tax / Self-Assessment Tax", -(committedTaxData.advanceTax + committedTaxData.selfAssessmentTax)],
        ["Tax Before Interest", summaryTaxBeforeInterest],
        ...(suggested234A > 0 ? [["Add: Interest u/s 234A", suggested234A] as (string | number)[]] : []),
        ...(suggested234B > 0 ? [["Add: Interest u/s 234B", suggested234B] as (string | number)[]] : []),
        ...(suggested234C > 0 ? [["Add: Interest u/s 234C", suggested234C] as (string | number)[]] : []),
        ...(suggested234F > 0 ? [["Add: Fee u/s 234F", suggested234F] as (string | number)[]] : []),
        [netBalance > 0 ? "Net Tax Payable Before Round Off" : "Net Tax Refundable Before Round Off", Math.abs(netBalance)],
        ["Round off u/s 288B", roundOffAdjustment],
        [netBalance > 0 ? "Rounded Net Tax Payable" : "Rounded Net Tax Refundable", Math.abs(roundedNetBalance)]
      ];
      computationRows.splice(taxCalculationStart, computationRows.length - taxCalculationStart, ...taxExportRows);
    }
    computationRows.unshift(["INCOME DETAILS", ""]);
    const incomeMainRows = new Set(["INCOME DETAILS", "TAX CALCULATION", "Income from Salary", "Income from House Property", "Profits and Gains from Business or Profession", "Capital Gain", "Other Sources"]);
    const incomeDetailRow = (label: string) => /^(Gross Salary|Less: Standard Deduction|Property \d+|Business Income under|Turnover u\/s|Gross Receipts u\/s|Presumptive|Short-Term Capital|Long-Term Capital|Interest from|Dividend Income|Any Other Income)/.test(label);
    const content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page WordSection1{size:595.3pt 841.9pt;margin:34pt}div.WordSection1{page:WordSection1}body{font-family:Arial,sans-serif;color:#142e29}table{border-collapse:collapse;width:100%}td{font-size:9pt}</style></head><body><div class="WordSection1"><table style="border-bottom:2pt solid #0f5b4c;margin-bottom:12pt"><tr><td style="width:24%;padding:8pt 0"><b style="font-family:Georgia,serif;font-size:14pt;color:#0f5b4c">TAXPRO CA SUITE</b><br><span style="font-size:8pt;color:#667773">Professional Tax Workspace</span></td><td style="width:52%;text-align:center;padding:8pt"><span style="font-size:8pt;letter-spacing:1pt;color:#e8844d">COMPUTATION STATEMENT</span><br><b style="font-family:Georgia,serif;font-size:18pt;white-space:nowrap">INCOME TAX COMPUTATION</b></td><td style="width:24%;text-align:right;font-size:8pt;color:#667773">FY 2025-26<br>AY 2026-27</td></tr></table><div style="font-family:Georgia,serif;font-size:12pt;font-weight:bold;text-align:center;border-top:1pt solid #dbe5e1;border-bottom:1pt solid #dbe5e1;padding:8pt">CLIENT INFORMATION</div><table style="background:#f6f8f7;margin-bottom:10pt">${clientRows.map((r, index) => `${index % 2 === 0 ? "<tr>" : ""}<td style="width:25%;padding:7pt 8pt;border-bottom:1pt solid #dbe5e1;color:#667773;font-size:7pt;text-transform:uppercase">${esc(r[0])}<br><b style="display:block;margin-top:3pt;color:#142e29;font-size:9pt;text-transform:none">${esc(r[1])}</b></td>${index % 2 === 1 ? "</tr>" : ""}`).join("")}</table><div style="font-family:Georgia,serif;font-size:13pt;font-weight:bold;text-align:center;border-top:1pt solid #dbe5e1;border-bottom:1pt solid #dbe5e1;padding:8pt">COMPUTATION OF TOTAL INCOME<br><span style="font-family:Arial,sans-serif;font-size:7pt;font-weight:normal;color:#667773">Income, deductions and tax liability</span></div><table><tr style="background:#edf5f1"><td style="padding:7pt;font-size:7pt;font-weight:bold;text-transform:uppercase">Particulars</td><td style="padding:7pt;text-align:right;font-size:7pt;font-weight:bold;text-transform:uppercase">Amount</td></tr>${computationRows.map(r => { const label = String(r[0]); const major = importantRows.has(label); const incomeMain = incomeMainRows.has(label); const detail = incomeDetailRow(label); const rowStyle = major || incomeMain ? "background:#f2f6f4;font-weight:bold" : ""; const leftPadding = detail ? "padding:6pt 7pt 6pt 22pt" : "padding:7pt"; const rightPadding = detail ? "padding:6pt 28pt 6pt 7pt" : "padding:7pt"; return `<tr style="${rowStyle}"><td style="${leftPadding};border-bottom:1pt solid #dfe7e4;${detail ? "color:#667773" : ""}">${esc(label)}</td><td style="${rightPadding};border-bottom:1pt solid #dfe7e4;text-align:right;font-weight:bold">${typeof r[1] === "number" ? money.format(r[1]) : esc(r[1])}</td></tr>`; }).join("")}</table><div style="margin-top:18pt;border-top:1pt solid #dbe5e1;padding-top:8pt;text-align:right;font-size:8pt"><b>Date:</b> ${formatDate(statementDate)}</div></div></body></html>`;
    const wordContent = content
      .replace('TAXPRO CA SUITE</b>', 'TaxPro CA Suite</b>')
      .replace(/<table style="background:#f6f8f7;margin-bottom:10pt">[\s\S]*?<\/table>/, wordClientGrid)
      .replace('CLIENT INFORMATION</div>', 'CLIENT INFORMATION<br><span style="font-family:Arial,sans-serif;font-size:7pt;font-weight:normal;color:#667773">Taxpayer and filing particulars</span></div>')
      .replace('<tr style=""><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;">__SPACE_AFTER_TOTAL__</td><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;text-align:right;font-weight:bold"></td></tr>', '<tr style="page-break-inside:avoid"><td colspan="2" style="height:8pt;padding:0;border:0;background:#ffffff;font-size:1pt">&nbsp;</td></tr>')
      .replace('<tr style=""><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;">__SPACE_BEFORE_TAX__</td><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;text-align:right;font-weight:bold"></td></tr>', '<tr style="page-break-inside:avoid"><td colspan="2" style="height:10pt;padding:0;border:0;background:#ffffff;font-size:1pt">&nbsp;</td></tr>')
      .replace('table{border-collapse:collapse;width:100%}td{font-size:9pt}', 'table{border-collapse:collapse;width:100%;mso-table-lspace:0pt;mso-table-rspace:0pt}tr{page-break-inside:avoid;mso-keep-together:yes}td{font-size:9pt}')
      .replaceAll('padding:6pt 28pt 6pt 7pt', 'padding:6pt 54pt 6pt 7pt')
      .replaceAll('padding:6pt 7pt 6pt 22pt', 'padding:6pt 7pt 6pt 17pt')
      .replaceAll('<tr style="background:#f2f6f4;font-weight:bold">', '<tr style="background:#f2f6f4;font-weight:bold;page-break-inside:avoid;mso-keep-together:yes;mso-keep-next:yes">')
      .replace('<tr style="background:#f2f6f4;font-weight:bold;page-break-inside:avoid;mso-keep-together:yes;mso-keep-next:yes"><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;">Net Tax Payable</td><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;text-align:right;font-weight:bold">', '<tr style="background:#884527;page-break-inside:avoid;mso-keep-together:yes"><td style="padding:9pt 18pt;color:#ffffff;font-size:11pt;font-weight:bold;border:0">NET TAX PAYABLE</td><td style="padding:9pt 18pt;color:#ffffff;text-align:right;font-family:Georgia,serif;font-size:14pt;font-weight:bold;border:0">')
      .replace('<tr style="background:#f2f6f4;font-weight:bold;page-break-inside:avoid;mso-keep-together:yes;mso-keep-next:yes"><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;">Net Tax Refundable</td><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;text-align:right;font-weight:bold">', '<tr style="background:#0f5b4c;page-break-inside:avoid;mso-keep-together:yes"><td style="padding:9pt 18pt;color:#ffffff;font-size:11pt;font-weight:bold;border:0">NET TAX REFUNDABLE</td><td style="padding:9pt 18pt;color:#ffffff;text-align:right;font-family:Georgia,serif;font-size:14pt;font-weight:bold;border:0">')
      .replace('<tr style="background:#f2f6f4;font-weight:bold;page-break-inside:avoid;mso-keep-together:yes;mso-keep-next:yes"><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;">INCOME DETAILS</td><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;text-align:right;font-weight:bold"></td></tr>', '<tr style="page-break-inside:avoid;mso-keep-next:yes"><td colspan="2" style="padding:10pt 12pt;background:#eef3f1;border-top:1pt solid #cbd8d3;border-bottom:1pt solid #cbd8d3;color:#142e29;font-size:10pt;font-weight:bold;letter-spacing:.5pt"><span style="background:#0f5b4c;color:#ffffff;font-size:8pt;font-weight:bold;padding:4pt 7pt">01</span>&nbsp;&nbsp; INCOME DETAILS</td></tr>')
      .replace('<tr style="background:#f2f6f4;font-weight:bold;page-break-inside:avoid;mso-keep-together:yes;mso-keep-next:yes"><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;">TAX CALCULATION</td><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;text-align:right;font-weight:bold"></td></tr>', '<tr style="page-break-before:always;page-break-inside:avoid;mso-keep-next:yes"><td colspan="2" style="padding:10pt 12pt;background:#eef3f1;border-top:1pt solid #cbd8d3;border-bottom:1pt solid #cbd8d3;color:#142e29;font-size:10pt;font-weight:bold;letter-spacing:.5pt"><span style="background:#0f5b4c;color:#ffffff;font-size:8pt;font-weight:bold;padding:4pt 7pt">02</span>&nbsp;&nbsp; TAX CALCULATION</td></tr>')
      .replace('<tr style=""><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;">Normal Income</td><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;text-align:right;font-weight:bold">', '<tr style="background:#edf7f3;font-weight:bold"><td style="padding:10pt 9pt 10pt 13pt;border-left:4pt solid #0f5b4c;border-bottom:1pt solid #c9ded6;color:#0f5b4c;font-size:10pt">Normal Income</td><td style="padding:10pt 13pt 10pt 7pt;border-bottom:1pt solid #c9ded6;text-align:right;font-family:Georgia,serif;font-size:13pt;font-weight:bold;color:#0f5b4c">')
      .replace('<tr style=""><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;">Special Income</td><td style="padding:7pt;border-bottom:1pt solid #dfe7e4;text-align:right;font-weight:bold">', '<tr style="background:#fff4ed;font-weight:bold"><td style="padding:10pt 9pt 10pt 13pt;border-left:4pt solid #d9773f;border-bottom:1pt solid #eed1c1;color:#a85128;font-size:10pt">Special Income</td><td style="padding:10pt 13pt 10pt 7pt;border-bottom:1pt solid #eed1c1;text-align:right;font-family:Georgia,serif;font-size:13pt;font-weight:bold;color:#a85128">')
      .replace('border-bottom:2pt solid #0f5b4c;margin-bottom:12pt', 'border-bottom:2pt solid #0f5b4c;margin:0 0 12pt 0;table-layout:fixed;mso-table-lspace:0pt;mso-table-rspace:0pt')
      .replace('width:24%;padding:8pt 0', 'width:26%;padding:11pt 8pt 11pt 10pt;vertical-align:middle;white-space:nowrap')
      .replace('font-size:14pt;color:#0f5b4c', 'font-size:10.5pt;color:#0f5b4c;white-space:nowrap;mso-line-height-rule:exactly;line-height:13pt')
      .replace('width:52%;text-align:center;padding:8pt', 'width:54%;text-align:center;padding:10pt 5pt;vertical-align:middle')
      .replace('font-size:18pt;white-space:nowrap', 'font-size:13.5pt;white-space:nowrap;mso-line-height-rule:exactly;line-height:16pt')
      .replace('width:24%;text-align:right', 'width:20%;padding:10pt 8pt 10pt 4pt;vertical-align:middle;text-align:right');
    const blob = new Blob([wordContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${computationFileName}.${format === "excel" ? "xls" : "doc"}`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">T</span><div><strong>Tax Studio</strong><small>Income Tax Workspace</small></div></div>
        <div className="year-pill"><span>●</span> FY 2025–26 <b>AY 2026–27</b></div>
        {showReview ? <div className="review-toolbar"><button className="button back-button" onClick={() => { setShowReview(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>←</span> Back to Computation</button><div className="export-menu" ref={exportRef}><button className="button primary export-trigger" onClick={() => setExportOpen(v => !v)} aria-expanded={exportOpen}>Export <span>⌄</span></button>{exportOpen && <div><button onClick={() => exportComputation("pdf")}><b>P</b><span>PDF<small>A4 summary document</small></span></button></div>}</div></div> : <div className="top-actions"><button className="icon-button" aria-label="Notifications">○</button><span className="avatar">{personal.name ? personal.name.split(/\s+/).map(n => n[0]).slice(0,2).join("").toUpperCase() : "—"}</span><div className="profile"><strong>{personal.name || "New Client"}</strong><small>Individual</small></div></div>}
      </header>

      {!showReview && <>
      <section className="page-head">
        <div><p className="eyebrow">Income Tax Computation</p><h1>Let’s Calculate Your Taxes.</h1><p>Add your income details and get a clear, real-time estimate.</p></div>
        <div className="head-toolbar"><input ref={importRef} className="json-import-input" type="file" accept="application/pdf,.pdf" onChange={importPdfBackup} /><button className="button secondary" onClick={() => setShowNewConfirm(true)}>＋ New</button><button className="button secondary" onClick={() => importRef.current?.click()}>Import PDF</button><button className="button save-button" onClick={savePdfBackup}>Save PDF</button><button className="button primary" onClick={() => { setShowReview(true); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50); }}>View Computation <span>→</span></button></div>
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
        <label><span>Return Type</span><select value={returnType} onChange={(e) => setReturnType(e.target.value)}><option>139(1) — Original Return</option><option>139(4) — Belated Return</option><option>139(5) — Revised Return</option><option>139(8A) — Updated Return (ITR-U)</option><option>92CD — Modified Return</option><option>119(2)(b) — Return after Condonation</option></select></label>
        <label><span>Tax Regime</span><div className="segmented"><button className={regime === "new" ? "active" : ""} onClick={() => setRegime("new")}>New regime <em>Default</em></button><button className={regime === "old" ? "active" : ""} onClick={() => setRegime("old")}>Old regime</button></div></label>
      </section>
      <div className="workspace">
        <aside className="income-nav">
          <div className="nav-title"><span>INCOME SOURCES</span><b>{incomeHeads.filter(h => committedValues[h.key] > 0).length}/6 added</b></div>
          {incomeHeads.map((head) => {
            const unavailable = !head.itr.includes(itr);
            return <button key={head.key} disabled={unavailable} className={`${active === head.key ? "selected" : ""} ${unavailable ? "locked" : ""}`} onClick={() => setActive(head.key)}><span className="head-icon">{head.icon}</span><span><strong>{head.title}</strong><small>{unavailable ? `Not available in ${itr}` : head.note}</small></span>{savedHeads.includes(head.key) && !unavailable ? <em>✓</em> : <i>›</i>}</button>
          })}
          <div className="nav-title nav-group"><span>DEDUCTIONS</span><b>{chapterVIA > 0 ? "1 added" : "0 added"}</b></div>
          {utilityHeads.filter(h => h.key === "deductions").map((head) => <button key={head.key} className={active === head.key ? "selected" : ""} onClick={() => setActive(head.key)}><span className="head-icon text-icon">{head.icon}</span><span><strong>Chapter VI-A deductions</strong><small>{head.note}</small></span>{savedHeads.includes(head.key) ? <em>✓</em> : <i>›</i>}</button>)}
          <div className="nav-title nav-group"><span>TAX PAID</span><b>{money.format(committedTaxData.tds + committedTaxData.tcs + committedTaxData.advanceTax + committedTaxData.selfAssessmentTax)}</b></div>
          {utilityHeads.filter(h => !["deductions","taxCalculation","interestFee"].includes(h.key)).map((head) => <button key={head.key} className={active === head.key ? "selected" : ""} onClick={() => setActive(head.key)}><span className="head-icon text-icon">{head.icon}</span><span><strong>{head.title}</strong><small>{head.note}</small></span>{savedHeads.includes(head.key) ? <em>✓</em> : <i>›</i>}</button>)}
          <div className="nav-title nav-group"><span>INTEREST &amp; FEE</span><b>{money.format(totalInterest + suggested234F)}</b></div>
          <button className={active === "interestFee" ? "selected" : ""} onClick={() => setActive("interestFee")}><span className="head-icon text-icon">IF</span><span><strong>Interest &amp; Fee</strong><small>Sections 234A, 234B, 234C and 234F</small></span>{savedHeads.includes("interestFee") ? <em>✓</em> : <i>›</i>}</button>
          <div className="nav-title nav-group"><span>TAX CALCULATION</span></div>
          <button className={active === "taxCalculation" ? "selected" : ""} onClick={() => setActive("taxCalculation")}><span className="head-icon text-icon">₹</span><span><strong>View Tax Calculation</strong><small>Detailed tax, rebate, cess and liability</small></span>{savedHeads.includes("taxCalculation") ? <em>✓</em> : <i>›</i>}</button>
        </aside>

        {current ? <section className="entry-card">
          <div className="entry-head"><span className="large-icon">{current.icon}</span><div><p>Income Details</p><h2>{active === "salary" ? "Salary & Pension" : active === "house" ? "House Property" : current.title}</h2><small>{current.note}</small></div><button aria-label="Information">i</button></div>
          {active === "capital" && <>{capitalEntries.map((entry, index) => <div className="saved-property saved-capital editable-entry" key={`capital-${index}`}><h3>{entry.term === "short" ? "Short-Term Capital Gain" : "Long-Term Capital Gain"} {index + 1}</h3><label className="select-field"><span>Applicable Section</span><select value={entry.section} onChange={(e) => updateCapitalEntry(index, { section: e.target.value })}>{entry.term === "short" ? <><option value="111A">STCG u/s 111A</option><option value="stcgOther">STCG Other Than Section 111A</option></> : <><option value="112A">LTCG u/s 112A</option><option value="112">LTCG u/s 112</option></>}</select></label><div className="source-table capital-table"><div className="source-row"><span>Sale Value</span><Field label="Sale Value" value={entry.saleValue} onChange={(n) => updateCapitalEntry(index, { saleValue: n })} /></div><div className="source-row"><span>Transfer Expenses</span><Field label="Transfer Expenses" value={entry.transferExpenses} onChange={(n) => updateCapitalEntry(index, { transferExpenses: n })} /></div><div className="source-row calculated"><span>Net Consideration</span><b>{money.format(entry.netConsideration)}</b></div><div className="source-row"><span>Cost</span><Field label="Cost" value={entry.cost} onChange={(n) => updateCapitalEntry(index, { cost: n })} /></div><div className={`source-row ${entry.section !== "112" ? "frozen" : ""}`}><span>Indexed Cost {entry.section !== "112" && <small>Not applicable</small>}</span><Field label="Indexed Cost" value={entry.indexedCost} onChange={(n) => updateCapitalEntry(index, { indexedCost: n })} disabled={entry.section !== "112"} /></div><div className="source-row total"><span>Gain / Loss</span><b>{money.format(entry.gain)}</b></div></div></div>)}<div className="capital-term-choice"><button className={capitalTerm === "short" ? "active" : ""} onClick={() => { setCapitalTerm("short"); setCapitalSection(""); }}>Short-Term Capital Gain<small>Sections 111A and other STCG</small></button><button className={capitalTerm === "long" ? "active" : ""} onClick={() => { setCapitalTerm("long"); setCapitalSection(""); }}>Long-Term Capital Gain<small>Sections 112A and 112</small></button></div></>}
          {active === "salary" && <div className="form-grid"><Field label="Gross Salary & Pension" value={values.salary} onChange={(n) => setValue("salary", n)} hint="Enter salary and pension before standard deduction" /><Field label="Exempt Allowances" value={0} onChange={() => {}} hint="HRA, LTA and other exempt allowances" /></div>}
          {active === "house" && <div className="source-calculation">{houseEntries.map((entry, index) => { const gross = entry.type === "self" ? 0 : Math.max(0, entry.rent - entry.municipalTax); return <div className="saved-property editable-entry" key={`house-${index}`}><h3>House Property {index + 1}</h3><label className="select-field"><span>Type of Property</span><select value={entry.type} onChange={(e) => updateHouseEntry(index, { type: e.target.value })}><option value="self">Self Occupied</option><option value="let">Let Out</option><option value="deemed">Deemed Let Out</option></select></label><div className="source-table"><div className="source-row"><span>Rent Received</span><Field label="Rent Received" value={entry.rent} onChange={(n) => updateHouseEntry(index, { rent: n })} disabled={entry.type === "self"} /></div><div className="source-row"><span>Municipal Tax Paid</span><Field label="Municipal Tax Paid" value={entry.municipalTax} onChange={(n) => updateHouseEntry(index, { municipalTax: n })} disabled={entry.type === "self"} /></div><div className="source-row calculated"><span>Gross Rent</span><b>{money.format(gross)}</b></div><div className="source-row calculated less"><span>Standard Deduction (30%)</span><b>− {money.format(gross * .30)}</b></div><div className="source-row"><span>Interest on House Loan</span><Field label="Interest on House Loan" value={entry.interest} onChange={(n) => updateHouseEntry(index, { interest: n })} /></div><div className="source-row total"><span>Net Rent</span><b>{money.format(entry.netRent)}</b></div></div></div>})}<div className="saved-property current-property"><h3>House Property {houseEntries.length + 1}</h3><label className="select-field"><span>Type of Property</span><select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}><option value="" disabled>Select Property Type</option><option value="self">Self Occupied</option><option value="let">Let Out</option><option value="deemed">Deemed Let Out</option></select></label>{propertyType && <div className="source-table"><div className="source-row"><span>Rent Received</span><Field label="Rent Received" value={rentReceived} onChange={setRentReceived} disabled={propertyType === "self"} /></div><div className="source-row"><span>Municipal Tax Paid</span><Field label="Municipal Tax Paid" value={municipalTax} onChange={setMunicipalTax} disabled={propertyType === "self"} /></div><div className="source-row calculated"><span>Gross Rent</span><b>{money.format(grossRent)}</b></div><div className="source-row calculated less"><span>Standard Deduction (30%)</span><b>− {money.format(houseStandardDeduction)}</b></div><div className="source-row"><span>Interest on House Loan</span><Field label="Interest on House Loan" value={houseInterest} onChange={setHouseInterest} /></div><div className="source-row total"><span>Net Rent</span><b>{money.format(netRent)}</b></div></div>}</div></div>}
          {active === "capital" && capitalTerm && <div className="source-calculation"><label className="select-field"><span>{capitalTerm === "short" ? "Short-Term Capital Gain Section" : "Long-Term Capital Gain Section"}</span><select value={capitalSection} onChange={(e) => setCapitalSection(e.target.value)}><option value="" disabled>Select Applicable Section</option>{capitalTerm === "short" ? <><option value="111A">STCG u/s 111A</option><option value="stcgOther">STCG Other Than Section 111A</option></> : <><option value="112A">LTCG u/s 112A</option><option value="112">LTCG u/s 112</option></>}</select></label>{capitalSection && <div className="source-table capital-table"><div className="source-row"><span>Sale Value</span><Field label="Sale Value" value={saleValue} onChange={setSaleValue} /></div><div className="source-row"><span>Transfer Expenses</span><Field label="Transfer Expenses" value={transferExpenses} onChange={setTransferExpenses} /></div><div className="source-row calculated"><span>Net Consideration</span><b>{money.format(netConsideration)}</b></div><div className="source-row"><span>Cost</span><Field label="Cost" value={capitalCost} onChange={setCapitalCost} /></div><div className={`source-row ${!indexationAllowed ? "frozen" : ""}`}><span>Indexed Cost {!indexationAllowed && <small>Not applicable</small>}</span><Field label="Indexed Cost" value={indexedCost} onChange={setIndexedCost} disabled={!indexationAllowed} /></div><div className="source-row total"><span>Gain / Loss</span><b>{money.format(capitalGain)}</b></div></div>}</div>}
          {active === "business" && <div className="form-grid"><Field label="Business Income" value={values.business} onChange={(n) => setValue("business", n)} hint="Enter the taxable business or professional income" /></div>}
          {active === "presumptive" && <div className="source-calculation">{presumptiveEntries.map((entry, index) => <div className="saved-property editable-entry" key={`presumptive-${index}`}><h3>Presumptive Income {index + 1}</h3><label className="select-field"><span>Presumptive Section</span><select value={entry.section} onChange={(e) => updatePresumptiveEntry(index, { section: e.target.value })}><option value="44AD">Section 44AD — Eligible Business</option><option value="44ADA">Section 44ADA — Specified Profession</option><option value="44AE">Section 44AE — Goods Carriages</option><option value="both">Business &amp; Profession — 44AD + 44ADA</option></select></label><div className="form-grid">{(entry.section === "44AD" || entry.section === "both") && <Field label="Business Turnover / Receipts" value={entry.businessReceipts} onChange={(n) => updatePresumptiveEntry(index, { businessReceipts: n })} hint="Presumptive income calculated at 8%" />}{(entry.section === "44ADA" || entry.section === "both") && <Field label="Professional Gross Receipts" value={entry.professionalReceipts} onChange={(n) => updatePresumptiveEntry(index, { professionalReceipts: n })} hint="Presumptive income calculated at 50%" />}{entry.section === "44AE" && <Field label="Presumptive Income from Goods Carriages" value={entry.vehicleIncome} onChange={(n) => updatePresumptiveEntry(index, { vehicleIncome: n })} />}</div><div className="saved-entry-total"><span>Presumptive Income</span><b>{money.format(entry.income)}</b></div></div>)}<div className="saved-property current-property"><h3>Presumptive Income {presumptiveEntries.length + 1}</h3><label className="select-field"><span>Presumptive Section</span><select value={presumptiveSection} onChange={(e) => setPresumptiveSection(e.target.value)}><option value="" disabled>Select Applicable Section</option><option value="44AD">Section 44AD — Eligible Business</option><option value="44ADA">Section 44ADA — Specified Profession</option><option value="44AE">Section 44AE — Goods Carriages</option><option value="both">Business &amp; Profession — 44AD + 44ADA</option></select></label><div className="form-grid">{(presumptiveSection === "44AD" || presumptiveSection === "both") && <Field label="Business Turnover / Receipts" value={businessReceipts} onChange={setBusinessReceipts} hint="Presumptive income calculated at 8%" />}{(presumptiveSection === "44ADA" || presumptiveSection === "both") && <Field label="Professional Gross Receipts" value={professionalReceipts} onChange={setProfessionalReceipts} hint="Presumptive income calculated at 50%" />}{presumptiveSection === "44AE" && <Field label="Presumptive Income from Goods Carriages" value={vehicleIncome} onChange={setVehicleIncome} />}</div></div></div>}
          {active === "other" && <><div className="form-grid"><Field label="Dividend Income" value={dividendIncome} onChange={setDividendIncome} /><Field label="Interest from Savings Bank" value={interestIncome} onChange={setInterestIncome} /><Field label="Interest from Deposit" value={depositInterest} onChange={setDepositInterest} /><Field label="Other Income" value={otherIncome} onChange={setOtherIncome} hint="Income other than dividend and interest" /></div><label className="description-field"><span>Details of Other Income</span><textarea value={otherDescription} onChange={(e) => setOtherDescription(e.target.value)} placeholder="Describe the nature and source of other income, for example family pension, gifts, winnings or miscellaneous receipts." /></label></>}
          {active === "house" && propertyType && <div className="repeat-entry"><span>{houseEntries.length} saved propert{houseEntries.length === 1 ? "y" : "ies"}</span><button onClick={() => { setHouseEntries(v => [...v, { type: propertyType, rent: rentReceived, municipalTax, interest: houseInterest, netRent }]); setPropertyType(""); setRentReceived(0); setMunicipalTax(0); setHouseInterest(0); }}>＋ Add More House Property Income</button></div>}
          {active === "capital" && capitalSection && capitalTerm && <div className="repeat-entry"><span>{capitalEntries.length} saved capital-gain entr{capitalEntries.length === 1 ? "y" : "ies"}</span><button onClick={() => { setCapitalEntries(v => [...v, { term: capitalTerm, section: capitalSection, saleValue, transferExpenses, netConsideration, cost: capitalCost, indexedCost, gain: capitalGain }]); setCapitalTerm(""); setCapitalSection(""); setSaleValue(0); setTransferExpenses(0); setCapitalCost(0); setIndexedCost(0); }}>＋ Add More Capital Gain</button></div>}
          {active === "presumptive" && <div className="offered-income-panel">{presumptiveEntries.map((entry, index) => { const minimum = entry.section === "44AD" ? entry.businessReceipts * .08 : entry.section === "44ADA" ? entry.professionalReceipts * .50 : entry.section === "both" ? entry.businessReceipts * .08 + entry.professionalReceipts * .50 : 0; return entry.section !== "44AE" && <div key={`offered-${index}`}><Field label={`Income Offered — Presumptive Income ${index + 1}`} value={entry.offeredIncome} onChange={(n) => updatePresumptiveEntry(index, { offeredIncome: n })} hint="You may offer income above the minimum presumptive income" />{entry.offeredIncome < minimum && <p className="validation-error">Income offered cannot be lower than {money.format(minimum)}.</p>}</div>})}{presumptiveSection && presumptiveSection !== "44AE" && <><div className="minimum-income"><span>Minimum Presumptive Income</span><b>{money.format(minimumPresumptiveIncome)}</b></div><div><Field label="Income Offered" value={offeredPresumptiveIncome} onChange={setOfferedPresumptiveIncome} hint="Enter the income you wish to offer" />{offeredPresumptiveIncome < minimumPresumptiveIncome && <p className="validation-error">Income offered cannot be lower than {money.format(minimumPresumptiveIncome)}.</p>}</div></>}</div>}
          {active === "presumptive" && presumptiveSection && <div className="repeat-entry"><span>{presumptiveEntries.length} saved presumptive entr{presumptiveEntries.length === 1 ? "y" : "ies"}</span><button onClick={() => { setPresumptiveEntries(v => [...v, { section: presumptiveSection, businessReceipts, professionalReceipts, vehicleIncome, offeredIncome: offeredPresumptiveIncome, income: presumptiveIncome }]); setPresumptiveSection(""); setBusinessReceipts(0); setProfessionalReceipts(0); setVehicleIncome(0); setOfferedPresumptiveIncome(0); }}>＋ Add More Presumptive Income</button></div>}
          {active === "salary" && <div className="deduction-strip"><span>✓</span><div><strong>Standard Deduction Applied</strong><small>{money.format(draftStandardDeduction)} automatically considered under the {regime} regime.</small></div><b>{money.format(draftStandardDeduction)}</b></div>}
          <div className="entry-total"><span>{active === "salary" ? "Income from Salary & Pension" : active === "house" ? "Income from House Property" : active === "capital" ? "Income from Capital Gains" : `Income from ${current.title}`}</span><strong>{money.format(active === "salary" ? Math.max(0, values.salary - draftStandardDeduction) : values[current.key])}</strong></div>
          <div className="entry-footer"><button className="text-button" onClick={() => { if (current.key === "house") { setRentReceived(0); setMunicipalTax(0); setHouseInterest(0); } else if (current.key === "capital") { setSaleValue(0); setTransferExpenses(0); setCapitalCost(0); setIndexedCost(0); } else setValue(current.key, 0); }}>Clear Details</button><button className="button primary" onClick={goNextHead}>Next <span>→</span></button></div>
        </section> : <section className="entry-card utility-entry">
          <div className="entry-head"><span className="large-icon">{utilityHeads.find(h => h.key === active)?.icon}</span><div><p>Computation Details</p><h2>{utilityHeads.find(h => h.key === active)?.title}</h2><small>{utilityHeads.find(h => h.key === active)?.note}</small></div></div>
          {active === "deductions" && <><p className="utility-note">{regime === "new" ? "Only deductions available under the new regime are displayed." : "Enter each eligible Chapter VI-A deduction separately."}</p><div className="form-grid"><Field label="80CCD(2) — Employer NPS Contribution" value={npsEmployer} onChange={setNpsEmployer} /><Field label="80CCH — Agniveer Corpus Fund" value={agniveer} onChange={setAgniveer} />{regime === "old" && <><Field label="Section 80C" value={deduction80C} onChange={setDeduction80C} hint="Eligible investments and payments" /><Field label="Section 80D" value={deduction80D} onChange={setDeduction80D} hint="Eligible health insurance and medical payments" /><Field label="Section 80TTA / 80TTB" value={deductionInterest} onChange={setDeductionInterest} hint="Applicable deduction on eligible interest income" /></>}</div>{regime === "old" && <div className="other-deductions"><h3>Other Deductions</h3>{otherDeductions.map((entry, index) => <div className="other-deduction-row" key={`deduction-${index}`}><input value={entry.section} onChange={(e) => setOtherDeductions(items => items.map((item, i) => i === index ? { ...item, section: e.target.value } : item))} aria-label={`Deduction section ${index + 1}`} /><Field label="Deduction Amount" value={entry.amount} onChange={(n) => setOtherDeductions(items => items.map((item, i) => i === index ? { ...item, amount: n } : item))} /></div>)}<div className="other-deduction-row"><div><select value={otherDeductionSection} onChange={(e) => setOtherDeductionSection(e.target.value)}><option value="">Select Section</option><option value="80E">Section 80E</option><option value="80G">Section 80G</option><option value="80GG">Section 80GG</option><option value="80U">Section 80U</option><option value="other">Write Other Section</option></select>{otherDeductionSection === "other" && <input value={customDeductionSection} onChange={(e) => setCustomDeductionSection(e.target.value)} placeholder="Enter section, e.g. 80DD" />}</div><Field label="Deduction Amount" value={otherDeductionAmount} onChange={setOtherDeductionAmount} /></div><button className="add-deduction" disabled={!otherDeductionAmount || !(otherDeductionSection === "other" ? customDeductionSection : otherDeductionSection)} onClick={() => { setOtherDeductions(items => [...items, { section: otherDeductionSection === "other" ? customDeductionSection : otherDeductionSection, amount: otherDeductionAmount }]); setOtherDeductionSection(""); setCustomDeductionSection(""); setOtherDeductionAmount(0); }}>＋ Add More Deduction</button></div>}</>}
          {active === "tdsTcs" && <div className="form-grid"><Field label="TDS on Salary" value={tdsSalary} onChange={setTdsSalary} /><Field label="TDS Other Than Salary" value={tdsOther} onChange={setTdsOther} /><Field label="Tax Collected at Source (TCS)" value={tcs} onChange={setTcs} /></div>}
          {active === "advanceTax" && <><p className="utility-note">Enter advance-tax payments quarter-wise as per the statutory instalment dates.</p><div className="form-grid"><Field label="Q1 — Paid up to 15 June" value={advanceQ1} onChange={setAdvanceQ1} /><Field label="Q2 — Paid from 16 June to 15 September" value={advanceQ2} onChange={setAdvanceQ2} /><Field label="Q3 — Paid from 16 September to 15 December" value={advanceQ3} onChange={setAdvanceQ3} /><Field label="Q4 — Paid from 16 December to 15 March" value={advanceQ4} onChange={setAdvanceQ4} /></div></>}
          {active === "selfAssessment" && <div className="form-grid"><Field label="Self-assessment tax paid" value={selfAssessmentTax} onChange={setSelfAssessmentTax} hint="Enter tax paid before filing the return" /></div>}
          {active === "interestFee" && <div className="interest-workings"><label className="filing-date"><span>Date of Filing</span><input type="date" value={filingDate} onChange={(e) => { setFilingDate(e.target.value); setStatementDate(e.target.value); }} /></label><p className="utility-note">The following workings are calculated automatically from the saved computation and tax-payment details. Final amounts remain editable below.</p><div className="interest-detail-schedule">
            <section className="working-card"><div className="working-card-head"><div><strong>Interest u/s 234A</strong><small>Delay in furnishing return of income</small></div><b>{money.format(suggested234A)}</b></div><div className="working-line"><span>Tax including surcharge and cess</span><b>{money.format(taxBeforeInterest)}</b></div><div className="working-line less"><span>Less: TDS / TCS</span><b>− {money.format(committedTaxData.tds + committedTaxData.tcs)}</b></div><div className="working-line less"><span>Less: Advance Tax / Self-Assessment Tax</span><b>− {money.format(committedTaxData.advanceTax + committedTaxData.selfAssessmentTax)}</b></div><div className="working-line"><span>Outstanding tax rounded down to nearest ₹100</span><b>{money.format(interest234ABase)}</b></div><div className="formula-line"><span>{money.format(interest234ABase)} × 1% × {delayedMonths} month(s) of delay</span><b>{money.format(suggested234A)}</b></div></section>
            <section className="working-card"><div className="working-card-head"><div><strong>Interest u/s 234B</strong><small>Shortfall in payment of advance tax</small></div><b>{money.format(suggested234B)}</b></div><div className="working-line"><span>Assessed tax after TDS / TCS</span><b>{money.format(assessedTax)}</b></div><div className="working-line"><span>90% of assessed tax - minimum advance tax required</span><b>{money.format(assessedTax * .90)}</b></div><div className="working-line less"><span>Advance tax paid</span><b>− {money.format(committedTaxData.advanceTax)}</b></div><div className="working-line"><span>Shortfall rounded down to nearest ₹100</span><b>{money.format(interest234BBase)}</b></div><div className="formula-line"><span>{money.format(interest234BBase)} × 1% × {interest234BBase > 0 ? monthsFromApril : 0} month(s)</span><b>{money.format(suggested234B)}</b></div></section>
            <section className="working-card"><div className="working-card-head"><div><strong>Interest u/s 234C</strong><small>Deferment of advance-tax instalments</small></div><b>{money.format(suggested234C)}</b></div><div className="working-assumption"><strong>Last-quarter income assumption</strong><span>Capital gains and dividend income are assumed to arise in the final quarter. Attributable tax of {money.format(lastQuarterIncomeTax)} is included only in the March target.</span></div><div className="working-grid interest-c-grid working-grid-head"><span>Instalment</span><span>Required / Paid</span><span>Shortfall</span><span>Interest</span></div>{interest234CWorking.map((row, index) => <div className="working-grid interest-c-grid" key={`entry-interest-234c-${index}`}><span>{row.label}<small>{row.percent}% cumulative target; {row.months} month(s) at 1% p.m.</small></span><span>{money.format(row.required)} / {money.format(row.paid)}</span><b>{money.format(row.shortfall)}</b><b>{money.format(row.interest)}</b></div>)}<div className="working-total"><span>Total Interest u/s 234C</span><b>{money.format(suggested234C)}</b></div></section>
            <section className="working-card"><div className="working-card-head"><div><strong>Fee u/s 234F</strong><small>Fee for delay in furnishing return</small></div><b>{money.format(suggested234F)}</b></div><div className="formula-line"><span>{delayedMonths ? `Return filed after the due date; fee based on total income of ${money.format(taxable)}` : "Return filed within the due date - no fee applicable"}</span><b>{money.format(suggested234F)}</b></div></section>
          </div><h3>Final Amounts</h3><div className="form-grid"><Field label="Interest u/s 234A" value={suggested234A} onChange={setInterest234A} /><Field label="Interest u/s 234B" value={suggested234B} onChange={setInterest234B} /><Field label="Interest u/s 234C" value={suggested234C} onChange={setInterest234C} /><Field label="Fee u/s 234F" value={suggested234F} onChange={setFee234F} /></div></div>}
          {active === "taxCalculation" && <div className="tax-detail-panel"><div className="tax-subhead"><span>Normal Income — Slab-Wise Calculation</span><b>{money.format(normalIncome)}</b></div>{slabBreakdown.map((row, index) => <div key={index}><span>{row.to === Infinity ? `Above ${money.format(row.from)}` : `${money.format(row.from)} – ${money.format(row.to)}`} @ {(row.rate * 100).toFixed(0)}%</span><b>{money.format(row.amount)}</b></div>)}<div><span>Tax on Normal Income</span><b>{money.format(grossNormalTax)}</b></div>{specialIncome > 0 && <><div className="tax-subhead"><span>Special Income — {capitalSection === "111A" ? "Section 111A" : capitalSection === "112A" ? "Section 112A" : "Section 112"}</span><b>{money.format(specialIncome)}</b></div>{specialBeneficialExemptionAdjustment > 0 && <div className="less"><span>Less: Basic exemption limit shortfall adjusted for maximum tax benefit</span><b>− {money.format(specialBeneficialExemptionAdjustment)}</b></div>}<div><span>Tax on Special Income</span><b>{money.format(specialRateTax)}</b></div></>}{rebate87A > 0 && <div className="less"><span>Less: Rebate u/s 87A</span><b>− {money.format(rebate87A)}</b></div>}<div><span>Gross Tax Liability</span><b>{money.format(grossTaxLiability)}</b></div>{surcharge > 0 && <div><span>Surcharge</span><b>{money.format(surcharge)}</b></div>}<div><span>Health &amp; Education Cess</span><b>{money.format(cess)}</b></div><div className="total"><span>Total Tax Liability</span><b>{money.format(totalTaxLiability)}</b></div></div>}
          <div className="entry-total"><span>{active === "taxCalculation" ? "Total Tax Liability" : "Total Entered"}</span><strong>{money.format(active === "deductions" ? draftChapterVIA : active === "tdsTcs" ? tds + tcs : active === "advanceTax" ? advanceTax : active === "selfAssessment" ? selfAssessmentTax : active === "interestFee" ? liveTotalInterest + suggested234F : totalTaxLiability)}</strong></div><div className="entry-footer utility-save-footer"><span>{active === "taxCalculation" ? "Review the detailed calculation before opening the computation." : "This section is saved automatically."}</span>{active === "taxCalculation" ? <div className="tax-calculation-actions">{netBalance > 0 && <a className="pay-tax-button" href="https://www.incometax.gov.in/iec/foportal/" target="_blank" rel="noreferrer">Pay Tax <span>↗</span></a>}<button className="button primary" onClick={() => { setShowReview(true); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50); }}>View Computation <span>→</span></button></div> : <button className="button primary" onClick={goNextHead}>Next <span>→</span></button>}</div>
        </section>}

        <aside className="summary-card">
          <div className="summary-head"><div><p>Live Summary</p><h2>Your Tax Estimate</h2></div><span>● Updated now</span></div>
          <div className="income-total"><span>GROSS TOTAL INCOME</span><strong>{money.format(total)}</strong><small>Across {Object.values(committedValues).filter(Boolean).length} saved income sources</small></div>
          <div className="summary-lines"><div><span>Chapter VI-A Deductions</span><b>− {money.format(chapterVIA)}</b></div><div className="taxable"><span>Taxable Income</span><b>{money.format(taxable)}</b></div><div><span>Income Tax</span><b>{money.format(tax)}</b></div><div><span>Health &amp; Education Cess</span><b>{money.format(cess)}</b></div></div>
          <div className="tax-paid-summary"><span>Tax Paid</span><strong>{money.format(committedTaxData.tds + committedTaxData.tcs + committedTaxData.advanceTax + committedTaxData.selfAssessmentTax)}</strong><small>TDS {money.format(committedTaxData.tds)} · TCS {money.format(committedTaxData.tcs)} · Advance Tax {money.format(committedTaxData.advanceTax)} · Self-Assessment Tax {money.format(committedTaxData.selfAssessmentTax)}</small></div>
          <div className={`payable ${netBalance > 0 ? "tax-payable" : "tax-refundable"}`}><span>ESTIMATED TAX {netBalance > 0 ? "PAYABLE" : "REFUNDABLE"}</span><strong>{money.format(Math.abs(roundedNetBalance))}</strong><small>Rounded off to nearest ₹10 as per section 288B</small></div>
          <div className="insight"><span>↘</span><p><strong>Smart insight</strong>Your effective tax rate is {total ? ((tax + cess) / total * 100).toFixed(1) : "0.0"}%. The new regime is currently selected.</p></div>
          <p className="disclaimer">Indicative estimate for planning. Final liability may vary based on special-rate income, surcharge, marginal relief and filing rules.</p>
        </aside>
      </div>
      </>}

      {showReview && <section id="computation-review" className="income-summary review-reveal" aria-labelledby="income-summary-title">
        <div className="statement-head">
          <div className="statement-brand"><span>TP</span><div><strong>TaxPro CA Suite</strong><small>Professional Tax Workspace</small></div></div>
          <div className="statement-title"><p>Computation Statement</p><h2 id="income-summary-title">INCOME TAX COMPUTATION</h2></div>
          <span className="summary-status">✓ Auto-updated</span>
        </div>
        <div className="statement-subheading client-information-heading"><div><strong>CLIENT INFORMATION</strong><small>Taxpayer and filing particulars</small></div></div>
        <div className="client-statement-grid">
          <div><span>Financial Year</span><strong>2025–26</strong></div>
          <div><span>Client Name</span><strong>{personal.name || "—"}</strong></div>
          <div><span>PAN Number</span><strong>{personal.pan || "—"}</strong></div>
          <div><span>Date of Birth</span><strong>{formatDate(personal.dob)}</strong></div>
          <div><span>Mobile Number</span><strong>{personal.mobile ? `+91 ${personal.mobile}` : "—"}</strong></div>
          <div><span>Email ID</span><strong>{personal.email || "—"}</strong></div>
          <div className="filing-row-start"><span>Tax Regime</span><strong>{regime === "new" ? "New Regime" : "Old Regime"}</strong></div>
          <div><span>ITR FORM</span><strong>{itr}</strong></div>
          <div><span>Return Type</span><strong>{returnType}</strong></div>
        </div>
        <div className="statement-subheading computation-heading"><div><strong>COMPUTATION OF TOTAL INCOME</strong><small>Income, deductions and tax liability</small></div></div>
        <div className="income-summary-table computation-table statement-table">
          <div className="income-summary-row heading"><span>Particulars</span><span>Amount</span></div>
          <div className="computation-section-title"><span>01</span> Income Details</div>
          {salaryIncome > 0 && <div className="income-head-group"><div className="computation-row source-main"><span>Salary &amp; Pension</span><b>{money.format(salaryIncome)}</b></div><div className="computation-row source-subrow"><span>Gross Salary &amp; Pension</span><b>{money.format(committedValues.salary)}</b></div><div className="computation-row source-subrow less"><span>Less: Standard Deduction</span><b>− {money.format(standardDeduction)}</b></div></div>}
          {committedValues.house !== 0 && <div className="income-head-group"><div className="computation-row source-main"><span>House Property</span><b>{money.format(houseIncomeForComputation)}</b></div>{summaryHouseEntries.map((entry, index) => <div className="computation-row source-subrow" key={`summary-house-${index}`}><span>Property {index + 1} — {entry.type === "self" ? "Interest on House Loan (Self Occupied)" : entry.type === "let" ? "Income from Let Out Property" : "Income from Deemed Let Out Property"}</span><b>{money.format(entry.netRent)}</b></div>)}{committedValues.house !== houseIncomeForComputation && <div className="computation-row source-subrow less"><span>{regime === "new" ? "House property loss not set off under section 115BAC" : "House property loss restricted for set-off"}</span><b>{money.format(houseIncomeForComputation - committedValues.house)}</b></div>}</div>}
          {committedValues.business + committedValues.presumptive !== 0 && <div className="income-head-group"><div className="computation-row source-main"><span>Profits and Gains from Business or Profession</span><b>{money.format(committedValues.business + committedValues.presumptive)}</b></div>{committedValues.business !== 0 && <div className="computation-row source-subrow"><span>Business Income under Regular Provisions</span><b>{money.format(committedValues.business)}</b></div>}{presumptive44AD !== 0 && <><div className="computation-row source-subrow"><span>Turnover u/s 44AD</span><b>{money.format(turnover44AD)}</b></div><div className="computation-row source-subrow"><span>Presumptive Business Income u/s 44AD</span><b>{money.format(presumptive44AD)}</b></div></>}{presumptive44ADA !== 0 && <><div className="computation-row source-subrow"><span>Gross Receipts u/s 44ADA</span><b>{money.format(receipts44ADA)}</b></div><div className="computation-row source-subrow"><span>Presumptive Professional Income u/s 44ADA</span><b>{money.format(presumptive44ADA)}</b></div></>}{presumptive44AE !== 0 && <div className="computation-row source-subrow"><span>Presumptive Income from Goods Carriages u/s 44AE</span><b>{money.format(presumptive44AE)}</b></div>}{presumptiveBoth !== 0 && <><div className="computation-row source-subrow"><span>Turnover u/s 44AD</span><b>{money.format(turnoverBoth)}</b></div><div className="computation-row source-subrow"><span>Gross Receipts u/s 44ADA</span><b>{money.format(receiptsBoth)}</b></div><div className="computation-row source-subrow"><span>Presumptive Income u/s 44AD and 44ADA</span><b>{money.format(presumptiveBoth)}</b></div></>}{committedValues.presumptive !== 0 && presumptive44AD === 0 && presumptive44ADA === 0 && presumptive44AE === 0 && presumptiveBoth === 0 && <div className="computation-row source-subrow"><span>Presumptive Income</span><b>{money.format(committedValues.presumptive)}</b></div>}</div>}
          {committedValues.capital !== 0 && <div className="income-head-group"><div className="computation-row source-main"><span>Capital Gains</span><b>{money.format(committedValues.capital)}</b></div>{capitalRowsForSection("111A", `Short-Term Capital ${stcg111A < 0 ? "Loss" : "Gain"} u/s 111A`, stcg111A)}{capitalRowsForSection("stcgOther", `Short-Term Capital ${stcgOther < 0 ? "Loss" : "Gain"} Other Than u/s 111A`, stcgOther)}{capitalRowsForSection("112A", `Long-Term Capital ${ltcg112A < 0 ? "Loss" : "Gain"} u/s 112A`, ltcg112A)}{capitalRowsForSection("112", `Long-Term Capital ${ltcg112 < 0 ? "Loss" : "Gain"} u/s 112`, ltcg112)}{stcg111A === 0 && stcgOther === 0 && ltcg112A === 0 && ltcg112 === 0 && <div className="computation-row source-subrow"><span>{shortTermCapitalGain !== 0 ? `Short-Term Capital ${shortTermCapitalGain < 0 ? "Loss" : "Gain"}` : `Long-Term Capital ${longTermCapitalGain < 0 ? "Loss" : "Gain"}`}</span><b>{money.format(shortTermCapitalGain || longTermCapitalGain)}</b></div>}</div>}
          {committedValues.other > 0 && <div className="income-head-group"><div className="computation-row source-main"><span>Other Sources</span><b>{money.format(committedValues.other)}</b></div>{interestIncome > 0 && <div className="computation-row source-subrow"><span>Interest from Savings Bank</span><b>{money.format(interestIncome)}</b></div>}{depositInterest > 0 && <div className="computation-row source-subrow"><span>Interest from Deposit</span><b>{money.format(depositInterest)}</b></div>}{dividendIncome > 0 && <div className="computation-row source-subrow"><span>Dividend Income</span><b>{money.format(dividendIncome)}</b></div>}{otherIncome > 0 && <div className="computation-row source-subrow"><span>Any Other Income{otherDescription.trim() ? ` — ${otherDescription.trim()}` : ""}</span><b>{money.format(otherIncome)}</b></div>}</div>}
          <div className="computation-row subtotal income-total-row"><span>Gross Total Income</span><b>{money.format(grossTotalIncome)}</b></div>
          {(regime === "old" || chapterVIA > 0) && <div className="computation-row less"><span>Deduction under Chapter VI-A</span><b>− {money.format(chapterVIA)}</b></div>}
          <div className="computation-row major income-total-row"><span>Total Income</span><b>{money.format(taxable)}</b></div>
          <div className="income-classification"><div><span>NORMAL INCOME</span><strong>{money.format(normalIncome)}</strong></div><div><span>SPECIAL INCOME</span><strong>{money.format(specialIncome)}</strong></div></div>

          <div className="computation-section-title"><span>02</span> Tax Calculation</div>
          <div className="computation-row"><span>Tax on Normal Income</span><b>{money.format(grossNormalTax)}</b></div>
          <div className="computation-row"><span>Tax on Special Income</span><b>{money.format(specialRateTax)}</b></div>
          <div className="computation-row major tax-milestone"><span>Gross Tax Liability</span><b>{money.format(grossTaxBeforeRebate)}</b></div>
          {rebate87A > 0 && <div className="computation-row less rebate-row"><span>Less: Rebate u/s 87A</span><b>− {money.format(rebate87A)}</b></div>}
          {rebate87A > 0 && <div className="computation-row major"><span>Tax after Rebate</span><b>{money.format(taxAfterRebate)}</b></div>}
          {surcharge > 0 && <><div className="computation-row"><span>Add: Surcharge</span><b>{money.format(surcharge)}</b></div><div className="computation-row major"><span>Total Tax</span><b>{money.format(totalTaxAfterSurcharge)}</b></div></>}
          <div className="computation-row"><span>Add: Education Cess</span><b>{money.format(cess)}</b></div>
          <div className="computation-row major tax-milestone"><span>Tax Before TDS</span><b>{money.format(summaryTaxBeforeTds)}</b></div>
          <div className="computation-row less"><span>Less: TDS / TCS</span><b>− {money.format(committedTaxData.tds + committedTaxData.tcs)}</b></div>
          <div className="computation-row major tax-milestone"><span>Tax Before Advance Tax</span><b>{money.format(summaryTaxBeforeAdvance)}</b></div>
          <div className="computation-row less"><span>Less: Advance Tax / Self-Assessment Tax</span><b>− {money.format(committedTaxData.advanceTax + committedTaxData.selfAssessmentTax)}</b></div>
          <div className="computation-row major tax-milestone"><span>Tax Before Interest</span><b>{money.format(summaryTaxBeforeInterest)}</b></div>
          {suggested234A > 0 && <div className="computation-row"><span>Add: Interest u/s 234A</span><b>{money.format(suggested234A)}</b></div>}
          {suggested234B > 0 && <div className="computation-row"><span>Add: Interest u/s 234B</span><b>{money.format(suggested234B)}</b></div>}
          {suggested234C > 0 && <div className="computation-row"><span>Add: Interest u/s 234C</span><b>{money.format(suggested234C)}</b></div>}
          {suggested234F > 0 && <div className="computation-row"><span>Add: Fee u/s 234F</span><b>{money.format(suggested234F)}</b></div>}
          <div className="computation-row major"><span>Net Tax {netBalance > 0 ? "Payable" : "Refundable"} Before Round Off</span><b>{money.format(Math.abs(netBalance))}</b></div>
          <div className="computation-row round-off-row"><span>Round off u/s 288B</span><b>{money.format(roundOffAdjustment)}</b></div>
          <div className={`computation-result ${netBalance <= 0 ? "refund" : "payable-result"}`}><span>NET TAX {netBalance > 0 ? "PAYABLE" : "REFUNDABLE"}</span><b>{money.format(Math.abs(roundedNetBalance))}</b></div>{netBalance > 0 && <div className="summary-pay-action"><a className="pay-tax-button" href="https://www.incometax.gov.in/iec/foportal/" target="_blank" rel="noreferrer">Pay Tax on Income Tax Portal <span>↗</span></a><small>Opens the official Income Tax Department e-Pay Tax service.</small></div>}
        </div>
        <div className="tax-working">
          <div className="computation-section-title tax-working-title"><span>03</span> Tax Working</div>
          <p className="tax-working-intro">Detailed working of tax, interest and payment adjustments forming part of this computation.</p>

          <section className="working-card">
            <div className="working-card-head"><div><strong>Tax on Normal Income</strong><small>{regime === "new" ? "New tax regime under section 115BAC" : "Old tax regime"} - slab-wise working</small></div><b>{money.format(grossNormalTax)}</b></div>
            <div className="working-grid working-grid-head"><span>Income Slab</span><span>Amount in Slab</span><span>Rate</span><span>Tax</span></div>
            {slabBreakdown.map((row, index) => <div className="working-grid" key={`slab-working-${index}`}><span>{row.to === Infinity ? `Above ${money.format(row.from)}` : row.from === 0 ? `Up to ${money.format(row.to)}` : `${money.format(row.from)} to ${money.format(row.to)}`}</span><b>{money.format(row.taxableAmount)}</b><span>{Math.round(row.rate * 100)}%</span><b>{money.format(row.amount)}</b></div>)}
            <div className="working-total"><span>Tax on Normal Income before Rebate</span><b>{money.format(grossNormalTax)}</b></div>
            {rebate87A > 0 && <div className="working-note"><span>Less: Rebate u/s 87A</span><b>− {money.format(rebate87A)}</b></div>}
          </section>

          <section className="working-card">
            <div className="working-card-head"><div><strong>Tax on Special Income</strong><small>Income-wise special-rate working</small></div><b>{money.format(specialRateTax)}</b></div>
            {specialTaxWorking.length > 0 ? <><div className="working-grid special-working-grid working-grid-head"><span>Nature of Income</span><span>Taxable Base</span><span>Rate</span><span>Tax</span></div>{specialTaxWorking.map((row, index) => { const taxableBase = Math.max(0, row.income - row.exemption - row.threshold); return <div className="working-grid special-working-grid" key={`special-working-${index}`}><span>{row.label}{row.exemption > 0 && <small>Income {money.format(row.income)} less basic exemption adjustment {money.format(row.exemption)}</small>}{row.threshold > 0 && <small>Less threshold under section 112A {money.format(row.threshold)}</small>}</span><b>{money.format(taxableBase)}</b><span>{row.rate * 100}%</span><b>{money.format(row.tax)}</b></div>})}<div className="working-total"><span>Tax on Special Income</span><b>{money.format(specialRateTax)}</b></div></> : <div className="working-empty">No income chargeable at a special rate.</div>}
          </section>

          {suggested234A > 0 && <section className="working-card interest-working-card">
            <div className="working-card-head"><div><strong>Interest u/s 234A</strong><small>Delay in furnishing return of income</small></div><b>{money.format(suggested234A)}</b></div><div className="formula-line"><span>Outstanding tax {money.format(interest234ABase)} × 1% × {delayedMonths} month(s)</span><b>{money.format(suggested234A)}</b></div><div className="working-note"><span>Amount adopted in computation</span><b>{money.format(suggested234A)}</b></div>
          </section>}

          {suggested234B > 0 && <section className="working-card interest-working-card">
            <div className="working-card-head"><div><strong>Interest u/s 234B</strong><small>Shortfall in payment of advance tax</small></div><b>{money.format(suggested234B)}</b></div><div className="working-line"><span>Assessed tax after TDS / TCS</span><b>{money.format(assessedTax)}</b></div><div className="working-line"><span>90% of assessed tax - minimum advance tax required</span><b>{money.format(assessedTax * .90)}</b></div><div className="working-line less"><span>Advance tax paid</span><b>− {money.format(committedTaxData.advanceTax)}</b></div><div className="working-line"><span>Shortfall rounded down to nearest ₹100</span><b>{money.format(interest234BBase)}</b></div><div className="formula-line"><span>{money.format(interest234BBase)} × 1% × {interest234BBase > 0 ? monthsFromApril : 0} month(s)</span><b>{money.format(suggested234B)}</b></div><div className="working-note"><span>Amount adopted in computation</span><b>{money.format(suggested234B)}</b></div>
          </section>}

          {suggested234C > 0 && <section className="working-card interest-working-card">
            <div className="working-card-head"><div><strong>Interest u/s 234C</strong><small>Deferment of advance-tax instalments</small></div><b>{money.format(suggested234C)}</b></div><div className="working-assumption"><strong>Last-quarter income assumption</strong><span>Capital gains and dividend income are assumed to arise in the final quarter. Tax attributable to such income ({money.format(lastQuarterIncomeTax)}) is excluded from the June, September and December targets and included in the March target.</span></div><div className="working-line"><span>Assessed tax for first three instalments</span><b>{money.format(regularAssessedTax)}</b></div><div className="working-line"><span>Add: Tax attributable to last-quarter income in March</span><b>{money.format(lastQuarterIncomeTax)}</b></div><div className="working-grid interest-c-grid working-grid-head"><span>Instalment</span><span>Required / Paid</span><span>Shortfall</span><span>Interest</span></div>{interest234CWorking.map((row, index) => <div className="working-grid interest-c-grid" key={`interest-234c-${index}`}><span>{row.label}<small>{row.percent}% cumulative target; {row.months} month(s) at 1% p.m.</small></span><span>{money.format(row.required)} / {money.format(row.paid)}</span><b>{money.format(row.shortfall)}</b><b>{money.format(row.interest)}</b></div>)}<div className="working-total"><span>Interest u/s 234C calculated</span><b>{money.format(suggested234C)}</b></div><div className="working-note"><span>Amount adopted in computation</span><b>{money.format(suggested234C)}</b></div>
          </section>}
        </div>
        <div className="statement-signoff">
          <label><span>Date of Filing</span><input type="date" value={statementDate} onChange={(e) => { setStatementDate(e.target.value); setFilingDate(e.target.value); }} /></label>
        </div>
        <div className="income-summary-footer"><p><span>i</span>This A4 computation statement contains only saved section data.</p></div>
      </section>}
          {showNewConfirm && <div className="confirm-overlay" role="presentation" onMouseDown={() => setShowNewConfirm(false)}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="new-title" onMouseDown={(e) => e.stopPropagation()}><div className="confirm-icon">＋</div><h2 id="new-title">Create New Computation?</h2><p>Are you sure you want to create a new computation? All unsaved information will be reset to NIL.</p><div><button className="button secondary" onClick={() => setShowNewConfirm(false)}>No</button><button className="button primary" onClick={() => { resetComputation(); setSavedHeads([]); setCommittedValues({ salary:0, house:0, capital:0, business:0, presumptive:0, other:0 }); setCommittedTaxData({ chapterVIA:0, tds:0, tcs:0, advanceTax:0, selfAssessmentTax:0, interest234A:0, interest234B:0, interest234C:0, fee234F:0, capitalSection:"" }); }}>Yes, Create New</button></div></section></div>}
      {showPortalImport && <div className="confirm-overlay" role="presentation" onMouseDown={() => setShowPortalImport(false)}><section className="portal-import-dialog" role="dialog" aria-modal="true" aria-labelledby="portal-import-title" onMouseDown={(e) => e.stopPropagation()}><div className="portal-dialog-head"><span>IT</span><div><h2 id="portal-import-title">Import from Income Tax Portal</h2><p>Select the information you want to authorise and import.</p></div></div><label className="portal-user-id"><span>Income Tax User ID / PAN</span><input value={portalUserId} onChange={(e) => setPortalUserId(e.target.value.toUpperCase())} placeholder="Enter PAN or portal user ID" autoComplete="username" /></label><fieldset><legend>What do you want to import?</legend><label><input type="checkbox" checked={portalScopes.personal} onChange={(e) => setPortalScopes(scopes => ({ ...scopes, personal: e.target.checked }))} /><span><b>Personal Information</b><small>Name, PAN, date of birth, contact and address</small></span></label><label><input type="checkbox" checked={portalScopes.form26as} onChange={(e) => setPortalScopes(scopes => ({ ...scopes, form26as: e.target.checked }))} /><span><b>Form 26AS</b><small>TDS, TCS and tax-payment information</small></span></label><label><input type="checkbox" checked={portalScopes.aisTis} onChange={(e) => setPortalScopes(scopes => ({ ...scopes, aisTis: e.target.checked }))} /><span><b>AIS / TIS</b><small>Reported interest, dividend, securities and other information</small></span></label><button type="button" className="select-all-scopes" onClick={() => setPortalScopes({ personal:true, form26as:true, aisTis:true })}>Select All</button></fieldset><div className="secure-auth-note"><b>Password is entered only on the official portal.</b><span>TaxPro does not request, see or store your Income Tax Portal password. Automatic retrieval requires registered ERI credentials and taxpayer consent/OTP.</span></div><div className="portal-dialog-actions"><button className="button secondary" onClick={() => setShowPortalImport(false)}>Cancel</button><a className={`button primary ${!portalUserId || !Object.values(portalScopes).some(Boolean) ? "disabled" : ""}`} href="https://www.incometax.gov.in/iec/foportal/" target="_blank" rel="noreferrer" aria-disabled={!portalUserId || !Object.values(portalScopes).some(Boolean)} onClick={(e) => { if (!portalUserId || !Object.values(portalScopes).some(Boolean)) e.preventDefault(); }}>Continue to Secure Login <span>↗</span></a></div></section></div>}
      {importSuccess && <div className="import-success" role="status"><span>✓</span><div><strong>PDF file successfully imported</strong><small>All saved computation data has been restored.</small></div></div>}
    </main>
  );
}
