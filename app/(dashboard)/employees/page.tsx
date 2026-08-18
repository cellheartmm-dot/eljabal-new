"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

const JOB_ROLES = ["مشرف", "عامل", "فني", "مقاول", "مهندس", "إداري", "سائق", "أخرى"];

export default function EmployeesHRPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      try {
        const cachedLogo = localStorage.getItem("eljabal_company_logo");
        if (cachedLogo) setCompanyLogoUrl(cachedLogo);
      } catch (e) {}

      const [empRes, projRes, settingsRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/projects"),
        fetch("/api/settings"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(Array.isArray(empData) ? empData : empData?.employees || []);
      } else {
        const errData = await empRes.json().catch(() => ({}));
        setFetchError(errData.error || `خطأ في استجابة الخادم (${empRes.status})`);
      }

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(Array.isArray(projData) ? projData : projData?.projects || []);
      }

      if (settingsRes.ok) {
        const setMap = await settingsRes.json();
        if (setMap.companyLogo) {
          setCompanyLogoUrl(setMap.companyLogo);
          try {
            localStorage.setItem("eljabal_company_logo", setMap.companyLogo);
          } catch (e) {}
        }
      }
    } catch (e: any) {
      console.error("Failed to fetch HR data:", e);
      setFetchError(e.message || "فشل الاتصال بقاعدة البيانات والسرفر");
    } finally {
      setLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [jobRoleFilter, setJobRoleFilter] = useState("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");
  const [bankFilter, setBankFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Documents Modal state
  const [docsEmployee, setDocsEmployee] = useState<any>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("general");
  const [docFile, setDocFile] = useState<File | null>(null);

  // Printable ID Card Modal state
  const [printEmployee, setPrintEmployee] = useState<any>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>("/api/settings/logo");

  // Form Fields
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [jobRole, setJobRole] = useState("عامل");
  const [employmentType, setEmploymentType] = useState("حر"); // حر / مرتبط بمشروع
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

  const fetchData = async () => {
    setLoading(true);
    try {
      try {
        const cachedLogo = localStorage.getItem("eljabal_company_logo");
        if (cachedLogo) setCompanyLogoUrl(cachedLogo);
      } catch (e) {}

      const [empRes, projRes, settingsRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/projects"),
        fetch("/api/settings"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(Array.isArray(empData) ? empData : []);
      }

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(Array.isArray(projData) ? projData : []);
      }

      if (settingsRes.ok) {
        const setMap = await settingsRes.json();
        if (setMap.companyLogo) {
          setCompanyLogoUrl(setMap.companyLogo);
          try {
            localStorage.setItem("eljabal_company_logo", setMap.companyLogo);
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error("Failed to fetch HR data:", e);
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

  const handleOpenEdit = (emp: any) => {
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
    setHireDate(emp.hireDate ? new Date(emp.hireDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setIsActive(emp.isActive !== undefined ? emp.isActive : true);
    setNotes(emp.notes || "");
    setPhotoFile(null);
    setIdFrontFile(null);
    setShowAddModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const isEdit = Boolean(editingEmployee);
      const url = "/api/employees";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        id: editingEmployee?.id,
        name,
        nationalId,
        phone,
        jobRole,
        employmentType,
        projectId: employmentType === "مرتبط بمشروع" ? projectId : null,
        hasBankAuthority,
        bankNotes,
        projectDeed,
        salaryType,
        salary,
        hireDate,
        isActive,
        notes,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "حدث خطأ أثناء حفظ بيانات الموظف");
        return;
      }

      const savedEmployee = await res.json();

      // If user attached files directly in the form, upload them to R2 now!
      const filesToUpload: { file: File; title: string; docType: string }[] = [];
      if (photoFile) filesToUpload.push({ file: photoFile, title: "صورة شخصية للموظف", docType: "photo" });
      if (idFrontFile) filesToUpload.push({ file: idFrontFile, title: "صورة بطاقة الرقم القومي", docType: "id_front" });

      for (const item of filesToUpload) {
        const formData = new FormData();
        formData.append("employeeId", savedEmployee.id);
        formData.append("title", item.title);
        formData.append("docType", item.docType);
        formData.append("file", item.file);

        await fetch("/api/employees/documents", {
          method: "POST",
          body: formData,
        });
      }

      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ في الاتصال بالشبكة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string, empName: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف الموظف (${empName}) وكافة مستنداته المرفوعة على Cloudflare R2؟`)) return;

    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        alert("فشل في حذف الموظف");
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ في عملية الحذف");
    }
  };

  // Upload document in Documents Modal
  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docsEmployee || !docFile) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("employeeId", docsEmployee.id);
      formData.append("title", docTitle || docFile.name);
      formData.append("docType", docType);
      formData.append("file", docFile);

      const res = await fetch("/api/employees/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setDocTitle("");
        setDocFile(null);
        setDocType("general");

        // Refresh docs employee details
        const empRes = await fetch(`/api/employees/${docsEmployee.id}`);
        if (empRes.ok) {
          const updatedEmp = await empRes.json();
          setDocsEmployee(updatedEmp);
        }
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "فشل في رفع الملف إلى R2");
      }
    } catch (e) {
      console.error(e);
      alert("خطأ أثناء الرفع لمورد Cloudflare R2");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("هل تريد حذف هذا المستند المرفوع من Cloudflare R2؟")) return;

    try {
      const res = await fetch(`/api/employees/documents?id=${docId}`, { method: "DELETE" });
      if (res.ok) {
        if (docsEmployee) {
          const empRes = await fetch(`/api/employees/${docsEmployee.id}`);
          if (empRes.ok) {
            const updatedEmp = await empRes.json();
            setDocsEmployee(updatedEmp);
          }
        }
        fetchData();
      }
    } catch (e) {
      console.error(e);
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
      {/* PAGE HEADER */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">👥 سجل الموارد البشرية وإدارة الموظفين</h1>
          <p className="page-subtitle">
            إدارة وتوثيق بيانات الكوادر، ربط المشاريع، صلاحيات التعامل البنكي، الرفع السحابي على R2، وطباعة الهوية
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة موظف جديد
          </button>
        </div>
      </div>

      {/* STATS WIDGETS */}
      <div className="grid-4 print:hidden" style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: 16, borderRight: "4px solid #3b82f6" }}>
          <div className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>👥 إجمالي الموظفين</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{totalCount}</div>
        </div>

        <div className="card" style={{ padding: 16, borderRight: "4px solid #8b5cf6" }}>
          <div className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>🏗️ معينين على مشاريع</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, color: "#8b5cf6" }}>{projectAssignedCount}</div>
        </div>

        <div className="card" style={{ padding: 16, borderRight: "4px solid #10b981" }}>
          <div className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>👷 عمالة حرة / عامة</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, color: "#10b981" }}>{freelanceCount}</div>
        </div>

        <div className="card" style={{ padding: 16, borderRight: "4px solid #f59e0b" }}>
          <div className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>🏦 تفويض بنكي باسم الشركة</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, color: "#f59e0b" }}>{bankAuthCount}</div>
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
                      <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#3b82f615", color: "#3b82f6", border: "1px solid #3b82f640" }}
                          onClick={() => setDocsEmployee(emp)}
                          title="مستندات Cloudflare R2"
                        >
                          📁 R2 ({emp.documents?.length || 0})
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#f59e0b15", color: "#d97706", border: "1px solid #f59e0b40" }}
                          onClick={() => setPrintEmployee(emp)}
                          title="طباعة كارت التعريف للهوية"
                        >
                          🎴 الكارت
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(emp)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
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
                    {docsEmployee.documents.map((doc: any) => (
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

              {/* ID BADGE CARD TEMPLATE */}
              <div
                ref={cardPrintRef}
                id="printable-id-card"
                style={{
                  width: "100%",
                  maxWidth: 360,
                  margin: "0 auto",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  color: "#ffffff",
                  border: "2px solid #38bdf8",
                  fontFamily: "Inter, Roboto, sans-serif",
                }}
              >
                {/* HEADER */}
                <div style={{ background: "linear-gradient(90deg, #1e3a8a 0%, #0369a1 100%)", padding: "16px 12px", textAlign: "center", borderBottom: "2px solid #f59e0b" }}>
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt="شعار الشركة"
                      style={{ maxHeight: 44, maxWidth: 120, objectFit: "contain", margin: "0 auto 4px auto", background: "#fff", padding: 3, borderRadius: 6 }}
                    />
                  ) : (
                    <div style={{ fontSize: 24, marginBottom: 2 }}>🏗️</div>
                  )}
                  <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.5, color: "#f8fafc" }}>الجبل الذهبي</div>
                  <div style={{ fontSize: 10, color: "#93c5fd", fontWeight: 600 }}>إدارة المقاولات والتوريدات العامة</div>
                </div>

                {/* BODY CONTENT */}
                <div style={{ padding: 16, textAlign: "center" }}>

                  {/* PHOTO */}
                  <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
                    {printEmployee.photoUrl ? (
                      <img
                        src={printEmployee.photoUrl}
                        alt={printEmployee.name}
                        style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "3px solid #f59e0b", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
                      />
                    ) : (
                      <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#0284c7", border: "3px solid #f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 auto" }}>
                        {printEmployee.name?.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* NAME & CODE */}
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", margin: "4px 0" }}>{printEmployee.name}</h3>
                  <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 800, background: "#f59e0b15", display: "inline-block", padding: "2px 10px", borderRadius: 12, border: "1px solid #f59e0b40" }}>
                    كود: {printEmployee.code}
                  </div>

                  {/* ROLE BADGE */}
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 6 }}>
                    <span style={{ background: "#38bdf8", color: "#0f172a", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 6 }}>
                      {printEmployee.jobRole}
                    </span>
                  </div>

                  {/* ASSIGNED PROJECT OR FREELANCE */}
                  <div style={{ marginTop: 10, fontSize: 11, background: "#334155", padding: "6px 10px", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span>🏗️ التعيين:</span>
                    <strong style={{ color: "#38bdf8" }}>
                      {printEmployee.employmentType === "مرتبط بمشروع"
                        ? (printEmployee.project?.name || "مشروع مخصص")
                        : "عمالة حرة / عامة"}
                    </strong>
                  </div>

                  {/* BANK AUTHORITY BADGE IF ENABLED */}
                  {printEmployee.hasBankAuthority && (
                    <div style={{ marginTop: 10, background: "linear-gradient(90deg, #d97706 0%, #b45309 100%)", color: "#fff", padding: "6px 10px", borderRadius: 8, fontWeight: 800, fontSize: 11, boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
                      🏦 مفوض رسمياً بالتعاملات البنكية باسم الشركة
                    </div>
                  )}

                  {/* ID DETAILS TABLE */}
                  <div style={{ marginTop: 12, textAlign: "right", fontSize: 11, borderTop: "1px solid #334155", paddingTop: 10 }}>
                    {printEmployee.projectDeed && (
                      <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0", color: "#f59e0b" }}>
                        <span style={{ color: "#94a3b8" }}>سند المشروع:</span>
                        <span style={{ fontWeight: 800 }}>{printEmployee.projectDeed}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
                      <span style={{ color: "#94a3b8" }}>الرقم القومي:</span>
                      <span style={{ fontWeight: 700 }}>{printEmployee.nationalId || "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
                      <span style={{ color: "#94a3b8" }}>الهاتف:</span>
                      <span style={{ fontWeight: 700 }}>{printEmployee.phone || "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
                      <span style={{ color: "#94a3b8" }}>تاريخ التعيين:</span>
                      <span style={{ fontWeight: 700 }}>{formatDateShort(printEmployee.hireDate)}</span>
                    </div>
                  </div>

                  {/* QR STAMP DECORATION */}
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px dashed #475569", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ textTransform: "uppercase", fontSize: 9, color: "#64748b", textAlign: "right" }}>
                      تصريح عمل موثق<br />شركة الجبل الذهبي
                    </div>
                    <div style={{ background: "#ffffff", padding: 4, borderRadius: 4 }}>
                      {/* Simple SVG QR visual placeholder */}
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                        <rect x="3" y="3" width="6" height="6"/>
                        <rect x="15" y="3" width="6" height="6"/>
                        <rect x="3" y="15" width="6" height="6"/>
                        <path d="M15 15h2v2h-2zM19 19h2v2h-2zM15 19h2v2h-2zM19 15h2v2h-2z"/>
                      </svg>
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

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 0;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          .modal-overlay,
          .modal,
          .modal-body,
          #printable-id-card,
          #printable-id-card * {
            visibility: visible !important;
          }
          .modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
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
          .modal-body {
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-id-card {
            position: relative !important;
            left: 0 !important;
            top: 40px !important;
            margin: 0 auto !important;
            width: 360px !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
