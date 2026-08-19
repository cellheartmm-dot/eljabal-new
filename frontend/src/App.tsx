import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";

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
                <Route path="project-expenses" element={<ProjectExpensesPage />} />
                <Route path="project-expenses/create" element={<ProjectExpenseCreatePage />} />
                <Route path="revenues" element={<RevenuesPage />} />
                <Route path="revenues/create" element={<RevenueCreatePage />} />
                <Route path="workers" element={<WorkersPage />} />
                <Route path="workers/create" element={<WorkerCreatePage />} />
                <Route path="workers/:id/statement" element={<WorkerStatementPage />} />
                <Route path="worker-daily" element={<WorkerDailyPage />} />
                <Route path="worker-daily/create" element={<WorkerDailyCreatePage />} />
                <Route path="worker-advances" element={<WorkerAdvancesPage />} />
                <Route path="worker-advances/create" element={<WorkerAdvanceCreatePage />} />
                <Route path="supervisors" element={<SupervisorsPage />} />
                <Route path="supervisors/create" element={<SupervisorCreatePage />} />
                <Route path="supervisor-salaries" element={<SupervisorSalariesPage />} />
                <Route path="supervisor-dailies" element={<SupervisorDailiesPage />} />
                <Route path="subcontractors" element={<SubcontractorsPage />} />
                <Route path="subcontractors/create" element={<SubcontractorCreatePage />} />
                <Route path="subcontractor-invoices" element={<SubcontractorInvoicesPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="equipment" element={<EquipmentPage />} />
                <Route path="general-expenses" element={<GeneralExpensesPage />} />
                <Route path="term-sheets" element={<TermSheetsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

