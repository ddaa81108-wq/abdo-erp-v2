import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Landmark, UserCheck, Inbox, FolderArchive, ShoppingBag, ShieldCheck, 
  Database, Search, FileDown, AlertCircle, FileSpreadsheet, Bell, Info,
  LogOut, Settings, Shield, X, Menu
} from 'lucide-react';

import { ERPState, INITIAL_ERP_STATE, DebtTransaction, Customer, CustomerCycle, PurchaseRecord, User } from './types';

// Import subcomponents
import AlertCenter from './components/AlertCenter';
import GlobalSearch from './components/GlobalSearch';
import BackupCenter from './components/BackupCenter';
import ExcelImporter from './components/ExcelImporter';
import ImageExporter from './components/ImageExporter';
import LoginScreen from './components/LoginScreen';
import SettingsModule from './components/SettingsModule';

// Import modules
import CustomerDebtsModule from './components/CustomerDebtsModule';
import CompaniesModule from './components/CompaniesModule';
import TreasuryModule from './components/TreasuryModule';
import PurchasesModule from './components/PurchasesModule';
import DepositsModule from './components/DepositsModule';
import MerchantsModule from './components/MerchantsModule';
import TransactionLogModule from './components/TransactionLogModule';
import TrashCanModule from './components/TrashCanModule';
import MailManualModule from './components/MailManualModule';
import FinancialReportsModule from './components/FinancialReportsModule';
import PdfExportModule from './components/PdfExportModule';

export default function App() {
  const [state, setState] = useState<ERPState>(INITIAL_ERP_STATE);
  
  // 👥 Active session details
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('ABDO_ERP_V2_ACTIVE_USER');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>('debts');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // 👑 Premium Appearance Theme state
  const [appTheme, setAppTheme] = useState<'light' | 'dark' | 'golden'>(() => {
    return (localStorage.getItem('ABDO_ERP_THEME') as any) || 'light';
  });

  const handleToggleTheme = () => {
    const nextThemeMap: Record<'light' | 'dark' | 'golden', 'light' | 'dark' | 'golden'> = {
      'light': 'dark',
      'dark': 'golden',
      'golden': 'light'
    };
    const nextTheme = nextThemeMap[appTheme];
    setAppTheme(nextTheme);
    localStorage.setItem('ABDO_ERP_THEME', nextTheme);
  };
  
  // Importer
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  
  // Global search
  const [showGlobSearch, setShowGlobSearch] = useState(false);
  const [searchPreFilter, setSearchPreFilter] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Image share card modal states
  const [showImageExportModal, setShowImageExportModal] = useState(false);
  const [exportSectionTitle, setExportSectionTitle] = useState('');
  const [exportMetrics, setExportMetrics] = useState({ label1: '', value1: '', label2: '', value2: '', label3: '', value3: '' });
  const [exportHeaders, setExportHeaders] = useState<string[]>([]);
  const [exportRows, setExportRows] = useState<any[][]>([]);

  // States for custom confirmation dialogs & toast alerts to bypass standard iframe restrictions
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [showSeedBannerConfirm, setShowSeedBannerConfirm] = useState(false);
  const [showCustomToast, setShowCustomToast] = useState('');

  // 1. LocalStorage Synchronization Core
  useEffect(() => {
    const saved = localStorage.getItem('ABDO_ERP_V2_DATA');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.customers && parsed.cycles) {
          // Backward compatibility check to load default users list if empty
          if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
            parsed.users = INITIAL_ERP_STATE.users;
          }
          if (!parsed.merchants || !Array.isArray(parsed.merchants)) {
            parsed.merchants = INITIAL_ERP_STATE.merchants;
          }
          if (!parsed.merchantTransactions || !Array.isArray(parsed.merchantTransactions)) {
            parsed.merchantTransactions = INITIAL_ERP_STATE.merchantTransactions;
          }
          if (!parsed.egyptianCashRecords || !Array.isArray(parsed.egyptianCashRecords)) {
            parsed.egyptianCashRecords = [];
          }
          setState(parsed);
        } else {
          // If corrupted state, boot with initial
          localStorage.setItem('ABDO_ERP_V2_DATA', JSON.stringify(INITIAL_ERP_STATE));
          setState(INITIAL_ERP_STATE);
        }
      } catch (err) {
        localStorage.setItem('ABDO_ERP_V2_DATA', JSON.stringify(INITIAL_ERP_STATE));
        setState(INITIAL_ERP_STATE);
      }
    } else {
      localStorage.setItem('ABDO_ERP_V2_DATA', JSON.stringify(INITIAL_ERP_STATE));
      setState(INITIAL_ERP_STATE);
    }
  }, []);

  const updateStateAndSync = (newState: ERPState) => {
    setState(newState);
    localStorage.setItem('ABDO_ERP_V2_DATA', JSON.stringify(newState));
  };

  const handleExportAllToExcel = () => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // 1. Customers Sheet
      const customersData = state.customers.map((c) => {
        const activeCycle = state.cycles.find((cy) => cy.customerId === c.id && cy.status === 'active');
        return {
          'معرف الزبون': c.id,
          'اسم الزبون بالكامل': c.name,
          'الهاتف': c.phone || 'غير مسجل',
          'تاريخ الانضمام والتسجيل': c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-LY') : '---',
          'الحالة الحالية': c.isDeleted ? 'مؤرشف بالمهملات' : 'نشط جاري',
          'الدين المتبقي الحالي (د.ل)': activeCycle ? activeCycle.currentBalance : 0,
        };
      });
      const wsCustomers = XLSX.utils.json_to_sheet(customersData);
      XLSX.utils.book_append_sheet(wb, wsCustomers, 'ديون العملاء والزبائن');

      // 2. Companies Sheet
      const companiesData = state.companies.map((c) => ({
        'معرف الشركة': c.id,
        'اسم الجهة الموردة': c.name,
        'هاتف التواصل': c.contact || 'غير مسجل',
        'القيمة السابقة (د.ل)': c.previousBalance || 0,
        'فواتير جديدة اليوم (د.ل)': c.newDebt || 0,
        'المدفوع والمسدد اليوم (د.ل)': c.paymentToday || 0,
        'صافي الدين المتبقي (د.ل)': c.balance || 0,
        'حالة الأرشيف': c.isDeleted ? 'مؤرشف بالمهملات' : 'نشط بالدفتر',
      }));
      const wsCompanies = XLSX.utils.json_to_sheet(companiesData);
      XLSX.utils.book_append_sheet(wb, wsCompanies, 'حسابات الشركات والموردين');

      // 3. Merchants Sheet
      const merchantsData = state.merchants.map((m) => ({
        'معرف التاجر': m.id,
        'اسم التاجر': m.name,
        'هاتف التواصل': m.contact || 'غير مسجل',
        'القيمة السابقة د.ل': m.previousBalance || 0,
        'سحوبات جديدة اليوم د.ل': m.newDebt || 0,
        'المدفوع اليوم د.ل': m.paymentToday || 0,
        'صافي الدين المترصد د.ل': m.balance || 0,
        'حالة الأرشيف': m.isDeleted ? 'مؤرشف بالمهملات' : 'نشط جاري',
      }));
      const wsMerchants = XLSX.utils.json_to_sheet(merchantsData);
      XLSX.utils.book_append_sheet(wb, wsMerchants, 'دفتر كشوفات التجار');

      // 4. Treasury Transactions Sheet
      const treasuryData = state.treasuryTransactions.map((t) => ({
        'رقم المستند والترحيل': t.referenceNo,
        'الوقت والتاريخ': t.date ? new Date(t.date).toLocaleString('ar-LY') : '---',
        'نوع التدفق المالي': t.type === 'in' ? '🔴 وارد (دخل)' : '🟢 صادر (خرج)',
        'القيمة المالية المستلمة': t.amount,
        'نوع العملة': t.currency || 'د.ل',
        'سعر الصرف المعادل (د.ل)': t.conversionRate || 1.0,
        'المبلغ المعادل (د.ل)': t.amount * (t.conversionRate || 1.0),
        'كود العملية المحاسبية': t.source,
        'البيان المحبر والقيد التاريخي': t.description,
      }));
      const wsTreasury = XLSX.utils.json_to_sheet(treasuryData);
      XLSX.utils.book_append_sheet(wb, wsTreasury, 'حركات الخزينة والصندوق');

      // 5. Purchases Sheet
      const purchasesData = state.purchases.map((p) => ({
        'رقم الفاتورة المعتمة': p.referenceNo,
        'تاريخ الاعتماد المالي': p.date ? new Date(p.date).toLocaleDateString('ar-LY') : '---',
        'اسم الصنف وتفاصيله': p.itemName,
        'الكمية الواردة': p.quantity,
        'سعر المفرد المحاسبي': p.unitPrice,
        'الإجمالي بالعملة الأصلية': p.totalPrice,
        'المعدل للعملة المحلية (د.ل)': p.conversionRate || 1.0,
        'الإجمالي المعادل بالليبي (د.ل)': p.totalPrice * (p.conversionRate || 1.0),
        'حالة الخزينة': p.postedToTreasury ? '✓ تم ترحيلها والخصم' : 'سداد خارجي فوري',
      }));
      const wsPurchases = XLSX.utils.json_to_sheet(purchasesData);
      XLSX.utils.book_append_sheet(wb, wsPurchases, 'مشتريات وفواتير اليوم');

      // 6. Escrow/Deposits Sheet
      const depositsData = state.trustDeposits.map((d) => ({
        'رقم الأمانة': d.referenceNo,
        'اسم العميل المودع': d.customerName,
        'القيمة بالدينار الليبي د.ل': d.amountLyd,
        'القيمة بالجنيه المصري': d.amountEgp,
        'تاريخ الإيداع': d.date ? new Date(d.date).toLocaleDateString('ar-LY') : '---',
        'الحالة المحاسبية الحالية': d.status === 'held' ? 'محتجزة بالصندوق 🛡️' : d.status === 'refunded' ? 'مسترجعة للعميل ✕' : 'مسواة ومقاصة لدفتر ديونه ✓',
        'البيان والشرح': d.note,
      }));
      const wsDeposits = XLSX.utils.json_to_sheet(depositsData);
      XLSX.utils.book_append_sheet(wb, wsDeposits, 'الأمانات وودائع الزباين');

      // Generate Excel file downstream download
      XLSX.writeFile(wb, `ABDO_MULTY_LEDGER_MASTER_EXPORT_${new Date().toISOString().slice(0, 10)}.xlsx`);
      alert('🎉 تم توليد وتصدير ملف الإكسل الشامل لكافة صفحات كشوفات وحركات المنظومة بنجاح!');
    } catch (error: any) {
      console.error(error);
      alert('⚠️ حصل خطأ أثناء ترحيل وتصدير البيانات لملف الإكسل: ' + error.message);
    }
  };

  // 2. State Actions forwarded from subpanels
  const handleRestoreState = (newState: ERPState) => {
    updateStateAndSync(newState);
  };

  const handleSaveBackupPoint = (name: string, description: string) => {
    const newPoint = {
      id: `point_${Date.now()}`,
      name,
      date: new Date().toISOString(),
      description,
      dataJson: JSON.stringify(state)
    };
    updateStateAndSync({
      ...state,
      backupPoints: [...state.backupPoints, newPoint]
    });
  };

  const handleDeleteBackupPoint = (id: string) => {
    updateStateAndSync({
      ...state,
      backupPoints: state.backupPoints.filter(p => p.id !== id)
    });
  };

  // Safe posting handlers from Alert center
  const postUnpostedTransactionFromAlert = (txId: string) => {
    const tx = state.debtTransactions.find(t => t.id === txId);
    if (!tx) return;

    // Post to treasury
    const refNo = tx.referenceNo;
    const custObj = state.customers.find(c => c.id === tx.customerId);
    const updatedTreasury = [...state.treasuryTransactions, {
      id: `tx_t_${Date.now()}`,
      type: 'in' as const,
      amount: tx.amount,
      currency: tx.currency,
      conversionRate: 1.0,
      date: new Date().toISOString(),
      referenceNo: refNo,
      source: 'customer_payment' as const,
      sourceId: txId,
      description: `ترحيل مقبوضات متأخرة للعميل: ${custObj?.name} - الكود ${refNo}`,
      createdAt: new Date().toISOString()
    }];

    // Mark as posted
    const updatedTxs = state.debtTransactions.map(t => {
      if (t.id === txId) {
        return { ...t, postedToTreasury: true };
      }
      return t;
    });

    updateStateAndSync({
      ...state,
      debtTransactions: updatedTxs,
      treasuryTransactions: updatedTreasury
    });

    alert(`تم بنجاح ترحيل مبلغ ${tx.amount} د.ل من العميل ${custObj?.name} إلى الخزينة.`);
  };

  const postUnpostedPurchaseFromAlert = (purchaseId: string) => {
    const purchase = state.purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    const rateFactor = purchase.conversionRate || 1.0;
    const equivalentLydAmount = purchase.totalPrice * rateFactor;

    const refNo = purchase.referenceNo;
    const newTreasuryTx = {
      id: `tx_t_pur_${Date.now()}`,
      type: 'out' as const,
      amount: equivalentLydAmount,
      currency: 'د.ل',
      conversionRate: 1.0,
      date: new Date().toISOString(),
      referenceNo: refNo,
      source: 'purchase' as const,
      sourceId: purchase.id,
      description: `صرف وتسوية قيمة مشتريات متأخرة: ${purchase.itemName} بمرجعية ${refNo}`,
      createdAt: new Date().toISOString()
    };

    const updatedPurchases = state.purchases.map(p => {
      if (p.id === purchaseId) {
        return { ...p, postedToTreasury: true };
      }
      return p;
    });

    updateStateAndSync({
      ...state,
      purchases: updatedPurchases,
      treasuryTransactions: [...state.treasuryTransactions, newTreasuryTx]
    });

    alert(`تم ترحيل وصرف مبلغ ${equivalentLydAmount} د.ل الخاص بمشتريات ${purchase.itemName} إلى الخزينة.`);
  };

  // 3. Smart Excel Import Integration
  const handleExcelImportComplete = (imported: {
    addedCustomersCount: number;
    mergedCustomersCount: number;
    errorsCount: number;
    newCustomers: Customer[];
    newCycles: CustomerCycle[];
    newTransactions: DebtTransaction[];
  }) => {
    // Merge list correctly
    const updatedCusts = [...state.customers, ...imported.newCustomers];
    const updatedCycles = [...state.cycles, ...imported.newCycles];
    const updatedTxs = [...state.debtTransactions, ...imported.newTransactions];

    // Compute updated cycle balances dynamically based on all transactions belonging to that cycle
    const computedCycles = updatedCycles.map(cy => {
      const cyTxs = updatedTxs.filter(t => t.cycleId === cy.id);
      const currentBal = cyTxs.reduce((sum, t) => {
        return t.type === 'debt' ? sum + t.amount : sum - t.amount;
      }, 0);

      return {
        ...cy,
        currentBalance: currentBal,
        status: currentBal === 0 ? ('closed' as const) : ('active' as const),
        endDate: currentBal === 0 ? new Date().toISOString() : undefined
      };
    });

    // Automatically create treasury records for the imported payment/collections to keep treasury balanced!
    const newTreasuryTxs = [...state.treasuryTransactions];
    imported.newTransactions.forEach(tx => {
      if (tx.type === 'payment') {
        const cust = updatedCusts.find(c => c.id === tx.customerId);
        newTreasuryTxs.push({
          id: `tx_t_ext_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          type: 'in',
          amount: tx.amount,
          currency: tx.currency,
          conversionRate: 1.0,
          date: tx.date,
          referenceNo: tx.referenceNo,
          source: 'customer_payment',
          sourceId: tx.id,
          description: `سداد مستورد من كشف إكسل للزبون: ${cust?.name}`,
          createdAt: new Date().toISOString()
        });
      }
    });

    updateStateAndSync({
      ...state,
      customers: updatedCusts,
      cycles: computedCycles,
      debtTransactions: updatedTxs,
      treasuryTransactions: newTreasuryTxs
    });
  };

  // 4. Multi-Page Share Card exporter launcher
  const handleOpenExporter = (
    title: string,
    metrics: { label1: string; value1: string | number; label2: string; value2: string | number; label3: string; value3: string | number },
    headers: string[],
    rows: any[][]
  ) => {
    setExportSectionTitle(title);
    setExportMetrics(metrics);
    setExportHeaders(headers);
    setExportRows(rows);
    setShowImageExportModal(true);
  };

  // Global Navigation shortcut trigger from search results
  const handleNavigateFromItem = (tab: string, filterText: string) => {
    setActiveTab(tab);
    setSearchPreFilter(filterText);
    setGlobalSearchQuery(filterText);
    setShowGlobSearch(false);
  };

  // 👥 Session authentication helpers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('ABDO_ERP_V2_ACTIVE_USER', JSON.stringify(user));
    
    // Auto-navigate to first available allowed module
    const allowed = [
      { id: 'debts', enabled: user.permissions.canViewDebts },
      { id: 'companies', enabled: user.permissions.canViewCompanies },
      { id: 'treasury', enabled: user.permissions.canViewTreasury },
      { id: 'purchases', enabled: user.permissions.canViewPurchases },
      { id: 'deposits', enabled: user.permissions.canViewDeposits },
      { id: 'backup', enabled: user.permissions.canViewBackup },
      { id: 'settings', enabled: true }
    ];
    const firstTab = allowed.find(t => t.enabled);
    if (firstTab) {
      setActiveTab(firstTab.id);
    } else {
      setActiveTab('settings');
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const executeLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('ABDO_ERP_V2_ACTIVE_USER');
    setShowLogoutConfirm(false);
  };

  const triggerCustomToast = (msg: string) => {
    setShowCustomToast(msg);
    setTimeout(() => {
      setShowCustomToast('');
    }, 4500);
  };

  const executeDataSeed = () => {
    updateStateAndSync(INITIAL_ERP_STATE);
    setShowSeedConfirm(false);
    triggerCustomToast('👑 تم تعبئة البيانات النموذجية للزبائن والشركات بنجاح! يسعدنا تصفحك لكامل المزايا الآن.');
  };

  const executeSeedBanner = () => {
    updateStateAndSync(INITIAL_ERP_STATE);
    setShowSeedBannerConfirm(false);
    triggerCustomToast('👑 تم تهيئة قاعدة المعطيات وتنزيل عينة محرك الدفاتر بنجاح!');
  };

  const handleUpdateCurrentSession = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    sessionStorage.setItem('ABDO_ERP_V2_ACTIVE_USER', JSON.stringify(updatedUser));
  };

  if (!currentUser) {
    return (
      <LoginScreen
        state={state}
        onUpdateState={updateStateAndSync}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-300 ${appTheme === 'dark' ? 'bg-[#0b0f19] text-slate-100 theme-dark' : appTheme === 'golden' ? 'bg-[#0d0c0a] text-yellow-105 theme-golden' : 'bg-slate-50 text-slate-800'}`} dir="rtl">
      
      {/* 1. TOP HEADER & NAVIGATION RAIL (FAR LEFT Exit Button & Demo Seed Button in line) */}
      <header className={`bg-slate-900 text-white shadow-xl sticky top-0 z-40 border-b border-indigo-950 transition-all duration-300 ${isSidebarOpen ? 'lg:pr-[210px]' : ''}`}>
        <div className="max-w-[1580px] mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand/Signature */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5 leading-none">
                <span>المنظومة الملكية المتكاملة لإدارة الحسابات والديون 👑</span>
                <span className="text-[9px] bg-emerald-600 text-white font-bold font-mono px-1.5 py-0.2 rounded-full leading-normal">
                  مستقر ✓
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-widest font-bold">ROYAL DIAMOND MULTI-LEDGER SYSTEM</p>
            </div>
          </div>

          {/* 🔎 حقل البحث بالشريط العلوي للكروت */}
          <div className="relative w-full md:w-64 shrink-0 mx-2">
            <input
              type="text"
              placeholder="🔍 ابحث بالاسم في ديون العملاء والشركات والتجار..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className="w-full text-right text-xs pr-9 pl-8 py-2 bg-slate-800 hover:bg-slate-750/90 focus:bg-slate-750 border border-slate-700 hover:border-slate-600 focus:border-indigo-550 rounded-xl text-white font-sans placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
              dir="rtl"
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            {globalSearchQuery && (
              <button 
                onClick={() => setGlobalSearchQuery('')}
                className="absolute left-3 top-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 p-0.5 flex items-center justify-center"
                title="تصفير البحث ✕"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Universal widgets trigger buttons & DATA SEEDER BUTTON */}
          <div className="flex items-center gap-1.5 flex-wrap">
            
            {/* 👑 زر تغيير المظهر الفاخر (Prestige Dynamic Theme Controller) */}
            <button
              onClick={handleToggleTheme}
              className={`font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer border ${
                appTheme === 'light' 
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300' 
                  : appTheme === 'dark' 
                  ? 'bg-slate-800 hover:bg-slate-705 text-slate-100 border-slate-700' 
                  : 'bg-amber-950/80 text-amber-300 hover:bg-amber-900 border-amber-600/60'
              }`}
              title="تغيير مظهر المنظومة (كلاسيكي فاتح / ليلي حديث / ملكي ذهبي)"
            >
              <span className="text-sm">
                {appTheme === 'light' ? '☀️' : appTheme === 'dark' ? '🌙' : '👑'}
              </span>
              <span>
                {appTheme === 'light' 
                  ? 'مظهر كلاسيكي فاتح' 
                  : appTheme === 'dark' 
                  ? 'مظهر ليلي حديث' 
                  : 'مظهر ملكي ذهبي'}
              </span>
            </button>

            {/* 📊 A button for populating data from an example */}
            <button
              onClick={() => setShowSeedConfirm(true)}
              className="bg-indigo-650 hover:bg-indigo-600 text-white border border-indigo-550 font-extrabold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="تعبئة بيانات تجريبية (عينة) لتجربة النظام المحاسبي"
            >
              <Database className="w-4 h-4 text-indigo-300" />
              <span>تعبئة بيانات تجريبية 📊</span>
            </button>




          </div>

          {/* FAR LEFT Signout/Exit button container */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 px-1.5 flex items-center justify-end">
            {/* Exit button with ONLY icon and no text next to or inside it */}
            <button
              id="header_exit_button"
              onClick={handleLogout}
              className="p-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-sm border border-rose-500"
              title="تسجيل الخروج والعودة لبوابة الدخول ✕"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>

        </div>
      </header>

      {/* 3. LIVE ALERT BAR CENTER 🔔 */}
      <AlertCenter 
        state={state} 
        onNavigateToSection={(sec) => setActiveTab(sec)}
        onPostDebtPaymentToTreasury={postUnpostedTransactionFromAlert}
        onPostPurchaseToTreasury={postUnpostedPurchaseFromAlert}
      />

      {/* 4. DB EMPTY SEED ALERT BANNER */}
      {state.customers.length === 0 && (
        <div className={`max-w-[1580px] mx-auto px-4 mt-4 transition-all duration-300 ${isSidebarOpen ? 'lg:pr-[210px]' : ''}`}>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-right flex flex-col md:flex-row items-center justify-between gap-3 text-amber-900 shadow-sm" dir="rtl">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce shrink-0">💡</span>
              <div>
                <h4 className="font-extrabold text-xs text-amber-950">تنبيه: قاعدة البيانات المحاسبية فارغة حالياً!</h4>
                <p className="text-[11px] mt-0.5 text-amber-800 leading-normal">
                  بدأ التطبيق بملف تخزين فارغ نظراً لذاكرة متصفحك. يرجى تهيئة وشحن البيانات المحاسبية النموذجية المفصلة للزبائن (أحمد المحمودي، محمد الفيتوري، حركة الخزينة والمستحقات والشركات) لتجربة ميزة الدورة النشطة ومتابعة الأرباح وخدمة تصفير الديون والتخفيض الفوري.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSeedBannerConfirm(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shrink-0 shadow-xs transition-all cursor-pointer"
            >
              🔄 تهيئة وتنزيل البيانات الافتراضية للزبائن والشركات
            </button>
          </div>
        </div>
      )}

      {/* 5. MAIN CENTRAL CONTENT & WORKSPACE WORKBENCH WITH IN-FLOW/FLEXIBLE SIDEBAR */}
      {/* Drawer backdrop ONLY on mobile screens (< lg) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={`w-full max-w-[1580px] mx-auto p-4 flex flex-col gap-4 transition-all duration-300 ${isSidebarOpen ? 'lg:pr-[210px]' : ''}`} dir="rtl">
        {/* A. RIGHT VERTICAL SIDEBAR (On the right of main content, slides or collapses) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 h-screen w-[210px] bg-slate-950 shadow-2xl overflow-hidden flex flex-col justify-between border-l border-slate-900 z-50"
              dir="rtl"
            >
              <div className="p-3.5 border-b border-slate-900 flex items-center justify-between bg-slate-950 shrink-0">
                <div className="text-right">
                  <span className="text-[9px] text-indigo-400 font-extrabold block uppercase tracking-widest leading-none font-mono">الدوائر المالية والمحاسبية</span>
                  <h3 className="font-extrabold text-[#d4af37] text-[11.5px] mt-1 leading-none">المنظومة الماسية الملكية 👑</h3>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer border border-slate-800"
                  title="طي الأقسام"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2 space-y-1 overflow-y-auto flex-1 text-right max-h-[calc(100vh-130px)] custom-scrollbar">
                {[
                  { id: 'debts', label: '1. قسم ديون العملاء 👥', enabled: currentUser.permissions.canViewDebts },
                  { id: 'merchants', label: '2. قسم ديون التجار 💼', enabled: currentUser.permissions.canViewCompanies || currentUser.permissions.canViewDebts },
                  { id: 'companies', label: '3. قسم ديون الشركات 🏭', enabled: currentUser.permissions.canViewCompanies },
                  { id: 'deposits', label: '4. قسم الأمانات 🛡️', enabled: currentUser.permissions.canViewDeposits },
                  { id: 'mail_manual', label: '5. قسم البريد واليدوي 📬', enabled: true },
                  { id: 'purchases', label: '6. قسم المشتريات 🛒', enabled: currentUser.permissions.canViewPurchases },
                  { id: 'treasury', label: '7. قسم الخزنة 💰', enabled: currentUser.permissions.canViewTreasury },
                  { id: 'financial_reports', label: '8. قسم التقارير المالية 📊', enabled: true },
                  { id: 'transaction_log', label: '9. سجل المعاملات الشامل 📝', enabled: true },
                  { id: 'trash_can', label: '10. سلة المهملات 🗑️', enabled: true },
                  { id: 'settings', label: '11. صلاحيات الموظفين ⚙️', enabled: true },
                  { id: 'backup', label: '12. الاعدادات الشامله 📦', enabled: currentUser.permissions.canViewBackup },
                  { id: 'export_pdf', label: '13. تصدير بي دي اف 📤', enabled: true }
                ].filter(t => t.enabled).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchPreFilter('');
                      if (window.innerWidth < 1024) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={`text-right w-full text-[11px] font-extrabold px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                      activeTab === tab.id
                        ? 'bg-[#d4af37] text-slate-950 shadow-md scale-101 border border-[#e5c158]'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[9px] transform transition-transform group-hover:translate-x-0.5 ${
                      activeTab === tab.id ? 'text-white' : 'text-slate-600'
                    }`}>
                      ◀
                    </span>
                  </button>
                ))}
              </div>

              {/* 📊 Excel Import & Export actions in the sidebar */}
              <div className="p-2.5 border-t border-slate-900 bg-slate-950/40 space-y-1.5 shrink-0" dir="rtl">
                <button
                  type="button"
                  onClick={() => setShowExcelImportModal(true)}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 active:scale-98 text-white font-extrabold text-[11px] py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md border border-emerald-600 shrink-0 cursor-pointer"
                  title="تحميل كشوفات وحسابات من ملف Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                  <span>استيراد كشوفات من Excel 📥</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportAllToExcel}
                  className="w-full bg-slate-900 hover:bg-slate-800 active:scale-98 text-indigo-400 hover:text-white font-extrabold text-[11px] py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md border border-slate-800 shrink-0 cursor-pointer"
                  title="تصدير نسخة كاملة من المنظومة كملف Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>تصدير الحسابات Excel 📤</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950/60 border-t border-slate-900 text-center text-[10px] text-slate-500 font-mono shrink-0">
                ABDO Multi-Ledger v2.0
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* B. MAIN WORKSPACE */}
        <div className="flex-1 w-full min-h-[60vh] flex flex-col items-start gap-4">
          {/* B1. COLLAPSED SIDE SEAL (appears when sidebar is closed) */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl shadow-lg transition-all cursor-pointer hover:scale-103 flex items-center gap-1.5 focus:outline-none"
              title="عرض شريط الأقسام الجانبي"
            >
              <Menu className="w-4 h-4 text-indigo-300" />
              <span className="text-[11px] font-bold">توسيع الأقسام المحاسبية ◀</span>
            </button>
          )}

          <main className="flex-1 w-full min-h-[60vh] transition-all">
          
          {/* Animated Slide transition of panels */}
          <div className="transition-all">
            <AnimatePresence mode="wait">
              {showGlobSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4"
                >
                  <GlobalSearch 
                    state={state} 
                    onNavigateToItem={handleNavigateFromItem}
                    onClose={() => setShowGlobSearch(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                
                {/* Dynamic rendering depending on selected division tab */}
                {activeTab === 'debts' && (
                  <CustomerDebtsModule 
                    state={state} 
                    onUpdateState={updateStateAndSync} 
                    onOpenExporter={handleOpenExporter}
                    searchQuery={globalSearchQuery}
                  />
                )}

                {activeTab === 'companies' && (
                  <CompaniesModule 
                    state={state} 
                    onUpdateState={updateStateAndSync} 
                    onOpenExporter={handleOpenExporter}
                    searchQuery={globalSearchQuery}
                  />
                )}

                {activeTab === 'merchants' && (
                  <MerchantsModule 
                    state={state} 
                    onUpdateState={updateStateAndSync} 
                    onOpenExporter={handleOpenExporter}
                    searchQuery={globalSearchQuery}
                  />
                )}

                {activeTab === 'treasury' && (
                  <TreasuryModule 
                    state={state} 
                    onUpdateState={updateStateAndSync} 
                    onOpenExporter={handleOpenExporter}
                  />
                )}

                {activeTab === 'mail_manual' && (
                  <MailManualModule 
                    state={state} 
                    onUpdateState={updateStateAndSync} 
                  />
                )}

                {activeTab === 'financial_reports' && (
                  <FinancialReportsModule 
                    state={state} 
                    onOpenExporter={handleOpenExporter}
                  />
                )}

                {activeTab === 'purchases' && (
                  <PurchasesModule 
                    state={state} 
                    onUpdateState={updateStateAndSync} 
                    onOpenExporter={handleOpenExporter}
                  />
                )}

                {activeTab === 'deposits' && (
                  <DepositsModule 
                    state={state} 
                    onUpdateState={updateStateAndSync} 
                    onOpenExporter={handleOpenExporter}
                  />
                )}

                {activeTab === 'transaction_log' && (
                  <TransactionLogModule 
                    state={state} 
                    onOpenExporter={handleOpenExporter}
                  />
                )}

                {activeTab === 'trash_can' && (
                  <TrashCanModule 
                    state={state} 
                    onUpdateState={updateStateAndSync} 
                  />
                )}

                {activeTab === 'backup' && (
                  <BackupCenter 
                    state={state} 
                    onRestoreState={handleRestoreState}
                    onSaveBackupPoint={handleSaveBackupPoint}
                    onDeleteBackupPoint={handleDeleteBackupPoint}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsModule 
                    state={state}
                    currentUser={currentUser}
                    onUpdateState={updateStateAndSync}
                    onUpdateCurrentSession={handleUpdateCurrentSession}
                  />
                )}

                {activeTab === 'export_pdf' && (
                  <PdfExportModule 
                    state={state}
                  />
                )}

              </motion.div>
            </AnimatePresence>
          </div>

        </main>
      </div>
    </div>

      {/* 5. MODAL SIDEBARS / POPUPS */}
      
      {/* Excel Smart Importer Modal */}
      {showExcelImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl border border-slate-200 shadow-2xl overflow-hidden p-3 md:p-5">
            <div className="flex justify-between items-center pb-2.5 border-b mb-3 text-right" dir="rtl">
              <span className="font-extrabold text-sm text-slate-800">📊 استيراد ومعالجة ملفات الإكسل والـ CSV المعتمدة</span>
              <button 
                onClick={() => setShowExcelImportModal(false)}
                className="bg-slate-100 hover:bg-slate-250 text-slate-500 font-bold px-3 py-1.5 rounded-full text-xs"
              >
                إغلاق ✕
              </button>
            </div>
            <ExcelImporter 
              state={state}
              onImportComplete={(imported) => {
                handleExcelImportComplete(imported);
              }}
              onClose={() => setShowExcelImportModal(false)}
            />
          </div>
        </div>
      )}

      {/* WhatsApp Share Card PNG Image Exporter Component */}
      {showImageExportModal && (
        <ImageExporter 
          sectionName={exportSectionTitle}
          activeCurrency="دينار ليبي د.ل"
          metrics={exportMetrics}
          tableHeaders={exportHeaders}
          tableRows={exportRows}
          onClose={() => setShowImageExportModal(false)}
        />
      )}

      {/* Minimal Footer */}
      <footer className="bg-slate-900 text-slate-500 text-center py-6 border-t border-slate-950 mt-12 text-xs">
        <p className="font-mono">ABDO ERP MULTI-LEDGER V2 • CODENAME ANTIGRAVITY SECURITY SYSTEM</p>
        <p className="font-sans mt-1">جميع الحقوق محفوظة للمطورين. لا تظهر معلومات الحساب غير المسجلين بالشاشة.</p>
      </footer>

      {/* ========================================================= */}
      {/* YEAR 2100 MODERN CUSTOM SECURITY CONFIRMATION OVERLAYS */}
      {/* ========================================================= */}

      {/* 1. Log Out Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 shadow-2xl" dir="rtl">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] p-6 text-right">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#f1f5f9] text-sm">تأكيد إنهاء الجلسة والخروج</h3>
                <p className="text-[10px] text-slate-400 font-semibold">بوابة الأمان والتدقيق الحركي لعام 2100</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed font-semibold mb-6">
              هل أنت متأكد من تسجيل الخروج كلياً من دفاترك الحالية؟ سيتم تفكيك مفتاح الوصول الفردي وإعادتك مباشرةً لبوابة الدخول.
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={executeLogout}
                className="flex-1 bg-gradient-to-l from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black py-2.5 rounded-xl text-xs transition cursor-pointer text-center active:scale-95"
              >
                تأكيد الخروج الآمن
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer text-center active:scale-95"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Seed Sample Data Top Modal */}
      {showSeedConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 shadow-2xl" dir="rtl">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] p-6 text-right">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#f1f5f9] text-sm">شحن قاعدة البيانات المحاسبية</h3>
                <p className="text-[10px] text-indigo-400 font-semibold">تحميل المعطيات النموذجية التجريبية</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed font-semibold mb-5">
              هل تود شحن المنظومة وتحميل كافة البيانات المحاسبية والعملاء والشركات النموذجية الآن؟ <br />
              <strong className="text-amber-500/90 font-sans block mt-2 text-[10px]">⚠️ سيتم استبدال وحذف أي بيانات فارغة أو مدرجة حالياً ببيانات العينة المتكاملة لتجربة الدورة المحاسبية النشطة بالكامل.</strong>
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={executeDataSeed}
                className="flex-1 bg-gradient-to-l from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black py-2.5 rounded-xl text-xs transition cursor-pointer active:scale-95"
              >
                موافق، شحن الدفاتر
              </button>
              <button
                type="button"
                onClick={() => setShowSeedConfirm(false)}
                className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer active:scale-95"
              >
                تراجع وإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Seed Sample Data Empty Banner Modal */}
      {showSeedBannerConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 shadow-2xl" dir="rtl">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] p-6 text-right">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#f1f5f9] text-sm">تهيئة الحسابات وتفعيل محاكي الدفاتر</h3>
                <p className="text-[10px] text-amber-500 font-semibold">نظام التشغيل التلقائي بالأرصدة</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed font-semibold mb-5">
              هل تود شحن المنظومة ببيانات العينة وتجربة كافة الميزات والأرصدة الدائنة الآن للتبويب؟
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={executeSeedBanner}
                className="flex-1 bg-gradient-to-l from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition cursor-pointer active:scale-95"
              >
                تحديث وتجربة الفوري
              </button>
              <button
                type="button"
                onClick={() => setShowSeedBannerConfirm(false)}
                className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer active:scale-95"
              >
                إلغاء التنزيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Beautiful Custom Toast Alert Overlay */}
      {showCustomToast && (
        <div className="fixed bottom-6 left-6 max-w-md bg-[#0b0f19] border border-slate-800 p-4 rounded-2xl z-[99999] shadow-2xl text-right animate-slide-up flex items-center gap-3 border-l-4 border-l-emerald-500" dir="rtl">
          <div className="w-8 h-8 rounded-full bg-emerald-500/25 text-emerald-400 text-xs font-black flex items-center justify-center shrink-0">✓</div>
          <span className="text-xs font-bold text-slate-100">{showCustomToast}</span>
        </div>
      )}

    </div>
  );
}
