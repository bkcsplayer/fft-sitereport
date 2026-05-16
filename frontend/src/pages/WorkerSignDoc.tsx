import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, Clock, FileText, ChevronDown } from "lucide-react";
import { useAuth } from "../auth";
import { api } from "../services/api";
import { SignaturePad, SignaturePadRef } from "../components/SignaturePad";

export function WorkerSignDoc() {
  const { reportId, docType } = useParams<{ reportId: string; docType: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const sigPadRef = useRef<SignaturePadRef>(null);

  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [docReady, setDocReady] = useState(false);
  const [hasReadDoc, setHasReadDoc] = useState(false);

  useEffect(() => {
    if (!reportId || !user?.token) return;
    api.getWorkerSigningDocuments(reportId)
      .then((data) => {
        // Check per-document signed status
        const isFppPage = docType === "fall_protection_plan";
        const thisDocSigned = isFppPage ? (data.fpp_signed || false) : (data.ha_signed || false);
        setAlreadySigned(thisDocSigned);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [reportId, user?.token, docType]);

  const handleSign = async () => {
    if (!sigPadRef.current || !reportId || !docType || !user) return;
    const base64 = sigPadRef.current.getSignature();
    if (!base64) { alert("Please sign before confirming"); return; }
    setSaving(true);
    try {
      await api.createSignature({
        site_report_id: reportId,
        worker_id: user.employee_id!,
        worker_name: user.display_name,
        document_type: docType,
        signature_image_base64: base64,
        confirmation_text: `I confirm I have reviewed the ${docType === "fall_protection_plan" ? "Fall Protection Plan" : "Hazard Assessment"} and understand its contents.`,
      });
      setSigned(true);
      sigPadRef.current.clear();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-[2.5px] border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  const isFpp = docType === "fall_protection_plan";
  const title = isFpp ? "FALL PROTECTION PLAN" : "HAZARD ASSESSMENT";
  const Icon = isFpp ? Shield : AlertTriangle;
  const iconColor = isFpp ? "text-amber-400" : "text-red-400";

  // URL for the full filled-in document preview
  const previewUrl = reportId && docType
    ? api.getDocumentPreviewUrl(reportId, docType)
    : "";

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-950/90 backdrop-blur border-b border-dark-800/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-dark-800/50 border border-dark-600/30 text-dark-400">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white truncate">{title}</h1>
          <p className="text-[10px] text-dark-500">Review the complete document before signing</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${iconColor} bg-dark-800/50 border border-dark-600/30`}>
          <Icon size={12} />
          {isFpp ? "FPP" : "HA"}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32 max-w-4xl mx-auto">
        {/* Step 1: Full Document Preview */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-700/50 bg-dark-800/30">
            <FileText size={14} className={iconColor} />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Step 1: Review Complete Document
            </span>
          </div>

          {!docReady && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-[2px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
            </div>
          )}

          <iframe
            src={previewUrl}
            className="w-full border-0"
            style={{
              height: docReady ? "80vh" : "0px",
              minHeight: docReady ? "600px" : "0px",
              transition: "height 0.3s ease",
            }}
            onLoad={() => setDocReady(true)}
            title="Document Preview"
          />

          {docReady && !hasReadDoc && (
            <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20">
              <button
                onClick={() => setHasReadDoc(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-semibold border border-amber-500/30 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                I have reviewed the document
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Signature (only visible after confirming document review) */}
        {hasReadDoc && (
          <div className="glass-card p-4 space-y-3 border-t-2 border-primary-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Step 2: Sign Document
              </span>
            </div>

            {alreadySigned ? (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Already Signed</p>
                  <p className="text-xs text-emerald-500/70">You have already signed this document.</p>
                </div>
              </div>
            ) : signed ? (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Document Signed</p>
                  <p className="text-xs text-emerald-500/70">Thank you for confirming.</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-dark-500 leading-relaxed">
                  By signing below, you confirm that you have read and understood the {isFpp ? "Fall Protection Plan" : "Hazard Assessment"} for this site.
                </p>
                <SignaturePad ref={sigPadRef} width={320} height={150} />
                <button onClick={handleSign} disabled={saving} className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? (
                    <><Clock size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    "Confirm & Sign"
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
