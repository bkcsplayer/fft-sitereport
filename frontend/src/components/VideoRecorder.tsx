import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, RotateCcw, Send, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import { useI18n } from "../i18n";

interface VideoRecorderProps {
  workAddress: string;
  onVideoUploaded: (nasPath: string) => void;
  onClear: () => void;
}

type Stage = "idle" | "preview" | "uploading" | "done";

export function VideoRecorder({ workAddress, onVideoUploaded, onClear }: VideoRecorderProps) {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef.current = file;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setStage("preview");
  };

  const handleReShoot = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    fileRef.current = null;
    setVideoUrl(null);
    setStage("idle");
    onClear();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleConfirm = async () => {
    if (!fileRef.current) return;
    setStage("uploading");
    try {
      const result = await api.uploadVideo(fileRef.current, workAddress);
      setStage("done");
      onVideoUploaded(result.nas_path);
    } catch {
      alert(t("video.error"));
      setStage("preview");
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <motion.button
            key="idle"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-dark-800/60 backdrop-blur-md border border-dark-600/40
                       rounded-xl hover:bg-dark-700/60 hover:border-primary-500/30 active:scale-[0.97]
                       transition-all duration-150 cursor-pointer w-full"
            style={{ minHeight: 52 }}
          >
            <div className="w-8 h-8 rounded-full bg-primary-600/15 border border-primary-500/25 flex items-center justify-center flex-shrink-0">
              <Video size={16} className="text-primary-300" />
            </div>
            <span className="text-sm text-dark-200 font-medium">{t("video.tap")}</span>
          </motion.button>
        )}

        {stage === "preview" && videoUrl && (
          <motion.div
            key="preview"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <video
              src={videoUrl}
              controls
              className="w-full rounded-xl bg-dark-900 border border-dark-700/30"
              style={{ maxHeight: 240 }}
            />
            <div className="flex gap-2.5">
              <button
                onClick={handleReShoot}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3
                           bg-dark-800/50 border border-dark-600/30 rounded-xl
                           text-dark-400 hover:text-dark-200 hover:bg-dark-700/50 hover:border-dark-500/40
                           active:scale-[0.97] transition-all duration-150 cursor-pointer"
                style={{ minHeight: 48 }}
              >
                <RotateCcw size={15} />
                <span className="text-xs font-semibold">{t("video.reShoot")}</span>
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3
                           bg-primary-600/15 border border-primary-500/30 rounded-xl
                           text-primary-300 hover:bg-primary-600/25 hover:border-primary-500/40
                           active:scale-[0.97] transition-all duration-150 cursor-pointer"
                style={{ minHeight: 48 }}
              >
                <Send size={15} />
                <span className="text-xs font-semibold">{t("video.confirm")}</span>
              </button>
            </div>
          </motion.div>
        )}

        {stage === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 px-5 py-4 bg-primary-500/5 border border-primary-500/15 rounded-xl"
          >
            <Loader2 size={18} className="text-primary-400 animate-spin flex-shrink-0" />
            <span className="text-sm text-primary-300 font-medium">{t("video.uploading")}</span>
          </motion.div>
        )}

        {stage === "done" && (
          <motion.div
            key="done"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 px-5 py-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl"
          >
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-300 font-medium">{t("video.done")}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
