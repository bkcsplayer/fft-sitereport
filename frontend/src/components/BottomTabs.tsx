import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardEdit, History, LayoutDashboard } from "lucide-react";
import { useI18n } from "../i18n";
import { useAuth } from "../auth";

export function BottomTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { isAdmin } = useAuth();

  const allTabs = [
    { path: "/", icon: ClipboardEdit, label: t("tab.report") },
    { path: "/my-reports", icon: History, label: t("tab.myReports") },
    { path: "/admin", icon: LayoutDashboard, label: t("tab.admin"), adminOnly: true },
  ];

  const tabs = allTabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
      <div className="glass-card-strong rounded-none rounded-t-[24px] border-t border-dark-600/30 px-2 pt-2 pb-safe flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
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
              <tab.icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={`relative z-10 transition-colors duration-200 ${
                  isActive ? "text-primary-300" : "text-dark-500"
                }`}
              />
              <span
                className={`relative z-10 text-[11px] font-semibold transition-colors duration-200 ${
                  isActive ? "text-primary-300" : "text-dark-500"
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
