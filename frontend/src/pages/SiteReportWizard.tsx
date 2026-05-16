import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Video, Mic, Send, FileText, Users,
  Shield, AlertTriangle, ClipboardCheck, ChevronRight, Plus, Trash2
} from "lucide-react";
import { api, FallProtectionPlanData, HazardAssessmentData, SignatureProgress, SignatureMatrixRow } from "../services/api";
import { EmployeeSelector } from "../components/EmployeeSelector";
import { PageHeader } from "../components/PageHeader";

interface SelectedWorker {
  employee_id: string;
  employee_name: string;
  is_crew_lead: boolean;
}

interface HazardItem {
  hazard: string;
  controls: string;
}

const DEFAULT_FPP: FallProtectionPlanData = {
  employer_name: "FIREFLY SOLAR",
  fall_hazards: null,
  fall_protection_system: null,
  anchor_type: null,
  anchor_count: null,
  system_procedures: null,
  rescue_self: false,
  rescue_assisted_roof: false,
  rescue_ladder: false,
  rescue_awp: false,
  rescue_fire_dept: false,
  clearance_a: null,
  clearance_b: null,
  clearance_c: null,
  clearance_d: null,
  clearance_e: null,
  clearance_f_total: null,
};

const STEPS = [
  { title: "Site Video", icon: Video, subtitle: "Record site video" },
  { title: "Basic Info", icon: FileText, subtitle: "Site details" },
  { title: "Crew", icon: Users, subtitle: "Select workers" },
  { title: "FPP", icon: Shield, subtitle: "Fall Protection Plan" },
  { title: "HA", icon: AlertTriangle, subtitle: "Hazard Assessment" },
  { title: "Safety Sign-off", icon: ClipboardCheck, subtitle: "Send to workers" },
];

export function SiteReportWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 0: Video
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Step 1: Basic Info
  const [reportId, setReportId] = useState<string | null>(null);
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [workAddress, setWorkAddress] = useState("");
  const [employer, setEmployer] = useState("FIREFLY SOLAR");
  const [installQty, setInstallQty] = useState(0);

  // Step 2: Crew
  const [workers, setWorkers] = useState<SelectedWorker[]>([]);
  const [crewLeadId, setCrewLeadId] = useState<string | null>(null);

  // Step 3: FPP
  const [fpp, setFpp] = useState<FallProtectionPlanData>({ ...DEFAULT_FPP });

  // Step 4: HA
  const [allReviewed, setAllReviewed] = useState(false);
  const [hazards, setHazards] = useState<HazardItem[]>([{ hazard: "", controls: "" }]);

  // Step 5: Review
  const [sigProgress, setSigProgress] = useState<SignatureProgress | null>(null);
  const [saving, setSaving] = useState(false);

  const nextStep = async () => {
    // Save data based on current step before moving forward
    if (step === 1) {
      // Create site report
      if (!workAddress.trim()) return;
      setSaving(true);
      try {
        const crewLead = workers.find((w) => w.is_crew_lead);
        const report = await api.createSiteReport({
          work_date: workDate,
          work_address: workAddress.trim(),
          employer: employer.trim(),
          installation_quantity: installQty,
          workers: workers.map((w) => ({
            employee_id: w.employee_id,
            employee_name: w.employee_name,
            is_crew_lead: w.is_crew_lead,
          })),
        });
        setReportId(report.id);

        if (videoFile) {
          try { await api.uploadSiteVideo(report.id, videoFile); } catch { /* non-critical */ }
        }
      } catch (err) {
        alert("Failed to create report");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (step === 2 && reportId && workers.length > 0) {
      setSaving(true);
      try {
        await api.updateSiteReportWorkers(
          reportId,
          workers.map((w) => w.employee_id),
          crewLeadId || ""
        );
      } catch {
        alert("Failed to save worker assignments");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (step === 3 && reportId) {
      setSaving(true);
      try {
        await api.saveFPP(reportId, fpp);
      } catch { /* non-critical */ }
      setSaving(false);
    }

    if (step === 4 && reportId) {
      setSaving(true);
      try {
        const cleanedHazards = hazards.filter((h) => h.hazard.trim());
        await api.saveHA(reportId, {
          all_hazards_reviewed: allReviewed,
          hazard_items: cleanedHazards.length > 0 ? cleanedHazards : null,
        });
        // Load signing progress to show worker status
        const progress = await api.getSignatureProgress(reportId);
        setSigProgress(progress);
      } catch { /* non-critical */ }
      setSaving(false);
    }

    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const canNext = () => {
    if (step === 1) return workAddress.trim().length > 0;
    if (step === 2) return workers.length > 0 && crewLeadId !== null;
    return true; // all other steps are optional
  };

  return (
    <div className="px-4 py-6 space-y-5 w-full">
      <PageHeader title="New Site Report" subtitle="Complete safety report package" />

      {/* Step Indicators */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={s.title}
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all flex-shrink-0 ${
                isActive
                  ? "bg-primary-600/15 text-primary-300 border border-primary-500/20"
                  : isDone
                  ? "bg-emerald-500/8 text-emerald-400 border border-emerald-500/15 cursor-pointer"
                  : "bg-dark-800/30 text-dark-500 border border-dark-600/10"
              }`}
            >
              {isDone ? <Check size={10} /> : <s.icon size={10} />}
              {s.title}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -40 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {step === 0 && <StepMedia videoFile={videoFile} setVideoFile={setVideoFile} />}
          {step === 1 && <StepBasicInfo workDate={workDate} setWorkDate={setWorkDate} workAddress={workAddress} setWorkAddress={setWorkAddress} employer={employer} setEmployer={setEmployer} installQty={installQty} setInstallQty={setInstallQty} />}
          {step === 2 && <StepCrew workers={workers} onChange={(w, leadId) => { setWorkers(w); setCrewLeadId(leadId); }} />}
          {step === 3 && <StepFPP fpp={fpp} setFpp={setFpp} />}
          {step === 4 && <StepHA hazards={hazards} setHazards={setHazards} allReviewed={allReviewed} setAllReviewed={setAllReviewed} />}
          {step === 5 && <StepReview reportId={reportId} sigProgress={sigProgress} fpp={fpp} hazards={hazards} workAddress={workAddress} workDate={workDate} workers={workers} />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <button onClick={prevStep} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-dark-800/50 border border-dark-600/30 rounded-xl text-dark-300 text-sm font-semibold active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50">
            <ArrowLeft size={15} />
            Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button
            onClick={nextStep}
            disabled={saving || !canNext()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600/15 border border-primary-500/25 rounded-xl text-primary-300 text-sm font-semibold active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40"
          >
            {saving ? "Saving..." : "Next"}
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function StepMedia({
  videoFile, setVideoFile,
}: {
  videoFile: File | null;
  setVideoFile: (f: File | null) => void;
}) {
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);



  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
    }
  };



  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-white">Site Video (Optional)</h2>
      <p className="text-xs text-dark-500">Record a brief site video. You can skip this step.</p>

      {/* Video */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
          <Video size={13} className="text-primary-400" />
          Site Video
        </h3>
        {videoPreviewUrl ? (
          <div className="space-y-2">
            <video src={videoPreviewUrl} controls className="w-full rounded-lg bg-dark-900" style={{ maxHeight: 200 }} />
            <button
              onClick={() => { setVideoFile(null); setVideoPreviewUrl(null); }}
              className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600/30 rounded-lg text-dark-400 text-xs active:scale-95 transition-all cursor-pointer"
            >
              Re-shoot
            </button>
          </div>
        ) : (
          <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-800/50 border border-dark-600/30 rounded-xl text-dark-300 text-sm active:scale-95 transition-all cursor-pointer">
            <Video size={14} />
            Select Video
            <input type="file" accept="video/*" onChange={handleVideoFile} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Basic Info ────────────────────────────────────

function StepBasicInfo({
  workDate, setWorkDate, workAddress, setWorkAddress, employer, setEmployer,
  installQty, setInstallQty,
}: {
  workDate: string; setWorkDate: (v: string) => void;
  workAddress: string; setWorkAddress: (v: string) => void;
  employer: string; setEmployer: (v: string) => void;
  installQty: number; setInstallQty: (v: number) => void;
}) {
  return (
    <div className="glass-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-white">Basic Information</h2>

      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">Work Date *</label>
        <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} className="input-field w-full text-sm" />
      </div>

      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">Work Address *</label>
        <input type="text" value={workAddress} onChange={(e) => setWorkAddress(e.target.value)} placeholder="e.g. 123 Main St, Calgary" className="input-field w-full text-sm" />
      </div>

      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">Employer</label>
        <input type="text" value={employer} onChange={(e) => setEmployer(e.target.value)} className="input-field w-full text-sm" />
      </div>

      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">Installation Quantity</label>
        <input type="number" value={installQty} onChange={(e) => setInstallQty(Number(e.target.value))} min={0} className="input-field w-full text-sm" />
      </div>

    </div>
  );
}

// ─── Step 2: Crew ──────────────────────────────────────────

function StepCrew({
  workers, onChange,
}: {
  workers: SelectedWorker[];
  onChange: (workers: SelectedWorker[], crewLeadId: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-white">Select Crew</h2>
      <p className="text-xs text-dark-500">Select workers and assign a crew lead. Fall Protection cert status is shown for each worker.</p>
      <EmployeeSelector selected={workers} onChange={onChange} />
    </div>
  );
}

// ─── Step 3: Fall Protection Plan ──────────────────────────

function StepFPP({
  fpp, setFpp,
}: {
  fpp: FallProtectionPlanData;
  setFpp: React.Dispatch<React.SetStateAction<FallProtectionPlanData>>;
}) {
  const update = (field: keyof FallProtectionPlanData, value: any) => {
    setFpp((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-white">Fall Protection Plan</h2>

      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">Employer Name</label>
        <input type="text" value={fpp.employer_name} onChange={(e) => update("employer_name", e.target.value)} className="input-field w-full text-sm" />
      </div>

      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">Fall Hazards</label>
        <textarea value={fpp.fall_hazards || ""} onChange={(e) => update("fall_hazards", e.target.value || null)} placeholder="Describe fall hazards on site" className="input-field w-full text-sm min-h-[64px] resize-none" />
      </div>

      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">Fall Protection System</label>
        <textarea value={fpp.fall_protection_system || ""} onChange={(e) => update("fall_protection_system", e.target.value || null)} placeholder="Describe the fall protection system in use" className="input-field w-full text-sm min-h-[64px] resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-dark-500 mb-1 block">Anchor Type</label>
          <select value={fpp.anchor_type || ""} onChange={(e) => update("anchor_type", e.target.value || null)} className="input-field w-full text-sm">
            <option value="">Select...</option>
            <option value="Permanent">Permanent Anchors</option>
            <option value="Reusable">Reusable Anchors</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-dark-500 mb-1 block">Anchor Count</label>
          <input type="number" value={fpp.anchor_count ?? ""} onChange={(e) => update("anchor_count", e.target.value ? Number(e.target.value) : null)} min={0} className="input-field w-full text-sm" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">System Procedures</label>
        <textarea value={fpp.system_procedures || ""} onChange={(e) => update("system_procedures", e.target.value || null)} placeholder="Describe system procedures" className="input-field w-full text-sm min-h-[48px] resize-none" />
      </div>

      {/* Rescue Options */}
      <div>
        <label className="text-[10px] text-dark-500 mb-2 block">Rescue Options</label>
        <div className="space-y-1.5">
          {[
            { key: "rescue_self", label: "Self Rescue" },
            { key: "rescue_assisted_roof", label: "Assisted Roof Rescue" },
            { key: "rescue_ladder", label: "Ladder Rescue" },
            { key: "rescue_awp", label: "AWP Rescue" },
            { key: "rescue_fire_dept", label: "Fire Department" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(fpp as any)[opt.key] || false}
                onChange={(e) => update(opt.key as keyof FallProtectionPlanData, e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 accent-primary-500"
              />
              <span className="text-xs text-dark-300">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clearance */}
      <div>
        <label className="text-[10px] text-dark-500 mb-2 block">Clearance Requirements (ft)</label>
        <div className="grid grid-cols-3 gap-2">
          {(["a", "b", "c", "d", "e"] as const).map((key) => (
            <div key={key}>
              <label className="text-[10px] text-dark-500 mb-0.5 block">{key.toUpperCase()}</label>
              <input
                type="number"
                value={(fpp as any)[`clearance_${key}`] ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setFpp((prev) => {
                    const next = { ...prev, [`clearance_${key}`]: val } as any;
                    // Auto-calculate F(total) = a + b + c + d + e
                    const sum = (next.clearance_a || 0) + (next.clearance_b || 0) + (next.clearance_c || 0) + (next.clearance_d || 0) + (next.clearance_e || 0);
                    next.clearance_f_total = sum > 0 ? sum : null;
                    return next;
                  });
                }}
                step="0.1"
                min={0}
                className="input-field w-full text-sm"
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-dark-500 mb-0.5 block">F (Total)</label>
            <input
              type="number"
              value={(() => {
                const a = fpp.clearance_a || 0;
                const b = fpp.clearance_b || 0;
                const c = fpp.clearance_c || 0;
                const d = fpp.clearance_d || 0;
                const e = fpp.clearance_e || 0;
                const sum = a + b + c + d + e;
                return sum > 0 ? sum : "";
              })()}
              readOnly
              tabIndex={-1}
              className="input-field w-full text-sm bg-dark-900/50 text-dark-400 cursor-default"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Hazard Assessment ─────────────────────────────

function StepHA({
  hazards, setHazards, allReviewed, setAllReviewed,
}: {
  hazards: HazardItem[];
  setHazards: React.Dispatch<React.SetStateAction<HazardItem[]>>;
  allReviewed: boolean;
  setAllReviewed: (v: boolean) => void;
}) {
  const addHazard = () => {
    setHazards((prev) => [...prev, { hazard: "", controls: "" }]);
  };

  const removeHazard = (index: number) => {
    setHazards((prev) => prev.filter((_, i) => i !== index));
  };

  const updateHazard = (index: number, field: keyof HazardItem, value: string) => {
    setHazards((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-white">Hazard Assessment</h2>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allReviewed}
          onChange={(e) => setAllReviewed(e.target.checked)}
          className="w-4 h-4 rounded border-dark-600 bg-dark-800 accent-primary-500"
        />
        <span className="text-xs text-dark-300">All hazards have been reviewed and controls are in place</span>
      </label>

      <div className="space-y-2">
        {hazards.map((h, i) => (
          <div key={i} className="bg-dark-800/30 rounded-lg p-3 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-dark-500 font-medium">Hazard #{i + 1}</span>
              {hazards.length > 1 && (
                <button onClick={() => removeHazard(i)} className="p-0.5 text-red-400/60 active:scale-90 transition-all cursor-pointer">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <input
              type="text"
              value={h.hazard}
              onChange={(e) => updateHazard(i, "hazard", e.target.value)}
              placeholder="Describe the hazard"
              className="input-field w-full text-sm"
            />
            <input
              type="text"
              value={h.controls}
              onChange={(e) => updateHazard(i, "controls", e.target.value)}
              placeholder="Controls / mitigation"
              className="input-field w-full text-sm"
            />
          </div>
        ))}
      </div>

      <button
        onClick={addHazard}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-dark-800/50 border border-dark-600/30 rounded-lg text-dark-400 text-xs active:scale-95 transition-all cursor-pointer"
      >
        <Plus size={12} />
        Add Hazard
      </button>
    </div>
  );
}

// ─── Step 5: Pre-Work Safety Sign-off ────────────────────

function StepReview({
  reportId, sigProgress, fpp, hazards, workAddress, workDate, workers,
}: {
  reportId: string | null;
  sigProgress: SignatureProgress | null;
  fpp: FallProtectionPlanData;
  hazards: HazardItem[];
  workAddress: string;
  workDate: string;
  workers: SelectedWorker[];
}) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [localProgress, setLocalProgress] = useState<SignatureProgress | null>(sigProgress);

  // Refresh signature progress
  const refreshProgress = async () => {
    if (!reportId) return;
    try {
      const progress = await api.getSignatureProgress(reportId);
      setLocalProgress(progress);
    } catch {}
  };

  // Poll for updates after confirming
  useEffect(() => {
    if (!confirmed || !reportId) return;
    const interval = setInterval(refreshProgress, 5000);
    return () => clearInterval(interval);
  }, [confirmed, reportId]);

  const handleConfirm = async () => {
    if (!reportId) return;
    setConfirming(true);
    try {
      const result = await api.confirmSiteReport(reportId);
      setLocalProgress(result.signature_progress);
      setConfirmed(true);
    } catch (err: any) {
      alert(err.message || "Failed to send. Make sure FPP and HA are filled and workers are assigned.");
    }
    setConfirming(false);
  };

  const progress = localProgress || sigProgress;
  const allSigned = progress && progress.completed >= progress.total_required && progress.total_required > 0;

  // Already confirmed & sent, show live signing progress
  if (confirmed && progress) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
        <div className="glass-card p-5 space-y-4">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Sent to Workers</h2>
            <p className="text-xs text-dark-400">
              FPP and Hazard Assessment have been sent. Workers can now sign from their dashboard.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-dark-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: progress.total_required > 0 ? `${(progress.completed / progress.total_required) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-xs text-dark-400 font-medium tabular-nums">
              {progress.completed}/{progress.total_required}
            </span>
          </div>

          {/* Worker Status */}
          <WorkerStatusTable matrix={progress.matrix} />
        </div>
      </motion.div>
    );
  }

  // Not yet confirmed — show worker list + send button
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">Pre-Work Safety Sign-off</h2>
        <p className="text-xs text-dark-500 mt-1">
          Fall Protection Plan and Hazard Assessment have been filled. Send them to the workers below for signature before work begins.
        </p>
      </div>

      {/* Summary */}
      <div className="glass-card p-4 space-y-1.5 text-xs">
        <div className="flex justify-between"><span className="text-dark-500">Date</span><span className="text-dark-200">{workDate}</span></div>
        <div className="flex justify-between"><span className="text-dark-500">Address</span><span className="text-dark-200 truncate max-w-[70%]">{workAddress}</span></div>
        <div className="flex justify-between"><span className="text-dark-500">Employer</span><span className="text-dark-200">{fpp.employer_name}</span></div>
        <div className="flex justify-between"><span className="text-dark-500">Workers</span><span className="text-dark-200">{workers.length}</span></div>
      </div>

      {/* ─── Send Button (ABOVE Worker Status) ─── */}
      <button
        onClick={handleConfirm}
        disabled={confirming || !reportId || workers.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary-600/15 border border-primary-500/25 rounded-xl text-primary-300 text-sm font-semibold active:scale-[0.97] transition-all cursor-pointer disabled:opacity-40 hover:bg-primary-600/20"
      >
        {confirming ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-400/20 border-t-primary-400 rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send size={15} />
            Send FPP & HA to Workers for Signature
          </>
        )}
      </button>

      {/* ─── Worker Status (BELOW Send Button) ─── */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-dark-400 flex items-center gap-2">
          <Users size={13} />
          Worker Status
        </h3>

        {workers.length === 0 ? (
          <p className="text-xs text-dark-500 text-center py-4">No workers assigned. Go back to the Crew step.</p>
        ) : progress && progress.matrix.length > 0 ? (
          <WorkerStatusTable matrix={progress.matrix} />
        ) : (
          /* Fallback: show workers from selection before signature data exists */
          <div className="space-y-1.5">
            {workers.map((w) => (
              <div key={w.employee_id} className="flex items-center gap-2 py-1.5 text-xs">
                <span className="flex-1 text-left text-dark-200">{w.employee_name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800/50 text-dark-500 border border-dark-600/20">
                  FPP —
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800/50 text-dark-500 border border-dark-600/20">
                  HA —
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkerStatusTable({ matrix }: { matrix: SignatureMatrixRow[] }) {
  return (
    <div className="space-y-1.5">
      {matrix.map((row) => {
        const fppSigned = row.fall_protection_plan?.status === "signed";
        const haSigned = row.hazard_assessment?.status === "signed";
        return (
          <div key={row.worker_id} className="flex items-center gap-2 py-2 text-xs">
            <div className="flex-1 min-w-0">
              <span className="text-dark-200 truncate block">{row.worker_name}</span>
              {row.is_crew_lead && (
                <span className="text-[10px] text-amber-400 font-medium">Crew Lead</span>
              )}
            </div>
            <span className={`text-[10px] px-2 py-1 rounded font-medium ${
              fppSigned
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}>
              FPP {fppSigned ? "Signed" : "Pending"}
            </span>
            <span className={`text-[10px] px-2 py-1 rounded font-medium ${
              haSigned
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}>
              HA {haSigned ? "Signed" : "Pending"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
