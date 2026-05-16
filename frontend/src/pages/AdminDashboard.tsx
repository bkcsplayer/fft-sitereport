import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  FileText,
  Layers,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock,
  UserCog,
} from "lucide-react";
import { api, AdminStats, SiteReportListItem } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";
import { PageHeader } from "../components/PageHeader";
import { useI18n } from "../i18n";

type AdminTab = "overview" | "reports";

export function AdminDashboard() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: t("admin.tab.overview"), icon: BarChart3 },
    { id: "reports", label: t("admin.tab.reports"), icon: FileText },
  ];

  return (
    <div className="px-4 py-6 space-y-5 w-full max-w-full overflow-hidden">
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />

      {/* Sub-tabs — horizontal scroll for safety on narrow screens */}
      <div className="grid grid-cols-2 gap-1 w-full min-w-0">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-[0.97] cursor-pointer min-w-0 ${
                active
                  ? "bg-primary-600/15 text-primary-300 border border-primary-500/30 shadow-[0_0_10px_rgba(51,145,255,0.06)]"
                  : "bg-dark-800/35 text-dark-500 border border-dark-700/25"
              }`}
              style={{ minHeight: 56 }}
            >
              <tab.icon size={16} strokeWidth={active ? 2.5 : 2} />
              <span className="truncate w-full text-center leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && <OverviewPanel key="overview" />}
        {activeTab === "reports" && <ReportsPanel key="reports" />}
      </AnimatePresence>
    </div>
  );
}

/* ─── Overview Panel ─── */
function OverviewPanel() {
  const { t } = useI18n();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminStats().then((d) => { setStats(d); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  const cards = stats
    ? [
        { icon: FileText, label: t("admin.stat.total"), value: stats.total_reports, color: "text-primary-400", bg: "bg-primary-600/8", border: "border-primary-500/15" },
        { icon: CheckCircle, label: t("admin.stat.completed"), value: stats.completed_reports, color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/15" },
        { icon: Clock, label: t("admin.stat.pending"), value: stats.pending_reports, color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/15" },
        { icon: AlertTriangle, label: t("admin.stat.anomaly"), value: stats.anomaly_reports, color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/15" },
        { icon: Layers, label: t("admin.stat.panels"), value: stats.total_panels_installed, color: "text-violet-400", bg: "bg-violet-500/8", border: "border-violet-500/15" },
        { icon: MapPin, label: t("admin.stat.projects"), value: stats.active_projects, color: "text-cyan-400", bg: "bg-cyan-500/8", border: "border-cyan-500/15" },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="grid grid-cols-3 gap-2 w-full min-w-0">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
            className={`glass-card p-3 text-center ${card.bg} ${card.border} active:scale-[0.97] transition-transform duration-150 cursor-pointer min-w-0 overflow-hidden`}
          >
            <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.border} border flex items-center justify-center mx-auto mb-2`}>
              <card.icon size={15} className={card.color} />
            </div>
            <div className="text-lg font-bold text-white tracking-tight">{card.value}</div>
            <div className="text-[10px] text-dark-500 mt-1 font-medium leading-tight truncate">{card.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Reports Panel ─── */
function ReportsPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [reports, setReports] = useState<SiteReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSiteReports().then((d) => { setReports(d); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-3 w-full min-w-0">
      <h2 className="section-header">
        <div className="w-7 h-7 rounded-lg bg-primary-600/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
          <FileText size={15} className="text-primary-400" />
        </div>
        {t("admin.allReports")}
        <span className="text-dark-600 font-normal text-xs ml-1">({reports.length})</span>
      </h2>

      {reports.length === 0 ? (
        <div className="text-center py-12 text-dark-500 text-sm font-medium">{t("admin.noReports")}</div>
      ) : (
        <div className="space-y-2.5 w-full">
          {reports.map((report, i) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02, duration: 0.25 }}
              className="glass-card p-3.5 space-y-2 card-hover cursor-pointer min-w-0 overflow-hidden"
              onClick={() => navigate(`/site-reports/${report.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-dark-500 flex-shrink-0">
                  <Clock size={11} className="text-dark-600" />
                  {report.work_date}
                </div>
                <StatusBadge status={report.status} />
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-primary-600/8 border border-primary-500/15 flex items-center justify-center flex-shrink-0">
                  <MapPin size={12} className="text-primary-400" />
                </div>
                <span className="text-sm text-dark-100 font-semibold truncate">{report.work_address}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-dark-500 pt-1 border-t border-dark-700/20">
                <span className="flex items-center gap-1.5 font-medium truncate">
                  <UserCog size={11} className="text-dark-600 flex-shrink-0" />
                  <span className="text-dark-400 truncate">{report.crew_lead_name || "Unknown"}</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium flex-shrink-0">
                  <Layers size={11} className="text-dark-600" />
                  <span className="text-dark-300">{report.installation_quantity}</span>
                  <span>{t("myReports.panels")}</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Shared ─── */
function Spinner() {
  return (
    <div className="flex justify-center py-14">
      <div className="w-9 h-9 border-[2.5px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
    </div>
  );
}
