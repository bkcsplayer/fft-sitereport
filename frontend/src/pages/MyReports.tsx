import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, MapPin, Calendar, Layers } from "lucide-react";
import { api, ReportListItem } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";
import { PageHeader } from "../components/PageHeader";
import { ReportDetailModal } from "../components/ReportDetailModal";
import { useI18n } from "../i18n";

export function MyReports() {
  const { t } = useI18n();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const data = await api.getReports();
    setReports(data);
    setLoading(false);
  };

  return (
    <div className="px-4 py-6 space-y-5 w-full max-w-full overflow-hidden">
      <PageHeader title={t("myReports.title")} subtitle={t("myReports.subtitle")} />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-[2.5px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-dark-800/50 border border-dark-700/30 flex items-center justify-center mx-auto mb-4">
            <History size={28} className="text-dark-600" />
          </div>
          <p className="text-dark-500 text-sm font-medium">{t("myReports.empty")}</p>
        </motion.div>
      ) : (
        <div className="space-y-3 w-full">
          {reports.map((report, i) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
              className="glass-card p-4 space-y-3 card-hover cursor-pointer min-w-0 overflow-hidden"
              onClick={() => setSelectedReportId(report.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-dark-500 flex-shrink-0">
                  <Calendar size={12} className="text-dark-600" />
                  <span className="font-medium">{report.work_date}</span>
                </div>
                <StatusBadge status={report.status} />
              </div>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary-600/8 border border-primary-500/15 flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-primary-400" />
                </div>
                <span className="text-sm text-dark-100 font-semibold truncate">
                  {report.work_address}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-dark-500 pt-1 border-t border-dark-700/20">
                <span className="font-medium truncate mr-2">{t("myReports.leader")}: <span className="text-dark-400">{report.crew_leader_name}</span></span>
                <span className="flex items-center gap-1.5 font-medium flex-shrink-0">
                  <Layers size={12} className="text-dark-600" />
                  <span className="text-dark-300">{report.panels_installed_today}</span>
                  <span>{t("myReports.panels")}</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedReportId && (
        <ReportDetailModal reportId={selectedReportId} onClose={() => setSelectedReportId(null)} />
      )}
    </div>
  );
}
