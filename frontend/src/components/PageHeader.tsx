import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useI18n } from "../i18n";
import { useAuth } from "../auth";

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { lang, setLang } = useI18n();
  const { user, logout } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex flex-col items-center gap-1.5 mb-3"
    >
      {/* Top bar: logout left, language right */}
      <div className="absolute -top-1 left-0 right-0 flex items-center justify-between">
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                     bg-dark-800/70 backdrop-blur-md border border-dark-600/40
                     active:scale-95 transition-all duration-150 cursor-pointer"
          aria-label="Logout"
        >
          <LogOut size={12} className="text-dark-400" />
          <span className="text-[11px] text-dark-400 font-medium">{user?.display_name}</span>
        </button>

        <button
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl
                     bg-dark-800/70 backdrop-blur-md border border-dark-600/40
                     active:scale-95 transition-all duration-150 cursor-pointer"
          aria-label="Switch language"
        >
          <span className={`text-xs font-bold transition-colors duration-200 ${lang === "zh" ? "text-primary-300" : "text-dark-500"}`}>中</span>
          <span className="text-dark-600 text-xs">/</span>
          <span className={`text-xs font-bold transition-colors duration-200 ${lang === "en" ? "text-primary-300" : "text-dark-500"}`}>EN</span>
        </button>
      </div>

      <div className="relative mt-6">
        <div className="absolute inset-0 bg-primary-500/10 blur-lg rounded-full" />
        <img
          src="/logo.png"
          alt="FFT"
          className="relative w-8 h-8 object-contain drop-shadow-lg"
        />
      </div>

      <div className="text-center">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary-200 via-primary-400 to-primary-500 bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        <p className="text-[11px] text-dark-500 mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}
