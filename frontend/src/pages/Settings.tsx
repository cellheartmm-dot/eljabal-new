import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface SystemUser {
  id: string;
  name: string;
  username: string;
  role: string; // "مدير النظام", "محاسب مالية", "مشرف موقع", "مهندس حصر", "قراءة فقط"
  phone?: string;
  canRecordExpenses?: boolean;
  canRecordWorkerDaily?: boolean;
  canRecordSubcontractorDaily?: boolean;
  createdAt?: string;
}

export default function SettingsPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<"company" | "users" | "landing" | "password">("company");

  // 1. Isolated Company Settings Fields
  const [companyName, setCompanyName] = useState("الجبل الذهبي للمقاولات والاستثمار العقاري");
  const [phone, setPhone] = useState("01120715027");
  const [companyLogo, setCompanyLogo] = useState<string>("/logo.jpeg");
  const [savingCompany, setSavingCompany] = useState(false);

  // 2. System Users & Roles State
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userName, setUserName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("👷 مشرف موقع (حضور ومصروفات الموقع)");
  const [userPhone, setUserPhone] = useState("");
  const [canRecordExpenses, setCanRecordExpenses] = useState(true);
  const [canRecordWorkerDaily, setCanRecordWorkerDaily] = useState(false);
  const [canRecordSubcontractorDaily, setCanRecordSubcontractorDaily] = useState(false);

  // 3. Customizable Landing Page CMS Content State
  const [heroTitle, setHeroTitle] = useState("بناء المستقبل بأعلى معايير الجودة والهندسة المتقدمة");
  const [heroSubtitle, setHeroSubtitle] = useState("رائدون في مجالات المقاولات العامة، المنشآت الخرسانية، أعمال التشطيبات، وإدارة المشاريع الضخمة بمصر والشرق الأوسط.");
  const [statsProjects, setStatsProjects] = useState("45+");
  const [statsValue, setStatsValue] = useState("250M+");
  const [statsLabor, setStatsLabor] = useState("500+");
  const [savingLanding, setSavingLanding] = useState(false);

  // 4. Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    // Load local cache first for instant responsiveness
    try {
      const cachedLogo = localStorage.getItem("eljabal_company_logo");
      const cachedName = localStorage.getItem("eljabal_company_name");
      const cachedPhone = localStorage.getItem("eljabal_company_phone");

      if (cachedLogo) setCompanyLogo(cachedLogo);
      if (cachedName) setCompanyName(cachedName);
      if (cachedPhone) setPhone(cachedPhone);
    } catch (e) {}

    // Load Settings from Supabase
    async function loadSettings() {
      try {
        const { data, error } = await supabase.from("Setting").select("*");
        if (!error && data) {
          const nameS = data.find((s: any) => s.key === "companyName");
          const phoneS = data.find((s: any) => s.key === "phone");
          const logoS = data.find((s: any) => s.key === "companyLogo");

          const hTitleS = data.find((s: any) => s.key === "landing_hero_title");
          const hSubS = data.find((s: any) => s.key === "landing_hero_subtitle");
          const sProjS = data.find((s: any) => s.key === "landing_stats_projects");
          const sValS = data.find((s: any) => s.key === "landing_stats_value");
          const sLabS = data.find((s: any) => s.key === "landing_stats_labor");

          if (nameS?.value) setCompanyName(nameS.value);
          if (phoneS?.value) setPhone(phoneS.value);
          if (logoS?.value) setCompanyLogo(logoS.value);
          if (hTitleS?.value) setHeroTitle(hTitleS.value);
          if (hSubS?.value) setHeroSubtitle(hSubS.value);
          if (sProjS?.value) setStatsProjects(sProjS.value);
          if (sValS?.value) setStatsValue(sValS.value);
          if (sLabS?.value) setStatsLabor(sLabS.value);
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Load System Users
    async function loadUsers() {
      setLoadingUsers(true);
      try {
        // 1. Try loading from Setting table first (contains full granular permissions)
        const { data: settingData } = await supabase
          .from("Setting")
          .select("*")
          .eq("key", "system_users_list")
          .maybeSingle();

        if (settingData && settingData.value) {
          try {
            const parsed = JSON.parse(settingData.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.map((u: any) => {
                const isAdm = u.username === "admin" || (u.role && u.role.includes("مدير"));
                return {
                  ...u,
                  role: isAdm ? "👑 مدير النظام (كامل الصلاحيات)" : (u.role || "👷 مشرف موقع (حضور ومصروفات الموقع)"),
                  canRecordExpenses: isAdm ? true : (u.canRecordExpenses !== undefined ? u.canRecordExpenses : true),
                  canRecordWorkerDaily: isAdm ? true : (u.canRecordWorkerDaily !== undefined ? u.canRecordWorkerDaily : false),
                  canRecordSubcontractorDaily: isAdm ? true : (u.canRecordSubcontractorDaily !== undefined ? u.canRecordSubcontractorDaily : false),
                };
              });
              setUsersList(cleaned);
              localStorage.setItem("system_users_list", JSON.stringify(cleaned));
              return;
            }
          } catch (e) {}
        }

        // 2. Otherwise load from User table
        const { data: dbUsers } = await supabase.from("User").select("*");
        if (dbUsers && dbUsers.length > 0) {
          const mapped: SystemUser[] = dbUsers.map((u: any) => {
            const isAdm = u.username === "admin" || u.role === "admin" || (u.role && u.role.includes("مدير"));
            const isAcc = u.role === "accountant" || (u.role && u.role.includes("محاسب"));
            const roleStr = isAdm
              ? "👑 مدير النظام (كامل الصلاحيات)"
              : isAcc
              ? "💰 محاسب مالية (إيرادات ومصروفات)"
              : "👷 مشرف موقع (حضور ومصروفات الموقع)";

            return {
              id: u.id,
              name: u.name || (isAdm ? "مدير النظام" : u.username),
              username: u.username || "user",
              role: roleStr,
              phone: u.phone || "",
              canRecordExpenses: true,
              canRecordWorkerDaily: isAdm,
              canRecordSubcontractorDaily: isAdm,
              createdAt: u.createdAt,
            };
          });

          setUsersList(mapped);
          localStorage.setItem("system_users_list", JSON.stringify(mapped));
          // Save to Setting for future granular preservation
          await supabase.from("Setting").upsert([{ key: "system_users_list", value: JSON.stringify(mapped) }]);
          return;
        }

        // 3. Fallback to default users
        const localU = localStorage.getItem("system_users_list");
        if (localU) {
          setUsersList(JSON.parse(localU));
        } else {
          const defaults: SystemUser[] = [
            { id: "cms3r63ks0000ksw3rslg4szt", name: "مدير النظام", username: "admin", role: "👑 مدير النظام (كامل الصلاحيات)", phone: "01120715027", canRecordExpenses: true, canRecordWorkerDaily: true, canRecordSubcontractorDaily: true },
            { id: "usr-2", name: "المحاسب المالي", username: "accountant", role: "💰 محاسب مالية (إيرادات ومصروفات)", phone: "01000000001", canRecordExpenses: true, canRecordWorkerDaily: true, canRecordSubcontractorDaily: true },
            { id: "usr-3", name: "مشرف الموقع", username: "supervisor", role: "👷 مشرف موقع (حضور ومصروفات الموقع)", phone: "01000000002", canRecordExpenses: true, canRecordWorkerDaily: false, canRecordSubcontractorDaily: false },
          ];
          setUsersList(defaults);
          localStorage.setItem("system_users_list", JSON.stringify(defaults));
          await supabase.from("Setting").upsert([{ key: "system_users_list", value: JSON.stringify(defaults) }]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingUsers(false);
      }
    }

    loadSettings();
    loadUsers();
  }, []);

  // Save Isolated Company Info
  const handleSaveCompany = async (e: FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);

    try {
      localStorage.setItem("eljabal_company_name", companyName);
      localStorage.setItem("eljabal_company_phone", phone);
      if (companyLogo) localStorage.setItem("eljabal_company_logo", companyLogo);

      await supabase.from("Setting").upsert([
        { key: "companyName", value: companyName },
        { key: "phone", value: phone },
        ...(companyLogo ? [{ key: "companyLogo", value: companyLogo }] : []),
      ]);

      showToast("تم حفظ وتثبيت بيانات وشعار الشركة بنجاح 🎉", "success");
    } catch (e: any) {
      showToast(e.message || "حدث خطأ أثناء حفظ الإعدادات", "error");
    } finally {
      setSavingCompany(false);
    }
  };

  // Save Landing Page Custom Contents
  const handleSaveLanding = async (e: FormEvent) => {
    e.preventDefault();
    setSavingLanding(true);

    try {
      await supabase.from("Setting").upsert([
        { key: "landing_hero_title", value: heroTitle },
        { key: "landing_hero_subtitle", value: heroSubtitle },
        { key: "landing_stats_projects", value: statsProjects },
        { key: "landing_stats_value", value: statsValue },
        { key: "landing_stats_labor", value: statsLabor },
      ]);

      showToast("تم حفظ وتحديث محتوى الصفحة التعريفية (Landing Page) بنجاح 🌐🎉", "success");
    } catch (e: any) {
      showToast(e.message || "حدث خطأ أثناء حفظ بيانات الصفحة التعريفية", "error");
    } finally {
      setSavingLanding(false);
    }
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserName("");
    setUserUsername("");
    setUserPassword("");
    setUserRole("👷 مشرف موقع (حضور ومصروفات الموقع)");
    setUserPhone("");
    setCanRecordExpenses(true);
    setCanRecordWorkerDaily(false);
    setCanRecordSubcontractorDaily(false);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: SystemUser) => {
    const isAdm = u.username === "admin" || (u.role && u.role.includes("مدير"));
    setEditingUser(u);
    setUserName(u.name || (isAdm ? "مدير النظام" : u.username));
    setUserUsername(u.username);
    setUserPassword("");
    setUserRole(isAdm ? "👑 مدير النظام (كامل الصلاحيات)" : (u.role || "👷 مشرف موقع (حضور ومصروفات الموقع)"));
    setUserPhone(u.phone || "");
    setCanRecordExpenses(isAdm ? true : (u.canRecordExpenses !== undefined ? u.canRecordExpenses : true));
    setCanRecordWorkerDaily(isAdm ? true : (u.canRecordWorkerDaily !== undefined ? u.canRecordWorkerDaily : false));
    setCanRecordSubcontractorDaily(isAdm ? true : (u.canRecordSubcontractorDaily !== undefined ? u.canRecordSubcontractorDaily : false));
    setShowUserModal(true);
  };

  // Add / Edit System User Handler
  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userUsername.trim()) {
      showToast("برجاء إدخال الاسم واسم الدخول", "warning");
      return;
    }

    const isAdm = userUsername.trim() === "admin" || userRole.includes("مدير");
    const effRole = isAdm ? "👑 مدير النظام (كامل الصلاحيات)" : userRole;
    const effExpenses = isAdm ? true : canRecordExpenses;
    const effWorker = isAdm ? true : canRecordWorkerDaily;
    const effSub = isAdm ? true : canRecordSubcontractorDaily;
    const dbRole = isAdm ? "admin" : effRole.includes("محاسب") ? "accountant" : "supervisor";

    try {
      let updated: SystemUser[] = [];

      if (editingUser) {
        // 1. Update in User table
        const updatePayload: any = {
          name: userName.trim(),
          username: userUsername.trim(),
          role: dbRole,
        };
        if (userPassword.trim()) {
          updatePayload.password = userPassword.trim();
        }

        try {
          await supabase.from("User").update(updatePayload).eq("id", editingUser.id);
        } catch (e) {}

        // 2. Update in List State
        updated = usersList.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: userName.trim(),
                username: userUsername.trim(),
                role: effRole,
                phone: userPhone.trim(),
                canRecordExpenses: effExpenses,
                canRecordWorkerDaily: effWorker,
                canRecordSubcontractorDaily: effSub,
              }
            : u
        );
        showToast("تم تحديث بيانات المستخدم والصلاحية بنجاح 👤✅", "success");
      } else {
        const newUser: SystemUser = {
          id: "usr-" + Date.now(),
          name: userName.trim(),
          username: userUsername.trim(),
          role: effRole,
          phone: userPhone.trim(),
          canRecordExpenses: effExpenses,
          canRecordWorkerDaily: effWorker,
          canRecordSubcontractorDaily: effSub,
          createdAt: new Date().toISOString(),
        };

        // 1. Insert into User table
        try {
          await supabase.from("User").insert([{
            id: newUser.id,
            name: newUser.name,
            username: newUser.username,
            password: userPassword.trim() || "123456",
            role: dbRole,
          }]);
        } catch (e) {}

        updated = [newUser, ...usersList];
        showToast("تم إضافة المستخدم وتحديد الصلاحية بنجاح 👤✅", "success");
      }

      setUsersList(updated);
      localStorage.setItem("system_users_list", JSON.stringify(updated));

      // 3. Persist reliably to Setting table
      await supabase.from("Setting").upsert([{ key: "system_users_list", value: JSON.stringify(updated) }]);

      setShowUserModal(false);
      setEditingUser(null);
      setUserName("");
      setUserUsername("");
      setUserPassword("");
      setUserPhone("");
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء حفظ بيانات المستخدم", "error");
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم (${name})؟`)) return;
    try {
      await supabase.from("User").delete().eq("id", id);
    } catch (err) {}

    const updated = usersList.filter((u) => u.id !== id);
    setUsersList(updated);
    localStorage.setItem("system_users_list", JSON.stringify(updated));
    try {
      await supabase.from("Setting").upsert([{ key: "system_users_list", value: JSON.stringify(updated) }]);
    } catch (e) {}
    showToast("تم حذف المستخدم بنجاح 🗑️", "success");
  };

  // Change Password
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast("كلمة المرور الجديدة وتأكيدها غير متطابقين", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error");
      return;
    }

    setPassLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      showToast("تم تحديث كلمة المرور بنجاح 🎉", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء تغيير كلمة المرور", "error");
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ إعدادات النظام والمستخدمين والصفحة التعريفية</h1>
          <p className="page-subtitle">تعديل اسم وشعار وهاتف الشركة، تحديد صلاحيات المستخدمين، ومُحرر الصفحة التعريفية (Landing Page)</p>
        </div>
        <a href="/landing" target="_blank" rel="noreferrer" className="btn btn-ghost">
          🌐 المعاينة الحية للصفحة التعريفية
        </a>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("company")}
          style={{
            padding: "9px 18px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 13,
            border: activeTab === "company" ? "1px solid #3b82f6" : "1px solid transparent",
            background: activeTab === "company" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "hsl(var(--bg-elevated))",
            color: activeTab === "company" ? "#fff" : "hsl(var(--text-primary))",
          }}
        >
          🏢 بيانات وشعار الشركة
        </button>

        <button
          onClick={() => setActiveTab("users")}
          style={{
            padding: "9px 18px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 13,
            border: activeTab === "users" ? "1px solid #3b82f6" : "1px solid transparent",
            background: activeTab === "users" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "hsl(var(--bg-elevated))",
            color: activeTab === "users" ? "#fff" : "hsl(var(--text-primary))",
          }}
        >
          👥 المستخدمون والصلاحيات ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab("landing")}
          style={{
            padding: "9px 18px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 13,
            border: activeTab === "landing" ? "1px solid #3b82f6" : "1px solid transparent",
            background: activeTab === "landing" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "hsl(var(--bg-elevated))",
            color: activeTab === "landing" ? "#fff" : "hsl(var(--text-primary))",
          }}
        >
          🌐 مُحرر الصفحة التعريفية (Landing Page)
        </button>

        <button
          onClick={() => setActiveTab("password")}
          style={{
            padding: "9px 18px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 13,
            border: activeTab === "password" ? "1px solid #3b82f6" : "1px solid transparent",
            background: activeTab === "password" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "hsl(var(--bg-elevated))",
            color: activeTab === "password" ? "#fff" : "hsl(var(--text-primary))",
          }}
        >
          🔒 كلمة المرور الأمان
        </button>
      </div>

      {/* TAB 1: ISOLATED COMPANY INFO & LOGO */}
      {activeTab === "company" && (
        <div className="card" style={{ maxWidth: 700 }}>
          <div className="card-header">
            <h2 className="card-title">🏢 معلومات وشعار الشركة الرسمي</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveCompany}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: 13 }}>
                  اسم الشركة / المؤسسة * (منفصل)
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="أدخل اسم الشركة الرسمي..."
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: 13 }}>
                  رقم الهاتف والتواصل الرئيسي * (منفصل)
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="أدخل رقم هاتف الشركة للتواصل والواتساب..."
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 800, fontSize: 13 }}>
                  لوجو ورابط شعار الشركة الرسمي * (منفصل)
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={companyLogo}
                  onChange={(e) => setCompanyLogo(e.target.value)}
                  placeholder="أدخل رابط الشعار مثل /logo.jpeg أو URL..."
                />
                {companyLogo && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>معاينة الشعار الحالي:</span>
                    <img
                      src={companyLogo}
                      alt="Company Logo Preview"
                      style={{ height: 50, width: 50, borderRadius: 10, objectFit: "cover", border: "2px solid #d97706" }}
                      onError={(e) => { e.currentTarget.src = "/logo.jpeg"; }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn btn-primary" disabled={savingCompany}>
                  {savingCompany ? <span className="spinner" /> : "💾 حفظ وتثبيت إعدادات الشركة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM USERS & ROLES */}
      {activeTab === "users" && (
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="card-title">👥 مستخدمو النظام وتحديد الصلاحيات والوصول</h2>
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddUser}>
              + إضافة مستخدم جديد وتحديد الصلاحية
            </button>
          </div>

          <div className="table-container">
            {loadingUsers ? (
              <div className="empty-state">
                <span className="spinner" style={{ width: 30, height: 30 }} />
                <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل قائمة المستخدمين...</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 45, textAlign: "center" }}>#</th>
                    <th>اسم المستخدم</th>
                    <th>اسم الدخول (Username)</th>
                    <th>رقم الهاتف</th>
                    <th>الصلاحية المحددة بالنظام</th>
                    <th style={{ textAlign: "center", minWidth: 140 }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u, idx) => (
                    <tr key={u.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 800 }}>{u.name}</td>
                      <td style={{ color: "hsl(var(--gold))", fontWeight: 700 }}>{u.username}</td>
                      <td>{u.phone || "-"}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className={`badge ${u.role.includes("مدير") ? "badge-success" : u.role.includes("محاسب") ? "badge-warning" : "badge-info"}`} style={{ width: "fit-content" }}>
                            {u.role}
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: (u.canRecordExpenses !== false) ? "#dcfce7" : "#fee2e2", color: (u.canRecordExpenses !== false) ? "#166534" : "#991b1b", border: (u.canRecordExpenses !== false) ? "1px solid #bbf7d0" : "1px solid #fecaca", fontWeight: 700 }}>
                              {(u.canRecordExpenses !== false) ? "✅ تسجيل المصروفات" : "❌ تسجيل المصروفات"}
                            </span>
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: u.canRecordWorkerDaily ? "#dbeafe" : "#f1f5f9", color: u.canRecordWorkerDaily ? "#1e40af" : "#64748b", border: u.canRecordWorkerDaily ? "1px solid #bfdbfe" : "1px solid #e2e8f0", fontWeight: 700 }}>
                              {u.canRecordWorkerDaily ? "✅ يوميات العمال" : "🔒 يوميات العمال (معطل)"}
                            </span>
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: u.canRecordSubcontractorDaily ? "#fef3c7" : "#f1f5f9", color: u.canRecordSubcontractorDaily ? "#92400e" : "#64748b", border: u.canRecordSubcontractorDaily ? "1px solid #fde68a" : "1px solid #e2e8f0", fontWeight: 700 }}>
                              {u.canRecordSubcontractorDaily ? "✅ يوميات المقاولين" : "🔒 يوميات المقاولين (معطل)"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                            title="تعديل المستخدم والصلاحية"
                          >
                            <span>✏️</span>
                            <span>تعديل</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", padding: "4px 8px", borderRadius: 6, fontSize: 12 }}
                            title="حذف المستخدم"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LANDING PAGE CMS EDITOR */}
      {activeTab === "landing" && (
        <div className="card" style={{ maxWidth: 800 }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="card-title">🌐 مُحرر وتعديل الصفحة التعريفية العامة (Landing Page Editor)</h2>
            <a href="/landing" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              👁️ معاينة الصفحة
            </a>
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveLanding}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>العنوان الرئيسي بالصفحة (Hero Title) *</label>
                <input
                  type="text"
                  className="form-control"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>الوصف والنبذة الترحيبية (Subtitle) *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid-3" style={{ gap: 14, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>إحصائية المشاريع</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: 45+"
                    value={statsProjects}
                    onChange={(e) => setStatsProjects(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>حجم الاستثمارات</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: 250M+"
                    value={statsValue}
                    onChange={(e) => setStatsValue(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>فريق العمل والعمالة</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: 500+"
                    value={statsLabor}
                    onChange={(e) => setStatsLabor(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn btn-primary" disabled={savingLanding}>
                  {savingLanding ? <span className="spinner" /> : "💾 حفظ وتحديث محتوى الصفحة التعريفية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: CHANGE PASSWORD */}
      {activeTab === "password" && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-header">
            <h2 className="card-title">🔒 تغيير كلمة المرور للم الحساب الحالي</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">كلمة المرور الحالية</label>
                <input
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور الجديدة..."
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary mt-4" disabled={passLoading}>
                {passLoading ? <span className="spinner" /> : "تحديث كلمة المرور"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT SYSTEM USER MODAL */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingUser ? "✏️ تعديل بيانات وصلاحيات المستخدم" : "👤 إضافة مستخدم جديد وتحديد الصلاحيات"}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم الكامل للمستخدم *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="مثال: المهندس أحمد علي..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">اسم الدخول (Username) *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="username"
                      value={userUsername}
                      onChange={(e) => setUserUsername(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {editingUser ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور الإفتراضية *"}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      required={!editingUser}
                      placeholder={editingUser ? "اتركها فارغة للإبقاء على القديمة" : "123456"}
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الصلاحية الرئيسية بالنظام *</label>
                  <select className="form-control" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                    <option value="👑 مدير النظام (كامل الصلاحيات)">👑 مدير النظام (كامل الصلاحيات)</option>
                    <option value="💰 محاسب مالية (إيرادات ومصروفات)">💰 محاسب مالية (إيرادات ومصروفات)</option>
                    <option value="👷 مشرف موقع (حضور ومصروفات الموقع)">👷 مشرف موقع (حضور ومصروفات الموقع)</option>
                    <option value="🏗️ مهندس حصر ومقاولات (نماذج وحصر)">🏗️ مهندس حصر ومقاولات (نماذج وحصر)</option>
                    <option value="👁️ قراءة فقط (ReadOnly)">👁️ قراءة فقط (ReadOnly)</option>
                  </select>
                </div>

                {/* GRANULAR PERMISSIONS SECTION */}
                <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 800, color: "#1e3a8a", marginBottom: 8, display: "block" }}>
                    🔐 الصلاحيات الميدانية والمالية الخاصة بالمستخدم:
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, cursor: "pointer", fontWeight: 700, color: "#0f172a" }}>
                      <input
                        type="checkbox"
                        checked={canRecordExpenses}
                        onChange={(e) => setCanRecordExpenses(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: "#2563eb" }}
                      />
                      <span>💸 تسجيل مصروفات الموقع للمشاريع المسندة (مفعل للمشرفين)</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, cursor: "pointer", fontWeight: 700, color: "#0f172a" }}>
                      <input
                        type="checkbox"
                        checked={canRecordWorkerDaily}
                        onChange={(e) => setCanRecordWorkerDaily(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: "#2563eb" }}
                      />
                      <span>👷 تسجيل يوميات وحضور العمال (فتح الصلاحية لهذا المشرف)</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, cursor: "pointer", fontWeight: 700, color: "#0f172a" }}>
                      <input
                        type="checkbox"
                        checked={canRecordSubcontractorDaily}
                        onChange={(e) => setCanRecordSubcontractorDaily(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: "#2563eb" }}
                      />
                      <span>🔨 تسجيل يوميات أطقم وصناع مقاولي الباطن (فتح الصلاحية لهذا المشرف)</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">رقم الهاتف التواصل</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="01000000000..."
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? "💾 حفظ وتحديث التعديلات" : "إضافة المستخدم والتثبيت"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
