import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, Play, Pause, RotateCcw, Send } from "lucide-react";
import { api } from "../services/api";
import { useI18n } from "../i18n";

interface VoiceRecorderProps {
  fieldId: string;
  onTranscribed: (text: string, recordingId: string) => void;
}

type Stage = "idle" | "recording" | "preview" | "uploading" | "transcribing" | "summarizing" | "done";

export function VoiceRecorder({ fieldId, onTranscribed }: VoiceRecorderProps) {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  const stageLabels: Record<Stage, string> = {
    idle: "",
    recording: t("voice.recording"),
    preview: t("voice.preview"),
    uploading: t("voice.uploading"),
    transcribing: t("voice.transcribing"),
    summarizing: t("voice.summarizing"),
    done: t("voice.done"),
  };

  useEffect(() => {
    return () => {
      if (audioElRef.current) {
        audioElRef.current.pause();
        URL.revokeObjectURL(audioElRef.current.src);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      audioBlobRef.current = null;
      setDuration(0);
      setPlaybackTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        audioBlobRef.current = blob;

        const audio = new Audio(URL.createObjectURL(blob));
        audioElRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          setPlaybackTime(0);
          if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
        };

        setStage("preview");
      };

      mediaRecorder.start(250);
      setStage("recording");

      timerRef.current = window.setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      alert(t("voice.micError"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const togglePlayback = () => {
    const audio = audioElRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
      playbackTimerRef.current = window.setInterval(() => {
        setPlaybackTime(Math.floor(audio.currentTime));
      }, 200);
    }
  };

  const discardAndReRecord = () => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      URL.revokeObjectURL(audioElRef.current.src);
      audioElRef.current = null;
    }
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    audioBlobRef.current = null;
    setIsPlaying(false);
    setPlaybackTime(0);
    setDuration(0);
    setStage("idle");
  };

  const confirmAndUpload = async () => {
    if (!audioBlobRef.current) return;

    if (audioElRef.current) {
      audioElRef.current.pause();
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      setIsPlaying(false);
    }

    await processAudio(audioBlobRef.current);
  };

  const processAudio = async (blob: Blob) => {
    setStage("uploading");
    setProgress(10);

    try {
      await api.transcribeAudioStream(blob, fieldId, (data) => {
        setStage(data.stage as Stage);
        setProgress(data.progress);

        if (data.stage === "done") {
          onTranscribed(data.processed_text || data.raw_text, data.recording_id);
          setTimeout(() => {
            cleanupAudio();
            setStage("idle");
            setProgress(0);
          }, 1500);
        }
      });
    } catch {
      const result = await api.transcribeAudio(blob, fieldId);
      onTranscribed(result.processed_text || result.raw_text, result.recording_id);
      cleanupAudio();
      setStage("idle");
      setProgress(0);
    }
  };

  const cleanupAudio = () => {
    if (audioElRef.current) {
      URL.revokeObjectURL(audioElRef.current.src);
      audioElRef.current = null;
    }
    audioBlobRef.current = null;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {stage === "idle" ? (
          <motion.button
            key="start"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={startRecording}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-dark-800/60 backdrop-blur-md border border-dark-600/40
                       rounded-xl hover:bg-dark-700/60 hover:border-primary-500/30 active:scale-[0.97]
                       transition-all duration-150 cursor-pointer w-full"
            style={{ minHeight: 52 }}
          >
            <div className="w-8 h-8 rounded-full bg-primary-600/15 border border-primary-500/25 flex items-center justify-center flex-shrink-0"
            >
              <Mic size={16} className="text-primary-300" />
            </div>
            <span className="text-sm text-dark-200 font-medium">{t("voice.tap")}</span>
          </motion.button>

        ) : stage === "recording" ? (
          <motion.button
            key="recording"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={stopRecording}
            className="flex items-center gap-3 px-5 py-3.5 bg-red-500/8 border border-red-500/25
                       rounded-xl hover:bg-red-500/12 active:scale-[0.97]
                       transition-all duration-150 cursor-pointer w-full"
            style={{ minHeight: 52 }}
          >
            <div className="w-6 h-6 rounded-md bg-red-500/20 flex items-center justify-center recording-pulse"
            >
              <Square size={12} className="text-red-300" fill="currentColor" />
            </div>
            <span className="text-sm text-red-300 font-semibold tabular-nums">{formatTime(duration)}</span>
            <span className="text-xs text-dark-500 ml-auto">{t("voice.tapStop")}</span>
          </motion.button>

        ) : stage === "preview" ? (
          <motion.div
            key="preview"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-dark-800/60 backdrop-blur-md border border-dark-600/40 rounded-xl"
            >
              <button
                onClick={togglePlayback}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-600/15 border border-primary-500/25
                           hover:bg-primary-600/25 active:scale-90 transition-all duration-150 flex-shrink-0 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause size={14} className="text-primary-300" />
                ) : (
                  <Play size={14} className="text-primary-300 ml-0.5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="h-1.5 bg-dark-700/70 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full"
                    animate={{ width: duration > 0 ? `${(playbackTime / duration) * 100}%` : "0%" }}
                    transition={{ duration: 0.15 }}
                  />
                </div>
              </div>

              <span className="text-xs text-dark-500 tabular-nums min-w-[40px] text-right flex-shrink-0">
                {isPlaying ? formatTime(playbackTime) : formatTime(duration)}
              </span>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={discardAndReRecord}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3
                           bg-dark-800/50 border border-dark-600/30 rounded-xl
                           text-dark-400 hover:text-dark-200 hover:bg-dark-700/50 hover:border-dark-500/40
                           active:scale-[0.97] transition-all duration-150 cursor-pointer"
                style={{ minHeight: 48 }}
              >
                <RotateCcw size={15} />
                <span className="text-xs font-semibold">{t("voice.reRecord")}</span>
              </button>
              <button
                onClick={confirmAndUpload}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3
                           bg-primary-600/15 border border-primary-500/30 rounded-xl
                           text-primary-300 hover:bg-primary-600/25 hover:border-primary-500/40
                           active:scale-[0.97] transition-all duration-150 cursor-pointer"
                style={{ minHeight: 48 }}
              >
                <Send size={15} />
                <span className="text-xs font-semibold">{t("voice.confirmUpload")}</span>
              </button>
            </div>
          </motion.div>

        ) : (
          <motion.div
            key="processing"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 px-5 py-4 bg-primary-500/5 border border-primary-500/15 rounded-xl"
          >
            <Loader2 size={18} className="text-primary-400 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-primary-300 font-medium">{stageLabels[stage]}</span>
              <div className="mt-2 h-1.5 bg-dark-700/60 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            <span className="text-xs text-primary-400/70 tabular-nums flex-shrink-0">{progress}%</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
