import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";
import PermissionsMatrixEditor from "../components/common/PermissionsMatrixEditor";
import {
  type PermissionsMatrix,
  getDefaultPermissionsForRole,
  FULL_ADMIN_PERMISSIONS,
} from "../lib/permissions";

interface SystemUser {
  id: string;
  name: string;
  username: string;
  role: string; // "مدير النظام", "محاسب مالية", "مشرف موقع", "مهندس حصر", "قراءة فقط"
  phone?: string;
  canRecordExpenses?: boolean;
  canRecordWorkerDaily?: boolean;
  canRecordSubcontractorDaily?: boolean;
  permissions?: PermissionsMatrix;
  createdAt?: string;
}

export default function SettingsPage() {
  const navigate = useNavigate();
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
  const [userRole, setUserRole] = useState("💰 محاسب مالية (إيرادات ومصروفات)");
  const [userPhone, setUserPhone] = useState("");
  const [canRecordExpenses, setCanRecordExpenses] = useState(true);
  const [canRecordWorkerDaily, setCanRecordWorkerDaily] = useState(false);
  const [canRecordSubcontractorDaily, setCanRecordSubcontractorDaily] = useState(false);
  const [userPermissions, setUserPermissions] = useState<PermissionsMatrix>(FULL_ADMIN_PERMISSIONS);

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
                  permissions: isAdm ? FULL_ADMIN_PERMISSIONS : (u.permissions || getDefaultPermissionsForRole(u.role || "مشرف")),
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
              permissions: isAdm ? FULL_ADMIN_PERMISSIONS : getDefaultPermissionsForRole(roleStr),
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
            { id: "cms3r63ks0000ksw3rslg4szt", name: "مدير النظام", username: "admin", role: "👑 مدير النظام (كامل الصلاحيات)", phone: "01120715027", canRecordExpenses: true, canRecordWorkerDaily: true, canRecordSubcontractorDaily: true, permissions: FULL_ADMIN_PERMISSIONS },
            { id: "usr-2", name: "المحاسب المالي", username: "accountant", role: "💰 محاسب مالية (إيرادات ومصروفات)", phone: "01000000001", canRecordExpenses: true, canRecordWorkerDaily: true, canRecordSubcontractorDaily: true, permissions: getDefaultPermissionsForRole("accountant") },
            { id: "usr-3", name: "مشرف الموقع", username: "supervisor", role: "👷 مشرف موقع (حضور ومصروفات الموقع)", phone: "01000000002", canRecordExpenses: true, canRecordWorkerDaily: false, canRecordSubcontractorDaily: false, permissions: getDefaultPermissionsForRole("supervisor") },
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
    const defaultRole = "💰 محاسب مالية (إيرادات ومصروفات)";
    setUserRole(defaultRole);
    setUserPhone("");
    setCanRecordExpenses(true);
    setCanRecordWorkerDaily(false);
    setCanRecordSubcontractorDaily(false);
    setUserPermissions(getDefaultPermissionsForRole(defaultRole));
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: SystemUser) => {
    const isAdm = u.username === "admin" || (u.role && u.role.includes("مدير"));
    const effRole = isAdm ? "👑 مدير النظام (كامل الصلاحيات)" : (u.role || "👷 مشرف موقع (حضور ومصروفات الموقع)");
    setEditingUser(u);
    setUserName(u.name || (isAdm ? "مدير النظام" : u.username));
    setUserUsername(u.username);
    setUserPassword("");
    setUserRole(effRole);
    setUserPhone(u.phone || "");
    setCanRecordExpenses(isAdm ? true : (u.canRecordExpenses !== undefined ? u.canRecordExpenses : true));
    setCanRecordWorkerDaily(isAdm ? true : (u.canRecordWorkerDaily !== undefined ? u.canRecordWorkerDaily : false));
    setCanRecordSubcontractorDaily(isAdm ? true : (u.canRecordSubcontractorDaily !== undefined ? u.canRecordSubcontractorDaily : false));
    setUserPermissions(isAdm ? FULL_ADMIN_PERMISSIONS : (u.permissions || getDefaultPermissionsForRole(effRole)));
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
    const finalPermissions = isAdm ? FULL_ADMIN_PERMISSIONS : userPermissions;
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
                permissions: finalPermissions,
              }
            : u
        );
        showToast("تم تحديث بيانات المستخدم والصلاحيات بنجاح 👤✅", "success");
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
          permissions: finalPermissions,
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
        showToast("تم إضافة المستخدم وتحديد الصلاحيات بنجاح 👤✅", "success");
      }

      setUsersList(updated);
      localStorage.setItem("system_users_list", JSON.stringify(updated));

      // Update current logged in user session if matching
      const currentLoggedInStr = localStorage.getItem("eljabal_user");
      if (currentLoggedInStr) {
        try {
          const curUser = JSON.parse(currentLoggedInStr);
          const matchedUpdated = updated.find((u) => u.username === curUser.username);
          if (matchedUpdated) {
            localStorage.setItem("eljabal_user", JSON.stringify({
              ...curUser,
              name: matchedUpdated.name,
              role: matchedUpdated.role,
              permissions: matchedUpdated.permissions,
              canRecordExpenses: matchedUpdated.canRecordExpenses,
              canRecordWorkerDaily: matchedUpdated.canRecordWorkerDaily,
              canRecordSubcontractorDaily: matchedUpdated.canRecordSubcontractorDaily,
            }));
          }
        } catch (e) {}
      }

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
          🔒 كلمة المرور
        </button>
      </div>

      {/* TAB 1: COMPANY DATA & ISOLATED LOGO */}
      {activeTab === "company" && (
        <div className="card" style={{ maxWidth: 650 }}>
          <div className="card-header">
            <h2 className="card-title">🏢 بيانات الشركة الرسمية والهوية</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveCompany}>
              <div className="form-group">
                <label className="form-label">اسم الشركة / المؤسسة *</label>
                <input
                  type="text"
                  className="form-control"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف / التواصل الرئيسي *</label>
                <input
                  type="text"
                  className="form-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              {/* LOGO UPLOAD & PREVIEW */}
              <div className="form-group" style={{ marginTop: 20 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>شعار الشركة (Company Logo)</label>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8 }}>
                  <img
                    src={companyLogo}
                    alt="Logo Preview"
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: 12,
                      objectFit: "cover",
                      border: "2px solid hsl(var(--border-subtle))",
                      background: "#fff",
                      padding: 4,
                    }}
                    onError={(e) => {
                      e.currentTarget.src = "/logo.jpeg";
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCompanyLogo(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 4 }}>
                      يدعم صيغ PNG, JPG, JPEG (يتم تثبيت الشعار في جميع الترويسات والمطبوعات)
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
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
            <div>
              <h2 className="card-title">👥 مستخدمو النظام والصلاحيات الميدانية والمالية</h2>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                إدارة الحسابات وتخصيص صلاحيات الوصول لكل قسم وصفحة بدقة متناهية.
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleOpenAddUser}>
              + إضافة مستخدم جديد
            </button>
          </div>
          <div className="card-body">
            {loadingUsers ? (
              <div className="empty-state" style={{ minHeight: 200 }}>
                <div className="spinner" />
                <p>جاري تحميل قائمة المستخدمين...</p>
              </div>
            ) : (
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>اسم الدخول (Username)</th>
                    <th>الدور والصلاحيات المفعلة</th>
                    <th style={{ textAlign: "center" }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 800 }}>{u.name}</td>
                      <td>
                        <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 6, color: "#0f172a", fontWeight: 700 }}>
                          {u.username}
                        </code>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className={`badge ${u.role.includes("مدير") ? "badge-success" : u.role.includes("محاسب") ? "badge-warning" : "badge-info"}`} style={{ width: "fit-content" }}>
                            {u.role}
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                            {u.permissions ? (
                              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", fontWeight: 800 }}>
                                🔐 مصرح له بـ ({Object.values(u.permissions).filter((p: any) => p.view).length} من 13 قسم)
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontWeight: 700 }}>
                                ⚙️ الصلاحيات الافتراضية للدور
                              </span>
                            )}
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840, width: "95%" }}>
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

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">الدور / المسمى الوظيفي الرئيسي *</label>
                    <select
                      className="form-control"
                      value={userRole}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserRole(val);
                        setUserPermissions(getDefaultPermissionsForRole(val));
                      }}
                    >
                      <option value="👑 مدير النظام (كامل الصلاحيات)">👑 مدير النظام (كامل الصلاحيات)</option>
                      <option value="💰 محاسب مالية (إيرادات ومصروفات)">💰 محاسب مالية (إيرادات ومصروفات)</option>
                      <option value="👷 مشرف موقع (حضور ومصروفات الموقع)">👷 مشرف موقع (حضور ومصروفات الموقع)</option>
                      <option value="🏗️ مهندس حصر ومقاولات (نماذج وحصر)">🏗️ مهندس حصر ومقاولات (نماذج وحصر)</option>
                      <option value="👥 مسؤول شؤون عاملين (HR)">👥 مسؤول شؤون عاملين (HR)</option>
                      <option value="👁️ قراءة فقط (ReadOnly)">👁️ قراءة فقط (ReadOnly)</option>
                    </select>
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

                {/* FULL PERMISSIONS MATRIX EDITOR */}
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <PermissionsMatrixEditor
                    value={userPermissions}
                    onChange={(newP) => {
                      setUserPermissions(newP);
                      if (newP.projectExpenses) setCanRecordExpenses(Boolean(newP.projectExpenses.add));
                      if (newP.employees) setCanRecordWorkerDaily(Boolean(newP.employees.add));
                      if (newP.subcontractors) setCanRecordSubcontractorDaily(Boolean(newP.subcontractors.add));
                    }}
                    selectedRole={userRole}
                    onRoleTemplateChange={(role) => setUserRole(role)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800, padding: "8px 24px" }}>
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
