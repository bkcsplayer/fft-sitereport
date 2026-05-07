import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, User, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";

export function LoginPage() {
  const { login } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t("login.required"));
      return;
    }

    setLoading(true);
    setError("");

    const result = await login(username.trim(), password);
    if (!result.ok) {
      setError(result.error || t("login.failed"));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[250px] h-[250px] bg-primary-800/8 rounded-full blur-[100px]" />
      </div>

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === "zh" ? "en" : "zh")}
        className="absolute top-6 right-5 flex items-center gap-1 px-3 py-1.5 rounded-xl
                   bg-dark-800/70 backdrop-blur-md border border-dark-600/40
                   active:scale-95 transition-all duration-150 cursor-pointer z-10"
        aria-label="Switch language"
      >
        <span className={`text-xs font-bold transition-colors duration-200 ${lang === "zh" ? "text-primary-300" : "text-dark-500"}`}>中</span>
        <span className="text-dark-600 text-xs">/</span>
        <span className={`text-xs font-bold transition-colors duration-200 ${lang === "en" ? "text-primary-300" : "text-dark-500"}`}>EN</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary-500/15 blur-xl rounded-full scale-150" />
            <img
              src="/logo.png"
              alt="FFT"
              className="relative w-14 h-14 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary-200 via-primary-400 to-primary-500 bg-clip-text text-transparent">
              FFT SiteReport
            </span>
          </h1>
          <p className="text-sm text-dark-500 mt-1.5">{t("login.subtitle")}</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-dark-500 mb-1.5 block font-medium">{t("login.username")}</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder={t("login.usernamePlaceholder")}
                  autoComplete="username"
                  autoCapitalize="off"
                  className="input-field w-full pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-dark-500 mb-1.5 block font-medium">{t("login.password")}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder={t("login.passwordPlaceholder")}
                  autoComplete="current-password"
                  className="input-field w-full pl-10"
                />
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/8 border border-red-500/20 rounded-xl"
            >
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-300 font-medium">{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogIn size={18} />
            )}
            <span>{loading ? t("login.loggingIn") : t("login.button")}</span>
          </button>
        </form>

        <p className="text-center text-[11px] text-dark-600 mt-6">
          FFT Solar Panel Installation
        </p>
      </motion.div>
    </div>
  );
}
