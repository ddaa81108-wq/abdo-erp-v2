import React, { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, ShieldCheck, Search, Users, Building, Inbox, Check } from 'lucide-react';
import { ERPState, Customer, Company, CustomerCycle, Merchant } from '../types';

interface TrashCanModuleProps {
  state: ERPState;
  onUpdateState: (newState: ERPState) => void;
}

export default function TrashCanModule({ state, onUpdateState }: TrashCanModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'customers' | 'companies' | 'merchants'>('all');
  
  // State for inline deletion confirmation to bypass window.confirm
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Find all deleted records
  const deletedCustomers = (state.customers || []).filter(c => c.isDeleted);
  const deletedCompanies = (state.companies || []).filter(c => c.isDeleted);
  const deletedMerchants = (state.merchants || []).filter(m => m.isDeleted);
  const deletedDeposits = (state.trustDeposits || []).filter(d => d.isDeleted);

  const triggerNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Restore Customer
  const handleRestoreCustomer = (custId: string) => {
    const updated = (state.customers || []).map(c => {
      if (c.id === custId) {
        return { ...c, isDeleted: false };
      }
      return c;
    });
    onUpdateState({
      ...state,
      customers: updated
    });
    triggerNotification('تم استرجاع الزبون وحسابه بنجاح لشاشة الديون النشطة! 👍');
  };

  // Permanent Delete Customer
  const handlePermanentDeleteCustomer = (custId: string) => {
    const updatedCusts = (state.customers || []).filter(c => c.id !== custId);
    const updatedCycles = (state.cycles || []).filter(cy => cy.customerId !== custId);
    const updatedTxs = (state.debtTransactions || []).filter(t => t.customerId !== custId);

    onUpdateState({
      ...state,
      customers: updatedCusts,
      cycles: updatedCycles,
      debtTransactions: updatedTxs
    });
    setConfirmingDeleteId(null);
    triggerNotification('تم مسح ملف الزبون وحساباته نهائياً من الذاكرة! 🗑️');
  };

  // Restore Company
  const handleRestoreCompany = (compId: string) => {
    const updated = (state.companies || []).map(c => {
      if (c.id === compId) {
        return { ...c, isDeleted: false };
      }
      return c;
    });
    onUpdateState({
      ...state,
      companies: updated
    });
    triggerNotification('تمت استعادة حساب المورد بنجاح لشاشة الشركات! 👍');
  };

  // Permanent Delete Company
  const handlePermanentDeleteCompany = (compId: string) => {
    const updatedComps = (state.companies || []).filter(c => c.id !== compId);
    const updatedTxs = (state.companyTransactions || []).filter(t => t.companyId !== compId);

    onUpdateState({
      ...state,
      companies: updatedComps,
      companyTransactions: updatedTxs
    });
    setConfirmingDeleteId(null);
    triggerNotification('تم مسح وإتلاف ملف شركة التوريد نهائياً بنجاح! 🗑️');
  };

  // Restore Merchant
  const handleRestoreMerchant = (merchId: string) => {
    const updated = (state.merchants || []).map(m => {
      if (m.id === merchId) {
        return { ...m, isDeleted: false };
      }
      return m;
    });
    onUpdateState({
      ...state,
      merchants: updated
    });
    triggerNotification('تم استرجاع حساب التاجر بنجاح لجدول كشوفات أعمال التجار! 👍');
  };

  // Permanent Delete Merchant
  const handlePermanentDeleteMerchant = (merchId: string) => {
    const updatedMerchants = (state.merchants || []).filter(m => m.id !== merchId);
    const updatedMerchantTxs = (state.merchantTransactions || []).filter(t => t.merchantId !== merchId);

    onUpdateState({
      ...state,
      merchants: updatedMerchants,
      merchantTransactions: updatedMerchantTxs
    });
    setConfirmingDeleteId(null);
    triggerNotification('تم مسح وشطب ملف التاجر بالكامل من النظام! 🗑️');
  };

  // Restore Deposit
  const handleRestoreDeposit = (depId: string) => {
    const updated = (state.trustDeposits || []).map(d => {
      if (d.id === depId) {
        return { ...d, isDeleted: false };
      }
      return d;
    });
    onUpdateState({
      ...state,
      trustDeposits: updated
    });
    triggerNotification('تم استرجاع سند الأمانة وتنشيطه بالدورة الحسابية بنجاح! 👍');
  };

  // Permanent Delete Deposit
  const handlePermanentDeleteDeposit = (depId: string) => {
    const updated = (state.trustDeposits || []).filter(d => d.id !== depId);
    onUpdateState({
      ...state,
      trustDeposits: updated
    });
    setConfirmingDeleteId(null);
    triggerNotification('تم مسح وإتلاف حساب الأمانة نهائياً بنجاح! 🗑️');
  };

  // Create unified feed for simple search and tab filtering
  const allTrashItems = [
    ...deletedCustomers.map(c => ({ id: c.id, name: c.name, details: c.phone ? `تلفونه: ${c.phone}` : 'من غير تلفون', type: 'customer' as const, label: 'زبون / عميل 👥', color: 'bg-rose-50 text-rose-700 border-rose-150' })),
    ...deletedCompanies.map(c => ({ id: c.id, name: c.name, details: c.contact ? `المسئول عنه: ${c.contact}` : 'من غير تفاصيل اتفاق', type: 'company' as const, label: 'مورد / شركة توريد 🏭', color: 'bg-amber-50 text-amber-700 border-amber-150' })),
    ...deletedMerchants.map(m => ({ id: m.id, name: m.name, details: m.contact ? `تلفون التاجر: ${m.contact}` : 'من غير تفاصيل اتصال', type: 'merchant' as const, label: 'تاجر / زبون ذمم 👥', color: 'bg-purple-50 text-purple-700 border-purple-150' })),
    ...deletedDeposits.map(d => ({ id: d.id, name: `أمانة العميل: ${d.customerName}`, details: `مرجع: ${d.referenceNo} | متبقي ليبي: ${d.amountLyd} د.ل | مصري: ${d.amountEgp} ج.م`, type: 'deposit' as const, label: 'سند أمانة جاري 🔒', color: 'bg-indigo-50 text-indigo-700 border-indigo-150' }))
  ].filter(item => {
    // Tab filter
    if (activeTab === 'customers' && item.type !== 'customer') return false;
    if (activeTab === 'companies' && item.type !== 'company') return false;
    if (activeTab === 'merchants' && item.type !== 'merchant') return false;

    // Search query Matching
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.details.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4 text-right animate-fadeIn" dir="rtl">
      
      {/* Dynamic Native Success Toast Overlay Alternative */}
      {successMessage && (
        <div className="fixed bottom-6 left-6 z-[60] bg-emerald-600 border border-emerald-500 text-white rounded-xl p-3 px-5 shadow-2xl flex items-center gap-3 animate-slideInLeft">
          <Check className="w-5 h-5 text-white animate-bounce" />
          <span className="text-xs font-extrabold font-sans leading-tight">{successMessage}</span>
        </div>
      )}

      {/* 1. Module info panel */}
      <div className="bg-white border rounded-2xl p-4 md:p-6 shadow-xs border-rose-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600 animate-pulse" />
            <span>سلة المهملات والمحذوفات المؤقتة (الأرشيف المسترجع) 🗑️</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            هنا هتلاقي كل زبون أو شركة أو تاجر حذفتهم مؤقتاً عشان متحصلش لخبطة في الدفاتر. تقدر ترجع أي حساب فيهم بضغطة زرار واحدة وترجع كل فلوسه وحساباته علطول أو تخلص عليه وتمسحه خالص!
          </p>
        </div>
        <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100/55 flex items-center gap-2 text-xs shrink-0">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="text-[10px] text-rose-950 leading-tight">
            الحسابات هنا مبتتحذفش غير لو دوست بنفسك على "تأكيد المسح النهائي" عشان تحافظ على أرصدتك.
          </div>
        </div>
      </div>

      {/* 2. Top control panel */}
      <div className="bg-white border p-3 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="🔍 دور بالاسم أو التلفون في سلة المحذوفات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-right text-xs pr-9 pl-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold bg-slate-50/65"
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto shrink-0 py-0.5" dir="rtl">
            {[
              { id: 'all', label: 'كل المحذوفات' },
              { id: 'customers', label: 'الزباين المحذوفة' },
              { id: 'companies', label: 'الشركات اللي مسحناها' },
              { id: 'merchants', label: 'التجار المحذوفين' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all border shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* 3. Render items cards */}
      {allTrashItems.length === 0 ? (
        <div className="bg-white border rounded-2xl p-16 text-center text-slate-400">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">سلة الزبالة والمهملات فاضية خالص! 🌟</p>
          <p className="text-[10.5px] text-slate-400 mt-1 leading-normal">
            مفيش أي زبون أو مورد أو تاجر ممسوح في الوقت الحالي. حساباتك ودورتك المحاسبية نضافة 100%.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allTrashItems.map(item => {
            const isConfirming = confirmingDeleteId === item.id;
            return (
              <div 
                key={item.id} 
                className="bg-white border-y border-l border-slate-200 border-r-4 border-r-rose-400 hover:border-slate-350 rounded-xl p-3 shadow-xs flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex justify-between items-center border-b pb-1.5 mb-2">
                    <span className="font-extrabold text-slate-800 text-xs">
                      {item.name}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${item.color}`}>
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 font-mono">
                    {item.details}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-4 pt-2 border-t border-slate-100">
                  {isConfirming ? (
                    <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200 w-full justify-between animate-fadeIn">
                      <span className="text-[10px] font-black text-rose-800">متأكد من المسح خالص؟</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            if (item.type === 'customer') handlePermanentDeleteCustomer(item.id);
                            else if (item.type === 'company') handlePermanentDeleteCompany(item.id);
                            else if (item.type === 'merchant') handlePermanentDeleteMerchant(item.id);
                            else if (item.type === 'deposit') handlePermanentDeleteDeposit(item.id);
                          }}
                          className="px-2 py-1 text-[9px] font-black bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-all cursor-pointer"
                        >
                          آه، امسحه نهائي دفترياً 🚨
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          className="px-2 py-1 text-[9px] font-bold bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-md transition-all cursor-pointer"
                        >
                          تراجع ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (item.type === 'customer') handleRestoreCustomer(item.id);
                          else if (item.type === 'company') handleRestoreCompany(item.id);
                          else if (item.type === 'merchant') handleRestoreMerchant(item.id);
                          else if (item.type === 'deposit') handleRestoreDeposit(item.id);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        title="استرجاع الملف للمنظومة مباشرة"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>رجع للحسابات النشطة</span>
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(item.id)}
                        className="px-2 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        title="حذف القيد وحرقه نهائياً من المتصفح"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>مسح نهائي 🗑️</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
