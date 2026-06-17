import React, { useState, useEffect } from 'react';
import { 
  Users, Trash2, Plus, Search, Calendar, Clock, ArrowDownLeft, ShieldAlert, AlertCircle, X, Check, FileText, Camera
} from 'lucide-react';
import { ERPState, Merchant, MerchantTransaction } from '../types';

interface MerchantsModuleProps {
  state: ERPState;
  onUpdateState: (newState: ERPState) => void;
  onOpenExporter: (section: string, metrics: any, headers: string[], rows: any[][]) => void;
  searchQuery?: string;
}

export default function MerchantsModule({ state, onUpdateState, onOpenExporter, searchQuery = '' }: MerchantsModuleProps) {

  
  // Create Merchant state
  const [showAddMerchantModal, setShowAddMerchantModal] = useState(false);
  const [merchName, setMerchName] = useState('');
  const [merchContact, setMerchContact] = useState('');
  const [initialDebt, setInitialDebt] = useState('');
  
  // Name collision detection state
  const [showCollisionModal, setShowCollisionModal] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<Merchant | null>(null);

  // Big Detailed Modal state (card clicked)
  const [selectedMerchId, setSelectedMerchId] = useState<string | null>(null);

  // Add Transaction states (opened on top of the big detailed modal, or directly)
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txType, setTxType] = useState<'debt' | 'payment'>('debt');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [paymentRoute, setPaymentRoute] = useState<'abdo' | 'client' | 'none'>('abdo');
  const [quickXMerchant, setQuickXMerchant] = useState<Merchant | null>(null);

  // States for custom confirmation dialogs to bypass standard blocked iframe confirm()
  const [showRolloverAllConfirm, setShowRolloverAllConfirm] = useState(false);
  const [rolloverSingleId, setRolloverSingleId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [merchantDeleteTxId, setMerchantDeleteTxId] = useState<string | null>(null);
  const [merchantSoftDeleteId, setMerchantSoftDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => setShowSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const handleManualRolloverSingle = (merchantId: string) => {
    setRolloverSingleId(merchantId);
  };

  const executeManualRolloverSingle = (merchantId: string) => {
    const merch = state.merchants.find(m => m.id === merchantId);
    if (!merch) return;
    const remainingDebt = (merch.previousBalance || 0) + (merch.newDebt || 0) - (merch.paymentToday || 0);
    const todayStr = new Date().toLocaleDateString('en-US');
    const updatedMerchants = state.merchants.map(m => {
      if (m.id === merchantId) {
        return {
          ...m,
          previousBalance: remainingDebt,
          newDebt: 0,
          paymentToday: 0,
          balance: remainingDebt,
          lastRolloverDate: todayStr
        };
      }
      return m;
    });
    onUpdateState({
      ...state,
      merchants: updatedMerchants
    });
    setRolloverSingleId(null);
    setShowSuccessToast(`📊 تم ترحيل وتسوية الحساب الحالي للتاجر (${merch.name}) بنجاح.`);
  };

  const generateReferenceNo = () => {
    const totalTxsCount = (state.debtTransactions?.length || 0) + (state.companyTransactions?.length || 0) + (state.merchantTransactions?.length || 0) + (state.treasuryTransactions?.length || 0);
    const padding = String(totalTxsCount + 107).padStart(6, '0');
    return `TX-2026-${padding}`;
  };

  const handleCreateMerchantAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchName.trim()) return;

    // Search for existing (including soft-deleted)
    const exactMatch = (state.merchants || []).find(
      m => m.name.trim().toLowerCase() === merchName.trim().toLowerCase()
    );

    if (exactMatch) {
      // Collision detected! Open prompt modal
      setDuplicateTarget(exactMatch);
      setShowCollisionModal(true);
      return;
    }

    // No collision -> Create brand new
    createNewMerchantDirect(merchName.trim(), merchContact.trim(), parseFloat(initialDebt) || 0);
  };

  const createNewMerchantDirect = (name: string, contact: string, startingDebt: number) => {
    const todayStr = new Date().toLocaleDateString('en-US');
    const merchId = `mer_${Date.now()}`;
    const newMerch: Merchant = {
      id: merchId,
      name: name,
      contact: contact,
      balance: startingDebt,
      previousBalance: startingDebt,
      newDebt: 0,
      paymentToday: 0,
      lastRolloverDate: todayStr,
      isDeleted: false,
      createdAt: new Date().toISOString()
    };

    const updatedTransactions = [...(state.merchantTransactions || [])];
    if (startingDebt > 0) {
      updatedTransactions.push({
        id: `tx_mer_init_${Date.now()}`,
        merchantId: merchId,
        type: 'debt',
        amount: startingDebt,
        currency: 'د.ل',
        date: new Date().toISOString(),
        referenceNo: generateReferenceNo(),
        note: 'رصيد مدين أول المدخر عند تهيئة الكشف بقسم التجار',
        postedToTreasury: false,
        createdAt: new Date().toISOString()
      });
    }

    onUpdateState({
      ...state,
      merchants: [...(state.merchants || []), newMerch],
      merchantTransactions: updatedTransactions
    });

    setMerchName('');
    setMerchContact('');
    setInitialDebt('');
    setShowAddMerchantModal(false);
  };

  const handleRestoreOldMerchant = () => {
    if (!duplicateTarget) return;
    const extraDebt = parseFloat(initialDebt) || 0;

    // Restore matches and optionally add starting debt
    const updatedMerchants = (state.merchants || []).map(m => {
      if (m.id === duplicateTarget.id) {
        const prevBal = m.balance || 0;
        const newTotalBal = prevBal + extraDebt;
        return { 
          ...m, 
          isDeleted: false,
          previousBalance: newTotalBal,
          newDebt: 0,
          paymentToday: 0,
          balance: newTotalBal
        };
      }
      return m;
    });

    const updatedTransactions = [...(state.merchantTransactions || [])];
    if (extraDebt > 0) {
      updatedTransactions.push({
        id: `tx_mer_restore_${Date.now()}`,
        merchantId: duplicateTarget.id,
        type: 'debt',
        amount: extraDebt,
        currency: 'د.ل',
        date: new Date().toISOString(),
        referenceNo: generateReferenceNo(),
        note: 'دين مضاف عند استعادة كارت التاجر من الأرشيف',
        postedToTreasury: false,
        createdAt: new Date().toISOString()
      });
    }

    onUpdateState({
      ...state,
      merchants: updatedMerchants,
      merchantTransactions: updatedTransactions
    });

    setShowCollisionModal(false);
    setShowAddMerchantModal(false);
    setSelectedMerchId(duplicateTarget.id); // Open restored card
    setDuplicateTarget(null);
    setMerchName('');
    setMerchContact('');
    setInitialDebt('');
    alert(`🎉 تم إعادة استرجاع وتفعيل كارت التاجر واحتسابه بالأرشيف التاريخي بنجاح: ${duplicateTarget.name}`);
  };

  const handleCreateAsBrandNewWithSlightDiff = () => {
    if (!duplicateTarget) return;
    const uniqueName = `${merchName.trim()} (جديد)`;
    createNewMerchantDirect(uniqueName, merchContact.trim(), parseFloat(initialDebt) || 0);
    setShowCollisionModal(false);
  };

  const handleManualRolloverAll = () => {
    setShowRolloverAllConfirm(true);
  };

  const executeManualRolloverAll = () => {
    const todayStr = new Date().toLocaleDateString('en-US');
    const rolledMerchants = (state.merchants || []).map(m => {
      const remainingDebt = (m.previousBalance || 0) + (m.newDebt || 0) - (m.paymentToday || 0);
      return {
        ...m,
        previousBalance: remainingDebt,
        newDebt: 0,
        paymentToday: 0,
        balance: remainingDebt,
        lastRolloverDate: todayStr
      };
    });

    onUpdateState({
      ...state,
      merchants: rolledMerchants
    });

    setShowRolloverAllConfirm(false);
    setShowSuccessToast('📊 تم ترحيل الأرصدة اليومية لكافة كشوفات التجار بنجاح.');
  };

  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0 || !selectedMerchId) return;

    const merchIndex = (state.merchants || []).findIndex(m => m.id === selectedMerchId);
    if (merchIndex === -1) return;

    const merch = state.merchants[merchIndex];
    const txId = `tx_mer_${Date.now()}`;
    const refNo = generateReferenceNo();

    const newTx: MerchantTransaction = {
      id: txId,
      merchantId: selectedMerchId,
      type: txType,
      amount: amount,
      currency: 'د.ل',
      date: new Date().toISOString(),
      referenceNo: refNo,
      note: txNote || (txType === 'debt' ? 'فاتورة بيع/استلام بالآجل' : 'دفعة سداد حساب من التاجر'),
      postedToTreasury: txType === 'payment' && paymentRoute === 'abdo',
      createdAt: new Date().toISOString()
    };

    // Calculate rolling balances inside
    const updatedMerchList = [...(state.merchants || [])];
    const prevBal = merch.previousBalance || 0;
    const curNewDebt = merch.newDebt || 0;
    const curPayToday = merch.paymentToday || 0;

    let nextPrev = prevBal;
    let nextNewDebt = curNewDebt;
    let nextPayToday = curPayToday;

    if (txType === 'debt') {
      nextNewDebt += amount;
    } else {
      nextPayToday += amount;
    }

    const nextBalance = prevBal + nextNewDebt - nextPayToday;

    updatedMerchList[merchIndex] = {
      ...merch,
      previousBalance: nextPrev,
      newDebt: nextNewDebt,
      paymentToday: nextPayToday,
      balance: nextBalance
    };

    // Handle posting to Treasury as POSITIVE input if paid via "عبده"
    const updatedTreasury = [...state.treasuryTransactions];
    if (txType === 'payment' && paymentRoute === 'abdo') {
      updatedTreasury.push({
        id: `tx_t_${Date.now()}`,
        type: 'in', // enters the treasury central safe
        amount: amount,
        currency: 'د.ل',
        conversionRate: 1.0,
        date: new Date().toISOString(),
        referenceNo: refNo,
        source: 'customer_payment',
        sourceId: txId,
        description: `تحصيل قيد سداد من كشف التاجر: ${merch.name} - مستند ${refNo} (عبر عبدو للخزينة المباشرة)`,
        createdAt: new Date().toISOString()
      });
    }

    onUpdateState({
      ...state,
      merchants: updatedMerchList,
      merchantTransactions: [...(state.merchantTransactions || []), newTx],
      treasuryTransactions: updatedTreasury
    });

    setTxAmount('');
    setTxNote('');
    setShowAddTxModal(false);
    alert('🎉 تم قيد وتحديث السجل المالي للتاجر بنجاح.');
  };

  const handleDeleteTransaction = (txId: string) => {
    setMerchantDeleteTxId(txId);
  };

  const executeDeleteTransaction = (txId: string) => {
    const tx = (state.merchantTransactions || []).find(t => t.id === txId);
    if (!tx) return;

    const updatedTxs = state.merchantTransactions.filter(t => t.id !== txId);
    
    const updatedMerch = state.merchants.map(m => {
      if (m.id === tx.merchantId) {
        const merchTxs = updatedTxs.filter(t => t.merchantId === m.id);
        
        let calcNewDebt = 0;
        let calcPayToday = 0;
        merchTxs.forEach(t => {
          if (t.type === 'debt') calcNewDebt += t.amount;
          else calcPayToday += t.amount;
        });

        const prev = m.previousBalance || 0;
        return {
          ...m,
          newDebt: calcNewDebt,
          paymentToday: calcPayToday,
          balance: prev + calcNewDebt - calcPayToday
        };
      }
      return m;
    });

    const updatedTreasury = state.treasuryTransactions.filter(t => t.sourceId !== txId);

    onUpdateState({
      ...state,
      merchantTransactions: updatedTxs,
      merchants: updatedMerch,
      treasuryTransactions: updatedTreasury
    });
    setMerchantDeleteTxId(null);
    setShowSuccessToast('تم حذف حركة الحساب للتاجر بنجاح.');
  };

  const handleSoftDeleteMerchant = (merchId: string) => {
    setMerchantSoftDeleteId(merchId);
  };

  const executeSoftDeleteMerchant = (merchId: string) => {
    const merch = (state.merchants || []).find(m => m.id === merchId);
    if (!merch) return;

    const updatedMerch = state.merchants.map(m => {
      if (m.id === merchId) {
        return { ...m, isDeleted: true };
      }
      return m;
    });

    onUpdateState({
      ...state,
      merchants: updatedMerch
    });

    setSelectedMerchId(null);
    setMerchantSoftDeleteId(null);
    setShowSuccessToast(`📥 تم نقل وأرشفة بطاقة التاجر (${merch.name}) بنجاح.`);
  };

  const handleExecuteQuickMerchantSettle = (strategy: 'settle_directly' | 'archive_only', merch: Merchant) => {
    const outstanding = merch.balance || 0;
    const refNo = generateReferenceNo();
    const timestamp = new Date().toISOString();

    let updatedTxs = [...(state.merchantTransactions || [])];
    let updatedTreasury = [...state.treasuryTransactions];

    if (strategy === 'settle_directly') {
      if (outstanding > 0) {
        const txId = `tx_mer_settle_${Date.now()}`;
        updatedTxs.push({
          id: txId,
          merchantId: merch.id,
          type: 'payment',
          amount: outstanding,
          currency: 'د.ل',
          date: timestamp,
          referenceNo: refNo,
          note: 'دفعة سداد تصفية سريعة وخروج من الشاشة النشطة للزبون المباشر',
          postedToTreasury: true,
          createdAt: timestamp
        });

        // Enters treasury
        updatedTreasury.push({
          id: `tx_tr_mer_${Date.now()}`,
          type: 'in', // enters the treasury
          amount: outstanding,
          currency: 'د.ل',
          conversionRate: 1.0,
          date: timestamp,
          referenceNo: refNo,
          source: 'customer_payment',
          sourceId: txId,
          description: `تحصيل كامل حساب التاجر وأرشفة كشفه: ${merch.name} - إيداع نقدي بالخزنة بقيمة (${outstanding} د.ل)`,
          createdAt: timestamp
        });
      }
    }

    const updatedMerchs = state.merchants.map(m => {
      if (m.id === merch.id) {
        return {
          ...m,
          balance: 0,
          paymentToday: (m.paymentToday || 0) + (strategy === 'settle_directly' ? outstanding : 0),
          isDeleted: true
        };
      }
      return m;
    });

    onUpdateState({
      ...state,
      merchants: updatedMerchs,
      merchantTransactions: updatedTxs,
      treasuryTransactions: updatedTreasury
    });

    setQuickXMerchant(null);
    setSelectedMerchId(null);
    alert(`🎉 تم تحديث وأرشفة كارت التاجر بنجاح وفق الخيار المختار (${
      strategy === 'settle_directly' ? 'تحصيل رصيد التاجر بالكامل وإضافته نقداً للخزينة' : 'شطب وإخفاء الكارت مؤقتاً دون قيد مالي'
    }).`);
  };

  // تصفية كافة بطاقات التجار النشطة وغير المحذوفة (حتى لو كان الرصيد صفراً) لتتم تصفيتهم وأرشتهم بالتحكم اليدوي وزر X
  const activeMerchants = (state.merchants || []).filter(m => {
    return !m.isDeleted;
  });

  const filteredMerchants = activeMerchants.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOwedToMerchants = activeMerchants.reduce((sum, m) => sum + (m.balance || 0), 0);

  const handleExportSingleMerchantImage = (merch: Merchant) => {
    const merchTxs = (state.merchantTransactions || []).filter(t => t.merchantId === merch.id);
    const headers = ['تاريخ الحركة', 'نوع الحركة (مدفوع / مستحق)', 'رقم المستند', 'قيمة المالي'];
    const rows = merchTxs.map(t => [
      new Date(t.date).toLocaleDateString('ar-LY') + ' ' + new Date(t.date).toLocaleTimeString('ar-LY', {hour: '2-digit', minute:'2-digit'}),
      t.type === 'debt' ? '🔴 تسجيل دين' : '🟢 سداد دفعة من التاجر',
      t.referenceNo,
      `${t.amount.toLocaleString()} د.ل`
    ]);

    onOpenExporter(
      `كشف حساب وأرشيف التاجر الشريك: ${merch.name}`,
      {
        label1: 'التاجر الشريك المعتمد',
        value1: merch.name,
        label2: 'باقي المتبقي بذمته للتحصيل',
        value2: `${(merch.balance || 0).toLocaleString()} د.ل`,
        label3: 'إجمالي الحركات الكلية',
        value3: `${merchTxs.length} معاملة بالدفتر`
      },
      headers,
      rows
    );
  };

  const handleOpenShareCard = () => {
    const headers = ['التاجر والتواصل', 'الدين السابق المتراكم', 'دين اليوم المضاف', 'المبالغ المسددة اليوم', 'الدين المتبقي الحالي ببطاقته'];
    const rows = filteredMerchants.map(m => [
      `${m.name} (${m.contact || 'بدون هاتف'})`,
      `${(m.previousBalance || 0).toLocaleString()} د.ل`,
      `${(m.newDebt || 0).toLocaleString()} د.ل`,
      `${(m.paymentToday || 0).toLocaleString()} د.ل`,
      `${(m.balance || 0).toLocaleString()} د.ل`
    ]);

    onOpenExporter(
      'قسم التجار ومستحقات الذمم اليومية',
      {
        label1: 'إجمالي ديون التجار المترصدة',
        value1: totalOwedToMerchants.toLocaleString() + ' د.ل',
        label2: 'عدد حسابات التجار المسجلين',
        value2: activeMerchants.length + ' كشف تاجر نشط',
        label3: 'مستوى الثقة والتطابق للقيود',
        value3: 'كامل ومرحّل إيجابياً للتحصيلات'
      },
      headers,
      rows
    );
  };

  // Details for selected merchant detailed ledger card
  const selectedMerchDetails = selectedMerchId ? (() => {
    const merch = state.merchants.find(m => m.id === selectedMerchId);
    if (!merch) return null;
    const txs = (state.merchantTransactions || []).filter(t => t.merchantId === selectedMerchId);
    return { merch, txs };
  })() : null;

  return (
    <div className="space-y-4 text-right" dir="rtl">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs border-l-4 border-l-purple-600 flex flex-col justify-between">
          <div>
            <span className="text-slate-500 font-bold text-xs block mb-1">👥 إجمالي ديون التجار المترصدة</span>
            <span className="font-mono text-2xl font-black text-purple-600 block leading-tight">
              {totalOwedToMerchants.toLocaleString()} د.ل
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              * مجموع الديون المترتربة على كشوفات حساب التجار. قيد الدفع يرحّل بالموجب لخزينة عبدو.
            </p>
          </div>
        </div>

        {/* Action card & control */}
        <div className="bg-gradient-to-tr from-purple-50/50 to-slate-50/50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-xs">
          <div>
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
              <span>👤 إدارة قسم التجار والمعاملات اليومية</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              سجل سحوبات السلع، فواتير الشحن الآجل، أو وثق التدفقات النقدية والتحصيلات في كروت متأصلة.
            </p>
          </div>

          <div className="flex gap-2 justify-end mt-3 flex-wrap">
            <button
              onClick={() => setShowAddMerchantModal(true)}
              className="bg-purple-600 hover:bg-purple-750 text-white font-extrabold text-[11px] px-3 py-2 rounded-lg shadow-xs cursor-pointer flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة كشف تاجر جديد 👤</span>
            </button>
            
            <button
              onClick={handleManualRolloverAll}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] px-2.5 py-2 rounded-lg shadow-xs cursor-pointer flex items-center gap-1 transition text-right"
              title="ترحيل اليوم ونقل باقي الديون لقيمة سابقة لجميع التجار"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>ترحيل 12:00 يدوياً 🔄</span>
            </button>

            <button
              onClick={handleOpenShareCard}
              className="bg-purple-650 hover:bg-purple-750 text-white font-extrabold text-[11px] px-3 py-2 rounded-lg shadow-xs cursor-pointer flex items-center gap-1 transition"
              title="تصدير الكشوفات للواتساب"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>صورة كشوفات 📸</span>
            </button>
          </div>
        </div>

      </div>

      {/* Grid of Merchants (Small Cards layout - ultra compact) */}
      {filteredMerchants.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-2" />
          <h4 className="font-bold text-slate-600 text-sm mb-1">لا توجد كشوفات للتجار مطابقة</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            انقر على زر "إضافة كشف تاجر جديد" بالأعلى لتهيئة معاملة تاجر جديد أو تفعيل ملف مؤرشف.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {filteredMerchants.map(m => {
            const prev = m.previousBalance || 0;
            const plus = m.newDebt || 0;
            const minus = m.paymentToday || 0;
            const remaining = prev + plus - minus;

            return (
              <div 
                key={m.id} 
                onClick={(e) => {
                  if ((e.target as Element).closest('button')) {
                    return;
                  }
                  setSelectedMerchId(m.id);
                }}
                className={`bg-white border-y border-l border-slate-200 border-r-4 ${remaining > 0 ? 'border-r-purple-500 hover:border-purple-450' : 'border-r-emerald-500 hover:border-emerald-450'} p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between shadow-xs hover:shadow-xs group max-h-[58px]`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setQuickXMerchant(m);
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 rounded-md transition-all cursor-pointer shrink-0 hover:scale-105"
                    title="أرشفة ❌"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="min-w-0 flex-1 text-right">
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-purple-650 transition-colors truncate" title={m.name}>
                      {m.name}
                    </h4>
                  </div>
                </div>
                
                <div className="text-left shrink-0">
                  {remaining > 0 ? (
                    <span className="font-mono font-extrabold text-purple-600 text-xs bg-purple-50/50 px-2 py-1 rounded border border-purple-100/50 block">
                      {remaining.toLocaleString()} د.ل
                    </span>
                  ) : (
                    <span className="font-sans font-extrabold text-emerald-700 text-[10px] bg-emerald-50 px-2 py-1 rounded border border-emerald-100 block">
                      مسدد ✓
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* 📂 النافذة الكبيرة: تفاصيل أرشيف التاجر وحركات قيوده التاريخية */}
      {selectedMerchId && selectedMerchDetails && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-4xl w-full border border-slate-200 flex flex-col max-h-[90vh] text-right">
            
            {/* رأس البطاقة */}
            <div className="flex items-center justify-between border-b pb-3.5 mb-4">
              <div>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-sans">
                  بطاقة كشف حساب تاجر نشط
                </span>
                <h3 className="font-black text-sm text-slate-900 mt-1 flex items-center gap-1">
                  <span>اسم التاجر:</span>
                  <span className="text-purple-650">{selectedMerchDetails.merch.name}</span>
                </h3>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleManualRolloverSingle(selectedMerchDetails.merch.id)}
                  className="bg-amber-600 hover:bg-amber-700 text-white p-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="ترحيل حساب هذا التاجر ونقل المتبقي كقيمة سابقة لليوم الجديد وتصفير الإدخالات اليومية"
                >
                  <span>ترحيل الحساب الحالي 🔄</span>
                </button>
                <button
                  onClick={() => setSelectedMerchId(null)}
                  className="bg-slate-100 hover:bg-slate-200 p-1 px-3 rounded-lg text-xs font-bold text-slate-750 transition"
                >
                  إغلاق النافذة ✕
                </button>
              </div>
            </div>

            {/* أرقام تجميع ديون التاجر اليومية والتاريخية (ما داخل الكارت) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-center">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <span className="text-slate-505 text-[10px] font-bold block mb-0.5">الدين القديم (المنتقل)</span>
                <span className="text-xs sm:text-sm font-mono font-black text-slate-700">
                  {(selectedMerchDetails.merch.previousBalance || 0).toLocaleString()} د.ل
                </span>
              </div>

              <div className="bg-purple-50 border border-purple-100 p-2.5 rounded-xl">
                <span className="text-purple-805 text-[10px] font-bold block mb-0.5">ديون السحوبات اليوم (+)</span>
                <span className="text-xs sm:text-sm font-mono font-black text-purple-700">
                  {(selectedMerchDetails.merch.newDebt || 0).toLocaleString()} د.ل
                </span>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                <span className="text-emerald-805 text-[10px] font-bold block mb-0.5">مسدد اليوم (-)</span>
                <span className="text-xs sm:text-sm font-mono font-black text-emerald-700">
                  {(selectedMerchDetails.merch.paymentToday || 0).toLocaleString()} د.ل
                </span>
              </div>

              <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                <span className="text-rose-805 text-[10px] font-bold block mb-0.5">صافي المتبقي بذمته</span>
                <span className="text-xs sm:text-sm font-mono font-black text-rose-600">
                  {((selectedMerchDetails.merch.previousBalance || 0) + (selectedMerchDetails.merch.newDebt || 0) - (selectedMerchDetails.merch.paymentToday || 0)).toLocaleString()} د.ل
                </span>
              </div>
            </div>

            {/* التنبيه لو الرصيد مصفى لسهولة الأرشفة */}
            {((selectedMerchDetails.merch.previousBalance || 0) + (selectedMerchDetails.merch.newDebt || 0) - (selectedMerchDetails.merch.paymentToday || 0)) === 0 && (
              <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl mb-3 text-xs text-emerald-955 flex items-center justify-between">
                <div>
                  <span className="font-bold flex items-center gap-1">🎯 تم تسوية وتصفية حساب التاجر بالكامل!</span>
                  <p className="text-[10px] text-emerald-800 mt-0.5">حسابه مصفى برصيد (0 د.ل) حالياً. يمكنك أرشفة وإخفاء هذا الكرت ليبقى نظيفاً على الشاشة.</p>
                </div>
                <button
                  onClick={() => handleSoftDeleteMerchant(selectedMerchDetails.merch.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] p-1.5 px-3 rounded-lg transition"
                >
                  أرشفة وإخفاء الكرت الآن 📥
                </button>
              </div>
            )}

            {/* الأرشيف وحركات الفواتير التاريخية للتاجر */}
            <div className="flex-1 overflow-y-auto border border-slate-150 rounded-xl p-3 bg-slate-50 mb-4 min-h-[160px]">
              <h4 className="text-xs font-extrabold text-slate-705 mb-2.5 pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-500 font-bold" />
                <span>أرشيف التاجر (السحوبات التاريخية وفواتير الذمم وتواريخ قيود الدفوعات والترحيل اليومي)</span>
              </h4>

              {selectedMerchDetails.txs.length === 0 ? (
                <div className="text-center py-8 text-slate-404 text-xs italic">
                  لا توجد أي معاملات سابقة دائنة أو مدينة مسجلة في كشف حساب هذا التاجر بعد.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse text-right">
                    <thead>
                      <tr className="bg-slate-200 text-slate-700 font-bold border-b border-slate-300">
                        <th className="p-2 text-right">المستند والوقت</th>
                        <th className="p-2 text-right">الوصف (سداد / مستحق)</th>
                        <th className="p-2 text-left">مبلغ الحركة</th>
                        <th className="p-2 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-mono">
                      {selectedMerchDetails.txs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="p-2">
                            <span className="text-slate-400 block text-[9px]">{tx.referenceNo}</span>
                            <span className="text-slate-600 block text-[9.5px]/none font-sans">
                              {new Date(tx.date).toLocaleDateString('ar-LY')}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-sans font-black ${
                              tx.type === 'debt' ? 'bg-purple-105 text-purple-800' : 'bg-emerald-105 text-emerald-800'
                            }`}>
                              {tx.type === 'debt' ? '🔴 مستحقات تاجر (ذمة)' : '🟢 دفعة مسددة'}
                            </span>
                          </td>
                          <td className={`p-2 text-left font-black ${
                            tx.type === 'debt' ? 'text-purple-650' : 'text-emerald-700'
                          }`}>
                            {tx.type === 'debt' ? '+' : '-'}{tx.amount.toLocaleString()} د.ل
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTransaction(tx.id);
                              }}
                              className="text-slate-350 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition animate-bounce cursor-pointer"
                              title="حذف القيد وتراجع الرصيد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* شريط الإجراءات السفلي (قيد وسحب وحذف) */}
            <div className="border-t pt-3.5 flex flex-wrap gap-2 justify-between items-center">
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleSoftDeleteMerchant(selectedMerchDetails.merch.id)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs p-2.5 px-4 rounded-xl flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>أرشفة وإخفاء التاجر من الشاشة 🗑️</span>
                </button>

                <button
                  onClick={() => handleExportSingleMerchantImage(selectedMerchDetails.merch)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-250 font-bold text-xs p-2.5 px-4 rounded-xl flex items-center gap-1 transition cursor-pointer"
                  title="تصدير كشف الحساب كصورة لمشاركتها عبر الواتساب"
                >
                  <span>صورة كشوفات التاجر 📸</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTxType('debt');
                    setTxAmount('');
                    setTxNote('');
                    setShowAddTxModal(true);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-750 border border-slate-250 font-bold text-xs p-2.5 px-4 rounded-xl transition cursor-pointer"
                >
                  ➕ قيد سحب / فاتورة آجل
                </button>

                <button
                  onClick={() => {
                    setTxType('payment');
                    setTxAmount('');
                    setTxNote('');
                    setPaymentRoute('abdo');
                    setShowAddTxModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-755 text-white font-extrabold text-xs p-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer"
                >
                  💸 تسجيل وتوريد دفعة سداد 💰
                </button>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* MODAL: CREATE NEW MERCHANT */}
      {showAddMerchantModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-md w-full border border-slate-200 text-right" dir="rtl">
            
            <h3 className="font-black text-sm text-slate-950 border-b pb-3 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              <span>تسجيل كشف تاجر جديد</span>
            </h3>
            
            <form onSubmit={handleCreateMerchantAttempt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">اسم التاجر الشريك بالكامل *</label>
                <input
                  type="text"
                  required
                  value={merchName}
                  onChange={(e) => setMerchName(e.target.value)}
                  placeholder="مثال: الحاج صالح التاجوري"
                  className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-705 mb-1">هاتف وتواصل (اختياري)</label>
                  <input
                    type="text"
                    value={merchContact}
                    onChange={(e) => setMerchContact(e.target.value)}
                    placeholder="092-XXXXXXXX"
                    className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1">دين مالي أول (اختياري)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={initialDebt}
                      onChange={(e) => setInitialDebt(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-right p-2.5 pl-8 border border-slate-200 rounded-xl text-xs font-mono font-bold bg-slate-50/50 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-[10px]">د.ل</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddMerchantModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5 py-2 rounded-lg text-xs cursor-pointer transition"
                >
                  حفظ وتسجيل التاجر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TRANSACTION OVERLAY */}
      {showAddTxModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-md w-full border border-slate-200 text-right" dir="rtl">
            
            <h3 className={`font-black text-xs border-b pb-3 mb-4 flex items-center gap-2 ${
              txType === 'debt' ? 'text-purple-800' : 'text-emerald-700'
            }`}>
              {txType === 'debt' ? (
                <>
                  <Plus className="w-5 h-5 text-purple-600" />
                  <span>🔴 قيد سحب بضاعة بالآجل للتاجر (دين جديد)</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>🟢 قيد وتوريد دفعة سداد حساب من التاجر (مدفوع)</span>
                </>
              )}
            </h3>

            <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">قيمة القيد المالي الكلي *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    step="any"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="أدخل المبلغ بالدينار الليبي د.ل"
                    className="w-full text-right p-2.5 pr-3 pl-9 border border-slate-200 rounded-xl text-xs font-mono font-bold bg-slate-50/50 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs font-mono">د.ل</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1">بيان وملاحظة السند</label>
                <input
                  type="text"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder={txType === 'debt' ? 'فاتورة سحب كابلات وأسلاك نحاسية' : 'استلام دفعة نقدية بيد المودع'}
                  className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {txType === 'payment' && (
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة ومسار تسوية الدفعة للأرشيف والخزنة:</label>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100 flex items-center justify-between text-[11px] cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="route"
                          checked={paymentRoute === 'abdo'}
                          onChange={() => setPaymentRoute('abdo')}
                        />
                        <div className="text-right">
                          <span className="font-bold text-emerald-950 block">عن طريق عبده (تغذي الخزينة المركزية بالموجب)</span>
                          <span className="text-[10px] text-emerald-800">سيتم ربط وإدراج العملية كإيداع مقبوضات واردة بالخزنة فوراً</span>
                        </div>
                      </div>
                    </label>

                    <label className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="route"
                          checked={paymentRoute === 'client'}
                          onChange={() => setPaymentRoute('client')}
                        />
                        <div className="text-right">
                          <span className="font-bold text-slate-700 block">عن طريق عميل / مندوب مباشر</span>
                          <span className="text-[10px] text-slate-505">يتم تسجيل وتخفيض الدين على الكارت لكن لا يدخل الخزنة المركزية</span>
                        </div>
                      </div>
                    </label>

                    <label className="bg-rose-50/50 p-2 rounded-xl border border-rose-100 flex items-center justify-between text-[11px] cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="route"
                          checked={paymentRoute === 'none'}
                          onChange={() => setPaymentRoute('none')}
                        />
                        <div className="text-right">
                          <span className="font-bold text-rose-950 block">الفلوس ما دخلتش الخزينة خالص</span>
                          <span className="text-[10px] text-rose-800">قيد سداد داخلي للأرصدة مع تجاهل إشعار سيولة الصندوق</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2 rounded-lg text-xs cursor-pointer transition"
                >
                  تثبيت وقيد العملية المحاسبية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLISION DETECTED DIALOG */}
      {showCollisionModal && duplicateTarget && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 text-right" dir="rtl">
            <div className="flex items-center gap-3 text-amber-600 mb-4 border-b pb-3">
              <ShieldAlert className="w-8 h-8 shrink-0 animate-pulse" />
              <div>
                <h4 className="font-black text-slate-900 text-sm">تنبيه: محاولة تكرار أو استرداد كارت تاجر قديم!</h4>
                <p className="text-xs text-slate-404">تاجر شريك باسم "{merchName}" متواجد بالفعل بالأرشيف القديم.</p>
              </div>
            </div>

            <p className="text-xs text-slate-605 leading-relaxed mb-4">
              المنظومة تفيد بأن التاجر "{merchName}" لديه ملف قديم بالأرشيف المالي. هل تريد استرجاع ملفه القديم وحفظ الحركة الجديدة لتظل معاملاته التاريخية متكاملة؟ أم تريد كارت مستقل جديد كلياً؟
            </p>

            <div className="space-y-2">
              <button
                onClick={handleRestoreOldMerchant}
                className="w-full text-right bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 font-bold p-3 rounded-xl text-xs transition cursor-pointer flex flex-col justify-start"
              >
                <span className="font-extrabold text-[12px] text-indigo-700">🟢 نعم، استرجع بطاقة حسابه القديمة (الأرشيف متكامل):</span>
                <span className="text-[10px] text-slate-500 mt-0.5">سيعاد تفعيله ميكانيكياً مع ربط الدين الجديد وسجل سحوباته ودفعاته التاريخية.</span>
              </button>

              <button
                onClick={handleCreateAsBrandNewWithSlightDiff}
                className="w-full text-right bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 font-bold p-3 rounded-xl text-xs transition cursor-pointer flex flex-col justify-start"
              >
                <span className="font-extrabold text-[12px] text-slate-705">🔵 لا، هذا مستقل جديد كلياً:</span>
                <span className="text-[10px] text-slate-500 mt-0.5">سيتم تسجيله كحساب منفصل وتلقائياً سنميز الاسم بـ "{merchName} (جديد)".</span>
              </button>

              <button
                onClick={() => {
                  setShowCollisionModal(false);
                  setDuplicateTarget(null);
                }}
                className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                تراجع وإلغاء العملية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التأكيد السريع للزر X - سدد ولا ما سددش؟ */}
      {quickXMerchant && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-md w-full border border-slate-200 text-right">
            <h3 className="font-black text-sm text-slate-950 border-b pb-3 mb-3 text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <span>إغلاق وأرشفة كارت التاجر من الشاشة</span>
            </h3>

            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              أنت على وشك إخفاء بطاقة التاجر <strong className="text-purple-650">{quickXMerchant.name}</strong> من شاشة العرض الرئيسية.
              <br />
              المبلغ المتبقي بذمته حالياً هو: <strong className="text-rose-600">{(quickXMerchant.balance || 0).toLocaleString()} د.ل</strong>.
              <br /><br />
              <span className="font-bold text-slate-900 block mb-1">الرجاء توضيح سبب المسح (سدد ولا ما سددش؟):</span>
            </p>

            <div className="space-y-2.5">
              {/* الخيار الأول: سدد */}
              <button
                onClick={() => handleExecuteQuickMerchantSettle('settle_directly', quickXMerchant)}
                className="w-full text-right p-3 rounded-xl border border-emerald-250 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950 transition flex items-start gap-2.5 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0">✓</div>
                <div>
                  <strong className="block text-xs font-black">سدد المبلغ (الاسم يتمسح من الشاشة ويدخل كاش للخزينة)</strong>
                  <span className="text-[10px] text-emerald-800 leading-normal mt-0.5 block">
                    سيتم تصفير رصيد التاجر فورا وتسجيل الحركة كدفعة مستلمة مع ترحيل كاش ({ (quickXMerchant.balance || 0).toLocaleString()} د.ل) إلى الخزينة المركزية، ويبقى بالكامل في أرشيف حركاته الدائم.
                  </span>
                </div>
              </button>

              {/* الخيار الثاني: ما سددش */}
              <button
                onClick={() => handleExecuteQuickMerchantSettle('archive_only', quickXMerchant)}
                className="w-full text-right p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 transition flex items-start gap-2.5 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-slate-500 text-white font-bold flex items-center justify-center text-[11px] shrink-0">✗</div>
                <div>
                  <strong className="block text-xs font-black">ما سددش (شطب وإلغاء الدين من الشاشة دون قيد مالي)</strong>
                  <span className="text-[10px] text-slate-500 leading-normal mt-0.5 block">
                    سيتم إخفاء كشف حساب التاجر من الشاشة فوراً دون تصفير الرصيد أو توريد كاش، مع بقاء رصيده وحركاته مخزنة داخلياً في الأرشيف الدائم لتستعيده في أي وقت عند إعادة كتابة اسمه.
                  </span>
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <button
                onClick={() => setQuickXMerchant(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition"
              >
                تراجع عن المسح
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Rollover All Merchants */}
      {showRolloverAllConfirm && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-md w-full shadow-2xl relative text-right">
            <h3 className="font-extrabold text-slate-900 text-base mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span>تسوية وترحيل اليوم (12:00) لجميع حسابات التجار 🔄</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في تسوية وترحيل اليوم الحالي لجميع كروت كشف حساب التجار؟ <br />
              <strong className="text-amber-800">سيقوم النظام بنقل "باقي الديون" كـ "قيمة سابقة" وتصفير الخانات اليومية والمدفوعات اليوم ميكانيكياً.</strong>
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={executeManualRolloverAll}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>نعم، تأكيد الترحيل والتصفير ⚡</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRolloverAllConfirm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Rollover Single Merchant */}
      {rolloverSingleId && (() => {
        const merch = state.merchants.find(m => m.id === rolloverSingleId);
        if (!merch) return null;
        const remainingDebt = (merch.previousBalance || 0) + (merch.newDebt || 0) - (merch.paymentToday || 0);
        return (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in" dir="rtl">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-md w-full shadow-2xl relative text-right">
              <h3 className="font-extrabold text-slate-900 text-base mb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>ترحيل حساب التاجر الفردي 🔄</span>
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                هل أنت متأكد من ترحيل وتسوية الحساب الحالي للتاجر <strong className="text-slate-900">{merch.name}</strong> ونقل صافي المتبقي في ذمته <strong className="text-rose-600 font-sans font-bold">{remainingDebt.toLocaleString()} د.ل</strong> كـ دين سابق معتمد ليوم جديد وتصفير الحركات اليومية؟
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => executeManualRolloverSingle(rolloverSingleId)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>نعم، ترحيل رصيد التاجر الكلي 📁</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRolloverSingleId(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Confirmation Modal for Deleting Merchant Transaction */}
      {merchantDeleteTxId && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-sm w-full shadow-2xl relative text-right">
            <h3 className="font-extrabold text-slate-900 text-base mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>تأكيد حذف المعاملة المالية ⚠️</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              هل أنت واثق من رغبتك في حذف حركة الحساب للتاجر وتعديل الأرصدة التراكمية تلقائياً؟ لا يمكن استرجاع هذه العملية بعد التأكيد.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => executeDeleteTransaction(merchantDeleteTxId)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer focus:outline-none"
              >
                تأكيد الحذف والخصم
              </button>
              <button
                type="button"
                onClick={() => setMerchantDeleteTxId(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Archiving Merchant */}
      {merchantSoftDeleteId && (() => {
        const merch = state.merchants.find(m => m.id === merchantSoftDeleteId);
        if (!merch) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in" dir="rtl">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-md w-full shadow-2xl relative text-right">
              <h3 className="font-extrabold text-slate-900 text-base mb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>أرشفة وبطاقة التاجر المعتمد 📥</span>
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                هل أنت واثق من ترحيل وإخفاء التاجر <strong className="text-slate-900">({merch.name})</strong> من الشاشة الرئيسية؟ سيتم الاحتفاظ بكامل كشف المعاملات التاريخي في قاعدة البيانات، وعند كتابة اسمه مجدداً ستتمكن من استعادة أرشيفه فوراً.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => executeSoftDeleteMerchant(merchantSoftDeleteId)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer focus:outline-none"
                >
                  نعم، ترحيل وأرشفة البطاقة
                </button>
                <button
                  type="button"
                  onClick={() => setMerchantSoftDeleteId(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Beautiful Non-Blocking Toast Success Alert */}
      {showSuccessToast && (
        <div className="fixed bottom-5 left-5 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 z-[99999] flex items-center gap-2.5 animate-slide-up" dir="rtl">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-900 font-black flex items-center justify-center text-xs">✓</div>
          <span className="text-xs font-bold">{showSuccessToast}</span>
        </div>
      )}

    </div>
  );
}
