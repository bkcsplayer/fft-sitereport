import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, MapPin, Calendar, User, Video, Mic, FileText,
  Shield, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp,
  ExternalLink, Send
} from "lucide-react";
import { useAuth } from "../auth";
import { api, SiteReportDetail as SiteReportDetailType } from "../services/api";
import { SignatureMatrix } from "../components/SignatureMatrix";
import { VoiceRecorder } from "../components/VoiceRecorder";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready_for_signature: "Ready for Signature",
  pending_signatures: "Pending Signatures",
  completed: "Completed",
  needs_review: "Needs Review",
};

export function SiteReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<SiteReportDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFpp, setShowFpp] = useState(false);
  const [showHa, setShowHa] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getSiteReport(id);
      setReport(data);
    } catch {
      setReport(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleSignClick = (workerId: string, docType: string) => {
    const worker = report?.workers.find((w) => w.employee_id === workerId);
    navigate(`/sign/${report?.id}?worker_id=${workerId}&worker_name=${encodeURIComponent(worker?.employee_name || "")}&doc_type=${docType}`);
  };

  const handleViewSigned = (reportId: string, docType: string) => {
    navigate(`/signed/${reportId}/${docType}`);
  };

  const handleConfirm = async () => {
    if (!id || !report) return;
    setConfirming(true);
    try {
      const result = await api.confirmSiteReport(id);
      setReport({ ...report, status: result.report_status, signature_progress: result.signature_progress });
    } catch (err: any) {
      alert(err.message || "Confirm failed");
    } finally {
      setConfirming(false);
    }
  };

  const isCrewLeadOrAdmin = user?.role === "admin" || user?.role === "crew_lead";
  const canConfirm =
    isCrewLeadOrAdmin &&
    report?.status === "draft" &&
    report?.fall_protection_plan &&
    report?.hazard_assessment &&
    report?.workers.length > 0;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-[2.5px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-dark-500">Report not found</p>
        <button onClick={() => navigate("/site-reports")} className="mt-3 text-primary-400 text-sm">Back to Reports</button>
      </div>
    );
  }

  const sp = report.signature_progress;

  return (
    <div className="px-4 py-6 space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/site-reports")} className="p-2 rounded-lg bg-dark-800/50 border border-dark-600/30 text-dark-400 cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">{report.work_address}</h1>
          <div className="flex items-center gap-2 text-xs text-dark-500">
            <Calendar size={10} />
            <span>{report.work_date}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              report.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
              report.status === "needs_review" ? "bg-red-500/10 text-red-400" :
              report.status === "pending_signatures" ? "bg-amber-500/10 text-amber-400" :
              "bg-dark-500/10 text-dark-400"
            }`}>
              {STATUS_LABELS[report.status] || report.status}
            </span>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="glass-card p-4 space-y-2 text-xs">
        <h3 className="text-sm font-semibold text-white mb-2">Basic Information</h3>
        {report.crew_lead_id && (
          <InfoRow label="Crew Lead" value={report.workers.find((w) => w.is_crew_lead)?.employee_name || "-"} />
        )}
        <InfoRow label="Employer" value={report.employer} />
        <InfoRow label="Installation Qty" value={String(report.installation_quantity)} />
        {report.site_contact && <InfoRow label="Site Contact" value={report.site_contact} />}
        {report.firefly_contact && <InfoRow label="Firefly Contact" value={report.firefly_contact} />}
        {report.summary && <InfoRow label="Summary" value={report.summary} />}
      </div>

      {/* Workers */}
      {report.workers.length > 0 && (
        <div className="glass-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white">Crew ({report.workers.length})</h3>
          <div className="flex flex-wrap gap-1.5">
            {report.workers.map((w) => (
              <span
                key={w.employee_id}
                className={`text-xs px-2 py-1 rounded-lg ${
                  w.is_crew_lead
                    ? "bg-primary-600/15 text-primary-300 border border-primary-500/20"
                    : "bg-dark-800/50 text-dark-300 border border-dark-600/20"
                }`}
              >
                {w.employee_name}
                {w.is_crew_lead && " (Lead)"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Video */}
      <div className="glass-card p-4 space-y-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Video size={14} className="text-dark-500" />
          Site Video
        </h3>
        {report.videos.length > 0 ? (
          <div className="space-y-2">
            {report.videos.map((v) => (
              <video
                key={v.id}
                src={api.getSiteVideoUrl(report.id, v.id)}
                controls
                className="w-full rounded-lg bg-dark-900"
                style={{ maxHeight: 200 }}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-dark-500">No video recorded</p>
        )}
      </div>

      {/* Audio */}
      <div className="glass-card p-4 space-y-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Mic size={14} className="text-dark-500" />
          Audio Notes
        </h3>
        {report.audio_files.length > 0 ? (
          <div className="space-y-2">
            {report.audio_files.map((a) => (
              <audio
                key={a.id}
                src={api.getSiteAudioUrl(report.id, a.id)}
                controls
                className="w-full"
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-dark-500">No audio notes</p>
        )}
      </div>

      {/* Fall Protection Plan */}
      {report.fall_protection_plan && (
        <div className="glass-card p-4 space-y-2">
          <button
            onClick={() => setShowFpp(!showFpp)}
            className="w-full flex items-center justify-between text-sm font-semibold text-white cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Shield size={14} className="text-primary-400" />
              Fall Protection Plan
            </span>
            {showFpp ? <ChevronUp size={16} className="text-dark-500" /> : <ChevronDown size={16} className="text-dark-500" />}
          </button>
          {showFpp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 text-xs"
            >
              <InfoRow label="Employer" value={report.fall_protection_plan.employer_name} />
              {report.fall_protection_plan.fall_hazards && <InfoRow label="Fall Hazards" value={report.fall_protection_plan.fall_hazards} />}
              {report.fall_protection_plan.fall_protection_system && <InfoRow label="Protection System" value={report.fall_protection_plan.fall_protection_system} />}
              {report.fall_protection_plan.anchor_type && <InfoRow label="Anchor Type" value={report.fall_protection_plan.anchor_type} />}
              {report.fall_protection_plan.anchor_count != null && <InfoRow label="Anchor Count" value={String(report.fall_protection_plan.anchor_count)} />}
              {report.fall_protection_plan.system_procedures && <InfoRow label="Procedures" value={report.fall_protection_plan.system_procedures} />}
              {report.fall_protection_plan.clearance_f_total != null && (
                <InfoRow label="Clearance Required" value={`${report.fall_protection_plan.clearance_f_total} ft`} />
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Hazard Assessment */}
      {report.hazard_assessment && (
        <div className="glass-card p-4 space-y-2">
          <button
            onClick={() => setShowHa(!showHa)}
            className="w-full flex items-center justify-between text-sm font-semibold text-white cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              Hazard Assessment
            </span>
            {showHa ? <ChevronUp size={16} className="text-dark-500" /> : <ChevronDown size={16} className="text-dark-500" />}
          </button>
          {showHa && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-xs"
            >
              <div className="mb-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  report.hazard_assessment.all_hazards_reviewed
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}>
                  {report.hazard_assessment.all_hazards_reviewed ? "All Hazards Reviewed" : "Review Incomplete"}
                </span>
              </div>
              {report.hazard_assessment.hazard_items && (report.hazard_assessment.hazard_items as any[]).length > 0 && (
                <div className="space-y-1.5">
                  {(report.hazard_assessment.hazard_items as any[]).map((item: any, i: number) => (
                    <div key={i} className="bg-dark-800/30 rounded-lg p-2">
                      <span className="text-dark-200">{item.hazard || item.name || `Hazard #${i + 1}`}</span>
                      {item.controls && <p className="text-dark-500 mt-0.5">{item.controls}</p>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Signature Matrix */}
      {sp && sp.matrix.length > 0 && (
        <div className="glass-card p-4">
          <SignatureMatrix
            matrix={sp.matrix}
            totalRequired={sp.total_required}
            completed={sp.completed}
            onSignClick={handleSignClick}
            onViewSigned={handleViewSigned}
          />
        </div>
      )}

      {/* Confirm & Send to Workers (DRAFT → ready for workers) */}
      {canConfirm && (
        <div className="space-y-3">
          <div className="glass-card p-4 border border-primary-500/30 bg-primary-500/5">
            <div className="flex items-start gap-3">
              <Send size={20} className="text-primary-400 mt-0.5" />
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-bold text-white">Ready to Send?</h3>
                <p className="text-xs text-dark-400">
                  Both FPP and Hazard Assessment are filled. {report.workers.length} worker(s) assigned.
                  Confirm to send the documents for signing.
                </p>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="btn-primary w-full py-3 text-sm font-semibold mt-3 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {confirming ? (
                <><Clock size={16} className="animate-spin" /> Sending...</>
              ) : (
                <><Send size={16} /> Confirm & Send to Workers</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Action: Open signing panel for non-draft status */}
      {!canConfirm && report.status !== "completed" && report.status !== "draft" && (
        <button
          onClick={() => navigate(`/sign/${report.id}?mode=matrix`)}
          className="btn-primary w-full py-3 text-sm font-semibold"
        >
          Open Signing Panel
        </button>
      )}

      {/* Post-Work Section */}
      {report.status === "completed" && isCrewLeadOrAdmin && (
        <PostWorkSection report={report} onUpdate={load} />
      )}

      {/* Draft but missing requirements */}
      {report.status === "draft" && !canConfirm && isCrewLeadOrAdmin && (
        <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5 text-center">
          <p className="text-xs text-amber-400 font-semibold">Cannot send yet</p>
          <p className="text-xs text-dark-500 mt-1">
            {!report.fall_protection_plan && "• Fill in Fall Protection Plan\n"}
            {!report.hazard_assessment && "• Fill in Hazard Assessment\n"}
            {report.workers.length === 0 && "• Assign at least one worker\n"}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-dark-500">{label}</span>
      <span className="text-dark-200 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function PostWorkSection({ report, onUpdate }: { report: SiteReportDetailType; onUpdate: () => void }) {
  const [milestoneType, setMilestoneType] = useState("");
  const [estTime, setEstTime] = useState("");
  const [actTime, setActTime] = useState("");
  const [asExpected, setAsExpected] = useState(true);
  const [delayReason, setDelayReason] = useState("");
  const [saving, setSaving] = useState(false);

  const addMilestone = async () => {
    if (!milestoneType || !estTime || !actTime) return;
    setSaving(true);
    try {
      await api.createMilestone(report.id, {
        milestone_type: milestoneType,
        estimated_completion_time: estTime + ":00",
        actual_completion_time: actTime + ":00",
        completed_as_expected: asExpected,
        delay_reason: asExpected ? null : delayReason,
        delay_other_reason: null,
      });
      setMilestoneType("");
      setEstTime("");
      setActTime("");
      setDelayReason("");
      onUpdate();
    } catch (e: any) {
      alert("Failed to add milestone: " + e.message);
    }
    setSaving(false);
  };

  const deleteMilestone = async (id: string) => {
    if (!confirm("Delete milestone?")) return;
    try {
      await api.deleteMilestone(report.id, id);
      onUpdate();
    } catch {}
  };

  return (
    <div className="space-y-4 pt-4 border-t border-dark-700/50">
      <h2 className="text-sm font-bold text-white">Post-Work Documentation</h2>
      <p className="text-xs text-dark-400">Record your milestones and final voice summary.</p>

      {/* Milestones List */}
      <div className="space-y-2">
        {report.milestones?.map((m) => (
          <div key={m.id} className="glass-card p-3 flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-white">{m.milestone_type}</span>
              <div className="text-xs text-dark-400">Est: {m.estimated_completion_time.slice(0, 5)} | Act: {m.actual_completion_time.slice(0, 5)}</div>
              {!m.completed_as_expected && <div className="text-[10px] text-red-400">Delayed: {m.delay_reason}</div>}
            </div>
            <button onClick={() => deleteMilestone(m.id)} className="text-red-400/50 hover:text-red-400">×</button>
          </div>
        ))}
      </div>

      {/* Add Milestone */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-white">Add Milestone</h3>
        <input type="text" placeholder="e.g. Rough-in, Panel Setup" value={milestoneType} onChange={(e) => setMilestoneType(e.target.value)} className="input-field w-full text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-dark-500 mb-1 block">Est. Time</label>
            <input type="time" value={estTime} onChange={(e) => setEstTime(e.target.value)} className="input-field w-full text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-dark-500 mb-1 block">Actual Time</label>
            <input type="time" value={actTime} onChange={(e) => setActTime(e.target.value)} className="input-field w-full text-sm" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input type="checkbox" checked={asExpected} onChange={(e) => setAsExpected(e.target.checked)} className="w-4 h-4 rounded border-dark-600 bg-dark-800 accent-primary-500" />
          <span className="text-xs text-dark-300">Completed as expected</span>
        </label>
        {!asExpected && (
          <input type="text" placeholder="Reason for delay" value={delayReason} onChange={(e) => setDelayReason(e.target.value)} className="input-field w-full text-sm mt-2" />
        )}
        <button onClick={addMilestone} disabled={saving || !milestoneType || !estTime || !actTime} className="w-full btn-primary py-2 text-xs">
          Add Milestone
        </button>
      </div>

      {/* Voice Recording */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-white">Voice Summary</h3>
        <VoiceRecorder fieldId="summary" siteReportId={report.id} onComplete={onUpdate} />
      </div>
    </div>
  );
}
