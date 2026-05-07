import { useI18n } from "../i18n";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();

  const statusConfig: Record<
    string,
    {
      labelKey: "status.completed" | "status.draft" | "status.anomaly";
      color: string;
      bg: string;
      border: string;
      dotColor: string;
    }
  > = {
    completed: {
      labelKey: "status.completed",
      color: "text-emerald-300",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      dotColor: "bg-emerald-400",
    },
    draft: {
      labelKey: "status.draft",
      color: "text-amber-300",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      dotColor: "bg-amber-400",
    },
    anomaly: {
      labelKey: "status.anomaly",
      color: "text-red-300",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      dotColor: "bg-red-400",
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${config.bg} ${config.border} ${config.color}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dotColor} mr-1.5 ${status === "anomaly" ? "status-dot-pulse" : ""}`}
      />
      {t(config.labelKey)}
    </span>
  );
}
