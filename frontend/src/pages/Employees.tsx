import { useState, useEffect, useRef, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";

import WorkersPage from "./Workers";
import WorkerDailyPage from "./WorkerDaily";
import WorkerAdvancesPage from "./WorkerAdvances";
import SupervisorsPage from "./Supervisors";
import SupervisorSalariesPage from "./SupervisorSalaries";
import SupervisorDailiesPage from "./SupervisorDailies";

const JOB_ROLES = ["مشرف", "سائق (معدة / سيارة)", "مشرف وسائق (عمل إضافي)", "عامل", "فني", "مقاول", "مهندس", "إداري", "أخرى"];

interface Project {
  id: string;
  code: string;
  name: string;
}

interface EmployeeDocument {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
}

interface Employee {
  id: string;
  code: string;
  name: string;
  nationalId?: string;
  phone?: string;
  jobRole: string;
  employmentType: string;
  projectId?: string;
  project?: Project;
  hasBankAuthority: boolean;
  bankNotes?: string;
  salaryType: string;
  salary: number;
  hireDate: string;
  photoUrl?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  projectDeedUrl?: string;
  projectDeed?: string;
  isActive: boolean;
  notes?: string;
  documents?: EmployeeDocument[];
}

export default function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMainTab = searchParams.get("tab") || "all";

  const handleTabChange = (tabId: string) => {
    if (tabId === "all") {
      searchParams.delete("tab");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab: tabId });
    }
  };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [jobRoleFilter, setJobRoleFilter] = useState("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");
  const [bankFilter, setBankFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Documents Modal state
  const [docsEmployee, setDocsEmployee] = useState<Employee | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("general");
  const [docFile, setDocFile] = useState<File | null>(null);

  // Printable ID Card Modal state
  const [printEmployee, setPrintEmployee] = useState<Employee | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>("/logo.jpeg");

  // Comprehensive Profile View Modal State
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState("attendance"); // "attendance", "advances", "statement", "id_card", "official_dossier"

  // Dailies attendance state
  const [employeeDailies, setEmployeeDailies] = useState<any[]>([]);
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyStatus, setDailyStatus] = useState("يوم كامل (1.0)");
  const [dailyProjectId, setDailyProjectId] = useState("");

  // Advances & Deductions state
  const [employeeAdvances, setEmployeeAdvances] = useState<any[]>([]);
  const [advanceType, setAdvanceType] = useState("سلفة تحت الحساب");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceProjectId, setAdvanceProjectId] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");

  // Payments / Check Voucher state
  const [employeePayments, setEmployeePayments] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [printVoucherItem, setPrintVoucherItem] = useState<any>(null);

  // Interactive Monthly Attendance Calendar State
  const [calendarEmployee, setCalendarEmployee] = useState<any | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<string>("2026-08");
  const [calendarDaysMap, setCalendarDaysMap] = useState<Record<number, string>>({});

  const openCalendarModal = (emp: any) => {
    setCalendarEmployee(emp);
    const mKey = `cal_${emp.id}_${calendarMonth}`;
    const saved = localStorage.getItem(mKey);
    if (saved) {
      try {
        setCalendarDaysMap(JSON.parse(saved));
        return;
      } catch (e) {}
    }

    const initialMap: Record<number, string> = {};
    for (let d = 1; d <= 31; d++) {
      initialMap[d] = "غير محدد";
    }
    setCalendarDaysMap(initialMap);
  };

  const getMonthDaysList = (ymStr: string) => {
    try {
      const [y, m] = ymStr.split("-").map(Number);
      const daysCount = new Date(y, m, 0).getDate();
      const list = [];
      const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

      for (let d = 1; d <= daysCount; d++) {
        const dateObj = new Date(y, m - 1, d);
        const dayName = dayNames[dateObj.getDay()];
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        list.push({ dayNum: d, dayName, dateStr });
      }
      return list;
    } catch (e) {
      return [];
    }
  };

  const toggleDayStatus = (dayNum: number) => {
    const current = calendarDaysMap[dayNum] || "غير محدد";
    const nextMap: Record<string, string> = {
      "غير محدد": "حاضر",
      "حاضر": "إجازة",
      "إجازة": "غياب",
      "غياب": "سُلفة",
      "سُلفة": "غير محدد",
    };
    const nextStatus = nextMap[current] || "غير محدد";
    setCalendarDaysMap((prev) => ({ ...prev, [dayNum]: nextStatus }));
  };

  const setAllDaysStatus = (status: string) => {
    const nextMap: Record<number, string> = {};
    for (let d = 1; d <= 31; d++) {
      nextMap[d] = status;
    }
    setCalendarDaysMap(nextMap);
  };

  const handleSaveCalendarAttendance = async () => {
    if (!calendarEmployee) return;
    const mKey = `cal_${calendarEmployee.id}_${calendarMonth}`;
    localStorage.setItem(mKey, JSON.stringify(calendarDaysMap));
    showToast(`تم تأكيد واعتماد حضور وحساب سُلف الموظف (${calendarEmployee.name}) لشهر ${calendarMonth} بنجاح 🚀✅`, "success");
    setCalendarEmployee(null);
  };

  useEffect(() => {
    if (!profileEmployee) return;

    const loadProfileData = async () => {
      setDailyProjectId(profileEmployee.projectId || "");
      setAdvanceProjectId(profileEmployee.projectId || "");

      // 1. Dailies
      try {
        const { data: dData } = await supabase
          .from("WorkerDaily")
          .select("*, project:Project(name)")
          .eq("workerId", profileEmployee.id)
          .order("date", { ascending: false });

        if (dData && Array.isArray(dData) && dData.length > 0) {
          setEmployeeDailies(dData);
        } else {
          const localD = localStorage.getItem(`emp_dailies_${profileEmployee.id}`);
          try {
            const parsed = localD ? JSON.parse(localD) : [];
            setEmployeeDailies(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            setEmployeeDailies([]);
          }
        }
      } catch (e) {
        setEmployeeDailies([]);
      }

      // 2. Advances
      try {
        const { data: aData } = await supabase
          .from("WorkerAdvance")
          .select("*")
          .eq("workerId", profileEmployee.id)
          .order("date", { ascending: false });

        if (aData && Array.isArray(aData) && aData.length > 0) {
          setEmployeeAdvances(aData);
        } else {
          const localA = localStorage.getItem(`emp_advances_${profileEmployee.id}`);
          try {
            const parsed = localA ? JSON.parse(localA) : [];
            setEmployeeAdvances(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            setEmployeeAdvances([]);
          }
        }
      } catch (e) {
        setEmployeeAdvances([]);
      }

      // 3. Payments
      try {
        const localP = localStorage.getItem(`emp_payments_${profileEmployee.id}`);
        const parsed = localP ? JSON.parse(localP) : [];
        setEmployeePayments(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setEmployeePayments([]);
      }
    };

    loadProfileData();
  }, [profileEmployee]);

  const handleAddProfileDaily = async (e: FormEvent) => {
    e.preventDefault();
    if (!profileEmployee) return;

    const rate = profileEmployee.salary || 0;
    const factor = dailyStatus.includes("1.0") ? 1.0 : dailyStatus.includes("0.5") ? 0.5 : 0;
    const amt = rate * factor;

    const newDaily = {
      workerId: profileEmployee.id,
      projectId: dailyProjectId || profileEmployee.projectId || null,
      date: new Date(dailyDate).toISOString(),
      status: dailyStatus,
      amount: amt,
    };

    try {
      await supabase.from("WorkerDaily").insert([newDaily]);
    } catch (err) {}

    const updated = [{ ...newDaily, id: "d-" + Date.now() }, ...(Array.isArray(employeeDailies) ? employeeDailies : [])];
    setEmployeeDailies(updated);
    try {
      localStorage.setItem(`emp_dailies_${profileEmployee.id}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleAddProfileAdvance = async (e: FormEvent) => {
    e.preventDefault();
    if (!profileEmployee || !advanceAmount) return;

    const amt = parseFloat(advanceAmount);
    const reasonText = deductionReason ? ` [سبب الخصم: ${deductionReason}]` : "";
    const notesStr = `${advanceType}${reasonText}${advanceNotes ? " - " + advanceNotes : ""}`;

    const newAdv = {
      workerId: profileEmployee.id,
      projectId: advanceProjectId || profileEmployee.projectId || null,
      amount: amt,
      date: new Date().toISOString(),
      notes: notesStr,
    };

    try {
      await supabase.from("WorkerAdvance").insert([newAdv]);
    } catch (err) {}

    const updated = [{ ...newAdv, id: "a-" + Date.now() }, ...(Array.isArray(employeeAdvances) ? employeeAdvances : [])];
    setEmployeeAdvances(updated);
    try {
      localStorage.setItem(`emp_advances_${profileEmployee.id}`, JSON.stringify(updated));
    } catch (e) {}
    setAdvanceAmount("");
    setDeductionReason("");
    setAdvanceNotes("");
  };

  const handleAddProfilePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!profileEmployee || !paymentAmount) return;

    const amt = parseFloat(paymentAmount);
    const newPay = {
      id: "pay-" + Date.now(),
      workerId: profileEmployee.id,
      amount: amt,
      paymentMethod,
      notes: paymentNotes || `صرف مستحقات راتب/يومية الموظف (${profileEmployee.name})`,
      date: new Date().toISOString(),
    };

    const updated = [newPay, ...(Array.isArray(employeePayments) ? employeePayments : [])];
    setEmployeePayments(updated);
    try {
      localStorage.setItem(`emp_payments_${profileEmployee.id}`, JSON.stringify(updated));
    } catch (e) {}
    setPaymentAmount("");
    setPaymentNotes("");

    setPrintVoucherItem({
      ...newPay,
      employeeName: profileEmployee.name,
      employeeCode: profileEmployee.code,
      jobRole: profileEmployee.jobRole,
    });
  };

  // Form Fields
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [jobRole, setJobRole] = useState("عامل");
  const [employmentType, setEmploymentType] = useState("حر");
  const [projectId, setProjectId] = useState("");
  const [hasBankAuthority, setHasBankAuthority] = useState(false);
  const [bankNotes, setBankNotes] = useState("");
  const [projectDeed, setProjectDeed] = useState("");
  const [salaryType, setSalaryType] = useState("شهري");
  const [salary, setSalary] = useState("");
  const [hireDate, setHireDate] = useState(new Date().toISOString().split("T")[0]);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  // Direct file uploads in main modal
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);

  const cardPrintRef = useRef<HTMLDivElement>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [empRes, projRes, settingRes] = await Promise.all([
        supabase
          .from("Employee")
          .select("*, project:Project(id, code, name), documents:EmployeeDocument(*)")
          .order("createdAt", { ascending: false }),
        supabase
          .from("Project")
          .select("id, code, name")
          .order("createdAt", { ascending: false }),
        supabase
          .from("Setting")
          .select("*"),
      ]);

      if (empRes.error) {
        setFetchError(empRes.error.message);
      } else {
        setEmployees(empRes.data || []);
      }

      setProjects(projRes.data || []);

      if (settingRes.data) {
        const logoSetting = settingRes.data.find((s: any) => s.key === "companyLogoUrl");
        if (logoSetting?.value) setCompanyLogoUrl(logoSetting.value);
      }
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName("");
    setNationalId("");
    setPhone("");
    setJobRole("عامل");
    setEmploymentType("حر");
    setProjectId("");
    setHasBankAuthority(false);
    setBankNotes("");
    setProjectDeed("");
    setSalaryType("شهري");
    setSalary("");
    setHireDate(new Date().toISOString().split("T")[0]);
    setIsActive(true);
    setNotes("");
    setPhotoFile(null);
    setIdFrontFile(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingEmployee(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name || "");
    setNationalId(emp.nationalId || "");
    setPhone(emp.phone || "");
    setJobRole(emp.jobRole || "عامل");
    setEmploymentType(emp.employmentType || "حر");
    setProjectId(emp.projectId || "");
    setHasBankAuthority(Boolean(emp.hasBankAuthority));
    setBankNotes(emp.bankNotes || "");
    setProjectDeed(emp.projectDeed || "");
    setSalaryType(emp.salaryType || "شهري");
    setSalary(emp.salary ? emp.salary.toString() : "");
    setHireDate(
      emp.hireDate
        ? new Date(emp.hireDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setIsActive(emp.isActive !== undefined ? emp.isActive : true);
    setNotes(emp.notes || "");
    setPhotoFile(null);
    setIdFrontFile(null);
    setShowAddModal(true);
  };

  const handleSaveEmployee = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const isEdit = Boolean(editingEmployee);
      const payload: any = {
        name,
        nationalId: nationalId || null,
        phone: phone || null,
        jobRole,
        employmentType,
        projectId: employmentType === "مرتبط بمشروع" && projectId ? projectId : null,
        hasBankAuthority,
        bankNotes: bankNotes || null,
        projectDeed: projectDeed || null,
        salaryType,
        salary: parseFloat(salary) || 0,
        hireDate: hireDate ? new Date(hireDate).toISOString() : new Date().toISOString(),
        isActive,
        notes: notes || null,
        updatedAt: new Date().toISOString(),
      };

      let savedEmployee: any;

      if (isEdit && editingEmployee) {
        const { data, error } = await supabase
          .from("Employee")
          .update(payload)
          .eq("id", editingEmployee.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        savedEmployee = data;
      } else {
        // Generate unique code EMP-0001
        const { count } = await supabase.from("Employee").select("*", { count: "exact", head: true });
        let tries = 1;
        let checkCode = `EMP-${((count || 0) + tries).toString().padStart(4, "0")}`;
        
        while (true) {
          const { data: existing } = await supabase.from("Employee").select("id").eq("code", checkCode).single();
          if (!existing) break;
          tries++;
          checkCode = `EMP-${((count || 0) + tries).toString().padStart(4, "0")}`;
        }

        payload.code = checkCode;
        payload.id = crypto.randomUUID();
        payload.createdAt = new Date().toISOString();

        const { data, error } = await supabase
          .from("Employee")
          .insert([payload])
          .select()
          .single();

        if (error) throw new Error(error.message);
        savedEmployee = data;
      }

      // Convert image files to Base64 Data URLs so they work everywhere reliably
      const readAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const fileUpdates: any = {};
      if (photoFile) {
        fileUpdates.photoUrl = await readAsDataURL(photoFile);
      }
      if (idFrontFile) {
        fileUpdates.idCardFrontUrl = await readAsDataURL(idFrontFile);
      }

      if (Object.keys(fileUpdates).length > 0) {
        await supabase
          .from("Employee")
          .update(fileUpdates)
          .eq("id", savedEmployee.id);
      }

      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "حدث خطأ أثناء حفظ بيانات الموظف في Supabase");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string, empName: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف الموظف (${empName})؟`)) return;

    try {
      const { error } = await supabase.from("Employee").delete().eq("id", id);
      if (error) throw new Error(error.message);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "حدث خطأ في عملية الحذف من Supabase");
    }
  };

  // Upload document in Documents Modal directly to Supabase
  const handleUploadDocumentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!docsEmployee || !docFile) return;

    setUploadingDoc(true);
    try {
      const readAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      const dataUrl = await readAsDataURL(docFile);
      const title = docTitle || docFile.name;

      // Insert into EmployeeDocument table
      const docPayload = {
        id: crypto.randomUUID(),
        employeeId: docsEmployee.id,
        title,
        fileKey: `doc_${Date.now()}_${docFile.name}`,
        fileUrl: dataUrl,
        fileName: docFile.name,
        fileSize: docFile.size,
        contentType: docFile.type || "application/octet-stream",
        createdAt: new Date().toISOString(),
      };

      const { error: docErr } = await supabase.from("EmployeeDocument").insert([docPayload]);
      if (docErr) throw new Error(docErr.message);

      // Update shortcut fields on Employee if specific docType selected
      const empUpdate: any = {};
      if (docType === "photo") empUpdate.photoUrl = dataUrl;
      else if (docType === "id_front") empUpdate.idCardFrontUrl = dataUrl;
      else if (docType === "id_back") empUpdate.idCardBackUrl = dataUrl;
      else if (docType === "deed") empUpdate.projectDeedUrl = dataUrl;

      if (Object.keys(empUpdate).length > 0) {
        await supabase.from("Employee").update(empUpdate).eq("id", docsEmployee.id);
      }

      setDocTitle("");
      setDocFile(null);
      setDocType("general");

      const { data: updatedEmp } = await supabase
        .from("Employee")
        .select("*, project:Project(id, code, name), documents:EmployeeDocument(*)")
        .eq("id", docsEmployee.id)
        .single();

      if (updatedEmp) setDocsEmployee(updatedEmp);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "خطأ أثناء حفظ المستند في Supabase");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("هل تريد حذف هذا المستند المرفوع؟")) return;

    try {
      const { error } = await supabase.from("EmployeeDocument").delete().eq("id", docId);
      if (error) throw new Error(error.message);

      if (docsEmployee) {
        const { data: updatedEmp } = await supabase
          .from("Employee")
          .select("*, project:Project(id, code, name), documents:EmployeeDocument(*)")
          .eq("id", docsEmployee.id)
          .single();
        if (updatedEmp) setDocsEmployee(updatedEmp);
      }
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "فشل حذف المستند من Supabase");
    }
  };

  const triggerPrintCard = () => {
    window.print();
  };

  // Filtering
  const filteredEmployees = employees.filter((emp) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      !s ||
      emp.name?.toLowerCase().includes(s) ||
      emp.code?.toLowerCase().includes(s) ||
      emp.nationalId?.includes(s) ||
      emp.phone?.includes(s);

    if (!matchesSearch) return false;

    if (jobRoleFilter !== "all" && emp.jobRole !== jobRoleFilter) return false;
    if (employmentTypeFilter !== "all" && emp.employmentType !== employmentTypeFilter) return false;
    if (bankFilter === "authorized" && !emp.hasBankAuthority) return false;
    if (bankFilter === "unauthorized" && emp.hasBankAuthority) return false;
    if (projectFilter !== "all" && emp.projectId !== projectFilter) return false;
    if (statusFilter === "active" && !emp.isActive) return false;
    if (statusFilter === "inactive" && emp.isActive) return false;

    return true;
  });

  // Calculate stats
  const totalCount = employees.length;
  const projectAssignedCount = employees.filter((e) => e.employmentType === "مرتبط بمشروع").length;
  const freelanceCount = employees.filter((e) => e.employmentType === "حر").length;
  const bankAuthCount = employees.filter((e) => e.hasBankAuthority).length;

  return (
    <div>
      {/* HR MULTI-TAB NAVIGATION */}
      <div className="print:hidden" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { id: "all", label: "👥 سجل إدارة الموظفين (HR)" },
          { id: "workers", label: "👷 العمال" },
          { id: "worker-daily", label: "📅 يوميات العمال" },
          { id: "worker-advances", label: "💵 سلف العمال" },
          { id: "supervisors", label: "👔 المشرفون" },
          { id: "supervisor-salaries", label: "🏦 رواتب المشرفين" },
          { id: "supervisor-dailies", label: "🗓️ يوميات المشرفين" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: "9px 16px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: activeMainTab === tab.id ? "1px solid #3b82f6" : "1px solid hsl(var(--border-subtle))",
              background: activeMainTab === tab.id ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "hsl(var(--bg-card))",
              color: activeMainTab === tab.id ? "#ffffff" : "hsl(var(--text-primary))",
              boxShadow: activeMainTab === tab.id ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeMainTab === "workers" && <WorkersPage />}
      {activeMainTab === "worker-daily" && <WorkerDailyPage />}
      {activeMainTab === "worker-advances" && <WorkerAdvancesPage />}
      {activeMainTab === "supervisors" && <SupervisorsPage />}
      {activeMainTab === "supervisor-salaries" && <SupervisorSalariesPage />}
      {activeMainTab === "supervisor-dailies" && <SupervisorDailiesPage />}

      {activeMainTab === "all" && (
        <>
          {/* PAGE HEADER */}
          <div className="page-header print:hidden">
            <div>
              <h1 className="page-title">👥 سجل الموارد البشرية وإدارة الموظفين</h1>
              <p className="page-subtitle">
                إدارة وتوثيق بيانات الكوادر، ربط المشاريع، صلاحيات التعامل البنكي، وطباعة الهوية
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={handleOpenAdd}>
                + إضافة موظف جديد
              </button>
            </div>
          </div>

      {/* STATS WIDGETS */}
      <div className="print:hidden" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(59, 130, 246, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>إجمالي الموظفين</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{totalCount}</div>
            </div>
            <div style={{ fontSize: 34, opacity: 0.85 }}>👥</div>
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(139, 92, 246, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>معينين على مشاريع</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{projectAssignedCount}</div>
            </div>
            <div style={{ fontSize: 34, opacity: 0.85 }}>🏗️</div>
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>عمالة حرة / عامة</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{freelanceCount}</div>
            </div>
            <div style={{ fontSize: 34, opacity: 0.85 }}>👷</div>
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>تفويض بنكي باسم الشركة</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{bankAuthCount}</div>
            </div>
            <div style={{ fontSize: 34, opacity: 0.85 }}>🏦</div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث باسم الموظف أو الرقم القومي أو الهاتف</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث هنا..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>👔 الوظيفة / الطبيعة</label>
            <select
              className="form-control"
              value={jobRoleFilter}
              onChange={(e) => setJobRoleFilter(e.target.value)}
            >
              <option value="all">جميع الوظائف</option>
              {JOB_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>📌 نوع الارتباط</label>
            <select
              className="form-control"
              value={employmentTypeFilter}
              onChange={(e) => setEmploymentTypeFilter(e.target.value)}
            >
              <option value="all">الكل (حر ومشاريع)</option>
              <option value="مرتبط بمشروع">مرتبط بمشروع</option>
              <option value="حر">حر / عام</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>🏗️ تخصيص المشروع</label>
            <select
              className="form-control"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">جميع المشاريع</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>🏦 التعامل البنكي</label>
            <select
              className="form-control"
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
            >
              <option value="all">جميع الموظفين</option>
              <option value="authorized">مفوض بنكياً فقط 🏦</option>
              <option value="unauthorized">غير مفوض بنكياً</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>⚡ الحالة</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط فقط</option>
              <option value="inactive">متوقف</option>
            </select>
          </div>
        </div>
      </div>

      {/* EMPLOYEES TABLE */}
      <div className="card print:hidden">
        <div className="table-container">
          {loading && employees.length === 0 ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل سجل الموظفين والمستندات...</div>
            </div>
          ) : fetchError ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <div className="empty-state-text text-danger" style={{ fontWeight: 700 }}>{fetchError}</div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={fetchData}>
                🔄 إعادة المحاولة
              </button>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-text">لا يوجد موظفون مطابقين للشروط المحددة</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + إضافة موظف جديد
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>الكود والاسم</th>
                  <th>الوظيفة والطبيعة</th>
                  <th>الارتباط والمشروع</th>
                  <th>الهاتف والبطاقة</th>
                  <th style={{ textAlign: "center" }}>صلاحية البنك</th>
                  <th>الأجر/الراتب</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th style={{ textAlign: "center", width: 170 }}>الإجراءات والتصريح</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {emp.photoUrl ? (
                          <img
                            src={emp.photoUrl}
                            alt={emp.name}
                            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #3b82f6" }}
                          />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#3b82f620", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                            {emp.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, color: "hsl(var(--text-primary))" }}>{emp.name}</div>
                          <span style={{ fontSize: 11, background: "#8b5cf615", color: "#8b5cf6", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                            {emp.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-info">{emp.jobRole}</span>
                    </td>

                    <td>
                      {emp.employmentType === "مرتبط بمشروع" ? (
                        <div>
                          <span className="badge badge-warning" style={{ background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b30" }}>
                            🏗️ {emp.project ? emp.project.name : "مشروع مخصص"}
                          </span>
                        </div>
                      ) : (
                        <span className="badge badge-ghost" style={{ opacity: 0.8 }}>👷 حر / عام</span>
                      )}
                      {emp.projectDeed && (
                        <div style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 2 }}>
                          📜 السند: {emp.projectDeed}
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: 12 }}>
                        <div>📞 {emp.phone || "-"}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>🪪 {emp.nationalId || "-"}</div>
                      </div>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      {emp.hasBankAuthority ? (
                        <span className="badge badge-gold" title="مفوض رسمياً للتعاملات البنكية باسم الشركة">
                          🏦 مفوض بنكياً
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, opacity: 0.5 }}>🔒 غير مفوض</span>
                      )}
                    </td>

                    <td>
                      <span className="text-gold" style={{ fontWeight: 800 }}>
                        {formatCurrency(emp.salary || 0)}
                      </span>
                      <span style={{ fontSize: 11, color: "hsl(var(--text-muted))", display: "block" }}>
                        ({emp.salaryType})
                      </span>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${emp.isActive ? "badge-success" : "badge-danger"}`}>
                        {emp.isActive ? "نشط" : "متوقف"}
                      </span>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "5px 12px", fontSize: 12, background: "#3b82f615", color: "#3b82f6", border: "1px solid #3b82f640", fontWeight: 700 }}
                          onClick={() => {
                            setProfileEmployee(emp);
                            setProfileActiveTab("attendance");
                          }}
                          title="عرض الملف الشامل، الحضور واليوميات والسلف"
                        >
                          👁️ عرض
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "5px 12px", fontSize: 12, background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "#fff", border: "none", fontWeight: 800 }}
                          onClick={() => openCalendarModal(emp)}
                          title="تقويم الحضور والغياب الشهري التفاعلي"
                        >
                          📅 تقويم الحضور
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "5px 10px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(emp)}
                          title="تعديل الموظف"
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "5px 10px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                          title="حذف الموظف"
                        >
                          🗑️ حذف
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

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingEmployee ? `✏️ تعديل بيانات الموظف (${editingEmployee.name})` : "+ إضافة موظف جديد للسجل"}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEmployee}>
              <div className="modal-body">

                {/* BASIC INFO */}
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="أدخل اسم الموظف بالكامل"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">الرقم القومي / بطاقة الموظف</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="14 رقم قومي"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">رقم الهاتف / الجوال</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="01xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">الوظيفة / طبيعة الشغل *</label>
                    <select
                      className="form-control"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                    >
                      {JOB_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع التعيين والارتباط *</label>
                    <select
                      className="form-control"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                    >
                      <option value="حر">حر / عام (غير مخصص لمشروع واحد)</option>
                      <option value="مرتبط بمشروع">مرتبط بمشروع محدد 🏗️</option>
                    </select>
                  </div>
                </div>

                {/* PROJECT ASSIGNMENT IF SELECTED */}
                {employmentType === "مرتبط بمشروع" && (
                  <div className="form-group" style={{ background: "#3b82f610", padding: 12, borderRadius: 8, border: "1px solid #3b82f630" }}>
                    <label className="form-label" style={{ color: "#3b82f6", fontWeight: 700 }}>
                      🏗️ اختر المشروع المرتبط به الموظف *
                    </label>
                    <select
                      className="form-control"
                      required
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    >
                      <option value="">-- اختر من قائمة المشاريع --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* BANK AUTHORITY TOGGLE */}
                <div style={{ background: hasBankAuthority ? "#f59e0b15" : "hsl(var(--bg-elevated))", border: hasBankAuthority ? "1px solid #f59e0b50" : "1px solid hsl(var(--border-subtle))", padding: 14, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: hasBankAuthority ? "#f59e0b" : "hsl(var(--text-primary))", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🏦</span> صلاحية التعامل البنكي باسم الشركة
                      </div>
                      <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                        تسمح للموظف بالتعامل الرسمي لدى البنوك وإصدار الشيكات أو الاستلام والتفويض
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      style={{ width: 22, height: 22, cursor: "pointer" }}
                      checked={hasBankAuthority}
                      onChange={(e) => setHasBankAuthority(e.target.checked)}
                    />
                  </div>

                  {hasBankAuthority && (
                    <div style={{ marginTop: 10 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>تفويض التعامل البنكي / ملاحظات الحساب</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="مثال: تفويض بنك مصر رقم X أو رقم الحساب المخصص..."
                        value={bankNotes}
                        onChange={(e) => setBankNotes(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* SALARY & HIRE DATE */}
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">نظام الراتب</label>
                    <select className="form-control" value={salaryType} onChange={(e) => setSalaryType(e.target.value)}>
                      <option value="شهري">شهري</option>
                      <option value="يومي">يومي</option>
                      <option value="بالمقطوعية">بالمقطوعية</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">الراتب / الأجر (جنيه)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ التعيين</label>
                    <input
                      type="date"
                      className="form-control"
                      value={hireDate}
                      onChange={(e) => setHireDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* PROJECT DEED TEXT INPUT */}
                <div className="form-group" style={{ background: "#3b82f608", padding: 12, borderRadius: 8, border: "1px solid #3b82f620" }}>
                  <label className="form-label" style={{ color: "#3b82f6", fontWeight: 700 }}>
                    📜 سند / عقد المشروع (إدخال نصي)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: سند تكليف رقم 402/2026 أو عقد رقم 12..."
                    value={projectDeed}
                    onChange={(e) => setProjectDeed(e.target.value)}
                  />
                </div>

                {/* DIRECT FILE UPLOADS TO CLOUDFLARE R2 */}
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#3b82f6" }}>
                    ☁️ مرفقات ومستندات الموظف على Cloudflare R2 (اختياري عند الإنشاء):
                  </div>

                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>📸 الصورة الشخصية</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        style={{ fontSize: 11 }}
                        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>🪪 صورة بطاقة الرقم القومي</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="form-control"
                        style={{ fontSize: 11 }}
                        onChange={(e) => setIdFrontFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">حالة التفعيل</label>
                    <select
                      className="form-control"
                      value={isActive ? "true" : "false"}
                      onChange={(e) => setIsActive(e.target.value === "true")}
                    >
                      <option value="true">نشط</option>
                      <option value="false">متوقف</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ملاحظات عامة</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="أية ملاحظات إضافية..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ الموظف وسجل المستندات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOUDFLARE R2 DOCUMENTS MODAL */}
      {docsEmployee && (
        <div className="modal-overlay" onClick={() => setDocsEmployee(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h2 className="modal-title">📁 مستندات الموظف ({docsEmployee.name}) على Cloudflare R2</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDocsEmployee(null)}>✕</button>
            </div>
            <div className="modal-body">

              {/* UPLOAD FORM */}
              <form onSubmit={handleUploadDocumentSubmit} style={{ background: "hsl(var(--bg-elevated))", padding: 14, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: "#3b82f6" }}>
                  + رفع مستند جديد (سند مشروع / بطاقة / عقد) مباشرة إلى R2:
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>عنوان/نوع المستند *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: سند مشروع القاهرة، عقد التعيين..."
                      required
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>تصنيف الحقل المباشر</label>
                    <select className="form-control" value={docType} onChange={(e) => setDocType(e.target.value)}>
                      <option value="general">مستند عام</option>
                      <option value="deed">سند / عقد المشروع 📜</option>
                      <option value="id_front">بطاقة الرقم القومي 🪪</option>
                      <option value="photo">صورة شخصية 📸</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>الملف المرفوع *</label>
                  <input
                    type="file"
                    className="form-control"
                    required
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-sm" disabled={uploadingDoc} style={{ width: "100%" }}>
                  {uploadingDoc ? <span className="spinner" /> : "☁️ رفع إلى Cloudflare R2 وتأكيد"}
                </button>
              </form>

              {/* EXISTING DOCUMENTS LIST */}
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>قائمة المستندات المسجلة بالسحابة:</div>
                {!docsEmployee.documents || docsEmployee.documents.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <div className="empty-state-text">لا يوجد مستندات مرفوعة لهذا الموظف حالياً</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {docsEmployee.documents.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: 10,
                          borderRadius: 6,
                          background: "hsl(var(--bg-surface))",
                          border: "1px solid hsl(var(--border-subtle))"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>{doc.title}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            📄 {doc.fileName} • {Math.round((doc.fileSize || 0) / 1024)} KB • {formatDateShort(doc.createdAt)}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 6 }}>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-ghost"
                            style={{ fontSize: 12, padding: "4px 8px" }}
                          >
                            👁️ معاينة / تحميل
                          </a>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                            onClick={() => handleDeleteDoc(doc.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE EMPLOYEE ID CARD MODAL & TEMPLATE */}
      {printEmployee && (
        <div className="modal-overlay print:p-0 print:bg-white" onClick={() => setPrintEmployee(null)}>
          <div className="modal print:w-full print:max-w-none print:shadow-none print:m-0 print:border-none" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header print:hidden">
              <h2 className="modal-title">🎴 طباعة كارت هويّة الموظف ({printEmployee.name})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPrintEmployee(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: 16 }}>

              {/* OFFICIAL EMPLOYEE BADGE / DOCUMENT TEMPLATE */}
              <div
                ref={cardPrintRef}
                id="printable-id-card"
                style={{
                  width: "100%",
                  maxWidth: 400,
                  margin: "0 auto",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                  background: "#ffffff",
                  color: "#1e293b",
                  border: "2px solid #10b981",
                  fontFamily: "Inter, Cairo, Roboto, sans-serif",
                  direction: "rtl",
                }}
              >
                {/* TOP HEADER WITH BRANDING */}
                <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", padding: "18px 16px 28px 16px", textAlign: "center", position: "relative" }}>
                  <div style={{ background: "#ffffff", display: "inline-block", padding: "6px 14px", borderRadius: 8, boxShadow: "0 4px 10px rgba(0,0,0,0.2)", marginBottom: 8 }}>
                    <img
                      src={companyLogoUrl || "/logo.jpeg"}
                      alt="شعار الشركة"
                      style={{ maxHeight: 46, maxWidth: 140, objectFit: "contain", display: "block" }}
                      onError={(e) => {
                        e.currentTarget.src = "/logo.jpeg";
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: "#f8fafc", letterSpacing: 0.5 }}>الجبل الذهبي للمقاولات</div>
                  <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>بطاقة تعيين وتصريح عمل رسمي</div>
                  
                  {/* Decorative Banner Wave */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 12, background: "linear-gradient(90deg, #10b981 0%, #059669 100%)", clipPath: "polygon(0 0, 100% 100%, 100% 100%, 0 100%)" }} />
                </div>

                {/* PHOTO SECTION WITH GREEN ACCENT */}
                <div style={{ padding: "0 20px 20px 20px", textAlign: "center", marginTop: -20, position: "relative" }}>
                  <div style={{ position: "relative", display: "inline-block", marginBottom: 10 }}>
                    {printEmployee.photoUrl ? (
                      <img
                        src={printEmployee.photoUrl}
                        alt={printEmployee.name}
                        style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid #10b981", boxShadow: "0 6px 16px rgba(0,0,0,0.25)", background: "#fff" }}
                      />
                    ) : (
                      <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#10b981", border: "4px solid #ffffff", boxShadow: "0 6px 16px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 900, color: "#fff", margin: "0 auto" }}>
                        {printEmployee.name?.charAt(0)}
                      </div>
                    )}
                  </div>

                  <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: "2px 0 4px 0" }}>{printEmployee.name}</h3>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#059669", background: "#ecfdf5", display: "inline-block", padding: "4px 14px", borderRadius: 20, border: "1px solid #a7f3d0", marginBottom: 12 }}>
                    {printEmployee.jobRole} • كود: {printEmployee.code}
                  </div>

                  {/* DETAILS TABLE */}
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12, border: "1px solid #e2e8f0", textAlign: "right", fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e2e8f0" }}>
                      <span style={{ color: "#64748b", fontWeight: 600 }}>🪪 الرقم القومي:</span>
                      <span style={{ fontWeight: 800, color: "#0f172a" }}>{printEmployee.nationalId || "-"}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e2e8f0" }}>
                      <span style={{ color: "#64748b", fontWeight: 600 }}>📞 رقم الهاتف:</span>
                      <span style={{ fontWeight: 800, color: "#0f172a" }}>{printEmployee.phone || "-"}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e2e8f0" }}>
                      <span style={{ color: "#64748b", fontWeight: 600 }}>🏗️ التخصيص والمشروع:</span>
                      <span style={{ fontWeight: 800, color: "#0284c7" }}>
                        {printEmployee.employmentType === "مرتبط بمشروع"
                          ? (printEmployee.project?.name || "مشروع مخصص")
                          : "عمالة حرة / عامة"}
                      </span>
                    </div>

                    {printEmployee.projectDeed && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ color: "#64748b", fontWeight: 600 }}>📜 سند / عقد المشروع:</span>
                        <span style={{ fontWeight: 800, color: "#d97706" }}>{printEmployee.projectDeed}</span>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e2e8f0" }}>
                      <span style={{ color: "#64748b", fontWeight: 600 }}>📅 تاريخ التعيين:</span>
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatDateShort(printEmployee.hireDate)}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                      <span style={{ color: "#64748b", fontWeight: 600 }}>🏦 صلاحيات البنك:</span>
                      <span style={{ fontWeight: 800, color: printEmployee.hasBankAuthority ? "#059669" : "#64748b" }}>
                        {printEmployee.hasBankAuthority
                          ? "مفوض رسمياً بالتعامل البنكي 🏦"
                          : "غير مفوض بنكياً"}
                      </span>
                    </div>
                  </div>

                  {/* ID CARD FRONT IMAGE PREVIEW IF UPLOADED */}
                  {printEmployee.idCardFrontUrl && (
                    <div style={{ marginTop: 12, background: "#f1f5f9", padding: 8, borderRadius: 8, border: "1px dashed #cbd5e1", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>🪪 صورة بطاقة الرقم القومي المرفقة:</div>
                      <img
                        src={printEmployee.idCardFrontUrl}
                        alt="بطاقة الرقم القومي"
                        style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 6, objectFit: "contain", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                  )}

                  {/* APPROVAL & SIGNATURE SECTION */}
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: "2px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>ختم الشركة والتوثيق</div>
                      <div style={{ background: "#ffffff", padding: 4, borderRadius: 4, display: "inline-block", border: "1px solid #e2e8f0", marginTop: 4 }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                          <rect x="3" y="3" width="6" height="6"/>
                          <rect x="15" y="3" width="6" height="6"/>
                          <rect x="3" y="15" width="6" height="6"/>
                          <path d="M15 15h2v2h-2zM19 19h2v2h-2zM15 19h2v2h-2zM19 15h2v2h-2z"/>
                        </svg>
                      </div>
                    </div>

                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>اعتماد مدير الشركة</div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>التوقيع: ............................</div>
                      <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>شركة الجبل الذهبي للمقاولات</div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            <div className="modal-footer print:hidden">
              <button type="button" className="btn btn-ghost" onClick={() => setPrintEmployee(null)}>إغلاق</button>
              <button type="button" className="btn btn-gold" onClick={triggerPrintCard}>
                🖨️ طباعة بطاقة الموظف الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE EMPLOYEE PROFILE MODAL (👁️ عرض) */}
      {profileEmployee && (
        <div className="modal-overlay print:p-0" onClick={() => setProfileEmployee(null)}>
          <div
            className="modal print:w-full print:max-w-none print:shadow-none print:border-none"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 900, width: "95%" }}
          >
            {/* Modal Header */}
            <div className="modal-header print:hidden" style={{ borderBottom: "1px solid hsl(var(--border-subtle))", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {(profileEmployee.photoUrl || profileEmployee.avatarUrl) ? (
                  <img src={profileEmployee.photoUrl || profileEmployee.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#3b82f620", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>
                    {(profileEmployee.name || "م").charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="modal-title" style={{ fontSize: 18 }}>{profileEmployee.name}</h2>
                  <div style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                    كود: <strong>{profileEmployee.code}</strong> • {profileEmployee.jobRole} • {profileEmployee.employmentType === "مرتبط بمشروع" ? `🏗️ ${profileEmployee.project?.name || "مشروع مخصص"}` : "👷 حر / عام"}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setProfileEmployee(null)}>✕</button>
            </div>

            {/* Modal Tabs Navigation Bar */}
            <div className="print:hidden" style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 16px", background: "hsl(var(--bg-elevated))", borderBottom: "1px solid hsl(var(--border-subtle))" }}>
              {[
                { id: "attendance", label: "📅 الحضور والإنصراف (باليوم)" },
                { id: "advances", label: "💵 السلف والخصومات" },
                { id: "statement", label: "💰 تصفية القبض والشيكات" },
                { id: "id_card", label: "🪪 الكارت التعريفي" },
                { id: "official_dossier", label: "📄 الملف التعريفي الرسمي (A4)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProfileActiveTab(tab.id)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: profileActiveTab === tab.id ? "1px solid #3b82f6" : "1px solid transparent",
                    background: profileActiveTab === tab.id ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "transparent",
                    color: profileActiveTab === tab.id ? "#ffffff" : "hsl(var(--text-primary))",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="modal-body" style={{ padding: 20 }}>
              {/* TAB 1: ATTENDANCE BY DAY */}
              {profileActiveTab === "attendance" && (
                <div>
                  <div className="grid-3" style={{ gap: 14, marginBottom: 16 }}>
                    <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 10 }}>
                      <span className="text-muted" style={{ fontSize: 11 }}>نظام الأجر المستحق</span>
                      <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2, color: "hsl(var(--gold))" }}>
                        {profileEmployee.salaryType === "يومية" ? `${profileEmployee.salary || 0} ج.م / يوم` : `${profileEmployee.salary || 0} ج.م / شهري`}
                      </div>
                    </div>

                    <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 10 }}>
                      <span className="text-muted" style={{ fontSize: 11 }}>إجمالي الأيام المسجلة</span>
                      <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2, color: "#10b981" }}>
                        {employeeDailies.length} يومية
                      </div>
                    </div>

                    <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 10 }}>
                      <span className="text-muted" style={{ fontSize: 11 }}>إجمالي المستحق من اليوميات</span>
                      <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2, color: "#3b82f6" }}>
                        {formatCurrency(employeeDailies.reduce((sum, d) => sum + (d.amount || 0), 0))}
                      </div>
                    </div>
                  </div>

                  {/* FORM TO ADD DAILY RECORD */}
                  <form onSubmit={handleAddProfileDaily} style={{ background: "hsl(var(--bg-elevated))", padding: 16, borderRadius: 12, marginBottom: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>+ تسجيل يومية حضور جديدة (باليوم)</h4>
                    <div className="grid-3" style={{ gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>التاريخ *</label>
                        <input
                          type="date"
                          className="form-control"
                          required
                          value={dailyDate}
                          onChange={(e) => setDailyDate(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>حالة اليومية *</label>
                        <select className="form-control" value={dailyStatus} onChange={(e) => setDailyStatus(e.target.value)}>
                          <option value="يوم كامل (1.0)">يوم كامل (1.0)</option>
                          <option value="نصف يوم (0.5)">نصف يوم (0.5)</option>
                          <option value="غياب (0.0)">غياب (0.0)</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>المشروع المرتبط</label>
                        <select className="form-control" value={dailyProjectId} onChange={(e) => setDailyProjectId(e.target.value)}>
                          <option value="">عام / حر (بدون مشروع)</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                      <button type="submit" className="btn btn-primary btn-sm">+ حفظ واستحقاق اليومية</button>
                    </div>
                  </form>

                  {/* DAILIES TABLE */}
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>التاريخ</th>
                          <th>الحالة</th>
                          <th>المشروع</th>
                          <th>المبلغ المستحق</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeDailies.map((d, idx) => (
                          <tr key={d.id || idx}>
                            <td>{formatDateShort(d.date)}</td>
                            <td><span className="badge badge-success">{d.status}</span></td>
                            <td>{d.project?.name || "عام / حر"}</td>
                            <td style={{ fontWeight: 800, color: "#10b981" }}>{formatCurrency(d.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: ADVANCES & DEDUCTIONS */}
              {profileActiveTab === "advances" && (
                <div>
                  <form onSubmit={handleAddProfileAdvance} style={{ background: "hsl(var(--bg-elevated))", padding: 16, borderRadius: 12, marginBottom: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>+ تسجيل سلفة / خصم مالي / جزاء على الموظف</h4>
                    <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>نوع المستقطع *</label>
                        <select className="form-control" value={advanceType} onChange={(e) => setAdvanceType(e.target.value)}>
                          <option value="سلفة تحت الحساب">💵 سلفة نقدية تحت الحساب</option>
                          <option value="خصم / جزاء مالي">🛑 خصم / جزاء مالي على الموظف</option>
                          <option value="إيجار ومرافق مخصومة">🏠 إيجارات ومرافق مخصومة (سكن/كهرباء/مياه)</option>
                          <option value="إتلاف وتلفيات خامات">⚠️ إتلاف وتلفيات خامات بالموقع</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>مبلغ السلفة / الخصم (جنيه) *</label>
                        <input
                          type="number"
                          step="any"
                          className="form-control"
                          placeholder="0.00"
                          required
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid-2" style={{ gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>سبب وسند الخصم / الاستقطاع *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="مثال: تأخير ساعتين، جزاء يوم غياب، خصم إيجار الشقة..."
                          value={deductionReason}
                          onChange={(e) => setDeductionReason(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>ربط بالمشروع (إن وجد)</label>
                        <select className="form-control" value={advanceProjectId} onChange={(e) => setAdvanceProjectId(e.target.value)}>
                          <option value="">عام / سلفة شخصية (بدون مشروع)</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                      <button type="submit" className="btn btn-gold btn-sm">
                        💾 تسجيل الاستقطاع وتحديث الحساب
                      </button>
                    </div>
                  </form>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>التاريخ</th>
                          <th>نوع المعاملة</th>
                          <th>القيمة</th>
                          <th>سبب الخصم والبيان</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeAdvances.map((a, idx) => {
                          const isDeduction = a.notes?.includes("خصم") || a.notes?.includes("جزاء") || a.notes?.includes("إتلاف") || a.notes?.includes("إيجار");
                          return (
                            <tr key={a.id || idx}>
                              <td>{formatDateShort(a.date)}</td>
                              <td>
                                <span className={`badge ${isDeduction ? "badge-danger" : "badge-warning"}`}>
                                  {isDeduction ? "🛑 خصم / استقطاع" : "💵 سلفة تحت الحساب"}
                                </span>
                              </td>
                              <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(a.amount)}</td>
                              <td style={{ fontWeight: 600 }}>{a.notes || "سلفة"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SETTLEMENT STATEMENT & PAYMENTS */}
              {profileActiveTab === "statement" && (
                <div>
                  {/* SUMMARY FINANCIAL STATEMENT */}
                  {(() => {
                    const totalEarned = employeeDailies.reduce((sum, d) => sum + (d.amount || 0), 0) || (profileEmployee.salary || 0);
                    const totalAdvances = employeeAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
                    const totalPaid = employeePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const netRemaining = totalEarned - (totalAdvances + totalPaid);

                    return (
                      <div>
                        <div className="grid-3" style={{ gap: 14, marginBottom: 16 }}>
                          <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", padding: 14, borderRadius: 12 }}>
                            <div style={{ fontSize: 11, opacity: 0.9 }}>إجمالي الأجر المستحق</div>
                            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{formatCurrency(totalEarned)}</div>
                          </div>

                          <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)", color: "#fff", padding: 14, borderRadius: 12 }}>
                            <div style={{ fontSize: 11, opacity: 0.9 }}>إجمالي السلف والواصل</div>
                            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{formatCurrency(totalAdvances + totalPaid)}</div>
                          </div>

                          <div style={{ background: netRemaining >= 0 ? "linear-gradient(135deg, #10b981 0%, #047857 100%)" : "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)", color: "#fff", padding: 14, borderRadius: 12 }}>
                            <div style={{ fontSize: 11, opacity: 0.9 }}>صافي الرصيد المتبقي له</div>
                            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{formatCurrency(netRemaining)}</div>
                          </div>
                        </div>

                        {/* FORM TO ISSUE SALARY CHECK / PAYMENT */}
                        <form onSubmit={handleAddProfilePayment} style={{ background: "hsl(var(--bg-elevated))", padding: 16, borderRadius: 12, marginBottom: 16 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>🧾 صرف الراتب / مستحقات الموظف وطباعة الشيك</h4>
                          <div className="grid-3" style={{ gap: 12 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: 11 }}>المبلغ المصروف *</label>
                              <input
                                type="number"
                                step="any"
                                className="form-control"
                                placeholder="0.00"
                                required
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                              />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: 11 }}>طريقة الصرف</label>
                              <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                <option value="نقدي">نقدي (خزينة)</option>
                                <option value="شيك بنكي">شيك بنكي رسمياً</option>
                                <option value="تحويل بنكي">تحويل بنكي</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: 11 }}>البيان الشارح</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="صرف يوميات شهر..."
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                              />
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                            <button type="submit" className="btn btn-gold btn-sm">🧾 صرف وتوليد شيك/إيصال المستحقات</button>
                          </div>
                        </form>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 4: ID CARD */}
              {profileActiveTab === "id_card" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 360, maxWidth: "100%", borderRadius: 16, overflow: "hidden", border: "2px solid #3b82f6", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", background: "#ffffff", color: "#0f172a" }}>
                    <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 12, fontWeight: 900 }}>شركة الجبل الذهبي للمقاولات</div>
                      <span style={{ fontSize: 10, background: "#ffffff20", padding: "2px 8px", borderRadius: 10 }}>بطاقة هوية</span>
                    </div>
                    <div style={{ padding: 20, textAlign: "center" }}>
                      {(profileEmployee.photoUrl || profileEmployee.avatarUrl) ? (
                        <img src={profileEmployee.photoUrl || profileEmployee.avatarUrl} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", margin: "0 auto 10px auto", border: "3px solid #3b82f6" }} />
                      ) : (
                        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#3b82f620", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 32, margin: "0 auto 10px auto" }}>
                          {(profileEmployee.name || "م").charAt(0)}
                        </div>
                      )}
                      <h3 style={{ fontSize: 16, fontWeight: 900, margin: "4px 0" }}>{profileEmployee.name}</h3>
                      <div style={{ fontSize: 12, color: "#3b82f6", fontWeight: 700 }}>{profileEmployee.jobRole}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>الكود: {profileEmployee.code} • القومي: {profileEmployee.nationalId || "-"}</div>
                    </div>
                  </div>
                  <button className="btn btn-gold" style={{ marginTop: 16 }} onClick={() => setPrintEmployee(profileEmployee)}>
                    🖨️ طباعة بطاقة الهوية الذكية
                  </button>
                </div>
              )}

              {/* TAB 5: OFFICIAL A4 DOSSIER (الملف التعريفي الرسمي) */}
              {profileActiveTab === "official_dossier" && (
                <div style={{ background: "#ffffff", color: "#0f172a", padding: 30, borderRadius: 12, border: "1px solid #cbd5e1", maxWidth: 750, margin: "0 auto" }}>
                  {/* COMPANY OFFICIAL LOGO HEADER */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #1e3a8a", paddingBottom: 14, marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1e3a8a", margin: 0 }}>شركة الجبل للمقاولات والاستثمار العقاري</h2>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>إدارة الموارد البشرية والشئون الإدارية</div>
                    </div>
                    {companyLogoUrl ? (
                      <img src={companyLogoUrl} alt="Logo" style={{ maxHeight: 60, objectFit: "contain" }} />
                    ) : (
                      <div style={{ fontSize: 28 }}>🏗️</div>
                    )}
                  </div>

                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, background: "#1e3a8a15", color: "#1e3a8a", padding: "6px 20px", borderRadius: 20 }}>
                      📄 بيان الملف التعريفي والاعتماد الرسمي للموظف
                    </span>
                  </div>

                  <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
                    <div>
                      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                        <tbody>
                          <tr><td style={{ padding: "6px 0", color: "#64748b", fontWeight: 700 }}>اسم الكادر:</td><td style={{ fontWeight: 900 }}>{profileEmployee.name}</td></tr>
                          <tr><td style={{ padding: "6px 0", color: "#64748b", fontWeight: 700 }}>الكود الوظيفي:</td><td style={{ fontWeight: 900, color: "#3b82f6" }}>{profileEmployee.code}</td></tr>
                          <tr><td style={{ padding: "6px 0", color: "#64748b", fontWeight: 700 }}>الرقم القومي:</td><td>{profileEmployee.nationalId || "-"}</td></tr>
                          <tr><td style={{ padding: "6px 0", color: "#64748b", fontWeight: 700 }}>رقم الهاتف:</td><td>{profileEmployee.phone || "-"}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                        <tbody>
                          <tr><td style={{ padding: "6px 0", color: "#64748b", fontWeight: 700 }}>المسمى الوظيفي:</td><td style={{ fontWeight: 800 }}>{profileEmployee.jobRole}</td></tr>
                          <tr><td style={{ padding: "6px 0", color: "#64748b", fontWeight: 700 }}>المشروع المسند:</td><td style={{ fontWeight: 800, color: "#0284c7" }}>{profileEmployee.employmentType === "مرتبط بمشروع" ? (profileEmployee.project?.name || "مشروع مخصص") : "حر / عام"}</td></tr>
                          <tr><td style={{ padding: "6px 0", color: "#64748b", fontWeight: 700 }}>سند التعيين:</td><td>{profileEmployee.projectDeed || "معتمد"}</td></tr>
                          <tr><td style={{ padding: "6px 0", color: "#64748b", fontWeight: 700 }}>صلاحية البنك:</td><td style={{ fontWeight: 800, color: profileEmployee.hasBankAuthority ? "#059669" : "#64748b" }}>{profileEmployee.hasBankAuthority ? "مفوض رسمياً للتعامل البنكي 🏦" : "غير مفوض"}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SIGNATURE & OFFICIAL SEAL */}
                  <div style={{ marginTop: 30, paddingTop: 16, borderTop: "2px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#64748b" }}>ختم الاعتماد الرسمي</div>
                      <div style={{ fontSize: 24, marginTop: 4 }}>🏛️</div>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 900 }}>توقيع الإدارة العليا والاعتماد</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>التوقيع: .......................................</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, textAlign: "center" }}>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                      🖨️ طباعة الملف التعريفي الرسمي (A4)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SALARY CHECK / PAYMENT VOUCHER PRINT MODAL */}
      {printVoucherItem && (
        <div className="modal-overlay print:p-0" onClick={() => setPrintVoucherItem(null)}>
          <div className="modal print:w-full print:max-w-none" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550, background: "#ffffff", color: "#0f172a" }}>
            <div className="modal-header print:hidden" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <h2 className="modal-title" style={{ color: "#1e3a8a" }}>🧾 شيك / إيصال صرف مستحقات</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPrintVoucherItem(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid #1e3a8a", paddingBottom: 12, marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#1e3a8a", margin: 0 }}>شركة الجبل الذهبي للمقاولات</h3>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>إيصال / شيك صرف مستحقات مالية معتمد</div>
              </div>

              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#64748b" }}>اصرفوا لـ السيد:</span>
                  <strong style={{ fontSize: 15, color: "#0f172a" }}>{printVoucherItem.emp.name}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#64748b" }}>مبلغ وقدره:</span>
                  <strong style={{ fontSize: 18, color: "#059669" }}>{formatCurrency(printVoucherItem.payment.amount)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#64748b" }}>طريقة الصرف:</span>
                  <strong style={{ color: "#3b82f6" }}>{printVoucherItem.payment.paymentMethod}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>التاريخ والبيان:</span>
                  <span>{formatDateShort(printVoucherItem.payment.date)} • {printVoucherItem.payment.notes}</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>توقيع المستلم:</div>
                  <div style={{ fontSize: 11, marginTop: 14 }}>..................................</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>توقيع المحاسب / الإدارة:</div>
                  <div style={{ fontSize: 11, marginTop: 14 }}>..................................</div>
                </div>
              </div>
            </div>
            <div className="modal-footer print:hidden">
              <button type="button" className="btn btn-ghost" onClick={() => setPrintVoucherItem(null)}>إغلاق</button>
              <button type="button" className="btn btn-gold" onClick={() => window.print()}>🖨️ طباعة الإيصال / الشيك الآن</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            display: block !important;
          }
          .modal {
            position: static !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .modal-header, .modal-footer {
            display: none !important;
          }
          .modal-body {
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-id-card {
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 auto !important;
            width: 380px !important;
            max-width: 100% !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-before: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      {/* INTERACTIVE MONTHLY ATTENDANCE CALENDAR MODAL (MATCHING USER SCREENSHOT EXACTLY) */}
      {calendarEmployee && (
        <div className="modal-overlay" onClick={() => setCalendarEmployee(null)} style={{ zIndex: 1100 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 1000,
              width: "95%",
              background: "#0b1329",
              color: "#f8fafc",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 20,
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              padding: 24,
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            {/* MODAL HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: 16, marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: "#f59e0b", margin: 0 }}>
                    📅 تقويم الحضور والغياب الشهري والسُلف المقتطعة
                  </h2>
                  <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "2px 10px", borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                    {calendarEmployee.name} ({calendarEmployee.code || "EMP-101"})
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                  المسمى الوظيفي: <strong style={{ color: "#38bdf8" }}>{calendarEmployee.jobRole}</strong> • النظام المالي: <span style={{ color: "#10b981", fontWeight: 700 }}>{calendarEmployee.salaryType === "يومية" ? `${calendarEmployee.salary || 350} ج.م / يوم` : `راتب شهري (${calendarEmployee.salary || 18000} ج.م/شهر)`}</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="month"
                  className="form-control"
                  style={{ background: "#1e293b", color: "#fff", border: "1px solid #475569", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700 }}
                  value={calendarMonth}
                  onChange={(e) => {
                    setCalendarMonth(e.target.value);
                    const saved = localStorage.getItem(`cal_${calendarEmployee.id}_${e.target.value}`);
                    if (saved) setCalendarDaysMap(JSON.parse(saved));
                  }}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => setCalendarEmployee(null)} style={{ color: "#fff", background: "#ef444430", border: "1px solid #ef444460", padding: "6px 14px", borderRadius: 8, fontWeight: 800 }}>
                  إغلاق ✕
                </button>
              </div>
            </div>

            {/* TOP 5 METRICS CARDS */}
            {(() => {
              const monthDays = getMonthDaysList(calendarMonth);
              let presentCount = 0;
              let vacationCount = 0;
              let absentCount = 0;
              let emptyCount = 0;
              let advanceCount = 0;

              monthDays.forEach((d) => {
                const st = calendarDaysMap[d.dayNum] || "غير محدد";
                if (st === "حاضر") presentCount++;
                else if (st === "إجازة") vacationCount++;
                else if (st === "غياب") absentCount++;
                else if (st === "سُلفة") advanceCount++;
                else emptyCount++;
              });

              const isMonthly = calendarEmployee.salaryType !== "يومية";
              const baseSalary = isMonthly ? (calendarEmployee.salary || 18000) : presentCount * (calendarEmployee.salary || 350);
              const dailyRate = isMonthly ? (calendarEmployee.salary || 18000) / 30 : (calendarEmployee.salary || 350);
              
              const absentDeduction = isMonthly ? absentCount * dailyRate : 0;
              const advanceDeduction = advanceCount * dailyRate;
              const approvedNetSalary = Math.max(0, baseSalary - absentDeduction - advanceDeduction);

              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#a7f3d0", fontWeight: 700 }}>أيام الحضور الفعلي:</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#10b981", marginTop: 4 }}>{presentCount} يوم</div>
                    </div>

                    <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#bfdbfe", fontWeight: 700 }}>إجازات وتفرغ:</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#3b82f6", marginTop: 4 }}>{vacationCount} يوم</div>
                    </div>

                    <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#fecaca", fontWeight: 700 }}>أيام الغياب:</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444", marginTop: 4 }}>{absentCount} يوم</div>
                    </div>

                    <div style={{ background: "rgba(148, 163, 184, 0.1)", border: "1px solid rgba(148, 163, 184, 0.3)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 700 }}>غير محدد (فاضي):</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#94a3b8", marginTop: 4 }}>{emptyCount} يوم</div>
                    </div>

                    <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#fde68a", fontWeight: 700 }}>إجمالي السُلف المالية:</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b", marginTop: 4 }}>{formatCurrency(advanceDeduction)}</div>
                    </div>
                  </div>

                  {/* GOLD APPROVED NET SALARY BANNER */}
                  <div style={{ background: "linear-gradient(135deg, rgba(217, 119, 6, 0.25) 0%, rgba(180, 83, 9, 0.25) 100%)", border: "1px solid #d97706", borderRadius: 14, padding: 16, marginBottom: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#fde68a", fontWeight: 800 }}>
                      الراتب المستحق المعتمد للصرف هذا الشهر (بعد خصم غياب وأي سُلف مالية):
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: "#f59e0b", marginTop: 6, textShadow: "0 2px 10px rgba(245, 158, 11, 0.4)" }}>
                      {formatCurrency(approvedNetSalary)}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      (الراتب الأساسي {formatCurrency(baseSalary)} - خصم غياب {absentCount} أيام ({formatCurrency(absentDeduction)}) - سُلف {formatCurrency(advanceDeduction)})
                    </div>
                  </div>

                  {/* QUICK ACTIONS & LEGEND CONTROL BAR */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b", padding: "12px 18px", borderRadius: 12, marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                      جدول أيام الشهر التفاعلي ({monthDays.length} يوم) - اضغط على أي يوم للتغيير:
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11, fontWeight: 700 }}>
                      <span>⚪ غير محدد</span>
                      <span style={{ color: "#10b981" }}>🟩 حاضر</span>
                      <span style={{ color: "#3b82f6" }}>🟦 إجازة</span>
                      <span style={{ color: "#ef4444" }}>🔴 غياب</span>
                      <span style={{ color: "#f59e0b" }}>🟡 سُلفة</span>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => setAllDaysStatus("حاضر")} style={{ background: "#10b981", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                        🟩 الكل حاضر
                      </button>
                      <button type="button" onClick={() => setAllDaysStatus("إجازة")} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                        🟦 الكل إجازة
                      </button>
                      <button type="button" onClick={() => setAllDaysStatus("غير محدد")} style={{ background: "#475569", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                        ⚪ مسح الكل (فاضي)
                      </button>
                    </div>
                  </div>

                  {/* MONTHLY DAYS GRID CALENDAR (7 COLUMNS MATCHING SATURDAY-FRIDAY) */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
                    {monthDays.map((d) => {
                      const st = calendarDaysMap[d.dayNum] || "غير محدد";
                      const isPresent = st === "حاضر";
                      const isVacation = st === "إجازة";
                      const isAbsent = st === "غياب";
                      const isAdvance = st === "سُلفة";

                      let bg = "#1e293b";
                      let border = "1px solid #334155";
                      let dotColor = "#94a3b8";

                      if (isPresent) { bg = "rgba(16, 185, 129, 0.15)"; border = "1px solid #10b981"; dotColor = "#10b981"; }
                      else if (isVacation) { bg = "rgba(59, 130, 246, 0.15)"; border = "1px solid #3b82f6"; dotColor = "#3b82f6"; }
                      else if (isAbsent) { bg = "rgba(239, 68, 68, 0.15)"; border = "1px solid #ef4444"; dotColor = "#ef4444"; }
                      else if (isAdvance) { bg = "rgba(245, 158, 11, 0.15)"; border = "1px solid #f59e0b"; dotColor = "#f59e0b"; }

                      return (
                        <div
                          key={d.dayNum}
                          onClick={() => toggleDayStatus(d.dayNum)}
                          style={{
                            background: bg,
                            border: border,
                            borderRadius: 12,
                            padding: 10,
                            textAlign: "center",
                            cursor: "pointer",
                            userSelect: "none",
                            transition: "all 0.15s ease-in-out",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>
                            <span>{d.dayName}</span>
                            <span style={{ fontWeight: 900, color: "#fff" }}>{d.dayNum}</span>
                          </div>

                          <div style={{ marginTop: 8, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, display: "inline-block" }} />
                            <span style={{ fontSize: 12, fontWeight: 800, color: dotColor }}>{st}</span>
                          </div>

                          <div style={{ fontSize: 9, color: "#64748b" }}>{d.dateStr}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* BOTTOM SAVE & APPROVE BUTTON */}
                  <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-gold"
                      style={{ padding: "12px 28px", fontSize: 14, fontWeight: 900, borderRadius: 12, boxShadow: "0 4px 16px rgba(245, 158, 11, 0.3)" }}
                      onClick={handleSaveCalendarAttendance}
                    >
                      🚀 تأكيد واعتماد حضور وحساب سُلف الشهر
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
