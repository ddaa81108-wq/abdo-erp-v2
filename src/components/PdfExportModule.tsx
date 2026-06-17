import React, { useState } from 'react';
import { FileText, Printer, CheckCircle, Shield, Award, Sparkles, MapPin, Calendar, Clock } from 'lucide-react';
import { ERPState } from '../types';

interface PdfExportModuleProps {
  state: ERPState;
}

export default function PdfExportModule({ state }: PdfExportModuleProps) {
  const [selectedReport, setSelectedReport] = useState<string>('customers');
  const [stampColor, setStampColor] = useState<string>('blue');
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [customHeaderTitle, setCustomHeaderTitle] = useState<string>('الشركة الملكية لإدارة الحسابات والاستثمار م.م');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('الرجاء السماح للنوافذ المنبثقة من متصفحك لتوليد تقارير PDF!');
      return;
    }

    let reportTitle = '';
    let tableHeaders: string[] = [];
    let tableRowsHtml = '';
    let summaryHtml = '';

    const currentDate = new Date().toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });

    if (selectedReport === 'customers') {
      reportTitle = 'تقرير ومذكرة كشف حساب ديون العملاء والزبائن';
      tableHeaders = ['م', 'اسم العميل / الجهة', 'رقم الهاتف', 'الحالة الحالية', 'إجمالي الدين المترصد'];
      
      const activeCustomers = state.customers.filter(c => !c.isDeleted);
      let totalAmount = 0;

      tableRowsHtml = activeCustomers.map((c, idx) => {
        const cycle = state.cycles.find(cy => cy.customerId === c.id && cy.status === 'active');
        const balance = cycle ? cycle.currentBalance : 0;
        totalAmount += balance;
        return `
          <tr>
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="font-weight: bold; color: #1e293b;">${c.name}</td>
            <td style="text-align: center;">${c.phone || 'غير مسجل'}</td>
            <td style="text-align: center; color: ${balance > 0 ? '#b91c1c' : '#15803d'}">${balance > 0 ? 'مفتوح (ذمم)' : 'مسدد ✓'}</td>
            <td style="text-align: left; font-family: monospace; font-weight: 900; background-color: #fafaf9; color: ${balance > 0 ? '#b91c1c' : '#15803d'}">${balance.toLocaleString()} د.ل</td>
          </tr>
        `;
      }).join('');

      summaryHtml = `
        <div style="margin-top: 25px; padding: 15px; border: 2px solid #334155; border-radius: 8px; background-color: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #334155;">إجمالي ديون الزبائن النشطة بالمنظومة:</span>
          <span style="font-size: 20px; font-weight: 900; color: #b91c1c; font-family: monospace;">${totalAmount.toLocaleString()} دينار ليبي</span>
        </div>
      `;

    } else if (selectedReport === 'merchants') {
      reportTitle = 'كشف ديون وحسابات في دفتر كبار التجار المستحقين';
      tableHeaders = ['م', 'التاجر المعتمد', 'رقم الهاتف', 'الدين السابق', 'المسدد اليوم', 'صافي الرصيد الحالي'];
      
      const activeMerchants = state.merchants.filter(m => !m.isDeleted);
      let totalAmount = 0;

      tableRowsHtml = activeMerchants.map((m, idx) => {
        totalAmount += m.balance;
        return `
          <tr>
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="font-weight: bold; color: #1e293b;">${m.name}</td>
            <td style="text-align: center;">${m.contact || 'غير مسجل'}</td>
            <td style="text-align: center; font-family: monospace;">${(m.previousBalance || 0).toLocaleString()} د.ل</td>
            <td style="text-align: center; font-family: monospace; color: #15803d;">${(m.paymentToday || 0).toLocaleString()} د.ل</td>
            <td style="text-align: left; font-family: monospace; font-weight: 900; background-color: #fafaf9; color: ${m.balance > 0 ? '#7c3aed' : '#15803d'}">${m.balance.toLocaleString()} د.ل</td>
          </tr>
        `;
      }).join('');

      summaryHtml = `
        <div style="margin-top: 25px; padding: 15px; border: 2px solid #7c3aed; border-radius: 8px; background-color: #f5f3ff; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #7c3aed;">إجمالي الأرصدة المترصدة للتاجر:</span>
          <span style="font-size: 20px; font-weight: 900; color: #7c3aed; font-family: monospace;">${totalAmount.toLocaleString()} دينار ليبي</span>
        </div>
      `;

    } else if (selectedReport === 'companies') {
      reportTitle = 'بيان الحسابات الإجمالية للشركات والموردين والجهات المجهزة';
      tableHeaders = ['م', 'اسم المورد / الشركة', 'خط التواصل', 'قيمة سابقة', 'فواتير جديدة', 'المسدد اليوم', 'صافي الدين القائم'];
      
      const activeCompanies = state.companies.filter(c => !c.isDeleted);
      let totalAmount = 0;

      tableRowsHtml = activeCompanies.map((c, idx) => {
        totalAmount += c.balance;
        return `
          <tr>
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="font-weight: bold; color: #1e293b;">${c.name}</td>
            <td style="text-align: center;">${c.contact || 'غير مسجل'}</td>
            <td style="text-align: center; font-family: monospace;">${(c.previousBalance || 0).toLocaleString()} د.ل</td>
            <td style="text-align: center; font-family: monospace; color: #b91c1c;">+${(c.newDebt || 0).toLocaleString()} د.ل</td>
            <td style="text-align: center; font-family: monospace; color: #15803d;">-${(c.paymentToday || 0).toLocaleString()} د.ل</td>
            <td style="text-align: left; font-family: monospace; font-weight: 900; background-color: #fafaf9; color: #b91c1c;">${c.balance.toLocaleString()} د.ل</td>
          </tr>
        `;
      }).join('');

      summaryHtml = `
        <div style="margin-top: 25px; padding: 15px; border: 2px solid #b91c1c; border-radius: 8px; background-color: #fef2f2; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #b91c1c;">إجمالي ديون الشركات المستحقة عليها:</span>
          <span style="font-size: 20px; font-weight: 900; color: #b91c1c; font-family: monospace;">${totalAmount.toLocaleString()} دينار ليبي</span>
        </div>
      `;

    } else if (selectedReport === 'deposits') {
      reportTitle = 'كشف ذمم وحسابات الأمانات والودائع الجارية للزبائن';
      tableHeaders = ['م', 'اسم المودع الأمانة', 'مرجع الإيداع', 'تاريخ الإيداع', 'رصيد د.ل ليبي', 'رصيد EGP مصري', 'حالة السند'];
      
      const activeDeposits = state.trustDeposits.filter(d => !d.isDeleted);
      let totalLyd = 0;
      let totalEgp = 0;

      tableRowsHtml = activeDeposits.map((d, idx) => {
        totalLyd += d.amountLyd;
        totalEgp += d.amountEgp;
        return `
          <tr>
            <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
            <td style="font-weight: bold; color: #1e293b;">${d.customerName}</td>
            <td style="text-align: center; font-family: monospace;">${d.referenceNo}</td>
            <td style="text-align: center;">${new Date(d.date).toLocaleDateString('ar-LY')}</td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #15803d;">${d.amountLyd.toLocaleString()} د.ل</td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #d97706;">${d.amountEgp.toLocaleString()} ج.م</td>
            <td style="text-align: center; color: ${d.status === 'held' ? '#cb5a07' : '#15803d'}">
              ${d.status === 'held' ? 'قيد الاحتفاظ 🔒' : d.status === 'refunded' ? 'مسترجع كامل' : 'مقاصة الديون'}
            </td>
          </tr>
        `;
      }).join('');

      summaryHtml = `
        <div style="margin-top: 25px; padding: 15px; border: 2px solid #0284c7; border-radius: 8px; background-color: #f0f9ff; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: bold; color: #0369a1;">إجمالي الودائع المحتفظ بها (بالدينار الليبي):</span>
            <span style="font-size: 16px; font-weight: 900; color: #0369a1; font-family: monospace;">${totalLyd.toLocaleString()} د.ل</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: bold; color: #d97706;">إجمالي الودائع المحتفظ بها (بالجنيه المصري):</span>
            <span style="font-size: 16px; font-weight: 900; color: #d97706; font-family: monospace;">${totalEgp.toLocaleString()} ج.م</span>
          </div>
        </div>
      `;

    } else {
      reportTitle = 'تقرير قائمة كشف رصيد وحركة الخزنة المركزية';
      tableHeaders = ['رقم', 'التاريخ', 'تفاصيل الحركة والقيد', 'المصدر الأساسي', 'نوع المعاملة', 'المبلغ المحصّل'];
      
      const txs = state.treasuryTransactions.slice(-25); // Last 25 entries for the report
      let totalIn = 0;
      let totalOut = 0;

      tableRowsHtml = txs.map((t, idx) => {
        if (t.type === 'in') totalIn += t.amount;
        else totalOut += t.amount;
        return `
          <tr>
            <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
            <td style="text-align: center; font-size: 11px;">${new Date(t.date).toLocaleDateString('ar-LY')}</td>
            <td style="font-weight: bold; color: #1e293b;">${t.description}</td>
            <td style="text-align: center; font-size: 11px; font-weight: bold;">${t.source === 'customer_payment' ? 'سداد عميل' : 'سداد شركات'}</td>
            <td style="text-align: center; font-weight: bold; color: ${t.type === 'in' ? '#15803d' : '#b91c1c'};">${t.type === 'in' ? 'وارد للدرج 📥' : 'صادر وتخليص 📤'}</td>
            <td style="text-align: left; font-family: monospace; font-weight: 900; color: ${t.type === 'in' ? '#15803d' : '#b91c1c'};">${t.amount.toLocaleString()} د.ل</td>
          </tr>
        `;
      }).join('');

      summaryHtml = `
        <div style="margin-top: 25px; padding: 15px; border: 2px solid #059669; border-radius: 8px; background-color: #ecfdf5; display: flex; justify-content: space-between; align-items: center; gap: 20px;">
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #047857; margin-bottom: 2px;">إجمالي الإيرادات المقيدة: <strong>${totalIn.toLocaleString()} د.ل</strong></div>
            <div style="font-size: 12px; color: #b91c1c;">إجمالي المصروفات المقيدة: <strong>${totalOut.toLocaleString()} د.ل</strong></div>
          </div>
          <div style="text-align: left; border-right: 2px solid #059669; padding-right: 15px;">
            <span style="font-size: 12px; font-weight: bold; color: #1f2937; display: block;">رصيد التدقيق المتبقي:</span>
            <span style="font-size: 20px; font-weight: 900; color: #059669; font-family: monospace;">${(totalIn - totalOut).toLocaleString()} د.ل</span>
          </div>
        </div>
      `;
    }

    const htmlContent = `
      <html dir="rtl" lang="ar">
        <head>
          <title>${reportTitle}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
            body {
              font-family: 'Cairo', Arial, sans-serif;
              color: #111827;
              background-color: #ffffff;
              padding: 40px;
              margin: 0;
              direction: rtl;
            }
            .border-wrap {
              border: 3px double #d4af37;
              padding: 24px;
              border-radius: 12px;
              min-height: calc(100vh - 130px);
              position: relative;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 4px double #d4af37;
              padding-bottom: 12px;
              margin-bottom: 25px;
            }
            .official-title {
              text-align: right;
            }
            .official-title h1 {
              margin: 0;
              font-size: 18px;
              font-weight: 900;
              color: #1e3a8a;
            }
            .official-title p {
              margin: 3px 0 0 0;
              font-size: 11px;
              color: #6b7280;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .emblem {
              font-size: 32px;
              color: #d4af37;
              padding: 5px;
              border: 2px solid #d4af37;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .metadata {
              text-align: left;
              font-size: 11px;
              line-height: 1.6;
              color: #374151;
            }
            .report-name {
              text-align: center;
              font-size: 16px;
              font-weight: 900;
              color: #111827;
              margin: 20px 0;
              padding: 6px 12px;
              border-bottom: 2px solid #111827;
              display: inline-block;
              position: relative;
              right: 50%;
              transform: translateX(50%);
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              font-size: 11.5px;
            }
            th {
              background-color: #1e3a8a;
              color: white;
              padding: 10px;
              border: 1px solid #cbd5e1;
              font-weight: bold;
            }
            td {
              padding: 8px 10px;
              border: 1px solid #e2e8f0;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .signatures {
              margin-top: 50px;
              display: grid;
              grid-template-cols: 1fr 1fr 1fr;
              gap: 20px;
              text-align: center;
              font-size: 11px;
              font-weight: bold;
              color: #334155;
            }
            .sign-box {
              border-top: 1.5px dashed #cbd5e1;
              padding-top: 10px;
              margin-top: 35px;
            }
            .stamp-wrapper {
              position: absolute;
              bottom: 120px;
              left: 40px;
              width: 110px;
              height: 110px;
              border-radius: 50%;
              border: 3px double ${stampColor === 'blue' ? '#1d4ed8' : stampColor === 'red' ? '#dc2626' : '#15803d'};
              color: ${stampColor === 'blue' ? '#1e40af' : stampColor === 'red' ? '#b91c1c' : '#166534'};
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              transform: rotate(-12deg);
              font-size: 10px;
              font-weight: 900;
              text-align: center;
              padding: 6px;
              background-color: rgba(255,255,255,0.85);
              box-shadow: 0 0 2px rgba(0,0,0,0.1);
              z-index: 10;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-35deg);
              font-size: 110px;
              color: rgba(15, 23, 42, 0.03);
              font-weight: 950;
              white-space: nowrap;
              user-select: none;
              pointer-events: none;
              font-family: sans-serif;
              z-index: 0;
            }
            @media print {
              body {
                padding: 0;
              }
              .border-wrap {
                border: none;
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="border-wrap">
            ${showWatermark ? `<div class="watermark">المنظومة الملكية</div>` : ''}

            <!-- الهيدر الرسمي المذهّب للشركة -->
            <div class="header">
              <div class="official-title">
                <h1>${customHeaderTitle}</h1>
                <p>إدارة التدقيق المالي ومراجعة الحسابات المركزية الـ ERP</p>
                <div style="font-size: 9px; color: #d4af37; margin-top: 2px;">تأسست عام 2011 • طرابلس، ليبيا</div>
              </div>
              
              <div class="emblem">👑</div>

              <div class="metadata">
                <div><strong>رقم التقرير:</strong> MS-${Math.floor(Math.random() * 900000 + 100000)}</div>
                <div><strong>التاريخ:</strong> ${currentDate}</div>
                <div><strong>الوقت:</strong> ${currentTime}</div>
                <div><strong>تاريخ الطلب:</strong> ${new Date().toLocaleDateString('ar-LY')}</div>
              </div>
            </div>

            <!-- عنوان التقرير -->
            <div class="report-name">${reportTitle}</div>

            <!-- جدول البيانات الفاخر -->
            <table>
              <thead>
                <tr>
                  ${tableHeaders.map(th => `<th>${th}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <!-- ملخص الحساب بالأرباح أو المجاميع -->
            ${summaryHtml}

            <!-- مكان الختم الصوري كبرستيج معتمد -->
            <div class="stamp-wrapper">
              <div>وزارة المالية م.خ</div>
              <div style="margin: 2px 0; font-size:7px; border-top:1px solid; border-bottom:1px solid; padding:1px 0;">قسم المراجعة المعتمد</div>
              <span style="font-size: 7px; color: #6b7280;">مستند مصادق عليه</span>
            </div>

            <!-- كتلة التواقيع الرسمية للبرستيج والاعتمادية -->
            <div class="signatures">
              <div>
                <span>المحاسب المعهود</span>
                <div class="sign-box">طارق الورفلي</div>
              </div>
              <div>
                <span>المراجع المالي العام</span>
                <div class="sign-box">عبدو المالك</div>
              </div>
              <div>
                <span>الختم والاعتماد المالي</span>
                <div class="sign-box" style="border:none; color: #d4af37; font-size: 16px;">👑 مصادق ✓</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 text-right max-w-4xl mx-auto" dir="rtl">
      
      {/* Title */}
      <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-600/20 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <span>قسم التصدير الملكي مستندات PDF المعتمدة 👑</span>
              <span className="text-[10px] bg-indigo-600 text-white font-mono px-2 py-0.5 rounded-full">
                البرستيج الكامل
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">توليد وتصدير كشوفات الحسابات والديون والجمعيات مع الأختام المعتمدة والتواقيع للمشاركة والدردشة.</p>
          </div>
        </div>

        <button 
          onClick={handlePrint}
          className="bg-amber-600 hover:bg-amber-700 hover:scale-102 flex items-center justify-center gap-2 px-5 py-3 text-white text-xs font-black rounded-lg transition-all shadow-md shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-white" />
          <span>توليد وطباعة مستند الـ PDF الفاخر 🖨️</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left pane: Options */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-4">
            <h3 className="font-black text-xs text-slate-800 flex items-center gap-1.5 border-b pb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>إعدادات وتخصيص ورقة المستند الرسمية</span>
            </h3>

            {/* Custom Header title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الترويسة وعنوان الجهة المصدرة بالكامل:</label>
              <input 
                type="text"
                value={customHeaderTitle}
                onChange={(e) => setCustomHeaderTitle(e.target.value)}
                className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold"
              />
            </div>

            {/* Selector column */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">حدد نوع التقرير الفاخر المراد تصديره:</label>
              <select 
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-900"
              >
                <option value="customers">👥 كشف حساب ديون العملاء والزبائن الإجمالي</option>
                <option value="merchants">💼 كشف ديون وحسابات في دفتر كبار التجار</option>
                <option value="companies">🏭 بيان الحسابات وتخالص الشركات والموردين</option>
                <option value="deposits">🔒 كشف سندات الأمانات والودائع الجارية للزبائن</option>
                <option value="treasury">💸 تقرير حركة الخزنة المركزية اليومية وإقفال الصندوق</option>
              </select>
            </div>

            {/* Stamp styles */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">لون ختم المراجعة والاعتماد المالي:</label>
                <select 
                  value={stampColor}
                  onChange={(e) => setStampColor(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                >
                  <option value="blue">🔵 أزرق ملكي معتمد</option>
                  <option value="red">🔴 أحمر سري ومستعجل</option>
                  <option value="green">🟢 أخضر ممتثل ومسدد</option>
                </select>
              </div>

              <div className="flex items-center justify-end h-full pt-6">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 focus:outline-none w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">تضمين علامات مائية خلفية مذهّبة للسرية وعلامات فخرية لضمان الهوية المعتمدة</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right pane: prestige features preview card */}
        <div className="md:col-span-1">
          <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 text-slate-800 space-y-4">
            <h3 className="font-extrabold text-amber-900 text-xs flex items-center gap-1.5 border-b border-amber-200 pb-2">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>معايير البرستيج المحاسبي 👑</span>
            </h3>

            <p className="text-[10px] text-amber-950 leading-relaxed font-sans">
              يتميز نظام التصدير الماسي الملكي بتضمن كشوفات PDF مطابقة للمعايير المصرفية الرسمية، حيث يشمل:
            </p>

            <ul className="space-y-2 text-[10px] text-amber-900 font-bold leading-normal">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500">✓</span>
                <span>ترويسة مذهّبة وشعار رسمي بنمط التاج.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500">✓</span>
                <span>علامة مائية متحركة لمنع تزوير الأرصدة.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500">✓</span>
                <span>أختام الوزارة المالية م.خ للتصديق الصوري والتثبيت.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500">✓</span>
                <span>خانة مخصصة لتوقيعات المحاسب والمدير المراجع.</span>
              </li>
            </ul>

            <div className="pt-2">
              <div className="bg-white border rounded-lg p-2 text-center text-xs font-extrabold text-slate-750">
                مظهر المستند: <strong className="text-amber-600">فاخر ورسمي ★★★★★</strong>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
