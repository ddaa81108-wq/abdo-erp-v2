import React, { useState } from 'react';
import { 
  UserPlus, Calendar, Trash2, CheckCircle, Clock, AlertCircle, Camera, Search, X, Check, Landmark
} from 'lucide-react';
import { ERPState, Customer, CustomerCycle, DebtTransaction, TreasuryTransaction } from '../types';

interface CustomerDebtsModuleProps {
  state: ERPState;
  onUpdateState: (newState: ERPState) => void;
  onOpenExporter: (section: string, metrics: any, headers: string[], rows: any[][]) => void;
  searchQuery?: string;
}

export default function CustomerDebtsModule({ state, onUpdateState, onOpenExporter, searchQuery = '' }: CustomerDebtsModuleProps) {


  // 1. حالات وإضافة زبون جديد
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustDebt, setNewCustDebt] = useState('');

  // حالة للتأكد إذا كان الزبون مسجل سابقاً ومحذوف
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restorableCustomer, setRestorableCustomer] = useState<Customer | null>(null);

  // 2. حالة فتح بطاقة الزبون (النافذة الكبيرة للزبون المختار)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // 3. حالات دفع الأموال (كامل أو جزء) داخل النافذة الكبيرة
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [recipient, setRecipient] = useState<'me' | 'subordinate'>('me');
  
  const delegatesList = state.delegates || [];
  const [chosenSubordinate, setChosenSubordinate] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  React.useEffect(() => {
    if (delegatesList.length > 0 && !chosenSubordinate) {
      setChosenSubordinate(delegatesList[0]);
    }
  }, [delegatesList.length, chosenSubordinate]);

  // 4. حالات حذف الزبون الكلي
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [quickXCustomer, setQuickXCustomer] = useState<any | null>(null);

  // دالة لتوليد رقم مستند تلقائي وبسيط للحركات
  const generateDocNumber = () => {
    const totalCount = state.debtTransactions.length + state.treasuryTransactions.length + 101;
    return `مستند-${totalCount}`;
  };

  // ----------------------------------------------------
  // إضافة زبون جديد أو التحقق مما إذا كان موجوداً سابقاً
  // ----------------------------------------------------
  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const initialDebt = parseFloat(newCustDebt) || 0;

    // البحث في قائمة كل الزبائن (حتى المحذوفين/المؤرشفين سابقاً)
    const existing = state.customers.find(
      c => c.name.trim().toLowerCase() === newCustName.trim().toLowerCase()
    );

    if (existing) {
      // الزبون مسجل سابقاً! نعرض رسالة الاختيار
      setRestorableCustomer(existing);
      setShowRestorePrompt(true);
      return;
    }

    // زبون جديد كلياً
    createNewCustomer(newCustName.trim(), newCustPhone.trim(), initialDebt);
  };

  const createNewCustomer = (name: string, phone: string, debtAmount: number) => {
    const id = `cust_${Date.now()}`;
    const newCust: Customer = {
      id,
      name,
      phone,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      type: 'customer' // دائماً زبون عادي
    };

    const newCycle: CustomerCycle = {
      id: `cycle_${id}_${Date.now()}`,
      customerId: id,
      startDate: new Date().toISOString(),
      status: 'active',
      initialBalance: debtAmount,
      currentBalance: debtAmount
    };

    const updatedTransactions = [...state.debtTransactions];
    if (debtAmount > 0) {
      updatedTransactions.push({
        id: `tx_${Date.now()}`,
        customerId: id,
        cycleId: newCycle.id,
        type: 'debt',
        amount: debtAmount,
        currency: 'د.ل',
        conversionRate: 1.0,
        date: new Date().toISOString(),
        referenceNo: generateDocNumber(),
        note: 'الدين المالي الأول المسجل عند التسجيل',
        postedToTreasury: false,
        createdAt: new Date().toISOString()
      });
    }

    onUpdateState({
      ...state,
      customers: [...state.customers, newCust],
      cycles: [...state.cycles, newCycle],
      debtTransactions: updatedTransactions
    });

    // تصفير الحقول وإغلاق النافذة
    setNewCustName('');
    setNewCustPhone('');
    setNewCustDebt('');
    setShowAddCustomerModal(false);
    setShowRestorePrompt(false);
    setRestorableCustomer(null);
  };

  // دالة استرجاع الزبون القديم مع دمج الأرشيف وحفظ الحركة الجديدة
  const handleRestoreOldCustomer = () => {
    if (!restorableCustomer) return;
    const debtAmount = parseFloat(newCustDebt) || 0;

    // إلغاء كونه محذوفاً
    const updatedCustomers = state.customers.map(c => {
      if (c.id === restorableCustomer.id) {
        return { ...c, isDeleted: false };
      }
      return c;
    });

    // فتح دورة ديون جديدة نشطة ومستقلة للزبون المعاد تفعيله
    const newCycleId = `cycle_${restorableCustomer.id}_${Date.now()}`;
    const newCycle: CustomerCycle = {
      id: newCycleId,
      customerId: restorableCustomer.id,
      startDate: new Date().toISOString(),
      status: 'active',
      initialBalance: debtAmount,
      currentBalance: debtAmount
    };

    const updatedTransactions = [...state.debtTransactions];
    if (debtAmount > 0) {
      updatedTransactions.push({
        id: `tx_rest_${Date.now()}`,
        customerId: restorableCustomer.id,
        cycleId: newCycleId,
        type: 'debt',
        amount: debtAmount,
        currency: 'د.ل',
        conversionRate: 1.0,
        date: new Date().toISOString(),
        referenceNo: generateDocNumber(),
        note: 'دين جديد مضاف لزبون سابق مسترجع من الأرشيف',
        postedToTreasury: false,
        createdAt: new Date().toISOString()
      });
    }

    onUpdateState({
      ...state,
      customers: updatedCustomers,
      cycles: [...state.cycles, newCycle],
      debtTransactions: updatedTransactions
    });

    setShowRestorePrompt(false);
    setShowAddCustomerModal(false);
    setSelectedCustomerId(restorableCustomer.id); // فتح تفاصيل حساب الزبون فوراً لرعاية الأرشيف القديم
    setRestorableCustomer(null);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustDebt('');
  };

  const handleCreateAsBrandNewWithSlightDiff = () => {
    if (!restorableCustomer) return;
    const debtAmount = parseFloat(newCustDebt) || 0;
    // إضافة علامة بسيطة لتمييز الاسم الجديد
    const uniqueName = `${newCustName.trim()} (جديد)`;
    createNewCustomer(uniqueName, newCustPhone, debtAmount);
    setShowRestorePrompt(false);
    setRestorableCustomer(null);
  };

  // ----------------------------------------------------
  // تصفية الزبائن وتصنيفهم
  // ----------------------------------------------------
  // تحتوي هذه القائمة على كافة الحسابات غير المحذوفة للبحث والوصول وتسجيل العمليات حتى لو كان رصيدها صفراً
  const allActiveAndSettledCustomers = state.customers.map(cust => {
    if (cust.isDeleted) return null;

    // الحصول على الدورة النشطة للديون الخاصة به حالياً
    const activeCycle = state.cycles.find(cy => cy.customerId === cust.id && cy.status === 'active');
    const debtBalance = activeCycle ? activeCycle.currentBalance : 0;

    // كافّة تحركات الديون والدفعات التاريخية لهذا الزبون من البداية للآن
    const historicalTxs = state.debtTransactions.filter(t => t.customerId === cust.id);

    return {
      cust,
      activeCycle,
      debtBalance,
      historicalTxs
    };
  }).filter(Boolean) as Array<{
    cust: Customer;
    activeCycle: CustomerCycle | undefined;
    debtBalance: number;
    historicalTxs: any[];
  }>;

  // القائمة المعروضة فقط على الشاشة ككروت للديون النشطة والمسواة التي لم تُحذف/تُؤرشف بعد كلياً من الشاشة
  const activeCustomersList = allActiveAndSettledCustomers.filter(item => {
    const matchesSearch = item.cust.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) as Array<{
    cust: Customer;
    activeCycle: CustomerCycle | undefined;
    debtBalance: number;
    historicalTxs: any[];
  }>;

  // إجمالي الدين المتبقي لجميع الزبائن النشطين المعروضين على الشاشة
  const totalOutstandingDebt = activeCustomersList.reduce((sum, item) => sum + item.debtBalance, 0);

  // ----------------------------------------------------
  // تسجيل السداد (الكامل أو الجزئي)
  // ----------------------------------------------------
  const handleProcessPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;

    const currentAcc = allActiveAndSettledCustomers.find(a => a.cust.id === selectedCustomerId);
    if (!currentAcc || !currentAcc.activeCycle) {
      alert('⚠️ هذا الزبون ليس لديه حساب ديون نشط حالياً.');
      return;
    }

    const amountToPay = parseFloat(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      alert('⚠️ الرجاء كتابة مبلغ مالي صحيح أكبر من الصفر.');
      return;
    }

    if (paymentType === 'full' && amountToPay !== currentAcc.debtBalance) {
      alert(`⚠️ للسداد الكامل، يجب أن تكون القيمة مساوية للدين المتبقي وهو: ${currentAcc.debtBalance} د.ل`);
      return;
    }

    if (paymentType === 'partial' && amountToPay >= currentAcc.debtBalance) {
      alert(`⚠️ للسداد الجزئي، يجب أن تكون القيمة أقل من الدين الحالي وهو: ${currentAcc.debtBalance} د.ل`);
      return;
    }

    const docNum = generateDocNumber();
    const txId = `tx_pay_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const noteText = recipient === 'me'
      ? `تم سداد المبلغ لي شخصياً (عبدو) | ${paymentNote || 'استلام مباشر باليد'}`
      : `تم سداد المبلغ عن طريق المندوب: [${chosenSubordinate}] | ${paymentNote || 'أخذ الموظف الدفعة'}`;

    // إضافة معاملة سداد دين
    const paymentTx = {
      id: txId,
      customerId: selectedCustomerId,
      cycleId: currentAcc.activeCycle.id,
      type: 'payment' as const,
      amount: amountToPay,
      currency: 'د.ل',
      conversionRate: 1.0,
      date: timestamp,
      referenceNo: docNum,
      note: noteText,
      postedToTreasury: recipient === 'me', // تؤثر في الخزينة فقط إذا تم الدفع لي
      createdAt: timestamp
    };

    // تعديل رصيد دورة الديون
    const updatedCycles = state.cycles.map(cy => {
      if (cy.id === currentAcc.activeCycle?.id) {
        const remaining = cy.currentBalance - amountToPay;
        return {
          ...cy,
          currentBalance: remaining,
          status: remaining === 0 ? ('closed' as const) : ('active' as const),
          endDate: remaining === 0 ? timestamp : undefined
        };
      }
      return cy;
    });

    // إذا استلمتها أنا بالكامل شخصياً، ترسل الأموال تلقائياً إلى الخزينة
    const updatedTreasury = [...state.treasuryTransactions];
    if (recipient === 'me') {
      updatedTreasury.push({
        id: `tx_tr_${Date.now()}`,
        type: 'in',
        amount: amountToPay,
        currency: 'د.ل',
        conversionRate: 1.0,
        date: timestamp,
        referenceNo: docNum,
        source: 'customer_payment',
        sourceId: txId,
        description: `دفعة ديون مستلمة نقداً من الزبون: ${currentAcc.cust.name} (رقم المستند ${docNum})`,
        createdAt: timestamp
      });
    } else {
      // سداد عبر مندوب: لا ترسل للخزينة لأن الموظف استلمها مسبقاً وسجلها في فرعه الخاص
    }

    onUpdateState({
      ...state,
      cycles: updatedCycles,
      debtTransactions: [...state.debtTransactions, paymentTx],
      treasuryTransactions: updatedTreasury
    });

    setPaymentAmount('');
    setPaymentNote('');
    setShowPaymentModal(false);

    if (paymentType === 'full') {
      setSelectedCustomerId(null); // إغلاق البطاقة لانتهاء الدين
      alert('🎉 تم تسديد الدين بالكامل وإغلاق دورة الزبون المالية بنجاح.');
    } else {
      alert('🎉 تم خصم الدفعة الجزئية من دين الزبون.');
    }
  };

  // ----------------------------------------------------
  // حذف الزبون الكلي مع الخيارات
  // ----------------------------------------------------
  const handleExecuteWipeAndSettle = (strategy: 'settle_to_treasury' | 'delete_subordinate', targetCustId?: string) => {
    const custId = targetCustId || selectedCustomerId;
    if (!custId) return;

    const currentAcc = allActiveAndSettledCustomers.find(a => a.cust.id === custId);
    if (!currentAcc) return;

    const outstanding = currentAcc.debtBalance;
    const timestamp = new Date().toISOString();
    const docNum = generateDocNumber();

    let updatedTreasury = [...state.treasuryTransactions];
    let updatedDebtTransactions = [...state.debtTransactions];

    // تصفير وإغلاق الدورة النشطة
    const updatedCycles = state.cycles.map(cy => {
      if (cy.customerId === custId && cy.status === 'active') {
        return {
          ...cy,
          status: 'closed' as const,
          currentBalance: 0,
          endDate: timestamp
        };
      }
      return cy;
    });

    if (strategy === 'settle_to_treasury') {
      // الخيار الأول: تمت التصفية بالكامل وترسل القيمة للخزينة
      if (outstanding > 0) {
        const txId = `tx_wipe_t_${Date.now()}`;
        updatedDebtTransactions.push({
          id: txId,
          customerId: custId,
          cycleId: currentAcc.activeCycle?.id || '',
          type: 'payment',
          amount: outstanding,
          currency: 'د.ل',
          conversionRate: 1.0,
          date: timestamp,
          referenceNo: docNum,
          note: `تصفية ديون عاجلة بالكامل وترحيل للخزينة لإغلاق الملف`,
          postedToTreasury: true,
          createdAt: timestamp
        });

        updatedTreasury.push({
          id: `tx_tr_wipe_${Date.now()}`,
          type: 'in',
          amount: outstanding,
          currency: 'د.ل',
          conversionRate: 1.0,
          date: timestamp,
          referenceNo: docNum,
          source: 'customer_payment',
          sourceId: txId,
          description: `تصفية حساب زبون بالكامل: ${currentAcc.cust.name} ترحيل المبلغ (${outstanding} د.ل)`,
          createdAt: timestamp
        });
      }
    } else {
      // الخيار الثاني: حذف معاملة مندوب، احذفه وانسى ولا ترسل شيئاً للخزينة
      if (outstanding > 0) {
        updatedDebtTransactions.push({
          id: `tx_wipe_f_${Date.now()}`,
          customerId: custId,
          cycleId: currentAcc.activeCycle?.id || '',
          type: 'payment',
          amount: outstanding,
          currency: 'د.ل',
          conversionRate: 1.0,
          date: timestamp,
          referenceNo: docNum,
          note: `شطب الدين وإلغائه دون تحصيل (حذف مندوب)`,
          postedToTreasury: false,
          createdAt: timestamp
        });
      }
    }

    // وضع علامة الحذف المؤقت للزبون لحفظ الأرشيف واسترجاعه في أي وقت
    const updatedCustomers = state.customers.map(c => {
      if (c.id === custId) {
        return { ...c, isDeleted: true };
      }
      return c;
    });

    onUpdateState({
      ...state,
      customers: updatedCustomers,
      cycles: updatedCycles,
      debtTransactions: updatedDebtTransactions,
      treasuryTransactions: updatedTreasury
    });

    setShowDeletePrompt(false);
    setQuickXCustomer(null);
    if (!targetCustId) {
      setSelectedCustomerId(null);
    }
  };

  // ----------------------------------------------------
  // تصوير شاشات وتقارير مبسطة للواتساب وصناعة الكروت
  // ----------------------------------------------------
  const handleExportSectionAsImage = () => {
    if (activeCustomersList.length === 0) {
      alert('⚠️ لا توجد كشوفات نشطة حالياً لتصويرها.');
      return;
    }

    const headers = ['المعرف الحسابي', 'اسم الزبون', 'المبالغ المدفوعة سابقاً', 'الدين المتبقي الحالي'];
    const rows = activeCustomersList.map(({ cust, debtBalance, historicalTxs }) => {
      const totalPaid = historicalTxs
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + t.amount, 0);
      return [
        cust.id.split('_')[1] || cust.id,
        cust.name,
        `${totalPaid.toLocaleString()} د.ل`,
        `${debtBalance.toLocaleString()} د.ل`
      ];
    });

    onOpenExporter(
      'تقرير ديون العملاء المتبقية بالشاشة',
      {
        label1: 'إجمالي الدين العام المترصد',
        value1: `${totalOutstandingDebt.toLocaleString()} د.ل`,
        label2: 'عدد الحسابات المفتوحة مديونيتها',
        value2: `${activeCustomersList.length} كشف زبون حالي`,
        label3: 'التاريخ الدقيق للتصدير',
        value3: new Date().toLocaleDateString('ar-LY')
      },
      headers,
      rows
    );
  };

  const handleExportSingleCustomerImage = (acc: any) => {
    const headers = ['التاريخ والوقت', 'الحركة (مدفوع / مستحق)', 'رقم المستند', 'قيمة المالي'];
    const rows = acc.historicalTxs.map((t: any) => {
      return [
        new Date(t.date).toLocaleDateString('ar-LY') + ' ' + new Date(t.date).toLocaleTimeString('ar-LY', {hour: '2-digit', minute:'2-digit'}),
        t.type === 'debt' ? '🔴 تسجيل دين' : '🟢 تسجيل دفعة سداد',
        t.referenceNo,
        `${t.amount.toLocaleString()} د.ل`
      ];
    });

    onOpenExporter(
      `كشف حساب وأرشيف الزبون: ${acc.cust.name}`,
      {
        label1: 'الاسم الحالي المسجل',
        value1: acc.cust.name,
        label2: 'الدين المتبقي عليه اليوم',
        value2: `${acc.debtBalance.toLocaleString()} د.ل`,
        label3: 'إجمالي الحركات بالأرشيف',
        value3: `${acc.historicalTxs.length} حركة`
      },
      headers,
      rows
    );
  };

  const selectedAccDetails = allActiveAndSettledCustomers.find(a => a.cust.id === selectedCustomerId);

  return (
    <div className="space-y-4 text-right" dir="rtl">
      
      {/* 1. لوحة المبالغ والإحصائيات فوق */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* صندوق إجمالي الديون وهو المجموع ويؤثر بشكل إيجابي في الخزينة */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-indigo-600 flex flex-col justify-between">
          <div>
            <span className="text-slate-500 font-bold text-xs block mb-1">🔴 إجمالي ديون العملاء المستحقة</span>
            <span className="font-mono text-2xl font-black text-slate-900 block leading-tight">
              {totalOutstandingDebt.toLocaleString()} د.ل
            </span>
            <p className="text-[10px] text-slate-450 mt-1">
              * رصيد ديون الزبائن بالخارج. عند تحصيل أي دفعة ينزل الإجمالي ويتأثر صندوقك المالي بالخزينة.
            </p>
          </div>
          
          <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center mt-2">
            <span className="text-[10px] text-slate-400">الحسابات المفتوحة حالياً: {activeCustomersList.length} كشف</span>
            <button
              onClick={handleExportSectionAsImage}
              className="text-xs font-bold text-indigo-650 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-indigo-500" />
              <span>تصدير الملخص كصورة للواتساب 📸</span>
            </button>
          </div>
        </div>

        {/* صندوق إجراءات إضافة وحسابات المنظومة */}
        <div className="bg-gradient-to-tr from-indigo-50/50 to-slate-50/50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <div>
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
              <span>👤 ديون واستفسار الزبائن</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              تصفح حسابات زبائنك، أدخل دفعات تحصيل كامل أو مجزأ، أو امسح الحساب فوراً لتسوية الخزينة.
            </p>
          </div>

          <div className="flex gap-2 justify-end mt-3">
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة زبون جديد ودين أولي 👤</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. شبكة كروت الزبائن */}
      {activeCustomersList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <Landmark className="w-12 h-12 text-slate-200 mx-auto mb-2" />
          <h4 className="font-bold text-slate-600 text-sm mb-1">لا توجد ديون زبائن مسجلة حالياً</h4>
          <p className="text-xs text-slate-450 max-w-sm mx-auto">
            جميع الحسابات مغلقة ومسواة صفر ومؤرشفة بالكامل. اضغط الزر بالأعلى لإضافة زبون جديد.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {activeCustomersList.map((acc) => {
            return (
              <div
                key={acc.cust.id}
                onClick={(e) => {
                  if ((e.target as Element).closest('button')) {
                    return;
                  }
                  setSelectedCustomerId(acc.cust.id);
                }}
                className={`bg-white border-y border-l border-slate-200 border-r-4 ${acc.debtBalance > 0 ? 'border-r-rose-450 hover:border-indigo-400' : 'border-r-emerald-500 hover:border-emerald-400'} p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between shadow-xs hover:shadow-xs group max-h-[58px]`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleExecuteWipeAndSettle('delete_subordinate', acc.cust.id);
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 rounded-md transition-all cursor-pointer shrink-0 hover:scale-105"
                    title="أرشفة ❌"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="min-w-0 flex-1 text-right">
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-indigo-650 transition-colors truncate" title={acc.cust.name}>
                      {acc.cust.name}
                    </h4>
                  </div>
                </div>
                
                <div className="text-left shrink-0">
                  {acc.debtBalance > 0 ? (
                    <span className="font-mono font-extrabold text-rose-600 text-xs bg-rose-50/50 px-2 py-1 rounded border border-rose-100/50 block">
                      {acc.debtBalance.toLocaleString()} د.ل
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


      {/*  نافذة إضافة زبون جديد */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-md w-full border border-slate-200 text-right">
            <h3 className="font-black text-sm text-slate-950 border-b pb-3 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-650" />
              <span>تسجيل زبون ودين مالي جديد</span>
            </h3>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الزبون بالكامل *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="مثال: صالح الفرجاني"
                  className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (اختياري)</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="091-XXXXXXX"
                    className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ الدين المديون به *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={newCustDebt}
                      onChange={(e) => setNewCustDebt(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold bg-slate-50/50"
                    />
                    <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">د.ل</span>
                  </div>
                </div>
              </div>

              {/* إذا تم العثور على زبون يحمل نفس الاسم في المحذوفين */}
              {showRestorePrompt && restorableCustomer && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2.5 text-xs text-amber-955 leading-relaxed">
                  <div className="flex items-center gap-1 font-bold text-amber-900">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-600" />
                    <span>⚠️ هذا العميل كان مسجلاً سابقاً وسدد ديونه!</span>
                  </div>
                  <p className="text-[11px]">
                    المنظومة تفيد بأن الزبون "{restorableCustomer.name}" لديه ملف قديم بالأرشيف. هل تريد استرجاع ملفه القديم ليتصل أرشيفه السابق بالدين الجديد، أم إنشاء زبون مفرز جديد بالكامل؟
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRestoreOldCustomer}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2 rounded-lg text-[10.5px] transition-colors"
                    >
                      نعم، استرجع الحساب واربطه بـ أرشيفه القديم
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateAsBrandNewWithSlightDiff}
                      className="flex-1 bg-white border border-slate-250 text-slate-700 font-bold py-2 rounded-lg text-[10.5px] hover:bg-slate-50 transition-colors"
                    >
                      لا، سجل زبون جديد كلياً
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setShowRestorePrompt(false);
                    setRestorableCustomer(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2 rounded-lg"
                >
                  حفظ وتسجيل الزبون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* 📂 النافذة الكبيرة: تفاصيل أرشيف الزبون وحركات دفوعه التاريخية */}
      {selectedCustomerId && selectedAccDetails && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-4xl w-full border border-slate-200 flex flex-col max-h-[90vh] text-right">
            
            {/* رأس البطاقة */}
            <div className="flex items-center justify-between border-b pb-3.5 mb-4">
              <div>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-sans">
                  بطاقة كشف زبون حالي
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1 flex items-center gap-1">
                  <span>اسم الزبون:</span>
                  <span className="text-indigo-650">{selectedAccDetails.cust.name}</span>
                </h3>
              </div>
              
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="bg-slate-100 hover:bg-slate-200 p-1 px-3 rounded-lg text-xs font-bold text-slate-700 transition"
              >
                إغلاق النافذة ✕
              </button>
            </div>

            {/* أرقام تجميع ديون هذا الزبون مع تصدير الصورة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                <span className="text-rose-800 text-[10px] font-bold block mb-0.5">الدين القائم حالياً عليه</span>
                <span className="text-base font-mono font-black text-rose-600">
                  {selectedAccDetails.debtBalance.toLocaleString()} د.ل
                </span>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                <span className="text-emerald-800 text-[10px] font-bold block mb-0.5">مجموع الدفوعات المسددة من قبل</span>
                <span className="text-base font-mono font-black text-emerald-700">
                  {selectedAccDetails.historicalTxs
                    .filter(t => t.type === 'payment')
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toLocaleString()} د.ل
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3/5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-bold text-[10px] block mb-0.5">إرسال كشف للزبون</span>
                  <span className="text-[10px] text-slate-400 block">اضغط لتصدير نسخة مخصصة للواتساب</span>
                </div>
                <button
                  onClick={() => handleExportSingleCustomerImage(selectedAccDetails)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-1.5 px-3 text-[10px] font-bold cursor-pointer"
                >
                  تصدير الكشف كصورة 📸
                </button>
              </div>
            </div>

            {/* الأرشيف وحركات الدفوعات التاريخية */}
            <div className="flex-1 overflow-y-auto border border-slate-150 rounded-xl p-3 bg-slate-50 mb-4 min-h-[160px]">
              <h4 className="text-xs font-extrabold text-slate-700 mb-2.5 pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500 font-bold" />
                <span>أرشيف الزبون (جميع الحركات التاريخية، السابقة والجديدة مع الوقت والتاريخ والنوع)</span>
              </h4>

              {selectedAccDetails.historicalTxs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  لا توجد أي حركات دفع أو دين مسجلة في كشف حساب الزبون بعد.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-200 text-slate-700 font-bold border-b border-slate-300">
                        <th className="p-2 text-right">الوقت والتاريخ</th>
                        <th className="p-2 text-right">الحركة (خيار الدفع / الذمة)</th>
                        <th className="p-2 text-right">رقم المستند</th>
                        <th className="p-2 text-left">قيمة الحركة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {selectedAccDetails.historicalTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 font-mono">
                          <td className="p-2 font-sans text-[10.5px]">
                            {new Date(tx.date).toLocaleDateString('ar-LY')} {new Date(tx.date).toLocaleTimeString('ar-LY', {hour: '2-digit', minute:'2-digit'})}
                          </td>
                          <td className="p-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                              tx.type === 'debt' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {tx.type === 'debt' ? '🔴 إضافة دين (مستحق)' : '🟢 سداد دفعة (مدفوع)'}
                            </span>
                          </td>
                          <td className="p-2 text-slate-500">
                            {tx.referenceNo}
                          </td>
                          <td className={`p-2 text-left font-black ${
                            tx.type === 'debt' ? 'text-rose-600' : 'text-emerald-700'
                          }`}>
                            {tx.amount.toLocaleString()} د.ل
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* شريط الإجراءات السفلي (سداد كامل/جزء ومسح الحساب) */}
            <div className="border-t pt-3 flex flex-wrap gap-2 justify-between items-center">
              
              {/* تصفير وحذف الزبون بالأول */}
              <button
                onClick={() => setShowDeletePrompt(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs p-2.5 px-4 rounded-xl flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>مسح وإلغاء الزبون بالكامل 🗑️</span>
              </button>

              {/* تحصيل بالبوابة */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPaymentType('partial');
                    setPaymentAmount('');
                    setRecipient('me');
                    setShowPaymentModal(true);
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs p-2.5 px-4 rounded-xl transition cursor-pointer"
                >
                  🟢 دفع جزء من الدين (سداد دفعات)
                </button>

                <button
                  onClick={() => {
                    setPaymentType('full');
                    setPaymentAmount(selectedAccDetails.debtBalance.toString());
                    setRecipient('me');
                    setShowPaymentModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs p-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer"
                >
                  ✅ سداد كامل الدين وتصفير الحساب
                </button>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* 🔴 نافذة اختيار التحصيل وسداد الدفعات */}
      {showPaymentModal && selectedAccDetails && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-md w-full border border-slate-200 text-right">
            
            <h3 className="font-black text-sm text-slate-950 border-b pb-3 mb-3">
              {paymentType === 'full' ? 'تسجيل سداد دين كامل وتسوية' : 'تسجيل سداد جزء وقيد دفعة'}
            </h3>

            <form onSubmit={handleProcessPaymentSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1">المبلغ المراد خصمه وتسديده *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    disabled={paymentType === 'full'}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs font-bold font-mono bg-slate-50/50"
                  />
                  <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">د.ل</span>
                </div>
                {paymentType === 'full' && (
                  <p className="text-[10px] text-slate-405 mt-1">
                    * في الدفع الكامل، يتم جلب رصيد الدين المتبقي للزبون تلقائياً وهو {selectedAccDetails.debtBalance} د.ل
                  </p>
                )}
              </div>

              {/* السؤال الهام جداً: هل دفع لي مباشرة أم للمندوب؟ */}
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <span className="block text-xs font-extrabold text-indigo-950 mb-2">
                  ❓ كيف تم سداد هذا الدين؟
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <label className={`border p-2.5 rounded-lg text-xs cursor-pointer block text-center transition ${
                    recipient === 'me'
                      ? 'bg-indigo-600 text-white font-bold border-indigo-705'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-55'
                  }`}>
                    <input
                      type="radio"
                      name="recipient"
                      value="me"
                      checked={recipient === 'me'}
                      onChange={() => setRecipient('me')}
                      className="hidden"
                    />
                    <span>سدد لي أنا شخصياً 👑</span>
                  </label>

                  <label className={`border p-2.5 rounded-lg text-xs cursor-pointer block text-center transition ${
                    recipient === 'subordinate'
                      ? 'bg-indigo-600 text-white font-bold border-indigo-705'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-55'
                  }`}>
                    <input
                      type="radio"
                      name="recipient"
                      value="subordinate"
                      checked={recipient === 'subordinate'}
                      onChange={() => setRecipient('subordinate')}
                      className="hidden"
                    />
                    <span>عبر موظف مندوب بالإدارة 💼</span>
                  </label>
                </div>

                {/* شرح الفروق بالإدارة المالية */}
                <div className="text-[10px] text-slate-500 mt-2">
                  {recipient === 'me' ? (
                    <span>💡 ملاحظة: المبلغ المستلم سيرحل تلقائياً لمالية الخزينة المركزية لزيادة كاش الصندوق فوراً.</span>
                  ) : (
                    <span>⚠️ ملاحظة: الزبون مستلم ومخفّض من المنظومة، ولكن لا ترحيل للخزينة مجدداً من هنا، لأن الموظف استلم مسبقاً وقُيد لديه.</span>
                  )}
                </div>
              </div>

              {/* إذا كان الدفع عبر موظف، نعرض قائمة المناديب المخصصة */}
              {recipient === 'subordinate' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اختر الموظف المندوب الذي استلم المال:</label>
                  {delegatesList.length > 0 ? (
                    <select
                      value={chosenSubordinate}
                      onChange={(e) => setChosenSubordinate(e.target.value)}
                      className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold"
                    >
                      {delegatesList.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs leading-normal font-bold">
                      ⚠️ لا يوجد أي مندوب مسجل في لوحة الصلاحيات حالياً! يرجى إضافة مناديب أولاً من قسم الإعدادات (صلاحيات الموظفين) لتتمكن من اختيارهم هنا تماشياً مع طلبك.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظة عامة أو بيان السند (اختياري)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="مثال: مستلم نقدًا بالكامل"
                  className="w-full text-right p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="bg-slate-150 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  disabled={recipient === 'subordinate' && delegatesList.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs px-5 py-2 rounded-lg transition-all"
                >
                  تسجيل السداد والخصم
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* 🔴 نافذة حذف الزبون الكلي مع الاستعلام الهام جداً للمالك */}
      {showDeletePrompt && selectedAccDetails && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-md w-full border border-slate-200 text-right">
            
            <h3 className="font-black text-sm text-slate-950 border-b pb-3 mb-3 text-rose-700 flex items-center gap-1">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>استعلام الأمان: مسح كشف ومستند الزبون بالكامل</span>
            </h3>

            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              أنت تطلب حالياً حذف وإغلاق حساب الزبون الكلي <strong className="text-indigo-650">{selectedAccDetails.cust.name}</strong>. لديه دين مستحق قيمته <strong>{selectedAccDetails.debtBalance} د.ل</strong>.
              <br /><br />
              <strong>يرجى توضيح سبب المسح للمراجعة المالية لمالك المنظومة:</strong>
            </p>

            <div className="space-y-2.5">
              
              {/* الخيار الأول: سدد بالكامل وترحل فوري للخزينة */}
              <button
                onClick={() => handleExecuteWipeAndSettle('settle_to_treasury')}
                className="w-full text-right p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition flex items-start gap-2.5 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10.5px] mt-0.5 shrink-0">1</div>
                <div>
                  <strong className="block text-xs font-black">الزبون سدد نقداً وتمت تصفيته الكلية</strong>
                  <span className="text-[10px] text-emerald-800 leading-normal mt-0.5 block">
                    خصم رصيده بالكامل، وضع حساب الزبون في الأرشيف مغلق، وترحيل فوري لكاش الدين المتبقي ({selectedAccDetails.debtBalance} د.ل) إلى ميزانية الخزينة المركزية.
                  </span>
                </div>
              </button>

              {/* الخيار الثاني: معاملة موظف مندوب، احذفها من الكشوفات فقط */}
              <button
                onClick={() => handleExecuteWipeAndSettle('delete_subordinate')}
                className="w-full text-right p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 transition flex items-start gap-2.5 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center text-[10.5px] mt-0.5 shrink-0">2</div>
                <div>
                  <strong className="block text-xs font-black">حذف وإسقاط حساب مندوب (احذفه وانسى)</strong>
                  <span className="text-[10px] text-slate-500 leading-normal mt-0.5 block">
                    سيتم تصفير وإغلاق الزبون وأرشفته بالكامل، ولكن مع مسح معاملة المندوب بالمالية دون إرسال أي مبالغ أو كاش للخزينة مجدداً طالما تم تقييدها للفرع سابقاً.
                  </span>
                </div>
              </button>

            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <button
                onClick={() => setShowDeletePrompt(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs"
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
