import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  UserPlus, 
  LogIn, 
  Users, 
  Lock, 
  Check, 
  Cpu, 
  Fingerprint, 
  Atom, 
  Activity, 
  Sparkles, 
  User, 
  KeyRound 
} from 'lucide-react';
import { User as UserType, ERPState } from '../types';

interface LoginScreenProps {
  state: ERPState;
  onUpdateState: (newState: ERPState) => void;
  onLoginSuccess: (user: UserType) => void;
}

export default function LoginScreen({ state, onUpdateState, onLoginSuccess }: LoginScreenProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeveloperCheatSheet, setShowDeveloperCheatSheet] = useState(false);

  // Register state details
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'admin' | 'accountant' | 'cashier' | 'warehouse' | 'assistant'>('accountant');
  const [isRegPasswordShown, setIsRegPasswordShown] = useState(false);

  // Dynamic login execution
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const targetUser = state.users.find(
      u => u.username.toLowerCase() === usernameInput.trim().toLowerCase()
    );

    if (!targetUser) {
      setErrorMessage('⚠️ عذراً! المعرّف الرقمي المدخل غير مدرج في سجلات البوابة.');
      return;
    }

    if (targetUser.password !== passwordInput.trim()) {
      setErrorMessage('❌ الرمز السري المدخل غير مطابق لتصريح الوصول المحدد.');
      return;
    }

    // Success login!
    onLoginSuccess(targetUser);
  };

  // Register account submission
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!regFullName.trim() || !regUsername.trim() || !regPassword.trim()) {
      setErrorMessage('⚠️ يرجى تعبئة كافة الحقول لتهيئة مفتاح الوصول الخاص بك.');
      return;
    }

    // Check conflict
    const isConflict = state.users.some(
      u => u.username.toLowerCase() === regUsername.trim().toLowerCase()
    );

    if (isConflict) {
      setErrorMessage('⚠️ اسم المستخدم هذا محجوز مسبقاً في قاعدة المعطيات الشبكية.');
      return;
    }

    const defaultPermissions = {
      admin: {
        canViewDebts: true,
        canViewCompanies: true,
        canViewTreasury: true,
        canViewPurchases: true,
        canViewDeposits: true,
        canViewArchive: true,
        canViewBackup: true
      },
      accountant: {
        canViewDebts: true,
        canViewCompanies: true,
        canViewTreasury: true,
        canViewPurchases: true,
        canViewDeposits: true,
        canViewArchive: true,
        canViewBackup: false
      },
      cashier: {
        canViewDebts: true,
        canViewCompanies: false,
        canViewTreasury: true,
        canViewPurchases: false,
        canViewDeposits: true,
        canViewArchive: false,
        canViewBackup: false
      },
      warehouse: {
        canViewDebts: false,
        canViewCompanies: false,
        canViewTreasury: false,
        canViewPurchases: true,
        canViewDeposits: false,
        canViewArchive: true,
        canViewBackup: false
      },
      assistant: {
        canViewDebts: true,
        canViewCompanies: false,
        canViewTreasury: false,
        canViewPurchases: false,
        canViewDeposits: false,
        canViewArchive: true,
        canViewBackup: false
      }
    };

    const newUser: UserType = {
      id: `u_${Date.now()}`,
      username: regUsername.trim().toLowerCase(),
      name: regFullName.trim(),
      role: regRole,
      password: regPassword.trim(),
      permissions: defaultPermissions[regRole],
      createdAt: new Date().toISOString()
    };

    onUpdateState({
      ...state,
      users: [...state.users, newUser]
    });

    // Auto-login or fill credentials
    setUsernameInput(newUser.username);
    setPasswordInput(newUser.password);
    setIsRegisterMode(false);
  };

  // Quick auto fill for sandbox testing
  const handleShortcutFill = (u: UserType) => {
    setUsernameInput(u.username);
    setPasswordInput(u.password);
    setErrorMessage('');
  };

  const roleArabicMap = {
    admin: 'المشرف العام الكلي للشبكة',
    accountant: 'المحلل المالي الرئيسي',
    cashier: 'أمين تسويات الصندوق الفورية',
    warehouse: 'مراقب الإمداد والمشتريات',
    assistant: 'مساعد العمليات التشغيلية'
  };

  return (
    <div className="min-h-screen bg-[#030712] text-right text-slate-100 p-4 sm:p-6 select-none font-sans overflow-x-hidden relative flex flex-col justify-between" dir="rtl">
      
      {/* Sleek Deep Space Holographic Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.11),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.06),transparent_50%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Futuristic Grid Lines Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Bar Header with Futuristic Metadata */}
      <header className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.25)] animate-pulse">
            <Atom className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-[#f8fafc] flex items-center gap-2">
              <span>نظام بوابات العبور الحركي الكلي</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">YEAR 2100</span>
            </h1>
            <p className="text-[10.5px] text-slate-400 font-medium">الذكاء المحاسبي المتكامل والشبكة اللامركزية لإدارة الذمم والشركاء</p>
          </div>
        </div>
        
        {/* Live Network Telemetry (Literal, Clean Indicator of Secured Workspace) */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Fingerprint className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-slate-300">SECURE QUANTUM LINK</span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT GATE CONTAINER */}
      <main className="flex-1 flex items-center justify-center py-8 z-10 w-full max-w-5xl mx-auto">
        <div className="w-full bg-[#0b0f19]/90 border border-slate-800/85 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] p-1.5 relative overflow-hidden backdrop-blur-xl">
          
          {/* Neon Top Accent Line */}
          <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-emerald-400 opacity-80" />

          {/* Integrated futuristic tabs header */}
          <div className="p-4 sm:p-6 pb-2">
            <div className="flex bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800/60 max-w-md mx-auto mb-6">
              <button
                type="button"
                onClick={() => setIsRegisterMode(false)}
                className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  !isRegisterMode
                    ? 'bg-slate-900 text-[#38bdf8] shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-slate-800/80 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>مصادقة المرور والمزامنة</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRegisterMode(true)}
                className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  isRegisterMode
                    ? 'bg-slate-900 text-[#38bdf8] shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-slate-800/80 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>تسجيل حساب موظف جديد</span>
              </button>
            </div>

            {/* Core Body Container Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* RIGHT SIDE: Dynamic futuristic form fields (Col 7) */}
              <div className="lg:col-span-7 bg-[#0e1626]/80 p-5 sm:p-7 rounded-3xl border border-slate-800 flex flex-col justify-between">
                
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                    <span className="text-[11px] font-mono tracking-wider uppercase text-indigo-400 font-bold">NODE INTERACTION PORTAL</span>
                  </div>

                  {errorMessage && (
                    <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/35 text-rose-300 text-xs font-bold leading-relaxed flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {!isRegisterMode ? (
                      // 🔑 SIGN IN FORM
                      <motion.div
                        key="login-form-pane"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                      >
                        <h2 className="text-base font-extrabold text-slate-100 mb-1">مصادقة مشغّل النظام الفردي</h2>
                        <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">أدخل معرّفك المحاسبي السري لتشغيل محرك الدفاتر المزامنة مع الخزينة المركزية.</p>

                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                          <div>
                            <label className="block text-slate-300 text-xs font-bold mb-1.5">اسم معرف المستخدم بالنظام (ID) *</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 font-mono text-xs">@</span>
                              <input
                                type="text"
                                required
                                value={usernameInput}
                                onChange={(e) => setUsernameInput(e.target.value)}
                                placeholder="أدخل اسم المستخدم مثل abdo"
                                className="w-full pr-10 pl-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-xs font-bold font-mono text-center focus:outline-none focus:border-indigo-500/80 transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500/25"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 text-xs font-bold mb-1.5">الرمز السري المشفر للعبور (Password) *</label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                                  <Lock className="w-4 h-4 text-slate-500" />
                                </span>
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  required
                                  value={passwordInput}
                                  onChange={(e) => setPasswordInput(e.target.value)}
                                  placeholder="أدخل كلمة المرور"
                                  className="w-full pr-10 pl-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-xs font-bold font-mono text-center focus:outline-none focus:border-indigo-500/80 transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500/25"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-slate-300 hover:text-slate-100 shrink-0 transition cursor-pointer flex items-center justify-center active:scale-95"
                                title={showPassword ? 'تشفير وحجب' : 'فك كشف الحجب'}
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full mt-6 bg-gradient-to-l from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                          >
                            <LogIn className="w-4 h-4 shrink-0 text-indigo-200" />
                            <span>فك ترميز الهوية والمزامنة الآن</span>
                          </button>
                        </form>
                      </motion.div>
                    ) : (
                      // 👤 SIGN UP/REGISTER FORM
                      <motion.div
                        key="register-form-pane"
                        initial={{ opacity: 0, x: -25 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 25 }}
                        transition={{ duration: 0.25 }}
                      >
                        <h2 className="text-base font-extrabold text-slate-100 mb-1">توليد معرّف حركي جديد</h2>
                        <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">سجل حساباً مفرزاً في الخادوم اللامركزي مع تعيين أدوار الدفاتر والصلاحيات.</p>

                        <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                          <div>
                            <label className="block text-slate-300 text-xs font-bold mb-1">الاسم الكامل للموظف (كما بالرقم الوطني) *</label>
                            <input
                              type="text"
                              required
                              value={regFullName}
                              onChange={(e) => setRegFullName(e.target.value)}
                              placeholder="مثال: المهندس مروان الورفلي"
                              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-150 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all text-right"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-300 text-xs font-bold mb-1">اسم الدخول المعياري (الشبكي) *</label>
                              <input
                                type="text"
                                required
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                                placeholder="مثال: marwan"
                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-150 text-center font-mono text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-300 text-xs font-bold mb-1">المسؤوليات التشغيلية التلقائية *</label>
                              <select
                                value={regRole}
                                onChange={(e) => setRegRole(e.target.value as any)}
                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-150 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                              >
                                <option value="accountant">محاسب عام للدفاتر والقوائم</option>
                                <option value="cashier">أمين صندوق الصرافة والداخل</option>
                                <option value="warehouse">أمين مخازن المشتريات والذمة</option>
                                <option value="assistant">مساعد تتبع تسويات العمليات</option>
                                <option value="admin">مسؤول رئيسي متمتع بكامل الامتيازات</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-300 text-xs font-bold mb-1">كلمة مرور لفك الحجب وحماية الأمان *</label>
                            <div className="flex gap-2">
                              {/* Password has hidden dynamic input, preserving clear privacy boundary */}
                              <input
                                type={isRegPasswordShown ? 'text' : 'password'}
                                required
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                placeholder="اكتب الرمز السري هنا"
                                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-150 font-mono text-center text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setIsRegPasswordShown(!isRegPasswordShown)}
                                className="px-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-300 hover:text-slate-100 shrink-0 transition"
                                title="إظهار / حجب"
                              >
                                {isRegPasswordShown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full mt-4 bg-gradient-to-l from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-slate-950 font-black py-3 px-4 rounded-2xl text-xs transition-all shadow-[0_4px_20px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                          >
                            <UserPlus className="w-4 h-4 shrink-0 text-slate-900" />
                            <span>تأكيد المطلب وإصدار الكارت المحاسبي</span>
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                <div className="mt-8 border-t border-slate-800/80 pt-4 text-center">
                  <span className="text-[10px] text-slate-500 font-medium">نظام التشفير القياسي المحمي بقوة عظمى للاتصال غير المركزي.</span>
                </div>

              </div>

              {/* LEFT SIDE: Professional integrated tables data (Col 5) */}
              <div className="lg:col-span-5 bg-slate-950/40 p-5 rounded-3xl border border-slate-800/80 flex flex-col justify-between">
                
                <div>
                  {!showDeveloperCheatSheet ? (
                    // 🔒 SECURE SYSTEM PORTAL GRAPHIC (Default View for users/public)
                    <div className="animate-fade-in text-right">
                      <div className="w-12 h-12 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] mb-4">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h4 className="text-sm font-black text-[#f1f5f9] mb-1">بوابة المصادقة المشفرة والآمنة</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-6">
                        تم تفعيل بروتوكول الحماية الشامل لشبكة تتبع الذمم والمشتريات. كافة الجلسات النشطة مراقبة ومقيدة بسلسلة حركية تضمن مطابقة الأرصدة بدقة تامة وبدون كسور عشرية.
                      </p>

                      <div className="space-y-2 text-[10.5px] bg-[#0c1322] border border-slate-800/80 p-4 rounded-2xl">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                          <span className="text-slate-500 font-sans">حالة البوابة (SYSTEM)</span>
                          <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            ONLINE
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                          <span className="text-slate-500 font-sans">معيار الأرقام (NUMBERS)</span>
                          <span className="text-[#38bdf8] font-bold">دقيق 100% وبدون مراتب خسرية ✓</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                          <span className="text-slate-500 font-sans">ترميز البيانات (DATABASE)</span>
                          <span className="text-indigo-400 font-mono">Quantum Shields Active</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-sans">مشغّلين مصادق عليهم</span>
                          <span className="text-slate-350 font-sans font-bold">{state.users.length} مستخدمين</span>
                        </div>
                      </div>

                      {/* Professional Toggle for Developer / Simulation check */}
                      <button
                        type="button"
                        onClick={() => setShowDeveloperCheatSheet(true)}
                        className="w-full mt-6 bg-slate-900 border border-slate-800/80 hover:bg-slate-850 hover:border-indigo-500/40 text-slate-300 hover:text-[#38bdf8] text-[10px] font-black py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                      >
                        <KeyRound className="w-3.5 h-3.5 shrink-0 text-slate-500 hover:text-indigo-400" />
                        <span>🔑 إظهار معرّفات الدخول للفحص والمحاكاة</span>
                      </button>
                    </div>
                  ) : (
                    // ⚙️ DEVELOPER / SIMULATION CREDENTIAL CHEAT SHEET (Toggled view)
                    <div className="animate-fade-in text-right">
                      <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-800/85 pb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                          <div>
                            <h4 className="text-xs font-black text-[#f1f5f9]">معرّفات المحاكاة للفحص السريع</h4>
                            <p className="text-[9px] text-slate-400">اضغط لملء البيانات التلقائية للموظف المحدد:</p>
                          </div>
                        </div>
                      </div>

                      {/* Table containing passwords for developers to simulate role changes */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 select-none">
                        <table className="w-full border-collapse text-[10px] text-right">
                          <thead>
                            <tr className="bg-slate-900/90 text-slate-300 font-black border-b border-slate-800">
                              <th className="p-1.5 w-6 text-center font-mono">#</th>
                              <th className="p-1.5 py-2">الموظف</th>
                              <th className="p-1.5 text-center font-mono">اسم الدخول</th>
                              <th className="p-1.5 text-center font-mono">الرمز السري</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state.users.map((u, i) => {
                              const isActiveMatch = usernameInput.toLowerCase() === u.username.toLowerCase();
                              return (
                                <tr
                                  key={u.id}
                                  onClick={() => handleShortcutFill(u)}
                                  className={`cursor-pointer transition-all border-b border-slate-900 last:border-0 hover:bg-indigo-950/40 ${
                                    isActiveMatch ? 'bg-indigo-950/25 text-[#38bdf8] font-bold' : 'text-slate-300 hover:text-slate-100'
                                  }`}
                                >
                                  <td className="p-1.5 text-center bg-slate-900/40 font-mono text-slate-500">
                                    {i + 1}
                                  </td>
                                  <td className="p-1.5 pl-1">
                                    <span className="block font-bold leading-tight">{u.name}</span>
                                    <span className="text-[8.5px] text-slate-500 font-medium block leading-none mt-0.5">
                                      {roleArabicMap[u.role] || u.role}
                                    </span>
                                  </td>
                                  <td className="p-1.5 text-center font-mono text-indigo-400">
                                    {u.username}
                                  </td>
                                  <td className="p-1.5 text-center font-mono text-slate-450 bg-slate-900/20 font-bold">
                                    {u.password}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowDeveloperCheatSheet(false)}
                        className="w-full mt-4 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-400 text-[10px] font-black py-2 px-3 rounded-xl transition cursor-pointer"
                      >
                        🔒 حجب المعرّفات وحماية البوابة مجدداً
                      </button>
                    </div>
                  )}

                  <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-2xl mt-4">
                    <h5 className="text-[10px] text-indigo-400 font-bold mb-1">🔒 بروتوكول الأمان المزدوج للأرصدة</h5>
                    <p className="text-[9.5px] text-slate-400 leading-normal">
                      تتكامل مستويات الوصول بصلاحيات منفصلة لمنع حركة أي تلاعب بالأرصدة الدائنة، ولتثبيت دورة الترحيل اليدوية 12:00 كمعيار رقابي دائم.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-3 mt-4 text-center">
                  <span className="text-[9.5px] text-slate-600 font-mono">CONNECTION STABILITY MAP: DYNAMIC CRYPTO SHIELDS CONNECTED</span>
                </div>

              </div>

            </div>

          </div>

        </div>
      </main>

      {/* Cybernetic Footer */}
      <footer className="py-4 text-center border-t border-slate-900 w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-mono z-20 gap-3">
        <div>COSMIC DATABASE PLATFORM SYSTEM LAYER • BUILD 2100A</div>
        <div className="text-[10px] text-slate-600 font-sans">تنبيه مشدد: يتم حماية الجلسة وتأمين الدفاتر ونقاط ومحاور المندوبية بترميز من طرف إلى طرف.</div>
      </footer>

    </div>
  );
}
