-- =========================================================
-- COMPLETE SUPABASE POSTGRESQL DATABASE SCHEMA MIGRATION
-- شركة الجبل الذهبي للمقاولات - Eljabal Construction System
-- =========================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS public."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON public."User"("username");

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS public."Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'جاري',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Project_code_key" ON public."Project"("code");

-- 3. PROJECT EXPENSES
CREATE TABLE IF NOT EXISTS public."ProjectExpense" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidBy" TEXT,
    "paymentMethod" TEXT,
    "statement" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectExpense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. WORKERS
CREATE TABLE IF NOT EXISTS public."Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationalId" TEXT,
    "specialty" TEXT,
    "dailyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- 5. WORKER DAILY
CREATE TABLE IF NOT EXISTS public."WorkerDaily" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "projectId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'حاضر',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkerDaily_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkerDaily_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES public."Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkerDaily_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 6. WORKER ADVANCES
CREATE TABLE IF NOT EXISTS public."WorkerAdvance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'مدفوع',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkerAdvance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkerAdvance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES public."Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 7. SUPERVISORS
CREATE TABLE IF NOT EXISTS public."Supervisor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "salaryType" TEXT NOT NULL DEFAULT 'شهري',
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Supervisor_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Supervisor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 8. SUPERVISOR SALARIES
CREATE TABLE IF NOT EXISTS public."SupervisorSalary" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'مدفوع',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupervisorSalary_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupervisorSalary_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES public."Supervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 9. SUPERVISOR DAILIES (NATIVE TABLE)
CREATE TABLE IF NOT EXISTS public."SupervisorDaily" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "projectId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'حاضر',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupervisorDaily_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupervisorDaily_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES public."Supervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupervisorDaily_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 10. SUBCONTRACTORS
CREATE TABLE IF NOT EXISTS public."Subcontractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subcontractor_pkey" PRIMARY KEY ("id")
);

-- 11. SUBCONTRACTOR DOCS
CREATE TABLE IF NOT EXISTS public."SubcontractorDoc" (
    "id" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'معلق',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubcontractorDoc_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SubcontractorDoc_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES public."Subcontractor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubcontractorDoc_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 12. EQUIPMENT
CREATE TABLE IF NOT EXISTS public."Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "plateNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'يعمل',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- 13. EQUIPMENT EXPENSES
CREATE TABLE IF NOT EXISTS public."EquipmentExpense" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentExpense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EquipmentExpense_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES public."Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 14. REVENUES
CREATE TABLE IF NOT EXISTS public."Revenue" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "source" TEXT NOT NULL,
    "type" TEXT,
    "paymentMethod" TEXT,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Revenue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Revenue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 15. GENERAL EXPENSES
CREATE TABLE IF NOT EXISTS public."GeneralExpense" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneralExpense_pkey" PRIMARY KEY ("id")
);

-- 16. SETTINGS
CREATE TABLE IF NOT EXISTS public."Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON public."Setting"("key");

-- 17. EMPLOYEES
CREATE TABLE IF NOT EXISTS public."Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationalId" TEXT,
    "phone" TEXT,
    "jobRole" TEXT NOT NULL DEFAULT 'عامل',
    "employmentType" TEXT NOT NULL DEFAULT 'حر',
    "projectId" TEXT,
    "hasBankAuthority" BOOLEAN NOT NULL DEFAULT false,
    "bankNotes" TEXT,
    "salaryType" TEXT NOT NULL DEFAULT 'شهري',
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoUrl" TEXT,
    "idCardFrontUrl" TEXT,
    "idCardBackUrl" TEXT,
    "projectDeedUrl" TEXT,
    "projectDeed" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Employee_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_code_key" ON public."Employee"("code");

-- 18. EMPLOYEE DOCUMENTS
CREATE TABLE IF NOT EXISTS public."EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileKey" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "contentType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 19. PROJECT INVESTORS
CREATE TABLE IF NOT EXISTS public."ProjectInvestor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "sharePercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "initialCapital" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectInvestor_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectInvestor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 20. PROJECT PHASES
CREATE TABLE IF NOT EXISTS public."ProjectPhase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "modelName" TEXT,
    "phaseName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSurveyedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "executedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subcontractorName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectPhase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectPhase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 21. PROJECT FILES
CREATE TABLE IF NOT EXISTS public."ProjectFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 22. TERM SHEETS
CREATE TABLE IF NOT EXISTS public."TermSheet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'عقود تنفيذ',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TermSheet_pkey" PRIMARY KEY ("id")
);

-- =========================================================
-- OPTIONAL COLUMN SAFEFALL (ADD IF NOT EXIST)
-- =========================================================
ALTER TABLE public."Project" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'GENERAL_CONTRACTING';
ALTER TABLE public."ProjectExpense" ADD COLUMN IF NOT EXISTS "paidBy" TEXT;
ALTER TABLE public."ProjectExpense" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public."ProjectExpense" ADD COLUMN IF NOT EXISTS "statement" TEXT;

ALTER TABLE public."Revenue" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE public."Revenue" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public."Revenue" ADD COLUMN IF NOT EXISTS "description" TEXT;

