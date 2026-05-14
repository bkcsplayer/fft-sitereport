import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  User,
  Layers,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Send,
  Video,
  Mic,
  ChevronDown,
} from "lucide-react";
import { VoiceRecorder } from "../components/VoiceRecorder";
import { VideoRecorder } from "../components/VideoRecorder";
import { PageHeader } from "../components/PageHeader";
import { api, DropdownOption } from "../services/api";
import { useI18n } from "../i18n";

interface AttendanceEntry {
  employee_name: string;
  arrival_time: string;
  departure_time: string;
}

interface MilestoneEntry {
  milestone_type: string;
  estimated_completion_time: string;
  actual_completion_time: string;
  completed_as_expected: boolean | null;
  delay_reason: string;
  delay_other_reason: string;
}

export function ReportForm() {
  const { t, lang } = useI18n();

  const DELAY_REASONS = [
    { key: "reason.weather" as const, value: "天气" },
    { key: "reason.material" as const, value: "材料短缺" },
    { key: "reason.design" as const, value: "设计问题" },
    { key: "reason.customer" as const, value: "客户原因" },
    { key: "reason.staff" as const, value: "人员不足" },
    { key: "reason.equipment" as const, value: "设备问题" },
    { key: "reason.other" as const, value: "其他" },
  ];

  const [leaders, setLeaders] = useState<DropdownOption[]>([]);
  const [employees, setEmployees] = useState<DropdownOption[]>([]);

  const [workDate, setWorkDate] = useState(new Date().toISOString().split("T")[0]);
  const [workAddress, setWorkAddress] = useState("");
  const [crewLeader, setCrewLeader] = useState("");
  const [panelsInstalled, setPanelsInstalled] = useState(0);

  const [planCompleted, setPlanCompleted] = useState<boolean | null>(null);
  const [incompleteReason, setIncompleteReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const [attendance, setAttendance] = useState<AttendanceEntry[]>([
    { employee_name: "", arrival_time: "08:00", departure_time: "17:00" },
  ]);

  const [milestones, setMilestones] = useState<MilestoneEntry[]>([
    {
      milestone_type: "rough_in",
      estimated_completion_time: "",
      actual_completion_time: "",
      completed_as_expected: null,
      delay_reason: "",
      delay_other_reason: "",
    },
    {
      milestone_type: "final_installation",
      estimated_completion_time: "",
      actual_completion_time: "",
      completed_as_expected: null,
      delay_reason: "",
      delay_other_reason: "",
    },
  ]);

  const [voiceNote, setVoiceNote] = useState("");
  const [voiceRecordingIds, setVoiceRecordingIds] = useState<string[]>([]);
  const [videoNasPath, setVideoNasPath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.getOptions("crew_leader_list").then(setLeaders);
    api.getOptions("employee_list").then(setEmployees);
  }, []);

  const addAttendance = () => {
    setAttendance([...attendance, { employee_name: "", arrival_time: "08:00", departure_time: "17:00" }]);
  };

  const removeAttendance = (i: number) => {
    setAttendance(attendance.filter((_, idx) => idx !== i));
  };

  const updateAttendance = (i: number, field: keyof AttendanceEntry, value: string) => {
    const updated = [...attendance];
    updated[i] = { ...updated[i], [field]: value };
    setAttendance(updated);
  };

  const updateMilestone = (i: number, field: keyof MilestoneEntry, value: any) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], [field]: value };
    setMilestones(updated);
  };

  const handleSubmit = async () => {
    if (!workAddress || !crewLeader) {
      alert(t("submit.requiredAlert"));
      return;
    }
    setSubmitting(true);

    const payload = {
      work_date: workDate,
      work_address: workAddress,
      crew_leader_name: crewLeader,
      panels_installed_today: panelsInstalled,
      daily_plan_completed: planCompleted,
      daily_plan_incomplete_reason: planCompleted === false ? incompleteReason : null,
      daily_plan_incomplete_other_reason: incompleteReason === "其他" ? otherReason : null,
      attendance_records: attendance
        .filter((a) => a.employee_name)
        .map((a) => ({
          employee_name: a.employee_name,
          arrival_time: a.arrival_time + ":00",
          departure_time: a.departure_time + ":00",
        })),
      milestones: milestones
        .filter((m) => m.estimated_completion_time && m.actual_completion_time)
        .map((m) => ({
          milestone_type: m.milestone_type,
          estimated_completion_time: m.estimated_completion_time + ":00",
          actual_completion_time: m.actual_completion_time + ":00",
          completed_as_expected: m.completed_as_expected ?? true,
          delay_reason: m.completed_as_expected === false ? m.delay_reason : null,
          delay_other_reason: m.delay_reason === "其他" ? m.delay_other_reason : null,
        })),
      voice_recording_ids: voiceRecordingIds,
      video_nas_path: videoNasPath,
    };

    try {
      await api.createReport(payload);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      resetForm();
    } catch {
      alert(t("submit.failAlert"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setWorkAddress("");
    setCrewLeader("");
    setPanelsInstalled(0);
    setPlanCompleted(null);
    setIncompleteReason("");
    setOtherReason("");
    setAttendance([{ employee_name: "", arrival_time: "08:00", departure_time: "17:00" }]);
    setMilestones([
      { milestone_type: "rough_in", estimated_completion_time: "", actual_completion_time: "", completed_as_expected: null, delay_reason: "", delay_other_reason: "" },
      { milestone_type: "final_installation", estimated_completion_time: "", actual_completion_time: "", completed_as_expected: null, delay_reason: "", delay_other_reason: "" },
    ]);
    setVoiceNote("");
    setVoiceRecordingIds([]);
    setVideoNasPath(null);
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" },
    }),
  };

  return (
    <div className="px-4 py-6 space-y-5 w-full max-w-full overflow-hidden">
      <PageHeader title={t("report.title")} subtitle={t("report.subtitle")} />

      {/* Video Input Section */}
      <motion.section
        custom={0}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="glass-card p-4 space-y-3"
      >
        <h2 className="section-header">
          <div className="w-7 h-7 rounded-lg bg-primary-600/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Video size={15} className="text-primary-400" />
          </div>
          {t("video.title")}
        </h2>
        <VideoRecorder
          workAddress={workAddress}
          onVideoUploaded={(path) => setVideoNasPath(path)}
          onClear={() => setVideoNasPath(null)}
        />
      </motion.section>

      {/* Basic Info */}
      <motion.section
        custom={1}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="glass-card p-4 space-y-4"
      >
        <h2 className="section-header">
          <div className="w-7 h-7 rounded-lg bg-primary-600/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Calendar size={15} className="text-primary-400" />
          </div>
          {t("basic.title")}
        </h2>

        <div className="space-y-4 w-full min-w-0">
          <div className="w-full min-w-0">
            <label className="text-xs text-dark-500 mb-1.5 block font-medium">{t("basic.date")}</label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="w-full min-w-0">
            <label className="text-xs text-dark-500 mb-1.5 block font-medium">{t("basic.address")}</label>
            <input
              type="text"
              value={workAddress}
              onChange={(e) => setWorkAddress(e.target.value)}
              placeholder={t("basic.addressPlaceholder")}
              className="input-field w-full"
            />
          </div>

          <div className="w-full min-w-0">
            <label className="text-xs text-dark-500 mb-1.5 block font-medium">{t("basic.leader")}</label>
            {leaders.length > 0 ? (
              <div className="relative w-full">
                <select
                  value={crewLeader}
                  onChange={(e) => setCrewLeader(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">{t("basic.select")}</option>
                  {leaders.map((l) => (
                    <option key={l.id} value={l.value}>{l.value}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
              </div>
            ) : (
              <input
                type="text"
                value={crewLeader}
                onChange={(e) => setCrewLeader(e.target.value)}
                placeholder={t("basic.leaderPlaceholder")}
                className="input-field w-full"
              />
            )}
          </div>

          <div className="w-full min-w-0">
            <label className="text-xs text-dark-500 mb-1.5 block font-medium">{t("basic.panels")}</label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={panelsInstalled}
              onChange={(e) => setPanelsInstalled(parseInt(e.target.value) || 0)}
              className="input-field w-full"
            />
          </div>
        </div>
      </motion.section>

      {/* Daily Completion */}
      <motion.section
        custom={2}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="glass-card p-4 space-y-4"
      >
        <h2 className="section-header">
          <div className="w-7 h-7 rounded-lg bg-primary-600/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={15} className="text-primary-400" />
          </div>
          {t("plan.title")}
        </h2>

        <div className="flex gap-3">
          {[
            { val: true, label: "Yes" },
            { val: false, label: "No" },
          ].map((opt) => (
            <button
              key={String(opt.val)}
              onClick={() => setPlanCompleted(opt.val)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 active:scale-[0.97] cursor-pointer ${
                planCompleted === opt.val
                  ? "bg-primary-600/15 border-primary-500/35 text-primary-300 shadow-[0_0_12px_rgba(51,145,255,0.08)]"
                  : "bg-dark-800/40 border-dark-600/25 text-dark-400"
              }`}
              style={{ minHeight: 48 }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {planCompleted === false && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="relative w-full">
                <select
                  value={incompleteReason}
                  onChange={(e) => setIncompleteReason(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">{t("plan.selectReason")}</option>
                  {DELAY_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{t(r.key)}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
              </div>
              <AnimatePresence>
                {incompleteReason === "其他" && (
                  <motion.textarea
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder={t("plan.otherPlaceholder")}
                    className="input-field w-full min-h-[88px] resize-none"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Attendance */}
      <motion.section
        custom={3}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="glass-card p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="section-header">
            <div className="w-7 h-7 rounded-lg bg-primary-600/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
              <User size={15} className="text-primary-400" />
            </div>
            {t("attendance.title")}
          </h2>
          <button
            onClick={addAttendance}
            className="w-9 h-9 rounded-lg bg-primary-600/12 border border-primary-500/20 flex items-center justify-center text-primary-400 active:scale-90 transition-all duration-150 cursor-pointer flex-shrink-0"
            aria-label={t("attendance.add")}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-3 w-full min-w-0">
          <AnimatePresence>
            {attendance.map((att, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-dark-900/35 rounded-xl p-3.5 space-y-3 border border-dark-700/20 w-full min-w-0 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-dark-500 font-semibold uppercase tracking-wider">{t("attendance.employee")} #{i + 1}</span>
                  {attendance.length > 1 && (
                    <button
                      onClick={() => removeAttendance(i)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/70 active:scale-90 transition-all duration-150 cursor-pointer"
                      aria-label={t("attendance.remove")}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {employees.length > 0 ? (
                  <div className="relative w-full">
                    <select
                      value={att.employee_name}
                      onChange={(e) => updateAttendance(i, "employee_name", e.target.value)}
                      className="input-field w-full text-sm"
                    >
                      <option value="">{t("attendance.selectEmployee")}</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.value}>{emp.value}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={att.employee_name}
                    onChange={(e) => updateAttendance(i, "employee_name", e.target.value)}
                    placeholder={t("attendance.namePlaceholder")}
                    className="input-field w-full text-sm"
                  />
                )}

                <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                  <div className="min-w-0 overflow-hidden">
                    <label className="text-[11px] text-dark-600 mb-1 block font-medium">{t("attendance.arrival")}</label>
                    <input
                      type="time"
                      value={att.arrival_time}
                      onChange={(e) => updateAttendance(i, "arrival_time", e.target.value)}
                      className="input-field w-full text-sm"
                    />
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <label className="text-[11px] text-dark-600 mb-1 block font-medium">{t("attendance.departure")}</label>
                    <input
                      type="time"
                      value={att.departure_time}
                      onChange={(e) => updateAttendance(i, "departure_time", e.target.value)}
                      className="input-field w-full text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Milestones */}
      <motion.section
        custom={4}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="glass-card p-4 space-y-4"
      >
        <h2 className="section-header">
          <div className="w-7 h-7 rounded-lg bg-primary-600/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Layers size={15} className="text-primary-400" />
          </div>
          {t("milestone.title")}
        </h2>

        <div className="space-y-4 w-full min-w-0">
          {milestones.map((ms, i) => (
            <div key={ms.milestone_type} className="bg-dark-900/35 rounded-xl p-3.5 space-y-3.5 border border-dark-700/20 w-full min-w-0 overflow-hidden">
              <h3 className="text-sm font-semibold text-dark-200">
                {ms.milestone_type === "rough_in" ? t("milestone.roughIn") : t("milestone.finalInstall")}
              </h3>

              <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                <div className="min-w-0 overflow-hidden">
                  <label className="text-[11px] text-dark-600 mb-1 block font-medium">{t("milestone.estimated")}</label>
                  <input
                    type="time"
                    value={ms.estimated_completion_time}
                    onChange={(e) => updateMilestone(i, "estimated_completion_time", e.target.value)}
                    className="input-field w-full text-sm"
                  />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <label className="text-[11px] text-dark-600 mb-1 block font-medium">{t("milestone.actual")}</label>
                  <input
                    type="time"
                    value={ms.actual_completion_time}
                    onChange={(e) => updateMilestone(i, "actual_completion_time", e.target.value)}
                    className="input-field w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-dark-500 mb-2 block font-medium">{t("milestone.onSchedule")}</label>
                <div className="flex gap-2.5">
                  {[
                    { val: true, label: "Yes" },
                    { val: false, label: "No" },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      onClick={() => updateMilestone(i, "completed_as_expected", opt.val)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-[0.97] cursor-pointer ${
                        ms.completed_as_expected === opt.val
                          ? "bg-primary-600/15 border-primary-500/35 text-primary-300 shadow-[0_0_10px_rgba(51,145,255,0.06)]"
                          : "bg-dark-800/40 border-dark-600/25 text-dark-400"
                      }`}
                      style={{ minHeight: 44 }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {ms.completed_as_expected === false && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-2.5 overflow-hidden"
                  >
                    <div className="relative w-full">
                      <select
                        value={ms.delay_reason}
                        onChange={(e) => updateMilestone(i, "delay_reason", e.target.value)}
                        className="input-field w-full text-sm"
                      >
                        <option value="">{t("milestone.selectReason")}</option>
                        {DELAY_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>{t(r.key)}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                    </div>
                    <AnimatePresence>
                      {ms.delay_reason === "其他" && (
                        <motion.textarea
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          value={ms.delay_other_reason}
                          onChange={(e) => updateMilestone(i, "delay_other_reason", e.target.value)}
                          placeholder={t("milestone.otherPlaceholder")}
                          className="input-field w-full text-sm min-h-[72px] resize-none"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Voice Input Section */}
      <motion.section
        custom={5}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="glass-card p-4 space-y-3"
      >
        <h2 className="section-header">
          <div className="w-7 h-7 rounded-lg bg-primary-600/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Mic size={15} className="text-primary-400" />
          </div>
          {t("voice.title")}
        </h2>
        <VoiceRecorder
          fieldId="daily_summary"
          onTranscribed={(text, recId) => {
            setVoiceNote(text);
            setVoiceRecordingIds((ids) => [...ids, recId]);
          }}
        />
        <AnimatePresence>
          {voiceNote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-dark-900/50 rounded-xl p-3.5 text-sm text-dark-200 border border-dark-700/30 leading-relaxed break-words"
            >
              {voiceNote}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Submit */}
      <motion.div
        custom={6}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="pt-2 pb-4"
      >
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary w-full flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {submitting ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Clock size={18} />
              </motion.div>
              {t("submit.submitting")}
            </>
          ) : submitted ? (
            <>
              <CheckCircle2 size={18} />
              {t("submit.success")}
            </>
          ) : (
            <>
              <Send size={18} />
              {t("submit.button")}
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
