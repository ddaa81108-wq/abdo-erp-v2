import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import {
  Coins,
  Camera,
  Save,
  Check,
  ArrowUpRight,
  RefreshCw,
  Landmark,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { ERPState, TreasuryTransaction } from '../types';

interface MailManualModuleProps {
  state: ERPState;
  onUpdateState: (newState: ERPState) => void;
}

export default function MailManualModule({ state, onUpdateState }: MailManualModuleProps) {
  // Date selector matching other sections
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const [localEgyptRecord, setLocalEgyptRecord] = useState<{
    date: string;
    rows: { value: number; commission: number }[];
    previousValue: number;
    receivedValue: number;
    isPostedToTreasury?: boolean;
  } | null>(null);

  const [exportingFourRows, setExportingFourRows] = useState(false);
  const fourRowsRef = useRef<HTMLDivElement>(null);
  const [remainderExchangeRate, setRemainderExchangeRate] = useState('10.0');

  // Sync from state to localState on mount / date change
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

  // Handler to update the table cell value or commission
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

    // Auto save to global state on every input change for reliable data persistence
    const others = state.egyptianCashRecords?.filter(r => r.date !== selectedDay) || [];
    onUpdateState({
      ...state,
      egyptianCashRecords: [...others, newRec]
    });
  };

  // Handler to update the header/summary fields (Previous Value & Received Value)
  const handleEgyptSummaryChange = (field: 'previousValue' | 'receivedValue', val: string) => {
    if (!localEgyptRecord) return;
    const numVal = parseFloat(val) || 0;
    const newRec = {
      ...localEgyptRecord,
      [field]: numVal
    };
    setLocalEgyptRecord(newRec);

    // Auto save to global state on change
    const others = state.egyptianCashRecords?.filter(r => r.date !== selectedDay) || [];
    onUpdateState({
      ...state,
      egyptianCashRecords: [...others, newRec]
    });
  };

  // Dedicated Save button
  const handleSaveEgyptRecordExplicit = () => {
    if (!localEgyptRecord) return;
    const others = state.egyptianCashRecords?.filter(r => r.date !== selectedDay) || [];
    onUpdateState({
      ...state,
      egyptianCashRecords: [...others, localEgyptRecord]
    });
    alert('تم حفظ وتأمين كافة بيانات كشف الجنية المصري اليومي بنجاح! 💾');
  };

  // Helper reference no generator
  const generateReferenceNo = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Cash integration function: Post equivalent LYD to primary ledger
  const handlePostEgyptRemainderToTreasury = (e: React.FormEvent, remainderAmount: number) => {
    e.preventDefault();
    if (!localEgyptRecord) return;
    const rate = parseFloat(remainderExchangeRate) || 10.0;
    if (rate <= 0) {
      alert('يرجى تحديد سعر صرف تقسيم صحيح للتحويل.');
      return;
    }
    if (remainderAmount <= 0) {
      alert('لا يمكن ترحيل قيمة صفرية أو سالبة.');
      return;
    }

    const libMultiplier = Math.round(remainderAmount / rate);
    if (libMultiplier <= 0) {
      alert('القيمة المعادلة صفرية بالدينار الليبي، يرجى التحقق من القيمة وسعر الصرف.');
      return;
    }

    const refNo = generateReferenceNo();
    const newTx: TreasuryTransaction = {
      id: `eg_remainder_convert_${Date.now()}`,
      type: 'in', // enters positively in the treasury context
      amount: libMultiplier,
      currency: 'د.ل',
      conversionRate: 1.0,
      date: new Date().toISOString(),
      referenceNo: refNo,
      source: 'manual_deposit',
      description: `تصفية وتسوية متبقي الجنيه المصري لليوم ${selectedDay} بقيمة ${remainderAmount.toLocaleString()} جنيه بسعر (تقسيم ${rate}) تعادل بالليبي`,
      createdAt: new Date().toISOString()
    };

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

    alert(`تم تأكيد التصفية والترحيل الإيجابي بنجاح! 🎉\nدخلت الخزينة العامة بقيمة +${libMultiplier.toLocaleString()} د.ل`);
  };

  // Capture only the 4-Rows card in Ultra HD 4K
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
      link.download = `كارت_تسوية_المصري_البريد_${selectedDay}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إلتقاط وتصدير بطاقة الـ 4 صفوف بدقة Ultra HD.');
    } finally {
      setExportingFourRows(false);
    }
  };

  // Date Shift Helper
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + days);
    setSelectedDay(d.toISOString().slice(0, 10));
  };

  return (
    <div className="w-full space-y-6 text-right animate-fadeIn" dir="rtl" id="mail-manual-section-wrapper">
      
      {/* 1. TOP HEADER SECTION */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
            <span className="text-3xl">🇪🇬</span>
            <span>قسم البريد واليدوي</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            قسم جمركي وإداري متكامل لمتابعة حركات الجنيه المصري، تسوية المسافير، وصرف العمولات والتحويل للخزانة بالدينار الليبي.
          </p>
        </div>

        {/* Date Navigator in Header */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-stretch md:self-auto justify-between">
          <button
            onClick={() => handleShiftDate(-1)}
            className="p-2 hover:bg-white text-slate-700 hover:text-slate-950 rounded-xl transition cursor-pointer"
            title="اليوم السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="bg-transparent border-0 font-bold font-mono text-slate-800 text-xs text-center focus:outline-none focus:ring-0 px-2 cursor-pointer"
          />
          <button
            onClick={() => handleShiftDate(1)}
            className="p-2 hover:bg-white text-slate-700 hover:text-slate-950 rounded-xl transition cursor-pointer"
            title="اليوم التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      {!localEgyptRecord ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs font-bold">جاري رصد حوافظ وتسوية الجنيه المصري...</p>
        </div>
      ) : (() => {
        const rows = localEgyptRecord.rows;
        const table1ValueTotal = rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
        const table1CommissionTotal = rows.reduce((sum, r) => sum + (Number(r.commission) || 0), 0);
        const table1GrandTotal = table1ValueTotal + table1CommissionTotal;

        const previousValue = Number(localEgyptRecord.previousValue) || 0;
        const receivedValue = Number(localEgyptRecord.receivedValue) || 0;
        const remainderValue = (previousValue + receivedValue) - table1GrandTotal;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* TABLE 1: 25 Rows Cash Entries */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-7 space-y-4">
              <div className="border-b pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-5 h-5 text-emerald-600" />
                    <span className="text-base font-black">قسم البريد واليدوي - جدول القيود والعمولات اليومية لـ 25 عملية</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    أدخل مبالغ الحركة وقيمة عمولتها في الخانات بالأسفل لحساب الإجمالي والترصيد التلقائي لملخص التسوية.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveEgyptRecordExplicit}
                  className="bg-emerald-650 hover:bg-emerald-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ المسودة 💾</span>
                </button>
              </div>

              {/* Table Wrapper with scroll */}
              <div className="overflow-x-auto max-h-[610px] overflow-y-auto pr-1 border border-slate-100 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-14 border-l text-center">رقم</th>
                      <th className="p-3 border-l text-center">القيمة (EG)</th>
                      <th className="p-3 border-l text-center">العمولة (EG)</th>
                      <th className="p-3 text-center bg-emerald-50 text-emerald-950">الإجمالي (EG)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                    {rows.map((row, idx) => {
                      const rowTotal = (Number(row.value) || 0) + (Number(row.commission) || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="p-2 border-l text-center text-slate-400 font-semibold bg-slate-50/50">
                            {idx + 1}
                          </td>
                          <td className="p-1 border-l text-center">
                            <input
                              type="number"
                              placeholder="0.00"
                              step="any"
                              value={row.value || ''}
                              onChange={(e) => handleEgyptRowChange(idx, 'value', e.target.value)}
                              className="w-full text-center p-2 focus:bg-amber-50 focus:outline-none border border-transparent hover:border-slate-200 focus:border-amber-400 rounded-lg font-bold font-mono text-slate-850 transition"
                            />
                          </td>
                          <td className="p-1 border-l text-center">
                            <input
                              type="number"
                              placeholder="0.00"
                              step="any"
                              value={row.commission || ''}
                              onChange={(e) => handleEgyptRowChange(idx, 'commission', e.target.value)}
                              className="w-full text-center p-2 focus:bg-amber-50 focus:outline-none border border-transparent hover:border-slate-200 focus:border-amber-400 rounded-lg font-bold font-mono text-slate-850 transition"
                            />
                          </td>
                          <td className="p-3 text-center bg-emerald-50/30 font-black text-emerald-800 text-sm">
                            {rowTotal > 0 ? rowTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs font-bold text-slate-800 font-mono">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="block text-[10px] text-slate-550 font-sans mb-1">إجمالي القيم المدفوعة:</span>
                  <span className="text-slate-950 font-black text-sm">{table1ValueTotal.toLocaleString('en-US')} EG</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="block text-[10px] text-slate-550 font-sans mb-1">إجمالي عمولات الصرف:</span>
                  <span className="text-slate-950 font-black text-sm">{table1CommissionTotal.toLocaleString('en-US')} EG</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-950">
                  <span className="block text-[10px] text-emerald-800 font-sans mb-1">الرقم الإجمالي للجدول:</span>
                  <span className="text-emerald-950 font-black text-sm">{table1GrandTotal.toLocaleString('en-US')} EG</span>
                </div>
              </div>
            </div>

            {/* TABLE 2: SUMMARY AND EXPORTS (4 ROWS ONLY) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Photo HD Camera button at top right */}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={exportingFourRows}
                  onClick={handleExportFourRowsImage}
                  className="bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-3 rounded-2xl cursor-pointer shadow-md flex items-center gap-1.5 transition-all w-full justify-center"
                >
                  <Camera className="w-5 h-5 text-indigo-200 animate-pulse" />
                  <span>تصدير بطاقة التسوية 4K Ultra HD 📸</span>
                </button>
              </div>

              {/* THE ULTRA 4K RESOLUTION BILLING SLIP */}
              <div
                ref={fourRowsRef}
                className="bg-white border-[6px] border-slate-950 p-7 rounded-3xl shadow-2xl relative overflow-hidden select-none"
                style={{ direction: 'rtl', width: '100%', maxWidth: '460px', margin: '0 auto' }}
                id="mail-manual-four-rows-slip"
              >
                {/* Visual Header Ribbon */}
                <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-red-600 via-yellow-400 to-slate-900"></div>

                {/* Card Title Box */}
                <div className="text-center pt-3 pb-5 border-b-2 border-dashed border-slate-900">
                  <div className="inline-flex items-center justify-center p-2 px-4 rounded-full bg-slate-950 text-white font-bold text-[10px] mb-2">
                    كارت تسوية المسافير والترصيد اليومي
                  </div>
                  <h4 className="font-sans font-black text-xl text-slate-950 tracking-tight leading-none">قسم البريد واليدوي الحساب الصافي</h4>
                  <p className="text-[9.5px] font-sans text-slate-400 font-extrabold mt-1 tracking-wider uppercase">Mail & Manual Registry Card</p>
                  <div className="mt-2 text-xs font-mono font-black border border-slate-950 bg-slate-950 text-white inline-block px-3 py-1 rounded-md">
                    التاريخ: {selectedDay}
                  </div>
                </div>

                {/* THE FOUR COMPREHENSIVE ROWS */}
                <div className="py-6 space-y-6">
                  
                  {/* Row 1: Previous value */}
                  <div className="bg-slate-50 p-6 rounded-2xl border-[3px] border-slate-950 shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-sans text-sm font-extrabold text-slate-950">المبالغ السابقة (Carried Balance)</span>
                      <span className="text-xs uppercase font-black text-slate-600 font-mono bg-slate-200 px-2 py-0.5 rounded">EG</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={localEgyptRecord.previousValue || ''}
                        onChange={(e) => handleEgyptSummaryChange('previousValue', e.target.value)}
                        className="w-full text-right bg-white px-4 py-3 text-3xl border-[3px] border-slate-950 rounded-2xl font-black font-mono text-slate-950 focus:outline-none focus:bg-amber-50 focus:ring-4 focus:ring-amber-250 transition"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans mt-2">الرصيد المُرّحل والذمم المتممة من الحسابات الماضية تلقائياً</p>
                  </div>

                  {/* Row 2: Received value */}
                  <div className="bg-slate-50 p-6 rounded-2xl border-[3px] border-slate-950 shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-sans text-sm font-extrabold text-slate-950">القيمة المستلمة (Received Value)</span>
                      <span className="text-xs uppercase font-black text-slate-600 font-mono bg-slate-200 px-2 py-0.5 rounded">EG</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={localEgyptRecord.receivedValue || ''}
                        onChange={(e) => handleEgyptSummaryChange('receivedValue', e.target.value)}
                        className="w-full text-right bg-white px-4 py-3 text-3xl border-[3px] border-slate-950 rounded-2xl font-black font-mono text-slate-950 focus:outline-none focus:bg-amber-50 focus:ring-4 focus:ring-amber-250 transition"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans mt-2">السيولة والجنية المصري المقبوض فورياً هذا اليوم</p>
                  </div>

                  {/* Row 3: Total of table 1 */}
                  <div className="bg-slate-50 p-6 rounded-2xl border-[3px] border-slate-950 shadow-md flex justify-between items-center">
                    <div className="text-right">
                      <span className="font-sans text-sm font-extrabold text-slate-950 block">إجمالي الجدول الأول (Transactions Total)</span>
                      <span className="text-[10px] text-slate-550 font-sans block mt-1">حصيلة جميع القيم والعمولات المدونة تلقائياً</span>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-3xl font-black text-slate-950 block text-left">
                        {table1GrandTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-xs font-sans font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded inline-block mt-1">EG</span>
                    </div>
                  </div>

                  {/* Row 4: Remainder */}
                  <div className="bg-emerald-50 p-7 rounded-2xl border-[4px] border-emerald-950 shadow-lg flex justify-between items-center">
                    <div className="text-right">
                      <span className="font-sans text-sm font-black text-emerald-950 block">المتبقي الصافي (Final Remainder)</span>
                      <span className="text-[10.5px] text-emerald-800 font-sans block mt-1">ما يتم ترحيله أو تذويبه بالدينار الليبي</span>
                    </div>
                    <div className="text-left font-mono">
                      <span className={`text-4xl font-black block text-left text-emerald-950 ${remainderValue < 0 ? 'text-rose-700' : ''}`}>
                        {remainderValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-xs font-sans font-black text-emerald-900 bg-emerald-200/80 px-2.5 py-0.5 rounded inline-block mt-1">EG</span>
                    </div>
                  </div>

                </div>

                {/* Slip footer */}
                <div className="border-t-2 border-dashed border-slate-900 pt-3 text-center text-[10px] text-slate-600 font-bold font-sans">
                  <p>منظومة الإدارة والمقاصة الرقمية الموحدة لشركة عبدو</p>
                  <p className="text-[8.5px] font-mono text-slate-400 mt-1">ULTRA HD 4K SECURITY RECEIPT PRINT</p>
                </div>
              </div>

              {/* TREASURY DISPATCH MODULE */}
              <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Landmark className="w-5 h-5 text-yellow-450" />
                  <h4 className="font-extrabold text-xs text-yellow-450 mb-0">ترحيل وتحويل المتبقي للخزن الليبية</h4>
                </div>
                
                <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                  يدخل هذا المتبقّي البالغ <strong className="font-mono text-emerald-400">{remainderValue.toLocaleString()} EG</strong> بشكل إيجابي للخزينة العامة. 
                  سيقوم النظام بتحويله تلقائياً بسعر تقسيم الصفيحة بالدينار ليظهر بالدفتر كتدفق مالي وارد (+).
                </p>

                {localEgyptRecord.isPostedToTreasury ? (
                  <div className="bg-emerald-950 border border-emerald-500/60 p-4 rounded-2xl text-center text-emerald-400 font-bold text-xs">
                    <Check className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                    <div>تم ترحيل متبقي الحساب بنجاح إلى الخزينة العامة باليوم المقرون! 🚀</div>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => handlePostEgyptRemainderToTreasury(e, remainderValue)}
                    className="space-y-4 text-xs"
                  >
                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">سعر صرف التقسيم (كم جنيه مصري لكل دينار) *</label>
                      <input
                        type="number"
                        required
                        step="any"
                        value={remainderExchangeRate}
                        onChange={(e) => setRemainderExchangeRate(e.target.value)}
                        placeholder="مثال: 10.0"
                        className="w-full text-left bg-slate-950 p-2.5 border border-slate-800 rounded-xl font-bold font-mono text-indigo-200 focus:outline-none focus:border-indigo-400"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">كل {remainderExchangeRate} جنيه مصري تعادل 1 دينار ليبي.</span>
                    </div>

                    {remainderValue > 0 ? (() => {
                      const rateNum = parseFloat(remainderExchangeRate) || 10;
                      const equLyd = Math.round(remainderValue / rateNum);
                      return (
                        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block pb-0.5">المبلغ المضاف دينار ليبي:</span>
                            <span className="font-mono text-md font-extrabold text-yellow-300">{equLyd.toLocaleString()} د.ل</span>
                          </div>
                          <button
                            type="submit"
                            className="bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-slate-950 font-black px-4 py-2.5 rounded-xl transition duration-100 flex items-center gap-1 cursor-pointer"
                          >
                            <span>ترحيل للخزينة (+)</span>
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })() : (
                      <div className="bg-rose-950/20 border border-rose-900/60 p-3 rounded-2xl text-center text-rose-350 text-[10.5px]">
                        ⚠️ لا يتوفر متبقي إيجابي في الحساب ليتم ترحيله إلى الخزينة الآن.
                      </div>
                    )}
                  </form>
                )}
              </div>

            </div>

          </div>
        );
      })()}

    </div>
  );
}
