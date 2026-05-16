import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutGrid, ClipboardEdit, LayoutDashboard, Users, IdCard, FileCheck, Shield } from "lucide-react";
import { useAuth } from "../auth";
import { api } from "../services/api";

export function BottomTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const isWorker = user?.role === "worker";
  const isCrewLead = user?.role === "crew_lead";

  // Poll pending signing tasks for crew lead
  const [pendingSignCount, setPendingSignCount] = useState(0);
  useEffect(() => {
    if (!isCrewLead || !user?.token) return;
    const fetchPending = () => {
      api.getWorkerDashboard()
        .then((data) => {
          const count = (data.assignments || []).filter(
            (a) => a.fpp_status !== "signed" || a.ha_status !== "signed"
          ).length;
          setPendingSignCount(count);
        })
        .catch(() => setPendingSignCount(0));
    };
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, [isCrewLead, user?.token]);

  const allTabs: Array<{ path: string; icon: React.ElementType; label: string; show?: boolean; badge?: number }> = [];

  if (isWorker) {
    allTabs.push({ path: "/worker", icon: LayoutGrid, label: "Home" });
    if (user?.employee_id) {
      allTabs.push({ path: `/employees/${user.employee_id}`, icon: IdCard, label: "My Docs" });
    }
  } else if (isCrewLead) {
    allTabs.push({ path: "/", icon: LayoutGrid, label: "Home" });
    allTabs.push({ path: "/new-report", icon: ClipboardEdit, label: "Report" });
    allTabs.push({
      path: "/worker",
      icon: FileCheck,
      label: "Sign",
      badge: pendingSignCount,
    });
  } else if (isAdmin) {
    allTabs.push({ path: "/", icon: LayoutGrid, label: "Home" });
    allTabs.push({ path: "/legacy-report", icon: ClipboardEdit, label: "Report" });
    allTabs.push({ path: "/employees", icon: Users, label: "Employees" });
    allTabs.push({ path: "/admin", icon: LayoutDashboard, label: "Admin" });
  }

  const tabs = allTabs.filter((t) => t.show !== false);

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-50">
      <div className="glass-card-strong rounded-none rounded-t-[24px] border-t border-dark-600/30 px-2 pt-2 pb-safe flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            tab.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.path);
          const hasPending = (tab.badge ?? 0) > 0;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl transition-colors duration-200 cursor-pointer"
              style={{ minWidth: 64, minHeight: 56 }}
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-primary-600/12 rounded-2xl border border-primary-500/15"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              {/* Pending badge */}
              {hasPending && (
                <div className="absolute -top-0.5 right-1 z-20 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{tab.badge}</span>
                </div>
              )}

              <tab.icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={`relative z-10 transition-colors duration-200 ${
                  hasPending
                    ? "text-red-400"
                    : isActive
                    ? "text-primary-300"
                    : "text-dark-500"
                }`}
              />
              <span
                className={`relative z-10 text-[11px] font-semibold transition-colors duration-200 ${
                  hasPending
                    ? "text-red-400"
                    : isActive
                    ? "text-primary-300"
                    : "text-dark-500"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
