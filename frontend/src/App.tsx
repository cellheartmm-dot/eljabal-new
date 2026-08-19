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
                
                {/* Projects */}
                <Route
                  path="projects"
                  element={
                    <RoleGuard moduleKey="projects" action="view">
                      <ProjectsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="projects/create"
                  element={
                    <RoleGuard moduleKey="projects" action="add">
                      <ProjectCreatePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="projects/:id"
                  element={
                    <RoleGuard moduleKey="projects" action="view">
                      <ProjectDetailsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="project-phases/create"
                  element={
                    <RoleGuard moduleKey="projects" action="add">
                      <ProjectPhaseCreatePage />
                    </RoleGuard>
                  }
                />

                {/* Project Expenses */}
                <Route
                  path="project-expenses"
                  element={
                    <RoleGuard moduleKey="projectExpenses" action="view">
                      <ProjectExpensesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="project-expenses/create"
                  element={
                    <RoleGuard moduleKey="projectExpenses" action="add">
                      <ProjectExpenseCreatePage />
                    </RoleGuard>
                  }
                />

                {/* Revenues */}
                <Route
                  path="revenues"
                  element={
                    <RoleGuard moduleKey="revenues" action="view">
                      <RevenuesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="revenues/create"
                  element={
                    <RoleGuard moduleKey="revenues" action="add">
                      <RevenueCreatePage />
                    </RoleGuard>
                  }
                />

                {/* Workers & Daily Attendance */}
                <Route
                  path="workers"
                  element={
                    <RoleGuard moduleKey="employees" action="view">
                      <WorkersPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="workers/create"
                  element={
                    <RoleGuard moduleKey="employees" action="add">
                      <WorkerCreatePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="workers/:id/statement"
                  element={
                    <RoleGuard moduleKey="employees" action="view">
                      <WorkerStatementPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="worker-daily"
                  element={
                    <RoleGuard moduleKey="employees" action="view">
                      <WorkerDailyPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="worker-daily/create"
                  element={
                    <RoleGuard moduleKey="employees" action="add">
                      <WorkerDailyCreatePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="worker-advances"
                  element={
                    <RoleGuard moduleKey="employees" action="view">
                      <WorkerAdvancesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="worker-advances/create"
                  element={
                    <RoleGuard moduleKey="employees" action="add">
                      <WorkerAdvanceCreatePage />
                    </RoleGuard>
                  }
                />

                {/* Supervisors Management */}
                <Route
                  path="supervisors"
                  element={
                    <RoleGuard moduleKey="employees" action="view">
                      <SupervisorsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="supervisors/create"
                  element={
                    <RoleGuard moduleKey="employees" action="add">
                      <SupervisorCreatePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="supervisor-salaries"
                  element={
                    <RoleGuard moduleKey="employees" action="view">
                      <SupervisorSalariesPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="supervisor-dailies"
                  element={
                    <RoleGuard moduleKey="employees" action="view">
                      <SupervisorDailiesPage />
                    </RoleGuard>
                  }
                />

                {/* Subcontractors */}
                <Route
                  path="subcontractors"
                  element={
                    <RoleGuard moduleKey="subcontractors" action="view">
                      <SubcontractorsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="subcontractors/create"
                  element={
                    <RoleGuard moduleKey="subcontractors" action="add">
                      <SubcontractorCreatePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="subcontractor-invoices"
                  element={
                    <RoleGuard moduleKey="subcontractorInvoices" action="view">
                      <SubcontractorInvoicesPage />
                    </RoleGuard>
                  }
                />

                {/* HR & Employees */}
                <Route
                  path="employees"
                  element={
                    <RoleGuard moduleKey="employees" action="view">
                      <EmployeesPage />
                    </RoleGuard>
                  }
                />

                {/* Equipment */}
                <Route
                  path="equipment"
                  element={
                    <RoleGuard moduleKey="equipment" action="view">
                      <EquipmentPage />
                    </RoleGuard>
                  }
                />

                {/* General Expenses */}
                <Route
                  path="general-expenses"
                  element={
                    <RoleGuard moduleKey="generalExpenses" action="view">
                      <GeneralExpensesPage />
                    </RoleGuard>
                  }
                />

                {/* Investment Term Sheets */}
                <Route
                  path="term-sheets"
                  element={
                    <RoleGuard moduleKey="termSheets" action="view">
                      <TermSheetsPage />
                    </RoleGuard>
                  }
                />

                {/* Price Quotations & BOQ */}
                <Route
                  path="price-quotations"
                  element={
                    <RoleGuard moduleKey="priceQuotations" action="view">
                      <PriceQuotationsPage />
                    </RoleGuard>
                  }
                />

                {/* Reports & Financial Statements */}
                <Route
                  path="reports"
                  element={
                    <RoleGuard moduleKey="reports" action="view">
                      <ReportsPage />
                    </RoleGuard>
                  }
                />

                {/* Settings */}
                <Route
                  path="settings"
                  element={
                    <RoleGuard moduleKey="settings" action="view">
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
