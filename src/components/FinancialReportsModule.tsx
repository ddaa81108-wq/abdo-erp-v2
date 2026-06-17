import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Coins, 
  Users, 
  Landmark, 
  ArrowRightLeft, 
  Sparkles, 
  PieChart, 
  Check, 
  FileText,
  Info
} from 'lucide-react';
import { ERPState } from '../types';

interface FinancialReportsModuleProps {
  state: ERPState;
  onOpenExporter: (section: string, metrics: any, headers: string[], rows: any[][]) => void;
}

export default function FinancialReportsModule({ state, onOpenExporter }: FinancialReportsModuleProps) {
  const [selectedScenario, setSelectedScenario] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

  // 1. Helper for formatting currency values
  const formatMoney = (val: number, currency: string = 'د.ل') => {
    return `${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
  };

  // 2. Real-time Safe Capital Balance from Treasury
  const totalLifetimeExpectedBalance = useMemo(() => {
    return state.treasuryTransactions.reduce((acc, curr) => {
      return curr.type === 'in' ? acc + curr.amount : acc - curr.amount;
    }, 0);
  }, [state.treasuryTransactions]);

  // 3. Active Customer Debts
  const activeCustomerDebtsTotal = useMemo(() => {
    return state.cycles
      .filter(cy => cy.status === 'active')
      .reduce((sum, cy) => sum + cy.currentBalance, 0);
  }, [state.cycles]);

  // 4. Supplier Debts (Liabilities to companies)
  const supplierDebtsTotal = useMemo(() => {
    return state.companies.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [state.companies]);

  // 5. Merchant Debts (Liabilities to wholesale merchants)
  const merchantDebtsTotal = useMemo(() => {
    return state.merchants.reduce((sum, m) => sum + (m.balance || 0), 0);
  }, [state.merchants]);

  // 6. Active deposits escrow
  const activeHeldDepositsTotal = useMemo(() => {
    return state.trustDeposits
      .filter(d => d.status === 'held')
      .reduce((sum, d) => sum + (d.amountLyd !== undefined ? d.amountLyd : d.amount), 0);
  }, [state.trustDeposits]);

  // Total Assets ("ليا إيه")
  const totalMyAssets = totalLifetimeExpectedBalance + activeCustomerDebtsTotal;

  // Total Liabilities ("عليّ إيه")
  const totalMyLiabilities = supplierDebtsTotal + merchantDebtsTotal + activeHeldDepositsTotal;

  // Unified net worth
  const netWorthValue = totalMyAssets - totalMyLiabilities;

  // Lifetime Purchases LYD
  const lifetimePurchasesLYD = useMemo(() => {
    return state.purchases.reduce((sum, p) => {
      const price = p.totalPrice || 0;
      if (p.currency !== 'د.ل' && p.conversionRate) {
        return sum + (price * p.conversionRate);
      }
      return sum + price;
    }, 0);
  }, [state.purchases]);

  // Total cash inputs vs total cash outputs lifetime
  const totalCashIn = useMemo(() => {
    return state.treasuryTransactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [state.treasuryTransactions]);

  const totalCashOut = useMemo(() => {
    return state.treasuryTransactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [state.treasuryTransactions]);

  return (
    <div className="space-y-6 text-right animate-fadeIn" dir="rtl" id="financial-reports-workspace">
      
      {/* 1. TOP MAIN HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="bg-indigo-600 text-indigo-100 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              لوحة التدقيق ومراجعة الميدان والحصاد الشامل
            </span>
            <h2 className="font-extrabold text-2xl text-white tracking-tight mt-2 flex items-center gap-2">
              <span className="text-3xl">📊</span>
              <span>قسم المراجعة والتقارير المالية والدراسة التحليلية</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              بورد استراتيجي مستقل يلخص الأرصدة والقرير المعياري لتوازن التدفق المالي، مقارنة كلفة المشتريات بالأرباح والديون المترصدة بالسوق لضمان سلامة وصون الحسابات والملاءة.
            </p>
          </div>
          <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl text-center shrink-0 min-w-[200px]">
            <span className="text-[10px] text-slate-400 block mb-0.5">صافي المركز المالي الموحد:</span>
            <span className={`text-xl font-black font-mono block ${netWorthValue >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {formatMoney(netWorthValue)}
            </span>
            <span className="text-[9px] text-slate-500 block mt-1">مطابق للثروة الرأسمالية الحرة</span>
          </div>
        </div>
        {/* Abstract Background Design */}
        <div className="absolute left-0 bottom-0 top-0 w-1/3 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
      </div>

      {/* 2. MAIN METRICS BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Assets Panel ("ممتلكاتنا وديوننا بالسوق") */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>🟢 ممتلكاتنا وديوننا بالسوق (ليا إيه):</span>
              </span>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">الأصول المتداولة</span>
            </div>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-sans text-slate-650">السيولة النقدية الفعلية بالخزنة:</span>
                <span className="font-extrabold text-slate-900">{formatMoney(totalLifetimeExpectedBalance)}</span>
              </div>
              
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-sans text-slate-650">ذمم ديون الزبائن النشطة بالسوق:</span>
                <span className="font-extrabold text-slate-900">{formatMoney(activeCustomerDebtsTotal)}</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-150 pt-4 mt-6 flex justify-between items-center">
            <span className="text-xs font-black text-slate-900">إجمالي الأصول والمستردات نقداً:</span>
            <span className="text-lg font-black font-mono text-emerald-700">{formatMoney(totalMyAssets)}</span>
          </div>
        </div>

        {/* Liabilities Panel ("الالتزامات والخصوم المتجمدة للموردين") */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-black text-rose-800 flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>🔴 الالتزامات والمطالبات (عليّا إيه):</span>
              </span>
              <span className="text-[9px] bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full font-bold">الالتزامات الكلية</span>
            </div>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-sans text-slate-650">ديون ومستحقات شركات الاستيراد:</span>
                <span className="font-extrabold text-rose-600">{formatMoney(supplierDebtsTotal)}</span>
              </div>
              
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-sans text-slate-650">ذمم وشغل تجار الجملة:</span>
                <span className="font-extrabold text-rose-600">{formatMoney(merchantDebtsTotal)}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-sans text-slate-650">مبالغ أمانات وودائع الزبائن المعلقة:</span>
                <span className="font-extrabold text-indigo-900">{formatMoney(activeHeldDepositsTotal)}</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-150 pt-4 mt-6 flex justify-between items-center">
            <span className="text-xs font-black text-slate-900">إجمالي المطلوبات والخصوم:</span>
            <span className="text-lg font-black font-mono text-rose-600">{formatMoney(totalMyLiabilities)}</span>
          </div>
        </div>

        {/* Assessment & Profitability Advisory */}
        <div className="bg-indigo-950 text-indigo-100 rounded-2xl p-5 border border-indigo-900 flex flex-col justify-between shadow-md">
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-yellow-400 flex items-center gap-1 border-b border-indigo-900 pb-2">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span>يا ترى كسبان ولا خسران ولا إيه الدنيا؟</span>
            </h4>
            <p className="text-[10.5px] leading-relaxed text-slate-300 font-sans">
              تحليل شامل يطرح فيه النظام مجموع "ديون السوق الفعالة والسيولة بالدرج" مقابل "الالتزامات للموردين والتجار والأمانات".
            </p>
            <div className="bg-indigo-900/60 p-3 rounded-xl border border-indigo-850/80 font-sans text-[11px] leading-normal text-slate-200">
              {netWorthValue > 0 ? (
                <span>
                  ✓ <strong>حالة تعافي ممتازة!</strong> ثروة أصولك بالخارج والداخل تغطي مطلوبات الموردين والأمانات بالكامل مع وفر مالي حر يبلغ <strong className="text-emerald-300 font-mono font-black">{formatMoney(netWorthValue)}</strong>. النشاط في مسار دوري صحّي وآمن.
                </span>
              ) : (
                <span>
                  ⚠️ <strong>جرس إنذار ائتماني:</strong> مجموع المطلوبات يفوق السيولة والأصول الحالية بقيمة <strong className="text-rose-300 font-mono font-bold">{formatMoney(Math.abs(netWorthValue))}</strong>. ينصح بوقف المشتريات الآجلة فوراً، والتركيز على تحصيل الديون وحل الودائع.
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-900 flex justify-between items-center text-[10.5px] font-mono text-slate-400">
            <span>معدل السيولة المتاحة:</span>
            <span className="text-emerald-400 font-bold">
              {totalMyLiabilities > 0 ? `${Math.round((totalMyAssets / totalMyLiabilities) * 100)}% ملاءة` : '100% مستقرة'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. CORE ANALYTICAL STUDY AND EXPENSES COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Dynamic Comparison Panel (المقاصة بين المشتريات وديون العملاء والسيولة) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-8 space-y-5">
          <div className="border-b pb-3">
            <h3 className="font-extrabold text-base text-slate-950 flex items-center gap-1.5">
              <PieChart className="w-5 h-5 text-indigo-650" />
              <span>مقارنات التدفق لقسم المشتريات والديون والسيولة المتاحة</span>
            </h3>
            <p className="text-xs text-slate-550 mt-1">
              رسم مقارن يوضح سرعة كلفة المشتريات مقابل مبالغ الذمم المستحقة بالسوق والسيولة الدفترية في الصندوق لمتابعتها.
            </p>
          </div>

          <div className="space-y-6 text-xs font-mono">
            {/* Bar 1: Purchases vs Customer Debts */}
            <div>
              <div className="flex justify-between mb-1.5 text-slate-800">
                <span className="font-sans font-bold text-slate-700">📦 مشتريات بضائع التموين المتلقاة مقابل ديون السوق المستحقة:</span>
                <span className="font-extrabold flex gap-2 items-baseline text-[11px]">
                  <span className="text-indigo-700">المشتريات: {formatMoney(lifetimePurchasesLYD)}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-rose-600">ديون العملاء والتجار: {formatMoney(activeCustomerDebtsTotal + merchantDebtsTotal)}</span>
                </span>
              </div>
              <div className="w-full bg-slate-150 h-5 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  title="المشتريات بالكامل"
                  className="bg-indigo-600 h-full transition-all flex items-center justify-center text-[9px] text-white font-bold" 
                  style={{ width: `${Math.min(95, Math.max(5, (lifetimePurchasesLYD / (lifetimePurchasesLYD + activeCustomerDebtsTotal + merchantDebtsTotal || 1)) * 100))}%` }} 
                >
                  {lifetimePurchasesLYD > 0 ? `${Math.round((lifetimePurchasesLYD / (lifetimePurchasesLYD + activeCustomerDebtsTotal + merchantDebtsTotal || 1)) * 100)}%` : ''}
                </div>
                <div 
                  title="أموال وديون السوق"
                  className="bg-rose-500 h-full transition-all flex items-center justify-center text-[9px] text-white font-bold" 
                  style={{ width: `${Math.min(95, Math.max(5, ((activeCustomerDebtsTotal + merchantDebtsTotal) / (lifetimePurchasesLYD + activeCustomerDebtsTotal + merchantDebtsTotal || 1)) * 100))}%` }} 
                >
                  {activeCustomerDebtsTotal > 0 ? `${Math.round(((activeCustomerDebtsTotal + merchantDebtsTotal) / (lifetimePurchasesLYD + activeCustomerDebtsTotal + merchantDebtsTotal || 1)) * 100)}%` : ''}
                </div>
              </div>
            </div>

            {/* Bar 2: Cash vs Supplier liabilities to companies */}
            <div>
              <div className="flex justify-between mb-1.5 text-slate-800">
                <span className="font-sans font-bold text-slate-700">💵 سيولة الصندوق المتاحة في يدك مقابل متبقي مديونية شركات الاستيراد والتسكين:</span>
                <span className="font-extrabold flex gap-2 items-baseline text-[11px]">
                  <span className="text-emerald-700">السيولة الحية: {formatMoney(totalLifetimeExpectedBalance)}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-amber-700">المطلوب للشركات: {formatMoney(supplierDebtsTotal)}</span>
                </span>
              </div>
              <div className="w-full bg-slate-150 h-5 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  title="السيولة الجاهزة بالخزنة"
                  className="bg-emerald-500 h-full transition-all flex items-center justify-center text-[9px] text-white font-bold" 
                  style={{ width: `${Math.min(95, Math.max(5, (totalLifetimeExpectedBalance / (totalLifetimeExpectedBalance + supplierDebtsTotal || 1)) * 100))}%` }} 
                >
                  {totalLifetimeExpectedBalance > 0 ? `${Math.round((totalLifetimeExpectedBalance / (totalLifetimeExpectedBalance + supplierDebtsTotal || 1)) * 100)}%` : ''}
                </div>
                <div 
                  title="ديون شركات الاستيراد"
                  className="bg-amber-500 h-full transition-all flex items-center justify-center text-[9px] text-slate-950 font-bold" 
                  style={{ width: `${Math.min(95, Math.max(5, (supplierDebtsTotal / (totalLifetimeExpectedBalance + supplierDebtsTotal || 1)) * 100))}%` }} 
                >
                  {supplierDebtsTotal > 0 ? `${Math.round((supplierDebtsTotal / (totalLifetimeExpectedBalance + supplierDebtsTotal || 1)) * 100)}%` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Scenario modeling builder */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="font-sans font-bold text-xs text-slate-900 block">🎯 نموذج محاكاة التدفق المالي المستقبلي والتحصيل:</span>
            <div className="flex gap-2">
              {[
                { id: 'conservative', label: 'تحصيل حذر وهادئ (%20 من ديون السوق)', desc: 'تقدير عودة خُمس مبالغ ديون السوق لزيادة الكاش بالخزنة.' },
                { id: 'balanced', label: 'تحصيل متوازن (%50 من ديون السوق)', desc: 'تقدير عودة نصف ديون السوق لتأمين الخامات وتسديد الموردين.' },
                { id: 'aggressive', label: 'تحصيل هجومي شامل (%80 من ديون السوق)', desc: 'تسريع تصفية الذمم وجلب التدفق لإغلاق الفواتير تماماً.' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScenario(s.id as any)}
                  className={`flex-1 text-right p-3 rounded-xl border text-xs cursor-pointer transition ${
                    selectedScenario === s.id 
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-extrabold block">{s.label}</span>
                  <p className={`text-[10px] mt-1 leading-normal ${selectedScenario === s.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {s.desc}
                  </p>
                </button>
              ))}
            </div>

            {(() => {
              const fraction = selectedScenario === 'conservative' ? 0.20 : selectedScenario === 'balanced' ? 0.50 : 0.80;
              const expectedInflow = (activeCustomerDebtsTotal + merchantDebtsTotal) * fraction;
              const projectedCash = totalLifetimeExpectedBalance + expectedInflow;
              return (
                <div className="bg-indigo-900 text-white p-4.5 rounded-xl border border-indigo-850/80 grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="font-sans text-indigo-200 block text-[10px] mb-1">المحصول المستقبلي المضاف للخزنة نقداً:</span>
                    <strong className="text-base text-yellow-300 font-black">{formatMoney(expectedInflow)}</strong>
                  </div>
                  <div>
                    <span className="font-sans text-indigo-200 block text-[10px] mb-1">الرصيد الكلي المتوقع للسيولة بعد الإضافة:</span>
                    <strong className="text-base text-emerald-300 font-black">{formatMoney(projectedCash)}</strong>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Unified Rules and Dual Sign Integrity Assurance */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 border-b pb-2">
              <Scale className="w-5 h-5 text-indigo-700" />
              <span>ميثاق الحسابات المزدوجة المعتمد لـ عبدو</span>
            </h4>
            
            <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
              "كل الحسابات والذمم السالبة تظل سالبة، وكل الموجبة تظل موجبة". تم تثبيت الكوابح الحسابية لمنع التشويش على ميزان الديون لضمان الثبات:
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60">
                <strong className="text-emerald-950 font-bold block mb-1">📌 الأرصدة السالبة للزبائن:</strong>
                <p className="text-emerald-900 text-[10px] leading-relaxed">
                  تمثل حوافظ ودفعات فائضة مقدمة، تبقي سالبة كحقوق معترف بها دون قلب الأرقام للنمط المطلق.
                </p>
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200/60">
                <strong className="text-indigo-950 font-bold block mb-1">📌 الأرصدة السالبة للشركات:</strong>
                <p className="text-indigo-900 text-[10px] leading-relaxed">
                  تمثل بواقي سدادت فائضة من الصندوق للمستوردين كخصومات مسبقة تضمن حق المحل.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                const headers = ['بند المراجعة والاستعلام الميداني', 'القيمة المقدرة د.ل', 'أثر التدفق والحركة'];
                const rows = [
                  ['السيولة النقدية بوعاء الخزنة', formatMoney(totalLifetimeExpectedBalance), 'أصل متداول جاهز (+)'],
                  ['مطلوبات مديونية شركات الاستيراد المطلوبة', formatMoney(supplierDebtsTotal), 'خصوم عاجلة السداد (-)'],
                  ['ذمم ورصيد ديون العملاء بالسوق', formatMoney(activeCustomerDebtsTotal), 'أصول جارية بانتظار التحصيل (+)'],
                  ['مجموع ثروة الملاءة والصافي الموحد للشركة', formatMoney(netWorthValue), 'المركز العام الموثق بالقرش ✓']
                ];
                onOpenExporter(
                  'تقرير المراجعة المالية والملاءة والمركز المالي العام',
                  {
                    label1: 'السيولة المتاحة',
                    value1: formatMoney(totalLifetimeExpectedBalance),
                    label2: 'إجمالي المطلوبات',
                    value2: formatMoney(totalMyLiabilities),
                    label3: 'صافي المركز الفعلي',
                    value3: formatMoney(netWorthValue)
                  },
                  headers,
                  rows
                );
              }}
              className="w-full bg-slate-900 hover:bg-black text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-slate-300" />
              <span>تصدير تقرير الملاءة والمراجعة (4K HD) 📸</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
