import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Clock, ExternalLink } from "lucide-react";
import type { SignatureMatrixRow, SignatureInfo } from "../services/api";

interface Props {
  matrix: SignatureMatrixRow[];
  totalRequired: number;
  completed: number;
  onSignClick: (workerId: string, docType: string) => void;
  onViewSigned: (reportId: string, docType: string) => void;
  readonly?: boolean;
}

export function SignatureMatrix({
  matrix,
  totalRequired,
  completed,
  onSignClick,
  onViewSigned,
  readonly = false,
}: Props) {
  const isComplete = completed >= totalRequired;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 size={18} className="text-emerald-400" />
          ) : (
            <Clock size={18} className="text-amber-400" />
          )}
          <span className="text-sm font-semibold text-white">
            {completed}/{totalRequired} signatures completed
          </span>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isComplete
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
              : "bg-amber-500/15 text-amber-300 border border-amber-500/25"
          }`}
        >
          {isComplete ? "Complete" : "Pending"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-dark-700/30">
              <th className="text-left py-2 text-dark-500 font-medium">Worker</th>
              <th className="text-center py-2 text-dark-500 font-medium">Fall Protection Plan</th>
              <th className="text-center py-2 text-dark-500 font-medium">Hazard Assessment</th>
              <th className="text-center py-2 text-dark-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => {
              const fppSigned = row.fall_protection_plan?.status === "signed";
              const haSigned = row.hazard_assessment?.status === "signed";
              const allSigned = fppSigned && haSigned;

              return (
                <motion.tr
                  key={row.worker_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-dark-700/15"
                >
                  <td className="py-2.5">
                    <span className="text-dark-200 font-medium">{row.worker_name}</span>
                    {row.is_crew_lead && (
                      <span className="ml-1.5 text-[10px] bg-primary-600/10 text-primary-400 px-1.5 py-0.5 rounded">Lead</span>
                    )}
                  </td>
                  <td className="text-center py-2.5">
                    <SigCell
                      sig={row.fall_protection_plan}
                      onSign={() => onSignClick(row.worker_id, "fall_protection_plan")}
                      onView={() => row.fall_protection_plan && onViewSigned(row.fall_protection_plan.site_report_id, "fall_protection_plan")}
                      readonly={readonly}
                    />
                  </td>
                  <td className="text-center py-2.5">
                    <SigCell
                      sig={row.hazard_assessment}
                      onSign={() => onSignClick(row.worker_id, "hazard_assessment")}
                      onView={() => row.hazard_assessment && onViewSigned(row.hazard_assessment.site_report_id, "hazard_assessment")}
                      readonly={readonly}
                    />
                  </td>
                  <td className="text-center py-2.5">
                    {allSigned ? (
                      <CheckCircle2 size={15} className="text-emerald-400 mx-auto" />
                    ) : (
                      <AlertCircle size={15} className="text-amber-500 mx-auto" />
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SigCell({
  sig,
  onSign,
  onView,
  readonly,
}: {
  sig: SignatureInfo | null;
  onSign: () => void;
  onView: () => void;
  readonly: boolean;
}) {
  if (sig && sig.status === "signed") {
    return (
      <button
        onClick={onView}
        className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium bg-emerald-500/8 px-2 py-1 rounded-lg border border-emerald-500/15 active:scale-95 transition-all cursor-pointer"
      >
        <CheckCircle2 size={11} />
        Signed
        <ExternalLink size={10} />
      </button>
    );
  }

  if (!readonly) {
    return (
      <button
        onClick={onSign}
        className="inline-flex items-center gap-1 text-primary-400 text-xs font-medium bg-primary-600/8 px-2 py-1 rounded-lg border border-primary-500/15 active:scale-95 transition-all cursor-pointer"
      >
        Sign Now
      </button>
    );
  }

  return <span className="text-dark-600 text-xs">Not Signed</span>;
}
