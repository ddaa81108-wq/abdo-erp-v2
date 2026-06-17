import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { 
  Landmark, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldAlert, 
  Sparkles, 
  Scale, 
  RefreshCw, 
  Search, 
  Users, 
  Calendar, 
  Coins, 
  ArrowRightLeft, 
  TrendingUp, 
  FileText, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  TrendingDown,
  Info,
  Camera,
  Save,
  Download
} from 'lucide-react';
import { ERPState, TreasuryTransaction, SafeAudit } from '../types';

interface TreasuryModuleProps {
  state: ERPState;
  onUpdateState: (newState: ERPState) => void;
  onOpenExporter: (section: string, metrics: any, headers: string[], rows: any[][]) => void;
}

export default function TreasuryModule({ state, onUpdateState, onOpenExporter }: TreasuryModuleProps) {
  // Tabs: 'journal' (دفتر اليومية), 'audit' (رقابة وجرد الفروقات)
  const [activeTab, setActiveTab] = useState<'journal' | 'audit'>('journal');
  const [filterQuery, setFilterQuery] = useState('');
  
  // Agents collection list
  const AGENTS = [
    'العم رجب',
    'أنس الفيتوري',
    'سالم الكاديكي',
    'رمزي الورفلي',
    'مفتاح العبيدي'
  ];
  const [selectedAgent, setSelectedAgent] = useState('بدون وكيل');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('الكل');

  // Date Picker for the dynamic daily rollover (طرح اليومية المتزامن)
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const adjusted = new Date(local.getTime() - (offset * 60 * 1000));
    return adjusted.toISOString().slice(0, 10);
  });

  // Manual transaction inputs
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState<'in' | 'out'>('in');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  // Settle category inputs
  const [settleCategory, setSettleCategory] = useState<'purchases' | 'deposits' | 'receivables' | 'companies' | 'merchants'>('purchases');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');

  // Egyptian currency conversion inputs (Preserved as requested)
  const [egyptAmount, setEgyptAmount] = useState('');
  const [exchangePrice, setExchangePrice] = useState('1.0'); // division exchange price
  const [egyptNote, setEgyptNote] = useState('تحويل نقدية فودافون كاش ومصري للخزينة');

  // Audit Inputs (كشف فرق الخزينة 💰)
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [auditNote, setAuditNote] = useState('');
  const [auditAuditor, setAuditAuditor] = useState('المدير عبدو');

  // -----------------------------------------------------------------
  // NEW: CUSTOM EGYPTIAN CASH AND MANUAL ENTRIES STATE
  // -----------------------------------------------------------------
  const [localEgyptRecord, setLocalEgyptRecord] = useState<{
    date: string;
    rows: { value: number; commission: number }[];
    previousValue: number;
    receivedValue: number;
    isPostedToTreasury?: boolean;
  } | null>(null);

  const [exportingFourRows, setExportingFourRows] = useState(false);
  const fourRowsRef = useRef<HTMLDivElement>(null);

  // Sync from prop state to local state on date / state updates
  useEffect(() => {
    const existing = state.egyptianCashRecords?.find(r => r.date === selectedDay);
    if (existing) {
      const rows = existing.rows.map(r => ({ ...r }));
      while (rows.length < 25) {
        rows.push({ value: 0, commission: 0 });
      }
      setLocalEgyptRecord({
        date: existing.date,
        rows,
        previousValue: existing.previousValue ?? 0,
        receivedValue: existing.receivedValue ?? 0,
        isPostedToTreasury: existing.isPostedToTreasury ?? false
      });
    } else {
      // Find the latest prior day's remainder to carry-over
      let autoPreviousValue = 0;
      if (state.egyptianCashRecords && state.egyptianCashRecords.length > 0) {
        const priorRecords = state.egyptianCashRecords
          .filter(r => r.date < selectedDay)
          .sort((a, b) => b.date.localeCompare(a.date));
        if (priorRecords.length > 0) {
          const lastRecord = priorRecords[0];
          const lastTableTotal = lastRecord.rows.reduce((sum, r) => sum + (Number(r.value) || 0) + (Number(r.commission) || 0), 0);
          const lastRemainder = (Number(lastRecord.previousValue) || 0) + (Number(lastRecord.receivedValue) || 0) - lastTableTotal;
          autoPreviousValue = Math.max(0, lastRemainder);
        }
      }
      const defaultRows = Array.from({ length: 25 }, () => ({ value: 0, commission: 0 }));
      setLocalEgyptRecord({
        date: selectedDay,
        rows: defaultRows,
        previousValue: autoPreviousValue,
        receivedValue: 0,
        isPostedToTreasury: false
      });
    }
  }, [state.egyptianCashRecords, selectedDay]);

  // Handle local EGP cell update
  const handleEgyptRowChange = (index: number, field: 'value' | 'commission', val: string) => {
    if (!localEgyptRecord) return;
    const numVal = parseFloat(val) || 0;
    const updatedRows = [...localEgyptRecord.rows];
    updatedRows[index] = {
      ...updatedRows[index],
      [field]: numVal
    };

    const newRec = {
      ...localEgyptRecord,
      rows: updatedRows
    };
    setLocalEgyptRecord(newRec);

    // Auto save on change
    const others = state.egyptianCashRecords?.filter(r => r.date !== selectedDay) || [];
    onUpdateState({
      ...state,
      egyptianCashRecords: [...others, newRec]
    });
  };

  const handleEgyptSummaryChange = (field: 'previousValue' | 'receivedValue', val: string) => {
    if (!localEgyptRecord) return;
    const numVal = parseFloat(val) || 0;
    const newRec = {
      ...localEgyptRecord,
      [field]: numVal
    };
    setLocalEgyptRecord(newRec);

    // Auto save on change
    const others = state.egyptianCashRecords?.filter(r => r.date !== selectedDay) || [];
    onUpdateState({
      ...state,
      egyptianCashRecords: [...others, newRec]
    });
  };

  // Explicit Save and confirmation trigger
  const handleSaveEgyptRecordExplicit = () => {
    if (!localEgyptRecord) return;
    const others = state.egyptianCashRecords?.filter(r => r.date !== selectedDay) || [];
    onUpdateState({
      ...state,
      egyptianCashRecords: [...others, localEgyptRecord]
    });
    alert('تم حفظ وتثبيت كشف الجنية المصري لليوم بنجاح! 💾');
  };

  // Helper to shift dates easily on the timeline
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + days);
    setSelectedDay(d.toISOString().slice(0, 10));
  };

  const generateReferenceNo = () => {
    const totalTxsCount = state.debtTransactions.length + state.companyTransactions.length + state.treasuryTransactions.length;
    const padding = String(totalTxsCount + 109).padStart(6, '0');
    return `TX-2026-${padding}`;
  };

  // Helper to format currency values as whole integers with no decimal points
  const formatMoney = (val: number, currency: string = 'د.ل') => {
    return `${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
  };

  // -----------------------------------------------------------------
  // DYNAMIC DAILY CALCULATIONS ("طرح يومي مكمل مع بعضه")
  // -----------------------------------------------------------------
  
  // 1. Expected Balance in real-time (Total lifetime safe capital)
  const totalLifetimeExpectedBalance = useMemo(() => {
    return state.treasuryTransactions.reduce((acc, curr) => {
      return curr.type === 'in' ? acc + curr.amount : acc - curr.amount;
    }, 0);
  }, [state.treasuryTransactions]);

  // 2. Transactions before selected date (opening balance historical sum)
  const openingBalance = useMemo(() => {
    return state.treasuryTransactions
      .filter(t => t.date.slice(0, 10) < selectedDay)
      .reduce((acc, curr) => {
        return curr.type === 'in' ? acc + curr.amount : acc - curr.amount;
      }, 0);
  }, [state.treasuryTransactions, selectedDay]);

  // 3. Transactions on selected date
  const selectedDayTxs = useMemo(() => {
    return state.treasuryTransactions.filter(t => t.date.slice(0, 10) === selectedDay);
  }, [state.treasuryTransactions, selectedDay]);

  // 4. Summarize today's inputs by department for the top cards:
  
  // A. Customer Debts Collected Today (وارد ديون العملاء)
  const collectedDebtsToday = useMemo(() => {
    return selectedDayTxs
      .filter(t => t.source === 'customer_payment')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayTxs]);

  // B. Escrows and trust deposits received today (وارد أمانات اليوم)
  const collectedDepositsToday = useMemo(() => {
    return selectedDayTxs
      .filter(t => t.source === 'deposit_escrow')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayTxs]);

  // C. Wholesale merchant receipts or other manual deposits today (وارد التجار والتسويات)
  const otherInputsToday = useMemo(() => {
    return selectedDayTxs
      .filter(t => t.type === 'in' && t.source !== 'customer_payment' && t.source !== 'deposit_escrow')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayTxs]);

  // D. Purchases / supplier payments spent today (مصروفات المشتريات والشركات بالسالب)
  const purchasesSpentToday = useMemo(() => {
    return selectedDayTxs
      .filter(t => t.type === 'out' && (t.source === 'purchase' || t.source === 'company_payment'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayTxs]);

  // E. Other outlays / manual withdrawals spent today (سحوبات ومصاريف إدارية أخرى بالسالب)
  const otherSpentToday = useMemo(() => {
    return selectedDayTxs
      .filter(t => t.type === 'out' && t.source !== 'purchase' && t.source !== 'company_payment')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayTxs]);

  // Total incoming and outgoing for selected day
  const dayInTotal = collectedDebtsToday + collectedDepositsToday + otherInputsToday;
  const dayOutTotal = purchasesSpentToday + otherSpentToday;
  const closingBalanceForDay = openingBalance + dayInTotal - dayOutTotal;

  // -----------------------------------------------------------------
  // PRESERVED EGYPTIAN CONVERSION FORM ACTIONS
  // -----------------------------------------------------------------
  const egAmountNum = parseFloat(egyptAmount) || 0;
  const exPriceNum = parseFloat(exchangePrice) || 1.0;
  // Convert strictly to Libyan Dinars in the treasury!
  const libyanEquivalent = exPriceNum > 0 ? Math.round(egAmountNum / exPriceNum) : 0;

  const handlePostEgyptToTreasury = (e: React.FormEvent) => {
    e.preventDefault();
    if (libyanEquivalent <= 0) {
      alert('يرجى إدخال قيم صحيحة لاحتساب المعادل بالدينار الليبي.');
      return;
    }
    const refNo = generateReferenceNo();
    const newTx: TreasuryTransaction = {
      id: `eg_convert_${Date.now()}`,
      type: 'in', // Positive deposit
      amount: libyanEquivalent,
      currency: 'د.ل',
      conversionRate: 1.0,
      date: new Date().toISOString(),
      referenceNo: refNo,
      source: 'manual_deposit',
      description: egyptNote.trim() ? `${egyptNote} (${egAmountNum.toLocaleString()} جنيه تقسيم سعر ${exPriceNum})` : `تحويل رصيد مصري للعملة الليبية (${egAmountNum.toLocaleString()} جنيه تقسيم سعر ${exPriceNum})`,
      createdAt: new Date().toISOString()
    };

    onUpdateState({
      ...state,
      treasuryTransactions: [...state.treasuryTransactions, newTx]
    });

    setEgyptAmount('');
    alert(`تم إيداع وتحويل العملة بنجاح بقيمة +${formatMoney(libyanEquivalent)} بالخزينة لكونها إضافة إيجابية ومسؤولة! 🎉`);
  };

  // -----------------------------------------------------------------
  // NEW: SPECIFIC EGYPTIAN REMAINDER DISPATCH AND ULTRA 4K CAPTURE
  // -----------------------------------------------------------------
  const [remainderExchangeRate, setRemainderExchangeRate] = useState('10.0');

  const handlePostEgyptRemainderToTreasury = (e: React.FormEvent, remainderAmount: number) => {
    e.preventDefault();
    if (!localEgyptRecord) return;
    const rate = parseFloat(remainderExchangeRate) || 10.0;
    if (rate <= 0) {
      alert('يرجى تحديد سعر صرف صحيح لتقسيم العملة.');
      return;
    }
    if (remainderAmount <= 0) {
      alert('لا يمكن ترحيل قيمة صفرية أو سالبة.');
      return;
    }

    const libMultiplier = Math.round(remainderAmount / rate);
    if (libMultiplier <= 0) {
      alert('القيمة بعد التقسيم صفرية، يرجى مراجعة المدخلات.');
      return;
    }

    const refNo = generateReferenceNo();
    const newTx: TreasuryTransaction = {
      id: `eg_remainder_convert_${Date.now()}`,
      type: 'in', // enters positively in the treasury
      amount: libMultiplier,
      currency: 'د.ل',
      conversionRate: 1.0,
      date: new Date().toISOString(),
      referenceNo: refNo,
      source: 'manual_deposit',
      description: `تصفية وتثبيت ترحيل متبقي الجنيه المصري ليوم ${selectedDay} بقيمة ${remainderAmount.toLocaleString()} جنيه بسعر (تقسيم ${rate}) تعادل بالليبي`,
      createdAt: new Date().toISOString()
    };

    // Update the local record to prevent double posting
    const updatedRecord = {
      ...localEgyptRecord,
      isPostedToTreasury: true
    };
    setLocalEgyptRecord(updatedRecord);

    const others = state.egyptianCashRecords?.filter(r => r.date !== selectedDay) || [];

    onUpdateState({
      ...state,
      egyptianCashRecords: [...others, updatedRecord],
      treasuryTransactions: [...state.treasuryTransactions, newTx]
    });

    alert(`تم تأكيد التصفية والترحيل الإيجابي بنجاح! 🎉\nدخلت الخزينة بقيمة +${formatMoney(libMultiplier)} د.ل`);
  };

  const handleExportFourRowsImage = async () => {
    if (!fourRowsRef.current) return;
    setExportingFourRows(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const dataUrl = await toPng(fourRowsRef.current, {
        quality: 1.0,
        pixelRatio: 4, // 4K Ultra HD
        backgroundColor: '#FFFFFF',
        style: {
          transform: 'none',
          transformOrigin: 'unset'
        }
      });
      const link = document.createElement('a');
      link.download = `ملخص_تسوية_المصري_فوق_العادة_${selectedDay}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رصد الأبعاد لفسيفساء الصورة.');
    } finally {
      setExportingFourRows(false);
    }
  };

  // -----------------------------------------------------------------
  // GENERAL SETTLEMENT EXPEDITE ACTIONS
  // -----------------------------------------------------------------
  const handlePostSettlementTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('يرجى إدخال قيمة صحيحة للترحيل.');
      return;
    }

    const isNegative = settleCategory === 'purchases' || settleCategory === 'deposits';
    const type = isNegative ? 'out' : 'in';

    let catName = '';
    switch (settleCategory) {
      case 'purchases': catName = 'مشتريات ترحيل ذمة جملة 🔻 (سالب)'; break;
      case 'deposits': catName = 'ودائع وأمانات مرجعة 🔻 (سالب)'; break;
      case 'receivables': catName = 'مستحقات ديون العملاء 🔺 (موجب)'; break;
      case 'companies': catName = 'وارد حسابات الشركات 🔺 (موجب)'; break;
      case 'merchants': catName = 'وارد حسابات التجار 🔺 (موجب)'; break;
    }

    let sourceVal: 'customer_payment' | 'company_payment' | 'purchase' | 'manual_deposit' | 'manual_withdraw' | 'deposit_escrow' = 'manual_deposit';
    if (settleCategory === 'purchases') sourceVal = 'purchase';
    else if (settleCategory === 'deposits') sourceVal = 'deposit_escrow';
    else if (settleCategory === 'receivables') sourceVal = 'customer_payment';
    else if (settleCategory === 'companies') sourceVal = 'company_payment';

    const baseDesc = settleNote.trim() ? `${catName} - ${settleNote}` : `${catName} (تسوية وترحيل حساب دوري مقفل)`;
    const finalDesc = (selectedAgent !== 'بدون وكيل' && !isNegative)
      ? `${baseDesc} - [تم تحصيل المعاملة ودخول الخزينة عن طريق الوكيل: ${selectedAgent}]`
      : baseDesc;

    const refNo = generateReferenceNo();
    const newTx: TreasuryTransaction = {
      id: `settle_tx_${Date.now()}`,
      type: type,
      amount: Math.round(amt),
      currency: 'د.ل',
      conversionRate: 1.0,
      date: new Date().toISOString(),
      referenceNo: refNo,
      source: sourceVal,
      description: finalDesc,
      createdAt: new Date().toISOString()
    };

    onUpdateState({
      ...state,
      treasuryTransactions: [...state.treasuryTransactions, newTx]
    });

    setSettleAmount('');
    setSettleNote('');
    setSelectedAgent('بدون وكيل');
    alert(`تم ترحيل وتسجيل حركة (${catName}) بقيمة ${formatMoney(amt)} بنجاح بالخزينة العامة! 💰`);
  };

  const handleManualTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0 || !manualDesc.trim()) return;

    const finalDesc = (selectedAgent !== 'بدون وكيل' && manualType === 'in')
      ? `${manualDesc} - [دخلت الخزينة عن طريق الوكيل المحصل: ${selectedAgent}]`
      : manualDesc;

    const refNo = generateReferenceNo();
    const newTx: TreasuryTransaction = {
      id: `manual_tx_${Date.now()}`,
      type: manualType,
      amount: amount,
      currency: 'د.ل',
      conversionRate: 1.0,
      date: new Date().toISOString(),
      referenceNo: refNo,
      source: manualType === 'in' ? 'manual_deposit' : 'manual_withdraw',
      description: finalDesc,
      createdAt: new Date().toISOString()
    };

    onUpdateState({
      ...state,
      treasuryTransactions: [...state.treasuryTransactions, newTx]
    });

    setManualAmount('');
    setManualDesc('');
    setSelectedAgent('بدون وكيل');
    setShowManualModal(false);
  };

  // 💰 AUDIT ACTION (كشف وعجز الخزينة)
  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actualAmount = parseFloat(actualCashInput);
    if (isNaN(actualAmount)) return;

    const diff = actualAmount - totalLifetimeExpectedBalance; // actual vs dynamic live balance
    const refNo = generateReferenceNo();

    const newAudit: SafeAudit = {
      id: `aud_${Date.now()}`,
      date: new Date().toISOString(),
      expectedBalance: totalLifetimeExpectedBalance,
      actualBalance: actualAmount,
      difference: diff,
      referenceNo: refNo,
      auditor: auditAuditor || 'المدير عبدو',
      note: auditNote || (diff === 0 ? 'مطابق وتام الخزينة' : diff < 0 ? 'عجز تم تدوينه بانتظار التسوية' : 'فائض بالمستندات')
    };

    onUpdateState({
      ...state,
      safeAudits: [...state.safeAudits, newAudit]
    });

    setActualCashInput('');
    setAuditNote('');
    setShowAuditModal(false);
  };

  const handleDeleteAudit = (id: string) => {
    if (confirm('هل ترغب في مسح سجل الجرد هذا؟')) {
      onUpdateState({
        ...state,
        safeAudits: state.safeAudits.filter(a => a.id !== id)
      });
    }
  };

  // -----------------------------------------------------------------
  // GENERATE SHARE CARD - HIGH RESOLUTION IMAGES SUPPORT
  // -----------------------------------------------------------------
  const handleOpenShareCard = () => {
    const headers = ['تاريخ الحركة', 'رقم المستند', 'الوصف والمسؤول', 'وارد (+)', 'صادر (-)'];
    const rows = filteredTransactions.slice(0, 15).map(t => [
      new Date(t.date).toLocaleDateString('ar-LY'),
      t.referenceNo,
      t.description,
      t.type === 'in' ? formatMoney(t.amount) : '-',
      t.type === 'out' ? formatMoney(t.amount) : '-'
    ]);

    onOpenExporter(
      `كشف دفتر حركة الخزينة ليوم ${selectedDay}`,
      {
        label1: 'رصيد الإغلاق لليوم الحالي',
        value1: formatMoney(closingBalanceForDay),
        label2: 'الرصيد الدفتري العام',
        value2: formatMoney(totalLifetimeExpectedBalance),
        label3: 'تدفقات اليوم (صافي)',
        value3: formatMoney(dayInTotal - dayOutTotal),
      },
      headers,
      rows
    );
  };

  const filteredTransactions = state.treasuryTransactions.filter(t => 
    t.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
    t.referenceNo.toLowerCase().includes(filterQuery.toLowerCase())
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter transactions for table view based on selected date
  const filteredJournalTransactions = useMemo(() => {
    return state.treasuryTransactions
      .filter(t => t.date.slice(0, 10) === selectedDay)
      .filter(t => {
        if (selectedAgentFilter === 'الكل') return true;
        return t.description.includes(selectedAgentFilter);
      })
      .filter(t => 
        t.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
        t.referenceNo.toLowerCase().includes(filterQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.treasuryTransactions, selectedDay, filterQuery, selectedAgentFilter]);


  // -----------------------------------------------------------------
  // EXTENSIVE FINANCIAL HARVEST CALCULATIONS ("ليا إيه وعليّا إيه")
  // -----------------------------------------------------------------
  
  // 1. "ليا إيه" (What is mine / Assets):
  // - Cash in hand expected: totalLifetimeExpectedBalance
  // - Active Customer debts: Total active cycle balance
  const activeCustomerDebtsTotal = useMemo(() => {
    return state.cycles
      .filter(cy => cy.status === 'active')
      .reduce((sum, cy) => sum + cy.currentBalance, 0);
  }, [state.cycles]);

  // - Active Trust Deposits Held (أمانات مودعة قائمة بالخزينة)
  const activeHeldDepositsTotal = useMemo(() => {
    return state.trustDeposits
      .filter(d => d.status === 'held')
      .reduce((sum, d) => sum + (d.amountLyd !== undefined ? d.amountLyd : d.amount), 0);
  }, [state.trustDeposits]);

  const totalMyAssets = totalLifetimeExpectedBalance + activeCustomerDebtsTotal;

  // 2. "عليّا إيه" (What I owe / Liabilities):
  // - Outstanding suppliers and importing companies balances
  const supplierDebtsTotal = useMemo(() => {
    return state.companies.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [state.companies]);

  // - Outstanding retail/wholesale merchant balances
  const merchantDebtsTotal = useMemo(() => {
    return state.merchants.reduce((sum, m) => sum + (m.balance || 0), 0);
  }, [state.merchants]);

  const totalMyLiabilities = supplierDebtsTotal + merchantDebtsTotal + activeHeldDepositsTotal;

  // 3. Overall Net Capital / Unified Net Worth
  const netWorthValue = totalMyAssets - totalMyLiabilities;

  // - Comprehensive lifetime Purchases (sum of all purchases in LYD)
  const lifetimePurchasesLYD = useMemo(() => {
    return state.purchases.reduce((sum, p) => {
      const price = p.totalPrice || 0;
      if (p.currency !== 'د.ل' && p.conversionRate) {
        return sum + (price * p.conversionRate);
      }
      return sum + price;
    }, 0);
  }, [state.purchases]);

  // 4. Purchases today details (بضائع فواتير اليوم)
  const purchasesTodayList = useMemo(() => {
    return state.purchases.filter(p => p.date.slice(0, 10) === selectedDay);
  }, [state.purchases, selectedDay]);

  const totalPurchasesTodayLYD = useMemo(() => {
    return purchasesTodayList.reduce((sum, p) => {
      const price = p.totalPrice || 0;
      // If purchase is recorded in non-LYD (e.g. Egypt / Dollar), convert using its multiplier rate or custom default
      if (p.currency !== 'د.ل' && p.conversionRate) {
        return sum + (price / p.conversionRate);
      }
      return sum + price;
    }, 0);
  }, [purchasesTodayList]);

  // Estimate daily business productivity
  const dailyWorkVolume = useMemo(() => {
    // Collect debt transactions of type 'debt' posted today
    return state.debtTransactions
      .filter(tx => tx.date.slice(0, 10) === selectedDay && tx.type === 'debt')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [state.debtTransactions, selectedDay]);


  return (
    <div className="space-y-4 text-right font-sans" id="treasury-workspace">

      {/* Dynamic Header & Timeline Date Navigator ("طرح يومي مكمل مع بعضه") */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 flex items-center gap-1.5">
              <span>قسم الخزينة التزامني ومطابقة الأرصدة المستمرة</span>
              <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold font-mono">
                مفعّل بالقرش ✓
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              إدارة حركة الداخل والمصروف، ترحيل وإغلاق الأيام المتتابعة، وتحليل المشتريات والديون والودائع.
            </p>
          </div>
        </div>

        {/* Timeline Control */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => handleShiftDate(-1)}
            className="p-1 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-0.5"
            title="اليوم اللاحق"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span>السابق</span>
          </button>
          
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-transparent font-mono font-black text-xs text-slate-900 border-none focus:outline-none focus:ring-0 text-center"
            />
          </div>

          <button
            onClick={() => handleShiftDate(1)}
            className="p-1 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-0.5"
          >
            <span>التالي</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              const local = new Date();
              const offset = local.getTimezoneOffset();
              const adjusted = new Date(local.getTime() - (offset * 60 * 1000));
              setSelectedDay(adjusted.toISOString().slice(0, 10));
            }}
            className="text-[10px] font-bold px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-100 transition"
          >
            اليوم
          </button>
        </div>
      </div>

      {/* 5 Dynamic Header Cards representing continuous daily inputs/outputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Customer debts collected today */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pointer-events-none mb-2">
            <span className="text-[10.5px] text-slate-500 font-bold">🔺 مقبوضات ديون العملاء (+)</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="font-mono text-base font-black text-emerald-700 block leading-none">
              {formatMoney(collectedDebtsToday)}
            </span>
            <p className="text-[9.5px] text-slate-400 mt-1.5">
              مجموع سدادات ديون الزبائن الواردة للصندوق اليوم
            </p>
          </div>
        </div>

        {/* Card 2: Escrow deposits received today */}
        <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pointer-events-none mb-2">
            <span className="text-[10.5px] text-slate-500 font-bold">🔒 مقبوضات الأمانات والودائع (+)</span>
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="font-mono text-base font-black text-blue-700 block leading-none border-b pb-1 border-dashed border-slate-100">
              {formatMoney(collectedDepositsToday)}
            </span>
            <p className="text-[9.5px] text-slate-400 mt-1.5">
              الأمانات وحجوزات البضائع المستلمة بالخزينة لليوم
            </p>
          </div>
        </div>

        {/* Card 3: Other inputs & Egyptian converted cash today */}
        <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pointer-events-none mb-2">
            <span className="text-[10.5px] text-slate-500 font-bold">🇪🇬 مقبوضات وتسويات ومصري (+)</span>
            <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="font-mono text-base font-black text-purple-700 block leading-none">
              {formatMoney(otherInputsToday)}
            </span>
            <p className="text-[9.5px] text-slate-400 mt-1.5">
              وارد التجار الاستثنائي وتسويات صرف الجنيه المصري لـ د.ل
            </p>
          </div>
        </div>

        {/* Card 4: Purchases outlay spent today */}
        <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pointer-events-none mb-2">
            <span className="text-[10.5px] text-slate-500 font-bold">🔻 مصروفات المشتريات والشركات (-)</span>
            <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="font-mono text-base font-black text-rose-600 block leading-none">
              -{formatMoney(purchasesSpentToday)}
            </span>
            <p className="text-[9.5px] text-slate-400 mt-1.5">
              المدفوع نقداً وفص الخراج لتغطية المشتريات والموردين اليوم
            </p>
          </div>
        </div>

        {/* Card 5: Consolidated Net Cashflow for Selected Day */}
        <div className={`rounded-2xl p-4 shadow-xs flex flex-col justify-between border ${
          (dayInTotal - dayOutTotal) >= 0 ? 'bg-emerald-950/5 border-emerald-200 text-emerald-900' : 'bg-rose-950/5 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center justify-between pointer-events-none mb-2">
            <span className="text-[10.5px] font-bold">📊 صافي فائض صندوق اليوم</span>
            <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded ${
              (dayInTotal - dayOutTotal) >= 0 ? 'bg-emerald-600/20 text-emerald-700' : 'bg-rose-600/20 text-rose-700'
            }`}>
              {(dayInTotal - dayOutTotal) >= 0 ? 'رواج نقدي 📈' : 'سحب رأسمالي 📉'}
            </span>
          </div>
          <div>
            <span className="font-mono text-base font-black block leading-none">
              {(dayInTotal - dayOutTotal) >= 0 ? '+' : ''}{formatMoney(dayInTotal - dayOutTotal)}
            </span>
            <p className="text-[9.5px] opacity-75 mt-1.5">
              حركة الميزان الصافي الجارية لخزينة يوم {selectedDay}
            </p>
          </div>
        </div>

      </div>

      {/* Tab Selector Workspace Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 rounded-xl gap-2 max-w-xl">
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 py-2.5 px-4 font-extrabold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'journal' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📜 حركة صندوق اليومية ({selectedDayTxs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2.5 px-4 font-extrabold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'audit' 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>⚖️ رقابة جرد الصندوق وفحوصات السلامة ({state.safeAudits.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: DAILY JOURNAL & QUICK MANUAL TRANSMISSIONS             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'journal' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Quick info block representing the carry forward opening details */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <p className="text-xs text-slate-750 font-bold">
                الرصيد الافتتاحي المنقول لليوم: <span className="font-mono text-slate-905">{formatMoney(openingBalance)}</span>
              </p>
              <span className="text-[10px] text-slate-400"> (التراكم السالف من الأيام السابقة متجدداً ومستمراً)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowManualModal(true)}
                className="bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer"
              >
                💸 إضافة حركة يدوية سريعة للخزينة
              </button>
              
              <button
                onClick={() => setShowAuditModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer"
              >
                📊 جرد الخزينة (عجز/فائض)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Table block */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">📜 كشف حركة الصندوق اليومية ليوم: ({selectedDay})</h3>
                <div className="flex gap-2 flex-wrap items-center">
                  <select
                    value={selectedAgentFilter}
                    onChange={(e) => setSelectedAgentFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 bg-white text-slate-700 font-extrabold focus:outline-none"
                  >
                    <option value="الكل">🔍 الوكيل: الكل</option>
                    {AGENTS.map(agent => (
                      <option key={agent} value={agent}>{agent}</option>
                    ))}
                  </select>
                  <div className="relative max-w-xs">
                    <input
                      type="text"
                      placeholder="ابحث بالحركة..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="w-full text-right pr-8 pl-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <button
                    onClick={handleOpenShareCard}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
                  >
                    📸 تصدير الصورة
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 border-l text-center w-20">رقم الحركة</th>
                      <th className="p-3 border-l text-center w-28">الساعة</th>
                      <th className="p-3 border-l">البيان وقيد المعاملة</th>
                      <th className="p-3 border-l text-center w-24 bg-emerald-50/20 text-emerald-900">وارد (+)</th>
                      <th className="p-3 border-l text-center w-24 bg-rose-50/20 text-rose-900">صادر (-)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-slate-850">
                    {filteredJournalTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-sans italic">
                          لا توجد حركات مقيدة بالصندوق ليوم {selectedDay} حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      filteredJournalTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 border-b last:border-b-0 border-slate-100">
                          <td className="p-3 border-l text-center text-[10px] text-slate-500 font-bold">{t.referenceNo}</td>
                          <td className="p-3 border-l text-center text-[10px] text-slate-400">
                            {new Date(t.date).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3 border-l font-sans text-slate-900 p-3 leading-relaxed">
                            {t.description}
                          </td>
                          <td className="p-3 border-l text-center font-extrabold text-emerald-700 bg-emerald-50/10">
                            {t.type === 'in' ? `+${t.amount.toLocaleString()}.00` : '-'}
                          </td>
                          <td className="p-3 border-l text-center font-extrabold text-rose-600 bg-rose-50/10">
                            {t.type === 'out' ? `-${t.amount.toLocaleString()}.00` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Day Summary row */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs flex justify-between items-center">
                <span className="font-sans font-bold text-slate-700">مجموع الإغلاق لصفحة التدفق اليومي:</span>
                <div className="flex gap-4">
                  <span className="text-emerald-700 font-extrabold">وارد: +{dayInTotal.toLocaleString()}.00 د.ل</span>
                  <span className="text-rose-600 font-extrabold">صادر: -{dayOutTotal.toLocaleString()}.00 د.ل</span>
                  <span className="text-slate-900 border-r pr-4 font-black">رصيد ختامي لليوم: {closingBalanceForDay.toLocaleString()}.00 د.ل</span>
                </div>
              </div>

            </div>

            {/* Quick Settle Panel (الترحيل السريع لحساب اليوم من الأقسام) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm lg:col-span-4 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 mb-2 flex items-center gap-1.5 border-b pb-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  <span>🔄 ترحيل وتسوية مجموع الشغل بالخزينة</span>
                </h4>
                <p className="text-[10.5px] text-slate-550 leading-relaxed mb-3">
                  يمكن للمشرف عول القيم المترصدة بنهاية قفل الحساب المالي للذمم والمبيعات بالخزينة لتسجيل الأثر اليومي بالقرش مباشرة.
                </p>

                <form onSubmit={handlePostSettlementTx} className="space-y-3.5 text-xs text-right">
                  <div>
                    <label className="block text-slate-650 font-bold mb-1">قسم ترحيل الحساب المتأثر:</label>
                    <select
                      value={settleCategory}
                      onChange={(e: any) => setSettleCategory(e.target.value)}
                      className="w-full text-right p-2.5 border rounded-xl bg-slate-50 text-slate-900 font-extrabold focus:outline-none"
                    >
                      <option value="purchases">📦 قسم المشتريات 🔻 (سالب)</option>
                      <option value="deposits">🔒 قسم الودائع والأمانات 🔻 (سالب)</option>
                      <option value="receivables">👥 مقبوضات ديون الزبائن 🔺 (موجب)</option>
                      <option value="companies">🏢 حسابات الشركات والموردين 🔺 (موجب)</option>
                      <option value="merchants">🛒 حسابات تجار الجملة الملتزمين 🔺 (موجب)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-650 font-bold mb-1">المبلغ المراد ترحيله نقداً لليوم (د.ل) *</label>
                    <input
                      type="number"
                      required
                      step="any"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-center p-2 border rounded-xl font-bold font-mono text-slate-900 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {(settleCategory === 'receivables' || settleCategory === 'companies' || settleCategory === 'merchants') && (
                    <div>
                      <label className="block text-slate-650 font-bold mb-1">الوكيل المحصل للأموال (اختياري):</label>
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full text-right p-2.5 border rounded-xl bg-slate-50 text-slate-900 font-extrabold focus:outline-none focus:bg-white"
                      >
                        <option value="بدون وكيل">مستلم مباشر / بدون وكيل</option>
                        {AGENTS.map(agent => (
                          <option key={agent} value={agent}>{agent}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-650 font-bold mb-1">البيان وتسجيل قيد المطابقة</label>
                    <input
                      type="text"
                      value={settleNote}
                      onChange={(e) => setSettleNote(e.target.value)}
                      placeholder="مثال: تسوية الشغل اليومي لشركة البيان"
                      className="w-full text-right p-2.5 border rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-black text-white font-extrabold py-3 rounded-xl transition duration-150 text-center cursor-pointer"
                  >
                    تأكيد ترحيل الحساب لليوم ✓
                  </button>
                </form>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-250 text-[10px] text-amber-900 leading-normal mt-4">
                ⚠️ <strong>تنبيه:</strong> سيتم تسجيل هذه المقاصة داخل كشف الصندوق مباشرة، مما يؤدي لموازنة ومطابقة النقدية مع الحافظة.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: FINANCIAL HARVEST PORTAL ("ليا إيه وعليّا إيه")          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'harvest' && (
        <div className="space-y-4 animate-fadeIn text-right">
          
          {/* General Balance Sheet Metrics Area */}
          <div className="bg-gradient-to-l from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl border border-indigo-900 p-6 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="bg-indigo-800 text-indigo-100 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                بورد مطابقة الحصاد المالي الشامل
              </span>
              <p className="text-[10px] text-slate-400 font-mono">آخر تحديث مباشر: {new Date().toLocaleString('ar-LY')}</p>
            </div>
            
            <h2 className="text-lg font-black text-white">⚖️ تقرير الملاءة والمركز المالي العام للمؤسسة بالقرش</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              يوفر هذا الكشف مركزاً مالياً حياً يطابق ثروة الأرصدة النشطة، والسيولة المنقولة بالخزينة، والمدفوعات والمستحقات بالسوق بالتوازي لتكون على دراية بـ (مالك وما عليك).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              
              {/* Assets panel ("ليا إيه") */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-indigo-800 flex flex-col justify-between">
                <div>
                  <span className="text-emerald-450 text-xs font-black block mb-1">🟢 ممتلكاتنا المستحقة ومواردنا (ليا إيه):</span>
                  <div className="space-y-2 mt-3 font-mono text-xs">
                    <div className="flex justify-between border-b border-indigo-900/40 pb-1.5">
                      <span className="text-slate-400 font-sans">1. السيولة بالخزينة:</span>
                      <span className="text-white font-bold">{formatMoney(totalLifetimeExpectedBalance)}</span>
                    </div>
                    <div className="flex justify-between border-b border-indigo-900/40 pb-1.5">
                      <span className="text-slate-400 font-sans">2. ذمم ديون العملاء بالسوق:</span>
                      <span className="text-white font-bold">{formatMoney(activeCustomerDebtsTotal)}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-indigo-900 pt-3 flex justify-between items-center mt-3 font-mono">
                  <span className="font-sans font-black text-emerald-400 text-xs">إجمالي الأصول والمال:</span>
                  <span className="text-base font-black text-emerald-300">{formatMoney(totalMyAssets)}</span>
                </div>
              </div>

              {/* Liabilities panel ("عليّا إيه") */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-indigo-800 flex flex-col justify-between">
                <div>
                  <span className="text-rose-450 text-xs font-black block mb-1">🔴 الالتزامات والمطالبات المستحقة (عليّ إيه):</span>
                  <div className="space-y-2 mt-3 font-mono text-xs">
                    <div className="flex justify-between border-b border-indigo-900/40 pb-1.5">
                      <span className="text-slate-400 font-sans">1. مستحقات لشركات الاستيراد:</span>
                      <span className="text-white font-bold">{formatMoney(supplierDebtsTotal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-indigo-900/40 pb-1.5">
                      <span className="text-slate-400 font-sans">2. ذمم وبواقي تجار الجملة:</span>
                      <span className="text-white font-bold">{formatMoney(merchantDebtsTotal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-indigo-900/40 pb-1.5">
                      <span className="text-slate-400 font-sans">3. مبالغ أمانات وودائع معلقة:</span>
                      <span className="text-rose-400 font-bold">{formatMoney(activeHeldDepositsTotal)}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-indigo-900 pt-3 flex justify-between items-center mt-3 font-mono">
                  <span className="font-sans font-black text-rose-400 text-xs">إجمالي الخصوم والديون:</span>
                  <span className="text-base font-black text-rose-300">{formatMoney(totalMyLiabilities)}</span>
                </div>
              </div>

              {/* Diagnostic profile of the day (المركز الصافي والربحية) */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-indigo-700 flex flex-col justify-between">
                <div>
                  <span className="text-amber-400 text-xs font-black block mb-2">📈 تقييم الموقف الصافي والجدوى:</span>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed">
                    بعد مقاصة كافة الأصول المطروحة مع الديون المستحقة على المحل، يظهر صافي القيمة الرأسمالية الحرة للنشاط بالقرش.
                  </p>

                  <div className="mt-4 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">المركز المالي الصافي الموحّد</span>
                    <span className={`font-mono text-xl font-black block leading-none ${
                      netWorthValue >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatMoney(netWorthValue)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-indigo-900 pt-3 mt-4 text-xs font-sans">
                  {netWorthValue >= 0 ? (
                    <div className="bg-emerald-900/20 border border-emerald-500/30 p-2 rounded-lg text-emerald-300 text-[10.5px] font-semibold text-center flex items-center gap-1.5 justify-center">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>ملاءة مالية متميزة ممتازة وإيجابية 👍</span>
                    </div>
                  ) : (
                    <div className="bg-rose-900/20 border border-rose-500/30 p-2 rounded-lg text-rose-350 text-[10.5px] font-semibold text-center">
                      ⚠️ ضغط ديون مؤقت على الخزينة، يجب زيادة التحصيل.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Today's Purchases Report Block (8 cols) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>📦 كشف فواتير ومشتريات اليوم المقارن بالدينار الليبي</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    يعرض هذا التقرير البضائع ومشتريات التوريد ليوم <strong className="font-mono text-slate-900">{selectedDay}</strong> وتكلفتها في الصندوق.
                  </p>
                </div>
                <div className="bg-slate-100 p-2.5 rounded-xl text-slate-900 font-mono text-xs font-extrabold">
                  إجمالي المشتريات اليوم: {formatMoney(totalPurchasesTodayLYD)}
                </div>
              </div>

              {purchasesTodayList.length === 0 ? (
                <div className="bg-slate-50/50 rounded-xl p-8 border border-slate-200/60 text-center text-slate-400 text-xs italic">
                  لا توجد فواتير ومشتريات مسجلة باسم هذا اليوم في قاعدة البيانات. 📋
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                      <tr>
                        <th className="p-3 border-l">الصنف المورّد</th>
                        <th className="p-3 border-l text-center">الكمية</th>
                        <th className="p-3 border-l text-center">سعر الوحدة بالعملة</th>
                        <th className="p-3 border-l text-center">المجموع بالعملة الأصلية</th>
                        <th className="p-3 border-l text-center bg-slate-100/55 text-slate-900">المعادل بالليبي (د.ل)</th>
                        <th className="p-3 border-l text-center">تسوية الخزينة</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-slate-800">
                      {purchasesTodayList.map(p => {
                        const price = p.totalPrice || 0;
                        const hasConRate = p.currency !== 'د.ل' && p.conversionRate;
                        const equivalentLyd = hasConRate ? (price / (p.conversionRate || 1)) : price;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 border-b last:border-b-0 border-slate-100">
                            <td className="p-3 border-l font-sans font-bold text-slate-900">{p.itemName}</td>
                            <td className="p-3 border-l text-center">{p.quantity}</td>
                            <td className="p-3 border-l text-center">{p.unitPrice.toLocaleString()} {p.currency}</td>
                            <td className="p-3 border-l text-center">{p.totalPrice.toLocaleString()} {p.currency}</td>
                            <td className="p-3 border-l text-center font-extrabold bg-slate-50 text-slate-900">
                              {equivalentLyd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} د.ل
                            </td>
                            <td className="p-3 border-l text-center">
                              {p.postedToTreasury ? (
                                <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded border border-emerald-200">
                                  مسدد ومرحّل للخزينة ✓
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-800 text-[10px] px-2 py-0.5 rounded border border-rose-200">
                                  قائم ذمم / آجل 🔻
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Informational comparison footer */}
              <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-200 text-[11px] text-indigo-950 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-650 shrink-0" />
                  <span>مقارنة سريعة: اليوم تم اقتناء بضاعة بقيمة <strong>{formatMoney(totalPurchasesTodayLYD)}</strong>، مقابل مقبوضات ديون عملاء جُمعت نقداً بقيمة <strong>{formatMoney(collectedDebtsToday)}</strong>.</span>
                </div>
                <div className="font-mono text-[10px] bg-indigo-100 px-2 py-1 rounded font-bold">
                  معدل التغطية: {totalPurchasesTodayLYD > 0 ? ((collectedDebtsToday / totalPurchasesTodayLYD) * 100).toFixed(1) + '%' : '100%'}
                </div>
              </div>

            </div>

            {/* Diagnostic panel: "يا ترى كسبان ولا خسران ولا إيه الدنيا؟" (4 cols) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs lg:col-span-4 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 mb-2 border-b pb-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>📈 تقييم ومقارنات الربحية وعمليات الصندوق</span>
                </h4>
                <p className="text-[10px] text-slate-500 leading-normal mb-3 font-sans">
                  تحليل استراتيجي يربط تكلفتك النقدية للمشتريات الاستثمارية مقابل حركة التدفق الدائر والوارد من السوق وخدمات المديونية.
                </p>

                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                    <span className="font-sans text-slate-600">شغل وبضائع منفذة اليوم (د.ل):</span>
                    <span className="font-extrabold text-slate-900">{dailyWorkVolume.toLocaleString()}.00 د.ل</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                    <span className="font-sans text-slate-600">منها مسحوبات نقدية عاجلة اليوم:</span>
                    <span className="font-extrabold text-rose-600">-{dayOutTotal.toLocaleString()}.00 د.ل</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                    <span className="font-sans text-slate-600">تدفقات المقبوضات الفعلية للزبائن:</span>
                    <span className="font-extrabold text-emerald-700">+{collectedDebtsToday.toLocaleString()}.00 د.ل</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-800 block mb-1">الرأي الاستشاري لليوم الفني:</span>
                  <div className="text-[10px] text-slate-550 leading-relaxed bg-slate-50 p-3 rounded-lg border font-sans">
                    {totalPurchasesTodayLYD > 0 ? (
                      totalPurchasesTodayLYD > collectedDebtsToday ? (
                        <span>
                          تمت إعادة تدوير سيولة الخزينة لشراء وتأمين مخزون بضائع جديد بما يتجاوز المحصل نقداً اليوم بقيمة <strong className="text-amber-700 font-mono">{(totalPurchasesTodayLYD - collectedDebtsToday).toLocaleString()} د.ل</strong>. هذا يمثل تجميع للموارد (بضائع) بدلاً من النقد السائل.
                        </span>
                      ) : (
                        <span>
                          ممتاز! المقبوضات والإدخال المالي المباشر من ديون الزبائن والأقسام يغطي كلفة الفواتير للمشتريات اليوم بالكامل مع وفر مالي وافر فائض بالصندوق يبلغ <strong className="text-emerald-755 font-mono font-bold">{(collectedDebtsToday - totalPurchasesTodayLYD).toLocaleString()} د.ل</strong>.
                        </span>
                      )
                    ) : (
                      <span>
                        لا توجد مشتريات أو مصاريف رأسمالية مورّدة لليوم، النقدية والتدفق الصافي بالكامل لصالح الصندوق والسيولة التراكمية في الخزانة.
                      </span>
                    )}
                  </div>
                </div>

              </div>
              
              <div className="bg-indigo-950 p-3.5 rounded-xl text-white text-right space-y-1">
                <span className="text-[9px] block text-indigo-300">تقديرات السيولة الكلية (طرح مستقبلي):</span>
                <p className="text-[10.5px] font-sans text-slate-350 leading-normal">
                  مجموع الأرصدة والديون والودائع المنظورة تشير إلى وضعية تعافي ائتلافية وتكافؤ دوري.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: AUDITS AND SAFE CONTROLS                              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="space-y-4 animate-fadeIn text-right">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Audit Logs list (8 cols) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm lg:col-span-8 space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900">⚖️ كشف ورقابة جرد الفروقات الدوري والأسبوعي بالخزينة</h3>
              <p className="text-[11px] text-slate-500">
                سجل بمطابقات الفئات الورقية والأرصدة الفعلية التي يُجريها المدير أو مسؤول المراجعة بالصندوق.
              </p>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {state.safeAudits.length === 0 ? (
                  <p className="text-center font-sans text-slate-400 text-xs italic py-8">لا توجد سجلات مطابقة أو جرود دورية سابقة بالخزينة.</p>
                ) : (
                  state.safeAudits.slice().reverse().map(aud => (
                    <div key={aud.id} className="border border-slate-200 bg-slate-50 p-3 rounded-xl hover:border-indigo-200 transition">
                      <div className="flex justify-between items-start mb-2 border-b pb-1 border-dashed">
                        <div>
                          <span className="font-sans font-black text-slate-800 block text-xs">{aud.auditor}</span>
                          <span className="text-[9.5px] text-slate-400 font-mono mt-0.5 block">{aud.referenceNo}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(aud.date).toLocaleDateString('ar-LY')} • {new Date(aud.date).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 border-b border-dashed border-slate-200 my-2 pb-2 font-mono text-xs">
                        <div>
                          <span className="text-[9.5px] text-slate-500 font-sans block leading-none">مجموع الخزينة بالدفاتر</span>
                          <span className="font-bold text-slate-900">{formatMoney(aud.expectedBalance)}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-500 font-sans block leading-none">الجرد والعد الفعلي للورق</span>
                          <span className="font-bold text-slate-900">{formatMoney(aud.actualBalance)}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-500 font-sans block leading-none">مكافأة الفارق وعجزه</span>
                          <span className={`font-black ${aud.difference === 0 ? 'text-emerald-700' : aud.difference < 0 ? 'text-rose-600' : 'text-indigo-700'}`}>
                            {aud.difference > 0 ? '+' : ''}{formatMoney(aud.difference)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1">
                        <p className="text-slate-600 font-sans leading-relaxed">&ldquo; {aud.note || 'مطابق وتام الخزينة'} &rdquo;</p>
                        <button 
                          onClick={() => handleDeleteAudit(aud.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded text-[10px] cursor-pointer"
                        >
                          مسح السجل
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Helper audit notes (4 cols) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lg:col-span-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-905 border-b pb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>تلميحات كشف العجز بالفلسفة والقرش</span>
                </h4>
                <p className="text-[11px] text-slate-550 leading-relaxed">
                  يحتسب النظام الفارق بموجب ومسح فحص المعادلة: <br />
                  <strong className="font-mono text-slate-900">الجرد الفعلي - رصيد الخزينة الدفتري</strong>.
                </p>
                <p className="text-[11px] text-slate-550 leading-relaxed">
                  - إذا كانت القيمة <strong>بالسالب</strong> فهذا يمثل عجزاً نقداً يجب تسويته للمصروفات النثرية أو البوفيه. <br />
                  - إذا كانت القيمة <strong>بالموجب</strong> فهذا فائض نقدي بالصندوق.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl mt-4">
                <span className="text-[10px] font-bold text-indigo-900 block mb-1">الرصد الفوري الآن باليد:</span>
                <span className="font-mono text-lg font-black text-indigo-950 block">{formatMoney(totalLifetimeExpectedBalance)}</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD MANUAL TRANSACTION (إيداع أو سحب نقدي يدوي)        */}
      {/* ------------------------------------------------------------- */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border p-5 shadow-xl max-w-md w-full text-right animate-fadeIn" dir="rtl">
            <h3 className="font-extrabold text-slate-900 text-sm mb-1">إضافة حركة مالية يدوية استثنائية</h3>
            <p className="text-[10.5px] text-slate-500 mb-4">أدخل الحركات النقدية التي تتم في الخزينة خارج الفهرس العام للأوراق.</p>
            
            <form onSubmit={handleManualTxSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">تحديد اتجاه الحركة المحاسبية:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualType('in')}
                    className={`p-2.5 rounded-xl border text-center font-bold ${
                      manualType === 'in' ? 'bg-emerald-50 text-emerald-800 border-emerald-400' : 'bg-white hover:bg-slate-100'
                    }`}
                  >
                    ● إيداع (وارد للخزينة +)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('out')}
                    className={`p-2.5 rounded-xl border text-center font-bold ${
                      manualType === 'out' ? 'bg-rose-50 text-rose-800 border-rose-400' : 'bg-white hover:bg-slate-100'
                    }`}
                  >
                    ● سحب (صادر من الخزينة -)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">المبلغ المودع/المسحوب نقداً لدينار الليبي *</label>
                <input
                  type="number"
                  required
                  step="any"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-center p-3 border rounded-xl font-mono text-sm leading-none focus:outline-none"
                />
              </div>

              {manualType === 'in' && (
                <div>
                  <label className="block text-slate-600 font-bold mb-1.5">الوكيل المحصل المحول للأموال (اختياري):</label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full text-right p-2.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-450"
                  >
                    <option value="بدون وكيل">إيداع مستقل / بدون وكيل</option>
                    {AGENTS.map(agent => (
                      <option key={agent} value={agent}>{agent}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">البيان وسبب القيد المحاسبي المبرر *</label>
                <input
                  type="text"
                  required
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="مثال: مصاريف بوفيه وضيافة أسبوعية أو تغذية تأسيسية"
                  className="w-full text-right p-2.5 border rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-black text-white font-black px-5 py-2 rounded-xl"
                >
                  تأكيد وقيد المعاملة ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: COMPREHENSIVE COMPILATION STUDY FOR THE TREASURY      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'study' && (
        <div className="space-y-6 animate-fadeIn text-right font-sans" dir="rtl">
          
          {/* Header Dashboard Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-505/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-3 relative z-10 flex-wrap gap-2">
              <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                الدراسة المقارنة الكبرى وتدقيق المركز لجهود المشتريات
              </span>
              <p className="text-[10px] text-slate-300 font-mono">التقرير المالي التدقيقي الفوري للمشرف: عبدو</p>
            </div>
            
            <h1 className="text-xl md:text-2xl font-black text-white leading-tight">
              📊 دراسة مقارنة مشتريات الدورة الكلية وديون وصندوق الخزينة العامة
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 max-w-4xl leading-relaxed">
              تأسست هذه الدراسة بطلب من الإدارة المالية لتشريح عمليات قسم المشتريات والتموين الفترية، وتنسيقها مقابل ديون السوق (العملاء والشركات). تضمن هذه الدراسة الحفاظ المطلق على الرصيد السالب والموجب كما هي وتتبع ثروتك الدفترية بدقة متناهية.
            </p>
          </div>

          {/* Core Analytics Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* 1. Purchasing / Capital Spent Card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <span className="text-xs font-black text-indigo-400">📦 مشتريات الدورة (القسم المالي التمويلي)</span>
                  <span className="text-[9px] text-indigo-150 bg-indigo-900/40 px-2 py-0.5 rounded font-mono">حجر الأساس</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10.5px] text-slate-400 mb-1">إجمالي المشتريات الاسمية (lifetime Purchases):</span>
                    <span className="text-xl font-black font-mono text-emerald-400">
                      {formatMoney(lifetimePurchasesLYD)}
                    </span>
                    <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                      * يمثل القيمة المالية للبضائع المشتراة من الموردين والمقيدة بالمنظومة لجميع التوريدات.
                    </p>
                  </div>

                  <div className="border-t border-slate-800/60 pt-3">
                    <span className="block text-[11px] text-slate-400 mb-1">إجمالي فواتير الآجل المقيدة للشركات:</span>
                    <span className="text-base font-bold font-mono text-slate-200 block">
                      {formatMoney(state.companyTransactions.filter(t => t.type === 'purchase_invoice').reduce((sum, t) => sum + t.amount, 0))}
                    </span>
                  </div>

                  <div className="border-t border-slate-800/60 pt-3">
                    <span className="block text-[11px] text-slate-400 mb-1">المسدد والمدفوع كاش للشركات من الخزينة:</span>
                    <span className="text-base font-bold font-mono text-amber-500 block">
                      {formatMoney(state.companyTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800/80 flex justify-between items-center text-[10.5px]">
                <span className="text-slate-400">عدد قيود المشتريات المسجلة:</span>
                <span className="font-extrabold font-mono text-indigo-300">{state.purchases.length} صفقة بضائع</span>
              </div>
            </div>

            {/* 2. Outstanding Debts Section */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-between shadow-md text-slate-900">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <span className="text-xs font-black text-rose-600">👥 الذمم الدائنة والمدينة (ديون السوق والموردين)</span>
                  <span className="text-[9px] text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded font-mono font-bold">الحسابات والذمم</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10.5px] text-slate-500 mb-1">إجمالي الديون المتبقية بذمة العملاء (مصلحتنا):</span>
                    <span className="text-xl font-black font-mono text-rose-600 block">
                      {formatMoney(activeCustomerDebtsTotal)}
                    </span>
                    <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                      * كروت الديون المترصدة على الزبائن بالخارج بانتظار التحصيل.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <span className="block text-[11px] text-slate-550 mb-1">إجمالي ديون كشوف حساب تجار الجملة:</span>
                    <span className="text-base font-bold font-mono text-slate-800 block">
                      {formatMoney(merchantDebtsTotal)}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <span className="block text-[11px] text-slate-550 mb-1">إجمالي متبقي الديون للشركات الموردة (علينا):</span>
                    <span className="text-base font-extrabold font-mono text-indigo-950 block">
                      {formatMoney(supplierDebtsTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center text-[10.5px]">
                <span className="text-slate-500">إجمالي التعرض العام (العملاء + التجار):</span>
                <span className="font-extrabold font-mono text-rose-600">{formatMoney(activeCustomerDebtsTotal + merchantDebtsTotal)}</span>
              </div>
            </div>

            {/* 3. Inflow Channels and Other Revenues */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between shadow-md text-slate-900">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <span className="text-xs font-black text-emerald-700">💰 رصيد الخزينة العامة وروافد الإمداد المالي</span>
                  <span className="text-[9px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono font-extrabold">متحصلات الصندوق</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10.5px] text-slate-500 mb-1">السيولة الدفترية المباشرة في كاش الدرج:</span>
                    <span className="text-xl font-black font-mono text-emerald-700 block">
                      {formatMoney(totalLifetimeExpectedBalance)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <span className="block text-[11px] text-slate-550 mb-1">إجمالي الودائع والمبالغ كأمانات للمتعاملين:</span>
                    <span className="text-base font-bold font-mono text-indigo-800 block">
                      {formatMoney(activeHeldDepositsTotal)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <span className="block text-[11px] text-slate-550 mb-1">أثر مقاصة تحويل العملات المصرية (المغذيات):</span>
                    <span className="text-base font-bold font-mono text-purple-800 block">
                      {formatMoney(state.treasuryTransactions.filter(t => t.id.startsWith('eg_convert') && t.type === 'in').reduce((sum, t) => sum + t.amount, 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between items-center text-[10.5px]">
                <span className="text-slate-500">معدل توازن التدفق وملاءة الثروة الكلية:</span>
                <span className={`font-black font-mono text-[10.5px] px-2 py-0.5 rounded ${totalMyAssets >= totalMyLiabilities ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {totalMyLiabilities > 0 ? `${Math.round((totalMyAssets / totalMyLiabilities) * 100)}% ملاءة ممتازة` : 'متطابقة %100'}
                </span>
              </div>
            </div>

          </div>

          {/* Comparative visualizer bars block */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-900 mb-3.5 flex items-center gap-1.5">
              <span>📊 تمثيل التدفق المقارن لقسم المشتريات وديون السوق والسيولة المتاحة لخدمة عبدو:</span>
            </h3>

            <div className="space-y-5 text-xs font-mono">
              {/* Row 1: Purchases vs Customer Debts */}
              <div>
                <div className="flex justify-between mb-1.5 text-slate-700">
                  <span className="font-sans font-extrabold">📦 إجمالي مشتريات التموين مقابل ديون السوق المستحقة للزبائن والتجار:</span>
                  <span className="font-extrabold flex gap-1 items-baseline">
                    <span className="text-xs text-indigo-700">المشتريات: {formatMoney(lifetimePurchasesLYD)}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-rose-600">ديون السوق: {formatMoney(activeCustomerDebtsTotal + merchantDebtsTotal)}</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
                  <div 
                    title="المشتريات والتموين"
                    className="bg-indigo-600 h-full transition-all" 
                    style={{ width: `${Math.min(95, Math.max(5, (lifetimePurchasesLYD / (lifetimePurchasesLYD + activeCustomerDebtsTotal + merchantDebtsTotal || 1)) * 100))}%` }} 
                  />
                  <div 
                    title="ديون السوق الكلية"
                    className="bg-rose-500 h-full transition-all" 
                    style={{ width: `${Math.min(95, Math.max(5, ((activeCustomerDebtsTotal + merchantDebtsTotal) / (lifetimePurchasesLYD + activeCustomerDebtsTotal + merchantDebtsTotal || 1)) * 100))}%` }} 
                  />
                </div>
              </div>

              {/* Row 2: Cash in safe vs Company Debt Liabilities */}
              <div>
                <div className="flex justify-between mb-1.5 text-slate-700">
                  <span className="font-sans font-extrabold">💵 سيولة الصندوق المتاحة في يدنا مقابل ديون شركات الاستيراد:</span>
                  <span className="font-extrabold flex gap-1 items-baseline">
                    <span className="text-xs text-emerald-700 font-mono">السيولة النقدية: {formatMoney(totalLifetimeExpectedBalance)}</span>
                    <span className="text-slate-350">•</span>
                    <span className="text-xs text-amber-700 font-mono">الشركات: {formatMoney(supplierDebtsTotal)}</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
                  <div 
                    title="السيولة المتاحة"
                    className="bg-emerald-500 h-full transition-all" 
                    style={{ width: `${Math.min(95, Math.max(5, (totalLifetimeExpectedBalance / (totalLifetimeExpectedBalance + supplierDebtsTotal || 1)) * 100))}%` }} 
                  />
                  <div 
                    title="الموردون والشركات"
                    className="bg-amber-450 h-full transition-all" 
                    style={{ width: `${Math.min(95, Math.max(5, (supplierDebtsTotal / (totalLifetimeExpectedBalance + supplierDebtsTotal || 1)) * 100))}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Expert Strategic Study from the premier system programmer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 leading-relaxed text-xs">
            <h3 className="font-black text-sm text-slate-900 mb-2.5 flex items-center gap-1.5">
              <span>📋 تقرير تقييم الملاءة المالية ورقابة الصدق الحسابي</span>
            </h3>
            
            <p className="text-slate-700 mb-4 text-[11.5px]">
              تحت إشراف الخبراء وصاحب المنظومة <strong>عبدو</strong>، نقدم هنا معالجة وحقائق مقارنة متكاملة:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <strong className="block text-indigo-950 mb-1.5 font-sans font-extrabold text-[12px]">⚖️ ميزان الرفد والائتمان (Leverage Balance):</strong>
                <p className="text-slate-600 leading-relaxed text-[11px] font-sans">
                  مجموع ديون العملاء والتجار الحالية بالسوق يبلغ <strong className="text-rose-600 font-mono">{formatMoney(activeCustomerDebtsTotal + merchantDebtsTotal)}</strong>، وهو يمثل رأس مال متداول بالخارج مقارنة بمديونيات شركات الاستيراد المطلوبة منا البالغة <strong className="text-amber-700 font-mono">{formatMoney(supplierDebtsTotal)}</strong>.
                  { (activeCustomerDebtsTotal + merchantDebtsTotal) > supplierDebtsTotal ? (
                    <span className="text-indigo-650 block mt-2 font-bold bg-indigo-50/50 p-2 rounded border border-indigo-100/50">
                      💡 التحقيق المالي: مبيعاتك الديونية تفوق ذمم الموردين. هذا يمثل تمدداً تجارياً ممتازاً بالسوق، لكن ينصح بتوجيه منذر والترهوني لإنقاص سقف المديونيات لضمان تسريع دورة التدفق وجلب السيولة للخزينة لتسديد فواتير الشركات القادمة في موعدها.
                    </span>
                  ) : (
                    <span className="text-amber-650 block mt-2 font-bold bg-amber-50/50 p-2 rounded border border-amber-100/50">
                      💡 التحقيق المالي: ديون شركات الاستيراد المطلوبة بذمتنا أعلى من ديون الزبائن بالخارج. كشوفات حسابك ممتازة، لكن يعني أنك تشتري بآجل بمعدّل أسرع من التصريف والتحصيل. ينصح بتقليل العقود الآجلة القادمة حتى ترتفع سيولة صندوقك الحية.
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <strong className="block text-emerald-950 mb-1.5 font-sans font-extrabold text-[12px]">🎯 حصاد مشتريات الدورة والتمويل (Procurement Velocity):</strong>
                <p className="text-slate-650 leading-relaxed text-[11px]">
                  برسم المشتريات كحجر أساس لكافة الحركات بالمنظومة، تبين أن إجمالي البضائع والبيوع المدخلة تبلغ <strong className="text-emerald-700 font-mono">{formatMoney(lifetimePurchasesLYD)}</strong>. قامت المنظومة بدفع وسداد ما نسبته 
                  <strong className="text-emerald-600 mx-1 font-mono text-[12px]">
                    {lifetimePurchasesLYD > 0 
                      ? `${Math.round(((lifetimePurchasesLYD - supplierDebtsTotal) / lifetimePurchasesLYD) * 100)}%`
                      : '0%'
                    }
                  </strong> 
                  نقداً بالكامل من ترحيلات نقدية الصندوق للشركات والموردين حتى تاريخ الساعة، بينما تظل النسبة الباقية ذمماً تجارية مرنة لخدمة مبيعات اليوم.
                </p>
              </div>
            </div>

            {/* DIRECT ASSURANCE OF THE SIGN INTUITION AND CUSTOMER PRESERVATION (all negative remains negative, all positive remains positive) */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-4 font-sans text-slate-900">
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</div>
                <div>
                  <h4 className="font-extrabold text-[12px] text-indigo-950 mb-1">🔒 مدونة سلامة وصون الإشارات والأرصدة الحسابية المعتمدة (Double-Sign Integrity Guard)</h4>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    بناءً على طلب صاحب الشأن والمنظومة الشاملة: <strong>"كل الحسابات والذمم السالبة تظل سالبة، وكل الموجبة تظل موجبة"</strong>. لقد قمنا بتثبيت وفحص المعادلات الحسابية دورياً لفرز والتأكيد على صون الإشارة الحسابية:
                  </p>
                  
                  <ul className="list-disc list-inside space-y-1 text-slate-700 mt-2 text-[10.5px]">
                    <li>
                      <strong>الأرصدة السالبة للزبائن (الأمانة الجارية والدفعات الفائضة):</strong> تمثل مبالغ وحقوق للزبون مدخلة مسبقاً بطيب خاطر. صمم النظام كابحاً يمنع قلبها بمطلق حسابي (No Absolute Values) لكي تظل معتمدة بالسالب بالضمان الحسابي.
                    </li>
                    <li>
                      <strong>الأرصدة السالبة للموردين (الدائنية العكسية):</strong> تمثل دفعات مدفوعة مقدماً من الصندوق للمورد أو خصومات مكتسبة تُقيد بالسالب صوناً لتغطيتها وتظل ظاهرة بوضوح.
                    </li>
                  </ul>

                  {/* Real-time compliance check statistics as of today */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3.5 border-t border-indigo-250">
                    <div className="bg-white/80 p-3 rounded-lg border border-indigo-150 shadow-xs">
                      <span className="font-extrabold text-[11px] text-slate-800 block mb-1">📌 فحص أرصدة الزبائن النشطة بالسوق:</span>
                      <div className="space-y-1.5 text-[10.5px] font-mono leading-none">
                        <div className="flex justify-between">
                          <span className="text-slate-650 font-sans">الأرصدة الموجبة (ديون مستحقة عليهم لنا):</span>
                          <span className="text-rose-650 font-extrabold">
                            {formatMoney(state.cycles.filter(c => c.status === 'active' && c.currentBalance > 0).reduce((sum, c) => sum + c.currentBalance, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-650 font-sans">الأرصدة السالبة (دفعات فائضة/حقوق العملاء مسبقاً):</span>
                          <span className="text-emerald-700 font-extrabold">
                            {formatMoney(state.cycles.filter(c => c.status === 'active' && c.currentBalance < 0).reduce((sum, c) => sum + c.currentBalance, 0))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 p-3 rounded-lg border border-indigo-150 shadow-xs">
                      <span className="font-extrabold text-[11px] text-slate-800 block mb-1">📌 فحص أرصدة الشركات التوريدية:</span>
                      <div className="space-y-1.5 text-[10.5px] font-mono leading-none">
                        <div className="flex justify-between">
                          <span className="text-slate-650 font-sans">الأرصدة الموجبة (ديون بذمتنا للمورد):</span>
                          <span className="text-indigo-950 font-extrabold">
                            {formatMoney(state.companies.filter(c => !c.isDeleted && (c.balance || 0) > 0).reduce((sum, c) => sum + (c.balance || 0), 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-650 font-sans">الأرصدة السالبة (فواضل مدفوعة مقدمة أو مستحقات لنا):</span>
                          <span className="text-emerald-700 font-extrabold">
                            {formatMoney(state.companies.filter(c => !c.isDeleted && (c.balance || 0) < 0).reduce((sum, c) => sum + (c.balance || 0), 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Master 4K Print / Share Button */}
          <div className="flex justify-end pt-1 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
            <button
              onClick={() => {
                const headers = ['الحساب والجهة', 'المشتريات / الدين العام', 'المسدد الفعلي', 'باقي الأرصدة المترصدة بالدراسة'];
                const rows = [
                  ['قسم المشتريات والتموين الفتري', formatMoney(lifetimePurchasesLYD), formatMoney(state.companyTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0)), formatMoney(supplierDebtsTotal)],
                  ['أرصدة ديون العملاء', formatMoney(activeCustomerDebtsTotal), '-', formatMoney(activeCustomerDebtsTotal)],
                  ['كشوفات حساب تجار الجملة', formatMoney(merchantDebtsTotal), '-', formatMoney(merchantDebtsTotal)],
                  ['السيولة النقدية بالخزينة العامة', formatMoney(totalLifetimeExpectedBalance), '-', formatMoney(totalLifetimeExpectedBalance)]
                ];
                onOpenExporter(
                  'دراسة التدفق المقارن لقسم المشتريات والديون والسيولة العامة',
                  {
                    label1: 'المشتريات الكلية المحققة',
                    value1: formatMoney(lifetimePurchasesLYD),
                    label2: 'إجمالي الذمم والتعرض بالسوق',
                    value2: formatMoney(activeCustomerDebtsTotal + merchantDebtsTotal),
                    label3: 'الرصيد الدفتري الحالي بالخزنة',
                    value3: formatMoney(totalLifetimeExpectedBalance)
                  },
                  headers,
                  rows
                );
              }}
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[11px] py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition duration-150 cursor-pointer shadow-md text-center"
            >
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              <span>📥 تصدير كارت دراسة الحصاد والمشتريات والديون الشاملة (لشير الواتس بأعلى دقة 4K)</span>
            </button>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: AUDIT DIALOG (جرد الفروقات ومحاسبة الصندوق)          */}
      {/* ------------------------------------------------------------- */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border p-5 shadow-xl max-w-md w-full text-right animate-fadeIn" dir="rtl">
            <h3 className="font-extrabold text-slate-900 text-sm mb-1.5 flex items-center gap-1">
              <Scale className="w-5 h-5 text-indigo-600" />
              <span>جرد الصندوق ومطابقة السيولة الفعلية</span>
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              أدخل الرصيد المالي الورقي الفعلي المتوفر في اليد وسيقوم النظام بمقارنته مع المجموع الدفتري لتقصي وتدوين العجز أو الفائض بالقرش.
            </p>

            <form onSubmit={handleAuditSubmit} className="space-y-4 text-xs font-sans">
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 font-mono flex items-center justify-between mb-2">
                <span className="text-[11px] text-indigo-900 font-sans font-bold">الرصيد الدفتري الحالي المتوقع بالخزينة:</span>
                <span className="font-extrabold text-slate-905 text-xs">{formatMoney(totalLifetimeExpectedBalance)}</span>
              </div>

              <div>
                <label className="block text-slate-650 font-bold mb-1.5">المبلغ الفعلي في الدرج (الجرد الفعلي) *</label>
                <input
                  type="number"
                  required
                  step="any"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-center p-3 border rounded-xl font-mono text-sm leading-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-650 font-bold mb-1.5">ملاحظة وبند التسوية الملحق بالجرد</label>
                <input
                  type="text"
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="مثال: مطابقة الجرد الدوري بعد خصم المبيعات"
                  className="w-full text-right p-2.5 border rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-650 font-bold mb-1.5">اسم القائم بالجرد ومسؤول المراجع بالخزنة</label>
                <input
                  type="text"
                  value={auditAuditor}
                  onChange={(e) => setAuditAuditor(e.target.value)}
                  className="w-full text-right p-2.5 border rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl"
                >
                  إلغاء والمغادرة
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2 rounded-xl cursor-pointer"
                >
                  تنفيذ وحفظ الجرد الدوري ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
