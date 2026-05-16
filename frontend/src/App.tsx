import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { LoginPage } from "./pages/LoginPage";
import { EmployeeAdmin } from "./pages/EmployeeAdmin";
import { EmployeeDetail } from "./pages/EmployeeDetail";
import { SiteReportWizard } from "./pages/SiteReportWizard";
import { SiteReportList } from "./pages/SiteReportList";
import { SiteReportDetail } from "./pages/SiteReportDetail";
import { SignedDocumentView } from "./pages/SignedDocumentView";
import { WorkerDashboard } from "./pages/WorkerDashboard";
import { WorkerSignDoc } from "./pages/WorkerSignDoc";
import { BottomTabs } from "./components/BottomTabs";
import { I18nProvider } from "./i18n";
import { AuthProvider, useAuth } from "./auth";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = user.role === "admin";
  const isWorker = user.role === "worker";
  const isCrewLead = user.role === "crew_lead";

  return (
    <BrowserRouter>
      <div className="h-dvh bg-dark-950 flex flex-col max-w-2xl mx-auto relative isolate overflow-x-hidden">
        {/* Subtle background gradient for depth */}
        <div
          className="fixed inset-0 max-w-2xl mx-auto pointer-events-none -z-10"
          aria-hidden="true"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] right-0 w-[300px] h-[300px] bg-primary-800/6 rounded-full blur-[100px]" />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 w-full">
          <Routes>
            {/* Worker routes */}
            <Route path="/worker" element={isWorker || isCrewLead ? <WorkerDashboard /> : <Navigate to="/" replace />} />
            <Route path="/worker/sign/:reportId/:docType" element={isWorker || isCrewLead ? <WorkerSignDoc /> : <Navigate to="/" replace />} />

            {/* Crew Lead & Admin routes */}
            <Route path="/" element={
              isWorker ? <Navigate to="/worker" replace /> : <HomePage />
            } />
            <Route path="/new-report" element={
              isCrewLead || isAdmin ? <SiteReportWizard /> : <Navigate to="/" replace />
            } />
            <Route path="/site-reports" element={
              isCrewLead || isAdmin ? <SiteReportList /> : <Navigate to="/" replace />
            } />
            <Route path="/site-reports/:id" element={
              isCrewLead || isAdmin ? <SiteReportDetail /> : <Navigate to="/" replace />
            } />
            <Route path="/signed/:reportId/:docType" element={<SignedDocumentView />} />

            {/* Employee routes: admin sees list, everyone sees own detail */}
            <Route path="/employees" element={isAdmin ? <EmployeeAdmin /> : <Navigate to="/" replace />} />
            <Route path="/employees/:id" element={<EmployeeDetail />} />

            {/* Admin only */}
            <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomTabs />
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
