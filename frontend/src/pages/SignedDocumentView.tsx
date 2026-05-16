import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { api } from "../services/api";

export function SignedDocumentView() {
  const { reportId, docType } = useParams<{ reportId: string; docType: string }>();
  const navigate = useNavigate();

  if (!reportId || !docType) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-dark-500">No document specified</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-primary-400 text-sm">Go Back</button>
      </div>
    );
  }

  const previewUrl = api.getDocumentPreviewUrl(reportId, docType);
  const docLabel = docType === "fall_protection_plan" ? "Fall Protection Plan" : "Hazard Assessment";

  return (
    <div className="flex flex-col h-screen bg-dark-950">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-700/30">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-dark-800/50 border border-dark-600/30 text-dark-400 cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-white">{docLabel}</span>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600/10 border border-primary-500/20 text-primary-400 text-xs cursor-pointer"
        >
          <ExternalLink size={12} />
          Open
        </a>
      </div>
      <iframe
        src={previewUrl}
        className="flex-1 w-full border-0"
        title={docLabel}
      />
    </div>
  );
}
