import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar, Calculator, Check, Copy, Download, X, Eye, FileText, Smartphone } from 'lucide-react';
import { toPng } from 'html-to-image';
import { ERPState } from '../types';

interface PurchasesModuleProps {
  state: ERPState;
  onUpdateState: (newState: ERPState) => void;
  onOpenExporter: (section: string, metrics: any, headers: string[], rows: any[][]) => void;
}

interface PurchaseRow {
  id: string;
  seq: number;
  type: string;    // النوع
  value: number;   // القيمة (مستور مالي صحيح)
  op: 'multiply' | 'divide'; // ضرب أو قسمة
  rate: number;    // السعر / نسبة التحويل (يمكن أن تكون عشرية كالصرف)
  result: number;  // الناتج المعادل (مستور مالي صحيح)
  paid: number;    // المسدد اليوم د.ل (مستور مالي صحيح)
  remaining: number; // باقي القيد د.ل (مستور مالي صحيح)
}

interface ConsumerRow {
  id: string;
  name: string;
  amount: number;
}

interface MerchantPurchaseState {
  previousBalance: number;
  rows: PurchaseRow[];
  manualConsumerValue: number; // المبلغ الإجمالي للمستهلك بالمصري المدخل يدوياً
  consumerRows?: ConsumerRow[]; // المستهلكين المنفصلين لقيمة فودافون كاش
}

const DEFAULT_STATE: Record<string, MerchantPurchaseState> = {
  baqy: {
    previousBalance: 1500,
    rows: [
      { id: 'b_row_1', seq: 1, type: 'فودافون كاش وارد', value: 100000, op: 'divide', rate: 10.0, result: 10000, paid: 2000, remaining: 8000 },
      { id: 'b_row_2', seq: 2, type: 'بضاعة وتوريد كوابل', value: 3000, op: 'multiply', rate: 1.0, result: 3000, paid: 3000, remaining: 0 }
    ],
    manualConsumerValue: 35000,
    consumerRows: [
      { id: 'b_c_1', name: 'المستهلك الأول', amount: 20000 },
      { id: 'b_c_2', name: 'المستهلك الثاني', amount: 15000 },
      { id: 'b_c_3', name: 'المستهلك الثالث', amount: 0 }
    ]
  },
  semsem: {
    previousBalance: 500,
    rows: [
      { id: 's_row_1', seq: 1, type: 'كروت شحن جملة', value: 2500, op: 'multiply', rate: 1.0, result: 2500, paid: 1500, remaining: 1000 },
      { id: 's_row_2', seq: 2, type: 'فودافون خطوط مميزة', value: 50000, op: 'divide', rate: 12.5, result: 4000, paid: 3000, remaining: 1000 }
    ],
    manualConsumerValue: 20000,
    consumerRows: [
      { id: 's_c_1', name: 'المستهلك الأول', amount: 10000 },
      { id: 's_c_2', name: 'المستهلك الثاني', amount: 10000 },
      { id: 's_c_3', name: 'المستهلك الثالث', amount: 0 }
    ]
  }
};

export default function PurchasesModule({ state, onUpdateState, onOpenExporter }: PurchasesModuleProps) {
  // Merchant switcher tab: 'baqy' (الباقي) or 'semsem' (سمسم)
  const [activeMerch, setActiveMerch] = useState<'baqy' | 'semsem'>('baqy');
  
  // State for Egypt currency exchange transfer rate
  const [egTransferRate, setEgTransferRate] = useState<string>('1.0');
  
  // States for the new Giant HD Capture modal
  const [showHdModal, setShowHdModal] = useState(false);
  const [copiedHd, setCopiedHd] = useState(false);
  const [generatingHd, setGeneratingHd] = useState(false);
  const hdCardsRef = useRef<HTMLDivElement>(null);

  // Generate and save Full HD cards
  const saveHdCardsImage = async () => {
    if (!hdCardsRef.current) return;
    setGeneratingHd(true);
    try {
      const dataUrl = await toPng(hdCardsRef.current, {
        pixelRatio: 3, // Full HD / 4K level crisp scale
        style: {
          transform: 'scale(1)',
        }
      });
      const link = document.createElement('a');
      const filename = `Daily_Cards_${activeMerch.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating image', err);
      alert('حدث خطأ أثناء تصوير الكروت، يرجى المحاولة لاحقاً.');
    } finally {
      setGeneratingHd(false);
    }
  };

  // Generate and copy to clipboard
  const copyHdCardsToClipboard = async () => {
    if (!hdCardsRef.current) return;
    setGeneratingHd(true);
    try {
      const dataUrl = await toPng(hdCardsRef.current, {
        pixelRatio: 3,
        style: {
          transform: 'scale(1)',
        }
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopiedHd(true);
      setTimeout(() => setCopiedHd(false), 3005);
    } catch (err) {
      console.error('Error copying to clipboard', err);
      saveHdCardsImage();
    } finally {
      setGeneratingHd(false);
    }
  };

  const [merchStates, setMerchStates] = useState<Record<string, MerchantPurchaseState>>(() => {
    try {
      const saved = localStorage.getItem('ABDO_DAILY_PURCHASES_V3');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure manualConsumerValue & consumerRows are present
        Object.keys(parsed).forEach(k => {
          if (typeof parsed[k].manualConsumerValue !== 'number') {
            parsed[k].manualConsumerValue = 0;
          }
          if (!parsed[k].consumerRows) {
            parsed[k].consumerRows = [
              { id: `${k}_c_1`, name: 'المستهلك الأول', amount: parsed[k].manualConsumerValue || 0 },
              { id: `${k}_c_2`, name: 'المستهلك الثاني', amount: 0 },
              { id: `${k}_c_3`, name: 'المستهلك الثالث', amount: 0 }
            ];
          }
          if (parsed[k].previousBalance) {
            parsed[k].previousBalance = Math.round(parsed[k].previousBalance);
          }
          if (parsed[k].rows) {
            parsed[k].rows = parsed[k].rows.map((r: any) => ({
              ...r,
              value: Math.round(r.value || 0),
              result: Math.round(r.result || 0),
              paid: Math.round(r.paid || 0),
              remaining: Math.round(r.remaining || 0)
            }));
          }
        });
        return parsed;
      }
    } catch (e) {
      console.error('Error loading daily purchases from localStorage', e);
    }
    return DEFAULT_STATE;
  });

  // Keep localStorage synced
  useEffect(() => {
    localStorage.setItem('ABDO_DAILY_PURCHASES_V3', JSON.stringify(merchStates));
  }, [merchStates]);

  const currentData = merchStates[activeMerch] || { previousBalance: 0, rows: [], manualConsumerValue: 0, consumerRows: [] };

  // Helper to update active merchant's state
  const updateCurrentMerchantState = (updater: (prev: MerchantPurchaseState) => MerchantPurchaseState) => {
    setMerchStates(prev => ({
      ...prev,
      [activeMerch]: updater(prev[activeMerch] || { previousBalance: 0, rows: [], manualConsumerValue: 0, consumerRows: [] })
    }));
  };

  // Inputs inside row changed - enforce whole numbers
  const handleRowChange = (rowId: string, field: keyof PurchaseRow, val: any) => {
    updateCurrentMerchantState(prev => {
      const updatedRows = prev.rows.map(r => {
        if (r.id !== rowId) return r;
        
        let newRow = { ...r };
        
        if (field === 'value') {
          newRow.value = Math.round(Number(val) || 0);
        } else if (field === 'paid') {
          newRow.paid = Math.round(Number(val) || 0);
        } else if (field === 'rate') {
          newRow.rate = Number(val) || 0;
        } else {
          newRow = { ...r, [field]: val };
        }
        
        // Recalculate result
        const valueNum = Number(newRow.value) || 0;
        const rateNum = Number(newRow.rate) || 0;
        if (newRow.op === 'multiply') {
          newRow.result = Math.round(valueNum * rateNum);
        } else {
          newRow.result = rateNum !== 0 ? Math.round(valueNum / rateNum) : 0;
        }
        
        // Recalculate remaining
        const paidNum = Number(newRow.paid) || 0;
        newRow.remaining = Math.round(newRow.result - paidNum);
        
        return newRow;
      });
      return { ...prev, rows: updatedRows };
    });
  };

  // Add New Row
  const handleAddRow = () => {
    updateCurrentMerchantState(prev => {
      const nextSeq = prev.rows.length > 0 ? Math.max(...prev.rows.map(r => r.seq)) + 1 : 1;
      const newRow: PurchaseRow = {
        id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        seq: nextSeq,
        type: '',
        value: 0,
        op: 'divide',
        rate: 10.0,
        result: 0,
        paid: 0,
        remaining: 0
      };
      return {
        ...prev,
        rows: [...prev.rows, newRow]
      };
    });
  };

  // Delete row
  const handleDeleteRow = (rowId: string) => {
    updateCurrentMerchantState(prev => ({
      ...prev,
      rows: prev.rows.filter(r => r.id !== rowId)
    }));
  };

  // Update Previous Balance
  const handleUpdatePreviousBalance = (val: number) => {
    updateCurrentMerchantState(prev => ({
      ...prev,
      previousBalance: Math.round(val)
    }));
  };

  const consumerRows = currentData.consumerRows || [
    { id: 'c_1', name: 'المستهلك الأول', amount: 0 },
    { id: 'c_2', name: 'المستهلك الثاني', amount: 0 },
    { id: 'c_3', name: 'المستهلك الثالث', amount: 0 }
  ];

  const handleUpdateConsumerRow = (id: string, amount: number) => {
    updateCurrentMerchantState(prev => {
      const rows = prev.consumerRows || [
        { id: 'c_1', name: 'المستهلك الأول', amount: prev.manualConsumerValue || 0 },
        { id: 'c_2', name: 'المستهلك الثاني', amount: 0 },
        { id: 'c_3', name: 'المستهلك الثالث', amount: 0 }
      ];
      const updated = rows.map(r => r.id === id ? { ...r, amount: Math.round(amount) } : r);
      const newSum = updated.reduce((sum, r) => sum + r.amount, 0);
      return {
        ...prev,
        consumerRows: updated,
        manualConsumerValue: newSum
      };
    });
  };

  const handleUpdateConsumerName = (id: string, name: string) => {
    updateCurrentMerchantState(prev => {
      const rows = prev.consumerRows || [
        { id: 'c_1', name: 'المستهلك الأول', amount: prev.manualConsumerValue || 0 },
        { id: 'c_2', name: 'المستهلك الثاني', amount: 0 },
        { id: 'c_3', name: 'المستهلك الثالث', amount: 0 }
      ];
      const updated = rows.map(r => r.id === id ? { ...r, name } : r);
      return {
        ...prev,
        consumerRows: updated
      };
    });
  };

  // Helper to determine if a row is a Vodafone row
  const isVodafoneRow = (type: string) => {
    if (!type) return false;
    return type.includes('فودافون') || type.toLowerCase().includes('vodafone');
  };

  // 1. القيمة السابقة
  const prevBalance = Math.round(currentData.previousBalance || 0);

  // 2. إجمالي شغل اليوم (مجموع القيمة المقيدة بالدينار لكل المعاملات، اللي هي مجموع result)
  const totalTodayWork = currentData.rows.reduce((sum, r) => sum + r.result, 0);

  // 3. القيمة المسددة اليوم (مجموع المسدد بالدينار لكل المعاملات)
  const totalPaidToday = currentData.rows.reduce((sum, r) => sum + r.paid, 0);

  // 4. الباقي من شغل اليوم (الدين الإجمالي المترصد)
  // حسبة معتمدة: (السابقة + شغل اليوم) - المسدد
  const remainingTotalOwed = prevBalance + totalTodayWork - totalPaidToday;

  // 5. إجمالي مبالغ المستهلكين المدخلة يدوياً
  const totalConsumerValue = consumerRows.reduce((sum, r) => sum + r.amount, 0);

  // 6. المجموع الكلي لفودافون كاش المقيد بالجدول بالجنيه
  const totalVodafoneBase = currentData.rows
    .filter(r => isVodafoneRow(r.type))
    .reduce((sum, r) => sum + r.value, 0);

  // 7. القيمة المصرية الباقية من فودافون كاش (الكارت الخامس)
  const remainingEgyptianValue = totalVodafoneBase - totalConsumerValue;

  const handleExportToPdf = () => {
    const merchTitle = activeMerch === 'baqy' ? 'التاجر الباقي' : 'التاجر سمسم';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('تم حظر فتح النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة لتصدير ملف الـ PDF.');
      return;
    }
    
    const htmlContent = `
      <html dir="rtl" lang="ar">
        <head>
          <title>كشف حساب مشتريات يومي - ${merchTitle}</title>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #111;
              background-color: #fff;
              padding: 40px;
              margin: 0;
              direction: rtl;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 4px solid #111;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 26px;
              font-weight: bold;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 14px;
              color: #444;
            }
            .metadata {
              text-align: left;
              font-size: 13px;
              line-height: 1.6;
            }
            .cards-grid {
              display: grid;
              grid-template-cols: repeat(5, 1fr);
              gap: 15px;
              margin-bottom: 40px;
            }
            .card {
              border: 2px solid #111;
              border-radius: 12px;
              padding: 15px;
              background-color: #fbfbfb;
            }
            .card-title {
              font-size: 11px;
              font-weight: bold;
              color: #444;
              margin-bottom: 5px;
            }
            .card-value {
              font-size: 18px;
              font-weight: bold;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-top: 30px;
              margin-bottom: 15px;
              border-bottom: 2px solid #111;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              font-size: 13px;
            }
            th, td {
              border: 1px solid #111;
              padding: 10px;
              text-align: center;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>عبدو للمنظومات الرقمية</h1>
              <p>كشف حساب مشتريات يومي للذمم والعملات • ${merchTitle}</p>
            </div>
            <div class="metadata">
              <strong>تاريخ الاستخراج:</strong> ${new Date().toLocaleDateString('ar-LY')} <br/>
              <strong>الوقت:</strong> ${new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div class="cards-grid">
            <div class="card">
              <div class="card-title">📝 1. القيمة السابقة</div>
              <div class="card-value">${prevBalance.toLocaleString()} د.ل</div>
            </div>
            <div class="card">
              <div class="card-title">⚡ 2. إجمالي شغل اليوم</div>
              <div class="card-value">${totalTodayWork.toLocaleString()} د.ل</div>
            </div>
            <div class="card">
              <div class="card-title">🟢 3. القيمة المسددة</div>
              <div class="card-value">${totalPaidToday.toLocaleString()} د.ل</div>
            </div>
            <div class="card" style="border: 3px solid #000; background-color: #f0f4ff;">
              <div class="card-title" style="color: #000;">🎒 4. الباقي من شغل اليوم</div>
              <div class="card-value" style="font-size: 20px;">${remainingTotalOwed.toLocaleString()} د.ل</div>
            </div>
            <div class="card" style="background-color: #faf5ff;">
              <div class="card-title">🇪🇬 5. القيمة المصرية الباقية</div>
              <div class="card-value" style="color: #6b21a8;">${remainingEgyptianValue.toLocaleString()} جنيه</div>
            </div>
          </div>

          <div class="section-title">👤 تفاصيل وسحوبات فودافون كاش للمستهلك:</div>
          <table style="max-width: 500px;">
            <thead>
              <tr>
                <th>توصيف المستهلك لسحب كاش</th>
                <th>القيمة بالإيجيبشن (جنيه مصري)</th>
              </tr>
            </thead>
            <tbody>
              ${consumerRows.map(c => `
                <tr>
                  <td>${c.name}</td>
                  <td>${c.amount.toLocaleString()} جنيه مصري</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #e9d5ff;">
                <td>إجمالي المجهود المخصوم العام</td>
                <td>${totalConsumerValue.toLocaleString()} جنيه مصري</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">📊 تفاصيل جدول معاملات التوريد والمشتريات:</div>
          <table>
            <thead>
              <tr>
                <th>ت</th>
                <th>نوع المعاملة والبيان</th>
                <th>القيمة بالكامل</th>
                <th>العملية الحسابية</th>
                <th>سعر العملة / التحويل</th>
                <th>الناتج المعادل اليومي</th>
                <th>المسدد اليوم نقداً</th>
                <th>المتبقي بالدينار</th>
              </tr>
            </thead>
            <tbody>
              ${currentData.rows.map(r => `
                <tr>
                  <td>${r.seq}</td>
                  <td>${r.type || 'غير محمد'}</td>
                  <td>${r.value.toLocaleString()}</td>
                  <td>${r.op === 'multiply' ? 'ضرب (✖)' : 'قسمة (➗)'}</td>
                  <td>${r.rate}</td>
                  <td style="font-weight: bold;">${r.result.toLocaleString()} د.ل</td>
                  <td style="color: green;">${r.paid.toLocaleString()} د.ل</td>
                  <td style="font-weight: bold; color: #1e1b4b;">${r.remaining.toLocaleString()} د.ل</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="font-size: 11px; color: #555; text-align: center; margin-top: 50px; border-top: 1px solid #111; padding-top: 15px;">
            تم توليد المستند وحفظه تلقائياً بصيغة PDF عالية الوضوح بنجاح عبر نظام عبدو لبرمجيات الـ ERP المتكاملة.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Rollover (ترحيل)
  const [showRolloverConfirm, setShowRolloverConfirm] = useState(false);

  const handlePerformRollover = () => {
    setShowRolloverConfirm(true);
  };

  const executePerformRollover = () => {
    updateCurrentMerchantState(prev => ({
      ...prev,
      previousBalance: remainingTotalOwed,
      rows: [],
      manualConsumerValue: 0,
      consumerRows: [
        { id: `${activeMerch}_c_1`, name: 'المستهلك الأول', amount: 0 },
        { id: `${activeMerch}_c_2`, name: 'المستهلك الثاني', amount: 0 },
        { id: `${activeMerch}_c_3`, name: 'المستهلك الثالث', amount: 0 }
      ]
    }));
    setShowRolloverConfirm(false);
  };

  const handleTransferEgyptToTreasury = () => {
    if (remainingEgyptianValue <= 0) {
      alert('لا توجد قيمة مصرية متبقية لترحيلها حالياً.');
      return;
    }
    
    const rate = parseFloat(egTransferRate) || 1.0;
    if (rate <= 0) {
      alert('يرجى إدخال سعر تحويل صحيح أكبر من الصفر.');
      return;
    }
    
    const lydEquivalent = Math.round(remainingEgyptianValue / rate);
    if (lydEquivalent <= 0) {
      alert('القيمة المعادلة بالدينار الليبي ضئيلة جداً.');
      return;
    }

    const refNo = `TX-TR-${Date.now().toString().slice(-6)}`;
    const merchTitle = activeMerch === 'baqy' ? 'البيان' : 'سمسم';
    
    const newTx = {
      id: `settle_egypt_auto_${Date.now()}`,
      type: 'in' as const,
      amount: lydEquivalent,
      currency: 'د.ل',
      conversionRate: 1.0,
      date: new Date().toISOString(),
      referenceNo: refNo,
      source: 'manual_deposit' as const,
      description: `صرف عملة فودافون كاش (${remainingEgyptianValue.toLocaleString()} جنيه تقسيم سعر ${rate}) لـ (${merchTitle}) كأثر مالي إيجابي بالخزينة`,
      createdAt: new Date().toISOString()
    };

    onUpdateState({
      ...state,
      treasuryTransactions: [...state.treasuryTransactions, newTx]
    });

    alert(`تم ترحيل وصرف القيمة بنجاح بقيمة +${lydEquivalent.toLocaleString()} د.ل بالخزينة لكونها إضافة إيجابية للجهة! 🎉`);
  };

  // WhatsApp Exporter
  const handleExportDailyImage = () => {
    const headers = ['ت', 'نوع المعاملة', 'القيمة بالكامل', 'العملية', 'سعر العملة', 'الناتج المعادل', 'المسدد اليوم', 'باقي القيد د.ل'];
    const rows = currentData.rows.map(r => [
      r.seq.toString(),
      r.type || 'غير محدد',
      r.value.toLocaleString() + ' مصري',
      r.op === 'multiply' ? 'ضرب (✖)' : 'قسمة (➗)',
      r.rate.toLocaleString(),
      r.result.toLocaleString() + ' د.ل',
      r.paid.toLocaleString() + ' د.ل',
      r.remaining.toLocaleString() + ' د.ل'
    ]);

    const merchTitle = activeMerch === 'baqy' ? 'البيان' : 'سمسم';

    onOpenExporter(
      `كشف المشتريات اليومية لشغل (${merchTitle})`,
      {
        label1: 'القيمة السابقة د.ل',
        value1: prevBalance.toLocaleString() + ' د.ل',
        label2: 'إجمالي الشغل والمدفوع اليوم',
        value2: `${totalTodayWork.toLocaleString()} د.ل (مسدد: ${totalPaidToday.toLocaleString()})`,
        label3: 'المتبقي لـ فودافون كاش',
        value3: `${remainingEgyptianValue.toLocaleString()} جنيه`
      },
      headers,
      rows
    );
  };

  return (
    <div className="space-y-5 text-right font-sans" dir="rtl">
      
      {/* Tab Switcher & HD Capture Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-transparent text-right">
        
        {/* Toggle Switch */}
        <div className="flex items-center bg-slate-200/60 p-1.5 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveMerch('baqy')}
            className={`px-8 py-2.5 rounded-lg font-black text-xs transition duration-150 cursor-pointer ${
              activeMerch === 'baqy'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            البيان (Al Bayan)
          </button>
          <button
            type="button"
            onClick={() => setActiveMerch('semsem')}
            className={`px-8 py-2.5 rounded-lg font-black text-xs transition duration-150 cursor-pointer ${
              activeMerch === 'semsem'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            سمسم (Simsim)
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* HD Camera Button to bring the five cards to screen as requested */}
          <button
            type="button"
            onClick={() => setShowHdModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl cursor-pointer flex items-center gap-1.5 transition whitespace-nowrap shadow-md shadow-emerald-600/20"
            title="تصوير الكروت الخمسة للزبائن والتاجر بجودة Full HD الخارقة"
          >
            <Smartphone className="w-4 h-4 text-emerald-100 animate-pulse" />
            <span>تصوير الكروت الخمسة 📸 Full HD</span>
          </button>

          <button
            type="button"
            onClick={handlePerformRollover}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-4 py-3 rounded-xl cursor-pointer flex items-center gap-1.5 transition whitespace-nowrap shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            <span>ترحيل الحساب الحالي 🔄</span>
          </button>

          <button
            type="button"
            onClick={handleExportDailyImage}
            className="bg-slate-800 hover:bg-slate-750 text-slate-100 font-extrabold text-xs px-4 py-3 rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <span>حفظ وتصدير كشف كامل 📸</span>
          </button>
        </div>
      </div>

      {/* The 5 Custom Analytical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-slate-700 flex flex-col justify-between">
          <div>
            <span className="text-slate-500 font-bold text-[11px] block mb-1">📝 1. القيمة السابقة</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="1"
                value={prevBalance}
                onChange={(e) => handleUpdatePreviousBalance(parseFloat(e.target.value) || 0)}
                className="font-mono text-xl font-bold text-slate-800 w-full border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-right"
                placeholder="0"
              />
              <span className="text-xs font-bold text-slate-400 shrink-0">د.ل</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">* قيمة الدين القديم المترحل من كشف اليوم السابق.</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-amber-600 flex flex-col justify-between">
          <div>
            <span className="text-slate-500 font-bold text-[11px] block mb-1">⚡ 2. إجمالي شغل اليوم</span>
            <span className="font-mono text-xl font-black text-amber-600 block leading-tight mt-1">
              {totalTodayWork.toLocaleString()} <span className="text-xs font-extrabold">د.ل</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-2">* مجموع باقي القيود من جدول التوريد والعمليات الحسابية.</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-emerald-600 flex flex-col justify-between">
          <div>
            <span className="text-slate-500 font-bold text-[11px] block mb-1">🟢 3. القيمة المسددة</span>
            <span className="font-mono text-xl font-black text-emerald-700 block leading-tight mt-1">
              {totalPaidToday.toLocaleString()} <span className="text-xs font-extrabold">د.ل</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-2">* قيمة الكاش المسجل كدفعات تحت الحساب.</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-indigo-600 flex flex-col justify-between">
          <div>
            <span className="text-slate-500 font-bold text-[11px] block mb-1">🎒 4. الباقي من شغل اليوم</span>
            <span className="font-mono text-xl font-black text-indigo-750 block leading-tight mt-1">
              {remainingTotalOwed.toLocaleString()} <span className="text-xs font-extrabold">د.ل</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-2">الحسبة: (السابقة + شغل اليوم) - المسدد</p>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm border-l-4 border-l-purple-600 flex flex-col justify-between">
          <div>
            <span className="text-purple-900 font-extrabold text-[11px] block mb-1">🇪🇬 5. القيمة المصرية الباقية</span>
            <span className={`${remainingEgyptianValue < 0 ? 'text-rose-600' : 'text-purple-750'} font-mono text-xl font-black block leading-tight mt-1`}>
              {remainingEgyptianValue.toLocaleString()} <span className="text-xs font-extrabold">جنيه</span>
            </span>
            <p className="text-[10px] text-purple-500/80 mt-2">* المتبقي بعد طرح المستهلك من قيمة فودافون بالجدول.</p>
          </div>
        </div>
      </div>

      {/* Egypt Consumers Panel */}
      <div className="bg-gradient-to-r from-slate-900 to-purple-950 p-5 rounded-2xl border border-purple-800 shadow-md text-white text-right">
        <div className="mb-4">
          <h4 className="font-extrabold text-xs text-purple-200 flex items-center gap-1.5">
            <span>⚙️ لوحة تصفية وسحب فودافون كاش - المستهلكين المنفصلين</span>
          </h4>
          <p className="text-[10.5px] text-slate-400 mt-1">
            أدخل قيمة كل مستهلك على حدة (بالجنيه المصري EG) في الحقول المستقلة أدناه. سيتم احتساب مجموعهم تلقائياً وطرحه من قيمة فودافون لإصدار الكارت الخامس.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {consumerRows.map((row) => (
            <div key={row.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 focus-within:border-purple-500 transition-all">
              <label className="text-[10px] font-bold text-purple-300">اسم/وصف المستهلك:</label>
              <input
                type="text"
                value={row.name}
                onChange={(e) => handleUpdateConsumerName(row.id, e.target.value)}
                className="bg-slate-900/40 text-white font-bold p-1.5 rounded text-xs border border-slate-800 focus:outline-none focus:border-purple-600 focus:bg-slate-900 text-right w-full"
                placeholder="اسم المستهلك..."
              />
              <label className="text-[10px] font-bold text-slate-400 mt-1">القيمة المخصومة (جنيه مصرى):</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={row.amount || ''}
                  onChange={(e) => handleUpdateConsumerRow(row.id, parseFloat(e.target.value) || 0)}
                  className="bg-slate-900/40 text-purple-200 font-extrabold font-mono p-2 pr-12 rounded text-xs border border-slate-800 focus:outline-none focus:border-purple-600 focus:bg-slate-900 text-left w-full"
                  placeholder="0"
                />
                <span className="absolute left-2.5 top-2 text-[8.5px] font-bold text-slate-500">جنيه</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 font-sans">
            <span className="text-slate-400 font-bold">إجمالي قيمة سحب المستهلكين:</span>
            <span className="bg-purple-900/60 border border-purple-700 font-mono text-purple-200 font-black px-3 py-1 rounded-lg text-sm">
              {totalConsumerValue.toLocaleString()} جنيه مصري
            </span>
          </div>
          <div className="text-[10px] text-slate-400 italic">
            * هذا الإجمالي يُطرح تلقائياً من إجمالي فودافون كاش البالغ بالجنيه ({totalVodafoneBase.toLocaleString()} جنيه) لحساب صافي القيمة المصرية.
          </div>
        </div>
      </div>

      {/* Table 1: Daily Work Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="font-bold text-slate-950 text-xs">جدول قيود وتفاصيل عمليات المشتريات اليومية</h3>
          </div>
          <button
            type="button"
            onClick={handleAddRow}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة معاملة شغل جديدة ➕</span>
          </button>
        </div>

        {currentData.rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-xs">لا توجد أي قيود شغل مسجلة اليوم.</p>
            <button
              onClick={handleAddRow}
              className="mt-3 bg-slate-100 hover:bg-indigo-50 border text-indigo-750 font-bold text-[11px] px-3.5 py-2 rounded-lg"
            >
              انقر هنا للبدء وإضافة أول قيد شغل 📝
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50 border-b text-slate-700 font-extrabold">
                <tr>
                  <th className="p-3 border-l font-bold text-center w-12 bg-slate-100">ت</th>
                  <th className="p-3 border-l">النوع (البيان)</th>
                  <th className="p-3 border-l text-center w-36">القيمة بالكامل (مصري)</th>
                  <th className="p-3 border-l text-center w-40">العملية الحسابية [ضرب/قسمة]</th>
                  <th className="p-3 border-l text-center w-28">سعر الصرف</th>
                  <th className="p-3 border-l text-right w-36">الناتج المعادل د.ل</th>
                  <th className="p-3 border-l text-center w-32 font-bold text-emerald-800">المسدد اليوم د.ل</th>
                  <th className="p-3 border-l text-right w-32 font-bold text-indigo-800">باقي القيد د.ل</th>
                  <th className="p-3 text-center w-16">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700 text-[11.5px]">
                {currentData.rows.map((row) => {
                  const isVod = isVodafoneRow(row.type);
                  return (
                    <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${isVod ? 'bg-purple-50/30 font-bold' : ''}`}>
                      <td className="p-3 border-l text-center font-bold bg-slate-50/50 w-12 text-slate-400">
                        {row.seq}
                      </td>
                      <td className="p-2 border-l relative min-w-[150px]">
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            value={row.type}
                            onChange={(e) => handleRowChange(row.id, 'type', e.target.value)}
                            placeholder="حدد النوع (مثال: فودافون، بضاعة...)"
                            className="w-full text-right bg-transparent p-1.5 focus:border-indigo-400 border border-slate-200 focus:bg-white rounded-lg text-xs font-sans font-bold text-slate-900"
                          />
                          {isVod && (
                            <span className="absolute left-2.5 bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              🇪🇬 فودافون
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 border-l w-36 text-center">
                        <input
                          type="number"
                          step="1"
                          value={row.value || ''}
                          onChange={(e) => handleRowChange(row.id, 'value', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full text-center bg-transparent p-1.5 focus:border-indigo-400 border border-slate-200 focus:bg-white rounded-lg text-xs font-bold text-slate-900"
                        />
                      </td>
                      <td className="p-2 border-l w-40 text-center">
                        <div className="flex items-center justify-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleRowChange(row.id, 'op', 'divide')}
                            className={`flex-1 text-center py-1 rounded-md text-[10px] font-extrabold transition-all duration-150 cursor-pointer ${
                              row.op === 'divide'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            ➗ قسمة
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRowChange(row.id, 'op', 'multiply')}
                            className={`flex-1 text-center py-1 rounded-md text-[10px] font-extrabold transition-all duration-150 cursor-pointer ${
                              row.op === 'multiply'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            ✖ ضرب
                          </button>
                        </div>
                      </td>
                      <td className="p-2 border-l w-28 text-center">
                        <input
                          type="number"
                          step="any"
                          value={row.rate || ''}
                          onChange={(e) => handleRowChange(row.id, 'rate', parseFloat(e.target.value) || 0)}
                          placeholder="1.0"
                          className="w-full text-center bg-transparent p-1.5 focus:border-indigo-400 border border-slate-200 focus:bg-white rounded-lg text-xs font-bold text-slate-900"
                        />
                      </td>
                      <td className="p-3 border-l text-right font-bold text-slate-900 bg-slate-50/20 w-36">
                        {row.result.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">د.ل</span>
                      </td>
                      <td className="p-2 border-l w-32 bg-emerald-50/20">
                        <input
                          type="number"
                          step="1"
                          value={row.paid || ''}
                          onChange={(e) => handleRowChange(row.id, 'paid', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full text-center p-1.5 border border-emerald-200 focus:border-emerald-500 focus:bg-white rounded-lg text-xs font-bold text-emerald-950 bg-emerald-50/30"
                        />
                      </td>
                      <td className="p-3 border-l text-right font-black text-indigo-900 bg-indigo-50/20 w-32 font-mono">
                        {row.remaining.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">د.ل</span>
                      </td>
                      <td className="p-2 text-center w-16">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-slate-300 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all"
                          title="حذف القيد الحالي"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-650 leading-relaxed text-right animate-none">
        💡 <strong className="text-slate-900">نظام فودافون كاش الذكي:</strong> أي سطر بالجدول يحتوي على كلمة <span className="text-purple-700 font-bold">"فودافون"</span> أو <span className="text-purple-700 font-bold">"Vodafone"</span> في حقل البيان، يتم سحب قيمته تلقائياً بالجنيه وإضافته لمجموع فودافون الكلي بالجدول (المجموع الحالي: {totalVodafoneBase.toLocaleString()} جنيه)، ليتم موازنته مع مسحوبات المستهلكين.
      </div>

      {/* 📸 AMAZING FULL HD 5-CARDS CAPTURE MODAL - Brings the five cards visually perfectly to the screen with high layout quality */}
      {showHdModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col transition-all transform scale-100">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                <h3 className="font-sans font-black text-xs">شاشة تصوير الكروت الخمسة عالية الوضوح واللمعان | 5 Work Cards HD Live View</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHdModal(false)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body & Live High Definition Preview Render Stage */}
            <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-950 flex flex-col items-center">
              
              <p className="text-xs text-slate-400 mb-4 font-sans text-center">
                هذه النسخة المدمرة بصريًا مهيأة للنسخ المباشر أو التحميل بدقة <strong className="text-emerald-400">Full HD (300% DPI Pixel-Ratio)</strong> لمشاركتها على واتساب والمنصات.
              </p>

              {/* 📷 CRISP STAGE (To Be Captured) */}
              <div className="w-full overflow-auto p-2 flex justify-center bg-slate-905">
                <div 
                  ref={hdCardsRef}
                  className="bg-slate-900 p-8 rounded-2xl border-2 border-slate-700 font-sans text-right text-white relative shadow-2xl shrink-0"
                  style={{ width: '900px', minWidth: '900px', direction: 'rtl', boxSizing: 'border-box' }}
                >
                  {/* Grid of the exactly Five Cards with spectacular clean design */}
                  <div className="grid grid-cols-5 gap-3.5 font-sans">
                    
                    {/* Card 1 */}
                    <div className="bg-slate-950 border-2 border-slate-700 rounded-xl p-5 flex flex-col justify-between text-center min-h-[120px] shadow-lg">
                      <div>
                        <span className="text-slate-300 font-black text-xs block mb-3 text-center border-b border-slate-800 pb-2">📝 1. القيمة السابقة</span>
                        <span className="font-mono text-xl font-extrabold text-white block mt-1 tracking-wide">
                          {prevBalance.toLocaleString()} <span className="text-xs text-slate-400 font-bold">د.ل</span>
                        </span>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-slate-950 border-2 border-amber-600/85 rounded-xl p-5 flex flex-col justify-between text-center min-h-[120px] shadow-lg">
                      <div>
                        <span className="text-amber-300 font-black text-xs block mb-3 text-center border-b border-amber-950 pb-2">⚡ 2. إجمالي الشغل</span>
                        <span className="font-mono text-xl font-extrabold text-amber-400 block mt-1 tracking-wide animate-none">
                          {totalTodayWork.toLocaleString()} <span className="text-xs text-amber-500 font-bold">د.ل</span>
                        </span>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-slate-950 border-2 border-emerald-600/85 rounded-xl p-5 flex flex-col justify-between text-center min-h-[120px] shadow-lg">
                      <div>
                        <span className="text-emerald-300 font-black text-xs block mb-3 text-center border-b border-emerald-950 pb-2">🟢 3. القيمة المسددة</span>
                        <span className="font-mono text-xl font-extrabold text-emerald-400 block mt-1 tracking-wide">
                          {totalPaidToday.toLocaleString()} <span className="text-xs text-emerald-500 font-bold">د.ل</span>
                        </span>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-slate-950 border-2 border-indigo-600 rounded-xl p-5 flex flex-col justify-between text-center min-h-[120px] shadow-lg">
                      <div>
                        <span className="text-indigo-300 font-black text-xs block mb-3 text-center border-b border-indigo-950 pb-2">🎒 4. الباقي من الشغل</span>
                        <span className="font-mono text-xl font-extrabold text-indigo-400 block mt-1 tracking-wide">
                          {remainingTotalOwed.toLocaleString()} <span className="text-xs text-indigo-400 font-bold">د.ل</span>
                        </span>
                      </div>
                    </div>

                    {/* Card 5 */}
                    <div className="bg-slate-950 border-2 border-purple-600 rounded-xl p-5 flex flex-col justify-between text-center min-h-[120px] shadow-lg">
                      <div>
                        <span className="text-purple-300 font-black text-xs block mb-3 text-center border-b border-purple-950 pb-2">🇪🇬 5. الباقية مصري</span>
                        <span className="font-mono text-xl font-extrabold text-purple-400 block mt-1 tracking-wide">
                          {remainingEgyptianValue.toLocaleString()} <span className="text-xs text-purple-400 font-bold">جنيه</span>
                        </span>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={copyHdCardsToClipboard}
                disabled={generatingHd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedHd ? 'تم النسخ للحافظة بنجاح! 📋' : 'نسخ لوحة الكروت للحافظة 📋'}</span>
              </button>

              <button
                type="button"
                onClick={saveHdCardsImage}
                disabled={generatingHd}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{generatingHd ? 'جاري السحب ومعالجة الـ HD...' : 'تحميل الصورة بجودة Ultra HD 📸'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHdModal(false)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs px-4 py-3 rounded-xl transition cursor-pointer"
              >
                إغلاق الشاشة ❌
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Rollover in Purchases Module */}
      {showRolloverConfirm && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-right">
            <h3 className="font-extrabold text-[#f1f5f9] text-base mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span>تسوية وترحيل الحساب الحالي اليوم 🔄</span>
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              هل أنت متأكد من ترحيل الحساب لـ تيسير المعاملات اليومية للمستلم النشط: <strong className="text-amber-400">{activeMerch === 'baqy' ? 'البيان' : 'سمسم'}</strong>؟ <br />
              <strong className="text-emerald-400 block mt-1">سيتم نقل الباقي الإجمالي المترصد بالدينار ({remainingTotalOwed.toLocaleString()} د.ل) ليكون القيمة السابقة لليوم الجديد، وتصفير جدول اليوم الجديد.</strong>
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={executePerformRollover}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <span>نعم، ترحيل رصيد كشف المورد الكلي 📁</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRolloverConfirm(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
