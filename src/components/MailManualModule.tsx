import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import {
  Coins,
  Camera,
  Check,
  ArrowUpRight,
  RefreshCw,
  Landmark,
  ChevronLeft,
  ChevronRight,
  FileDown
} from 'lucide-react';
import { ERPState, TreasuryTransaction, EgyptianCashRow } from '../types';

interface MailManualModuleProps {
  state: ERPState;
  onUpdateState: (newState: ERPState) => void;
}

export default function MailManualModule({ state, onUpdateState }: MailManualModuleProps) {
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const [localEgyptRecord, setLocalEgyptRecord] = useState<{
    date: string;
    rows: EgyptianCashRow[];
    previousValue: number;
    receivedValue: number;
    isPostedToTreasury?: boolean;
  } | null>(null);

  const [exportingFourRows, setExportingFourRows] = useState(false);
  const fourRowsRef = useRef<HTMLDivElement>(null);
  const [remainderExchangeRate, setRemainderExchangeRate] = useState('10.0');

  useEffect(() => {
    const existing = state.egyptianCashRecords?.find(r => r.date === selectedDay);
    if (existing) {
      const rows = existing.rows.map(r => ({ 
        value: Number(r.value) || 0,
        commission: Number((r as any).commission) || 0
      }));
      while (rows.length < 25) {
        rows.push({ value: 0, commission: 0 });
      }
      setLocalEgyptRecord({
        date: existing.date,
        rows,
        previousValue: Number(existing.previousValue) || 0,
        receivedValue: Number(existing.receivedValue) || 0,
        isPostedToTreasury: existing.isPostedToTreasury || false
      });
    } else {
      let autoPreviousValue = 0;
      if (state.egyptianCashRecords && state.egyptianCashRecords.length > 0) {
        const priorRecords = state.egyptianCashRecords
          .filter(r => r.date < selectedDay)
          .sort((a, b) => b.date.localeCompare(a.date));
        if (priorRecords.length > 0) {
          const lastRecord = priorRecords[0];
          const lastTableTotal = lastRecord.rows.reduce((sum, r) => sum + ((Number(r.value) || 0) - (Number((r as any).commission) || 0)), 0);
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

  const handleEgyptRowChange = (index: number, field: 'value' | 'commission', val: string) => {
    if (!localEgyptRecord) return;
    const numVal = parseFloat(val) || 0;
    const updatedRows = [...localEgyptRecord.rows];
    updatedRows[index] = { ...updatedRows[index], [field]: numVal };

    const newRec = {
      ...localEgyptRecord,
      rows: updatedRows
    };
    setLocalEgyptRecord(newRec);

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

    const others = state.egyptianCashRecords?.filter(r => r.date !== selectedDay) || [];
    onUpdateState({
      ...state,
      egyptianCashRecords: [...others, newRec]
    });
  };

  const generateReferenceNo = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handlePostEgyptRemainderToTreasury = (e: React.FormEvent, remainderAmount: number) => {
    e.preventDefault();
    if (!localEgyptRecord) return;
    const rate = parseFloat(remainderExchangeRate) || 10.0;
    if (rate <= 0) {
      alert('يرجى تحديد سعر صرف صحيح.');
      return;
    }
    if (remainderAmount <= 0) {
      alert('لا يمكن ترحيل قيمة صفرية أو سالبة.');
      return;
    }

    const libMultiplier = Math.round(remainderAmount / rate);
    if (libMultiplier <= 0) {
      alert('القيمة المعادلة صفرية بالدينار الليبي.');
      return;
    }

    const refNo = generateReferenceNo();
    const newTx: TreasuryTransaction = {
      id: `eg_remainder_convert_${Date.now()}`,
      type: 'in',
      amount: libMultiplier,
      currency: 'د.ل',
      conversionRate: 1.0,
      date: new Date().toISOString(),
      referenceNo: refNo,
      source: 'manual_deposit',
      description: `تسوية المصراوية لليوم ${selectedDay} بقيمة ${remainderAmount.toLocaleString('en-US')} بسعر (تقسيم ${rate}) تعادل بالليبي`,
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

    alert(`تم الترحيل بنجاح!\nدخلت الخزينة بقيمة +${libMultiplier.toLocaleString('en-US')} د.ل`);
  };

  const handleExportFourRowsImage = async () => {
    if (!fourRowsRef.current) return;
    setExportingFourRows(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      
      const el = fourRowsRef.current;
      const elWidth = el.offsetWidth || 380;
      const elHeight = el.offsetHeight || 400;

      const dataUrl = await toPng(el, {
        quality: 1.0,
        pixelRatio: 4,
        width: elWidth,
        height: elHeight,
        backgroundColor: '#FFFFFF',
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          margin: '0'
        }
      });
      
      const link = document.createElement('a');
      link.download = `الكشف_النهائي_${selectedDay.replace(/\//g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التصدير كصورة.');
    } finally {
      setExportingFourRows(false);
    }
  };

  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + days);
    setSelectedDay(d.toISOString().slice(0, 10));
  };

  return (
    <div className="w-full space-y-6 text-right animate-fadeIn" dir="rtl">
      
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
            <span className="text-3xl">🇪🇬</span>
            <span>المصراوية</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-stretch md:self-auto justify-between">
          <button
            onClick={() => handleShiftDate(-1)}
            className="p-2 hover:bg-white text-slate-700 hover:text-slate-950 rounded-xl transition cursor-pointer"
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
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!localEgyptRecord ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
        </div>
      ) : (() => {
        const rows = localEgyptRecord.rows;
        const table1GrandTotal = rows.reduce((sum, r) => sum + ((Number(r.value) || 0) - (Number(r.commission) || 0)), 0);

        const previousValue = Number(localEgyptRecord.previousValue) || 0;
        const receivedValue = Number(localEgyptRecord.receivedValue) || 0;
        const remainderValue = (previousValue + receivedValue) - table1GrandTotal;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-7 space-y-4">
              <div className="overflow-x-auto max-h-[850px] overflow-y-auto pr-1 border border-slate-100 rounded-2xl scrollbar-thin">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/90 text-slate-750 font-bold border-b sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="p-3 w-14 border-l border-slate-200 text-center text-slate-500">رقم</th>
                      <th className="p-3 text-center border-l border-slate-200">القيمة</th>
                      <th className="p-3 text-center border-l border-slate-200">العمولة</th>
                      <th className="p-3 text-center">الإجمالي (الصافي)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                    {rows.map((row, idx) => {
                      const netValue = (Number(row.value) || 0) - (Number(row.commission) || 0);

                      return (
                        <tr 
                          key={idx} 
                          className="transition hover:bg-slate-50/50"
                        >
                          <td className="p-2 border-l border-slate-100 text-center text-slate-500 font-semibold bg-slate-50/50">
                            {idx + 1}
                          </td>
                          <td className="p-1 text-center border-l border-slate-100">
                            <input
                              type="number"
                              placeholder="0"
                              step="any"
                              value={row.value || ''}
                              onChange={(e) => handleEgyptRowChange(idx, 'value', e.target.value)}
                              className="w-full text-center py-2 px-3 focus:outline-none border-0 bg-transparent font-bold font-mono text-slate-900"
                            />
                          </td>
                          <td className="p-1 text-center border-l border-slate-100 bg-red-50/30">
                            <input
                              type="number"
                              placeholder="0"
                              step="any"
                              value={row.commission || ''}
                              onChange={(e) => handleEgyptRowChange(idx, 'commission', e.target.value)}
                              className="w-full text-center py-2 px-3 focus:outline-none border-0 bg-transparent font-bold font-mono text-red-900"
                            />
                          </td>
                          <td className="p-2 text-center font-bold text-indigo-900 bg-indigo-50/30">
                            {netValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-right flex items-center justify-between">
                <span className="font-bold text-emerald-800">إجمالي الشغل:</span>
                <span className="text-emerald-950 font-black text-xl font-mono">
                  {table1GrandTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={exportingFourRows}
                  onClick={handleExportFourRowsImage}
                  className="bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-sm px-5 py-3 rounded-2xl cursor-pointer shadow-md flex items-center gap-2 transition-all w-full justify-center"
                >
                  <Camera className="w-5 h-5" />
                  <span>تصدير كصورة (للمشاركة عبر واتساب)</span>
                </button>
              </div>

              <div className="flex justify-center w-full">
                <div
                  ref={fourRowsRef}
                  className="bg-white border-2 border-indigo-900 p-5 rounded-[2rem] relative overflow-hidden select-none"
                  style={{ direction: 'rtl', width: '380px', maxWidth: '100%' }}
                >
                  <div className="text-center pt-2 pb-5 border-b-2 border-slate-100">
                    <h4 className="font-sans font-black text-xl text-indigo-900 tracking-tight">الكشف النهائي للمنظومة الماسيه الملكيه</h4>
                    <div className="mt-2 text-md font-bold text-indigo-800 font-mono">
                      {selectedDay}
                    </div>
                  </div>

                  <div className="py-5 space-y-4">
                    <div className="bg-white border-b border-slate-100 pb-3 flex justify-between items-center px-1 text-slate-800">
                      <div className="text-base font-bold whitespace-nowrap ml-2">القيمة السابقة:</div>
                      <input
                        type="number"
                        placeholder="0"
                        value={localEgyptRecord.previousValue || ''}
                        onChange={(e) => handleEgyptSummaryChange('previousValue', e.target.value)}
                        className="w-1/2 text-left bg-transparent px-1 py-1 text-2xl font-black font-mono focus:outline-none focus:bg-slate-50 rounded text-slate-800"
                        dir="ltr"
                      />
                    </div>

                    <div className="bg-white border-b border-slate-100 pb-3 flex justify-between items-center px-1 text-slate-800">
                      <div className="text-base font-bold whitespace-nowrap ml-2">المستلمة اليوم:</div>
                      <input
                        type="number"
                        placeholder="0"
                        value={localEgyptRecord.receivedValue || ''}
                        onChange={(e) => handleEgyptSummaryChange('receivedValue', e.target.value)}
                        className="w-1/2 text-left bg-transparent px-1 py-1 text-2xl font-black font-mono focus:outline-none focus:bg-slate-50 rounded text-slate-800"
                        dir="ltr"
                      />
                    </div>

                    <div className="bg-white border-b border-slate-100 pb-3 flex justify-between items-center px-1 text-slate-800">
                      <div className="text-base font-bold whitespace-nowrap ml-2">إجمالي الشغل:</div>
                      <div className="text-2xl font-black font-mono text-left dir-ltr">
                        {table1GrandTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    <div className="bg-transparent pt-3 flex justify-between items-center px-1 mt-2 text-fuchsia-800">
                      <div className="text-lg font-black whitespace-nowrap ml-2">الباقي النهائي:</div>
                      <div className={`text-3xl font-black font-mono text-left dir-ltr ${remainderValue < 0 ? 'text-rose-600' : 'text-fuchsia-800'}`}>
                        {remainderValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-4 text-xs font-sans">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Landmark className="w-5 h-5 text-yellow-450" />
                  <h4 className="font-extrabold text-xs text-yellow-450 mb-0">ترحيل للخزنة</h4>
                </div>

                {localEgyptRecord.isPostedToTreasury ? (
                  <div className="bg-emerald-950 border border-emerald-500/60 p-4 rounded-2xl text-center text-emerald-400 font-bold">
                    <Check className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                    <div>تم ترحيل الباقي للخزينة بنجاح</div>
                  </div>
                ) : (
                  <form onSubmit={(e) => handlePostEgyptRemainderToTreasury(e, remainderValue)} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5">سعر صرف التقسيم</label>
                      <input
                        type="number"
                        required
                        step="any"
                        value={remainderExchangeRate}
                        onChange={(e) => setRemainderExchangeRate(e.target.value)}
                        placeholder="مثال: 10.0"
                        className="w-full text-left bg-slate-950 p-2.5 border border-slate-800 rounded-xl font-bold font-mono focus:outline-none"
                      />
                    </div>

                    {remainderValue > 0 ? (
                      <button type="submit" className="w-full bg-yellow-400 text-slate-950 font-black px-4 py-3 rounded-xl flex items-center justify-center gap-1 hover:bg-yellow-500 cursor-pointer transition">
                        <span>ترحيل للخزينة</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="text-center text-slate-500">لا يوجد متبقي إيجابي للترحيل.</div>
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

