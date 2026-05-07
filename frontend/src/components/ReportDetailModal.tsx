import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, User, Layers, Calendar, Clock, Mic, ChevronDown } from "lucide-react";
import { api, ReportDetail, VoiceRecordingInfo } from "../services/api";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../i18n";

interface Props {
  reportId: string;
  onClose: () => void;
}

export function ReportDetailModal({ reportId, onClose }: Props) {
  const { t } = useI18n();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRecording, setExpandedRecording] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getReport(reportId)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [reportId]);

  const formatTime = (t: string) => {
    if (!t) return "-";
    return t.length === 8 ? t.slice(0, 5) : t;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-900 border border-dark-700/40 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Close handle */}
        <div className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur-md rounded-t-3xl sm:rounded-t-2xl border-b border-dark-700/30">
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-dark-600" />
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-base font-bold text-white">{t("detail.title")}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-dark-800/60 border border-dark-600/30 flex items-center justify-center text-dark-400 active:scale-90 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 pb-8">
          {loading ? (
            <div className="flex justify-center py-14">
              <div className="w-8 h-8 border-[2.5px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
            </div>
          ) : !report ? (
            <p className="text-center py-14 text-dark-500 text-sm">{t("admin.noReports")}</p>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-dark-500">
                  <Calendar size={13} className="text-dark-600" />
                  <span className="font-medium">{report.work_date}</span>
                </div>
                <StatusBadge status={report.status} />
              </div>

              {/* Basic Info */}
              <Section title={t("detail.basicInfo")}>
                <InfoRow icon={MapPin} label={t("detail.address")} value={report.work_address} />
                <InfoRow icon={User} label={t("detail.leader")} value={report.crew_leader_name} />
                <InfoRow icon={Layers} label={t("detail.panels")} value={String(report.panels_installed_today)} />
              </Section>

              {/* Plan Completion */}
              <Section title={t("detail.planCompletion")}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-dark-500">{report.daily_plan_completed === null ? "-" : report.daily_plan_completed ? t("detail.planYes") : t("detail.planNo")}</span>
                </div>
                {report.daily_plan_completed === false && report.daily_plan_incomplete_reason && (
                  <p className="text-xs text-dark-400 mt-1">
                    {t("detail.reason")}: {report.daily_plan_incomplete_reason}
                    {report.daily_plan_incomplete_other_reason && ` — ${report.daily_plan_incomplete_other_reason}`}
                  </p>
                )}
              </Section>

              {/* Attendance */}
              <Section title={t("detail.attendance")}>
                {report.attendance_records.length === 0 ? (
                  <EmptyText />
                ) : (
                  <div className="space-y-2">
                    {report.attendance_records.map((a) => (
                      <div key={a.id} className="bg-dark-800/40 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                        <span className="text-dark-200 font-medium">{a.employee_name}</span>
                        <span className="text-dark-500">
                          {formatTime(a.arrival_time)} — {formatTime(a.departure_time)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Milestones */}
              <Section title={t("detail.milestones")}>
                {report.milestones.length === 0 ? (
                  <EmptyText />
                ) : (
                  <div className="space-y-2">
                    {report.milestones.map((m) => (
                      <div key={m.id} className="bg-dark-800/40 rounded-lg px-3 py-2.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-dark-200 font-semibold">
                            {m.milestone_type === "rough_in" ? "Rough-in" : t("milestone.finalInstall")}
                          </span>
                          <span className={m.completed_as_expected ? "text-emerald-400" : "text-red-400"}>
                            {m.completed_as_expected ? t("detail.yes") : t("detail.no")}
                          </span>
                        </div>
                        <div className="flex gap-3 text-dark-500">
                          <span>{t("detail.estimated")}: {formatTime(m.estimated_completion_time)}</span>
                          <span>{t("detail.actual")}: {formatTime(m.actual_completion_time)}</span>
                        </div>
                        {!m.completed_as_expected && m.delay_reason && (
                          <p className="text-dark-400">{t("detail.reason")}: {m.delay_reason}{m.delay_other_reason ? ` — ${m.delay_other_reason}` : ""}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Voice Recordings */}
              <Section title={t("detail.voiceRecordings")}>
                {report.voice_recordings.length === 0 ? (
                  <p className="text-xs text-dark-600 py-3 text-center">{t("detail.noRecordings")}</p>
                ) : (
                  <div className="space-y-3">
                    {report.voice_recordings.map((rec) => (
                      <VoiceRecordingCard
                        key={rec.id}
                        recording={rec}
                        expanded={expandedRecording === rec.id}
                        onToggle={() => setExpandedRecording(expandedRecording === rec.id ? null : rec.id)}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-dark-800/40 rounded-lg px-3 py-2.5">
      <Icon size={14} className="text-dark-600 flex-shrink-0" />
      <span className="text-xs text-dark-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-dark-100 font-medium truncate ml-auto">{value}</span>
    </div>
  );
}

function EmptyText() {
  return <p className="text-xs text-dark-600 py-1">-</p>;
}

function VoiceRecordingCard({
  recording,
  expanded,
  onToggle,
  t,
}: {
  recording: VoiceRecordingInfo;
  expanded: boolean;
  onToggle: () => void;
  t: (key: any) => string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setAudioDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
  };

  const formatSeconds = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="bg-dark-800/40 rounded-xl border border-dark-700/25 overflow-hidden">
      {/* Audio player bar */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-primary-600/15 border border-primary-500/25 flex items-center justify-center flex-shrink-0 active:scale-90 transition-all cursor-pointer"
        >
          {playing ? (
            <div className="w-2.5 h-2.5 bg-primary-300 rounded-sm" />
          ) : (
            <div className="w-0 h-0 border-l-[10px] border-l-primary-300 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="h-1.5 bg-dark-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <span className="text-[11px] text-dark-500 tabular-nums min-w-[36px] text-right flex-shrink-0">
          {playing ? formatSeconds(currentTime) : formatSeconds(audioDuration)}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={api.getAudioUrl(recording.id)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Expand toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 pb-2.5 text-xs text-dark-500 hover:text-dark-300 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <Mic size={11} />
          {recording.transcript_raw ? "查看语音文字" : "暂无文字"}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Transcript content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5">
              {recording.transcript_raw && (
                <div>
                  <p className="text-[10px] text-dark-600 mb-1 font-semibold uppercase tracking-wider">{t("detail.rawText")}</p>
                  <p className="text-xs text-dark-400 leading-relaxed bg-dark-900/50 rounded-lg p-2.5">{recording.transcript_raw}</p>
                </div>
              )}
              {recording.transcript_processed && (
                <div>
                  <p className="text-[10px] text-dark-600 mb-1 font-semibold uppercase tracking-wider">{t("detail.processedText")}</p>
                  <p className="text-xs text-dark-200 leading-relaxed bg-dark-900/50 rounded-lg p-2.5">{recording.transcript_processed}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
