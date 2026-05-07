import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReportForm } from "./pages/ReportForm";
import { MyReports } from "./pages/MyReports";
import { AdminDashboard } from "./pages/AdminDashboard";
import { LoginPage } from "./pages/LoginPage";
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

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-950 flex flex-col max-w-md mx-auto relative isolate overflow-x-hidden">
        {/* Subtle background gradient for depth */}
        <div
          className="fixed inset-0 max-w-md mx-auto pointer-events-none -z-10"
          aria-hidden="true"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] right-0 w-[300px] h-[300px] bg-primary-800/6 rounded-full blur-[100px]" />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 w-full">
          <Routes>
            <Route path="/" element={<ReportForm />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route
              path="/admin"
              element={
                user.role === "admin" ? <AdminDashboard /> : <Navigate to="/" replace />
              }
            />
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
