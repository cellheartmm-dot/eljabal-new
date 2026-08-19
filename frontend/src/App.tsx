import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import RoleGuard from "./components/layout/RoleGuard";

import { ThemeProvider } from "./context/ThemeContext";

// Pages
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ProjectsPage from "./pages/Projects";
import ProjectCreatePage from "./pages/ProjectCreate";
import ProjectDetailsPage from "./pages/ProjectDetails";
import ProjectPhaseCreatePage from "./pages/ProjectPhaseCreate";

import ProjectExpensesPage from "./pages/ProjectExpenses";
import ProjectExpenseCreatePage from "./pages/ProjectExpenseCreate";

import RevenuesPage from "./pages/Revenues";
import RevenueCreatePage from "./pages/RevenueCreate";

import WorkersPage from "./pages/Workers";
import WorkerCreatePage from "./pages/WorkerCreate";
import WorkerStatementPage from "./pages/WorkerStatement";
import WorkerDailyPage from "./pages/WorkerDaily";
import WorkerDailyCreatePage from "./pages/WorkerDailyCreate";
import WorkerAdvancesPage from "./pages/WorkerAdvances";
import WorkerAdvanceCreatePage from "./pages/WorkerAdvanceCreate";

import SupervisorsPage from "./pages/Supervisors";
import SupervisorCreatePage from "./pages/SupervisorCreate";
import SupervisorSalariesPage from "./pages/SupervisorSalaries";
import SupervisorDailiesPage from "./pages/SupervisorDailies";

import SubcontractorsPage from "./pages/Subcontractors";
import SubcontractorCreatePage from "./pages/SubcontractorCreate";
import SubcontractorInvoicesPage from "./pages/SubcontractorInvoices";

import EmployeesPage from "./pages/Employees";
import EquipmentPage from "./pages/Equipment";
import GeneralExpensesPage from "./pages/GeneralExpenses";
import TermSheetsPage from "./pages/TermSheets";
import PriceQuotationsPage from "./pages/PriceQuotations";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import LandingPage from "./pages/LandingPage";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/landing" element={<LandingPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/create" element={<ProjectCreatePage />} />
                <Route path="projects/:id" element={<ProjectDetailsPage />} />
                <Route path="project-phases/create" element={<ProjectPhaseCreatePage />} />

                {/* Project Expenses (Restricted to canRecordExpenses for supervisors) */}
                <Route
                  path="project-expenses"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordExpenses">
                      <ProjectExpensesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="project-expenses/create"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordExpenses">
                      <ProjectExpenseCreatePage />
                    </RoleGuard>
                  }
                />

                {/* Revenues (Admin & Accountant only) */}
                <Route
                  path="revenues"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant"]}>
                      <RevenuesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="revenues/create"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant"]}>
                      <RevenueCreatePage />
                    </RoleGuard>
                  }
                />

                {/* Worker Dailies & Advances (Supervisor if canRecordWorkerDaily) */}
                <Route
                  path="workers"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordWorkerDaily">
                      <WorkersPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="workers/create"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordWorkerDaily">
                      <WorkerCreatePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="workers/:id/statement"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordWorkerDaily">
                      <WorkerStatementPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="worker-daily"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordWorkerDaily">
                      <WorkerDailyPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="worker-daily/create"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordWorkerDaily">
                      <WorkerDailyCreatePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="worker-advances"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordWorkerDaily">
                      <WorkerAdvancesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="worker-advances/create"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordWorkerDaily">
                      <WorkerAdvanceCreatePage />
                    </RoleGuard>
                  }
                />

                {/* Supervisors Management */}
                <Route
                  path="supervisors"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant"]}>
                      <SupervisorsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="supervisors/create"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant"]}>
                      <SupervisorCreatePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="supervisor-salaries"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant"]}>
                      <SupervisorSalariesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="supervisor-dailies"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]}>
                      <SupervisorDailiesPage />
                    </RoleGuard>
                  }
                />

                {/* Subcontractors */}
                <Route
                  path="subcontractors"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordSubcontractorDaily">
                      <SubcontractorsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="subcontractors/create"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordSubcontractorDaily">
                      <SubcontractorCreatePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="subcontractor-invoices"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant"]}>
                      <SubcontractorInvoicesPage />
                    </RoleGuard>
                  }
                />

                {/* HR & Employees (Supervisor if canRecordWorkerDaily) */}
                <Route
                  path="employees"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant", "supervisor"]} requirePermission="canRecordWorkerDaily">
                      <EmployeesPage />
                    </RoleGuard>
                  }
                />

                {/* Equipment (Daily logs accessible to supervisor) */}
                <Route path="equipment" element={<EquipmentPage />} />

                {/* General Expenses (Admin & Accountant only) */}
                <Route
                  path="general-expenses"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant"]}>
                      <GeneralExpensesPage />
                    </RoleGuard>
                  }
                />

                {/* Investment Term Sheets (Admin only) */}
                <Route
                  path="term-sheets"
                  element={
                    <RoleGuard allowedRoles={["admin"]}>
                      <TermSheetsPage />
                    </RoleGuard>
                  }
                />

                {/* Price Quotations & BOQ (Admin & Accountant only) */}
                <Route
                  path="price-quotations"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant"]}>
                      <PriceQuotationsPage />
                    </RoleGuard>
                  }
                />

                {/* Comprehensive Reports (Admin & Accountant only) */}
                <Route
                  path="reports"
                  element={
                    <RoleGuard allowedRoles={["admin", "accountant"]}>
                      <ReportsPage />
                    </RoleGuard>
                  }
                />

                {/* System Settings (Admin only) */}
                <Route
                  path="settings"
                  element={
                    <RoleGuard allowedRoles={["admin"]}>
                      <SettingsPage />
                    </RoleGuard>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
