import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, MapPin, Calendar, ChevronRight, Clock, Shield, AlertTriangle } from "lucide-react";
import { api, SiteReportListItem, WorkerAssignment } from "../services/api";
import { PageHeader } from "../components/PageHeader";
import { WeatherWidget } from "../components/WeatherWidget";
import { useAuth } from "../auth";

const STATUS_LABELS: Record<string, { en: string; color: string }> = {
  draft: { en: "Draft", color: "bg-dark-500/10 text-dark-400" },
  ready_for_signature: { en: "Ready", color: "bg-primary-500/10 text-primary-400" },
  pending_signatures: { en: "Signing", color: "bg-amber-500/10 text-amber-400" },
  completed: { en: "Done", color: "bg-emerald-500/10 text-emerald-400" },
  needs_review: { en: "Review", color: "bg-red-500/10 text-red-400" },
};

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState<SiteReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSiteReports()
      .then((reportsData) => setReports(reportsData))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-[2.5px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4 w-full">
      <PageHeader title="Site Reports" subtitle="Safety report dossiers" />

      {/* ─── Weather ─────────────────────────────────── */}
      <WeatherWidget />

      {/* ─── Report List ─────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Reports</h2>

        {reports.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-14 h-14 rounded-full bg-dark-800/50 border border-dark-600/30 flex items-center justify-center mx-auto mb-3">
              <FileText size={24} className="text-dark-500" />
            </div>
            <p className="text-dark-500 text-sm">No site reports yet</p>
            <p className="text-dark-600 text-xs mt-1">Create one from the Report tab</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r, i) => {
              const st = STATUS_LABELS[r.status] || STATUS_LABELS.draft;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/site-reports/${r.id}`)}
                  className="glass-card p-3.5 space-y-2 cursor-pointer card-hover"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] text-dark-500 mb-0.5">
                        <Calendar size={10} />
                        <span>{r.work_date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-dark-500 flex-shrink-0" />
                        <span className="text-sm text-dark-100 font-medium truncate">{r.work_address}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${st.color}`}>
                      {st.en}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-dark-500">
                      {r.crew_lead_name && <span>Crew: {r.crew_lead_name}</span>}
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-dark-600" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
