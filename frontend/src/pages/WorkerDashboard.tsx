import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Calendar, Shield, AlertTriangle, FileCheck, IdCard, Upload, Plus, Trash2, Image } from "lucide-react";
import { useAuth } from "../auth";
import { api, WorkerAssignment, CertificateInfo, EmployeeDetail } from "../services/api";

export function WorkerDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState<EmployeeDetail | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const load = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const data = await api.getWorkerDashboard();
      setAssignments(data.assignments || []);
    } catch {
      setAssignments([]);
    }
    try {
      if (user.employee_id) {
        const empData = await api.getEmployee(user.employee_id);
        setEmp(empData);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user?.employee_id) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const cert = await api.addCertificate(user.employee_id, { certificate_type: "other" });
        await api.uploadCertificateImage(user.employee_id, cert.id, file);
      } catch {}
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    const empData = await api.getEmployee(user.employee_id);
    setEmp(empData);
  };

  const deleteCertificate = async (certId: string) => {
    if (!user?.employee_id) return;
    try {
      await api.deleteCertificate(user.employee_id, certId);
      const empData = await api.getEmployee(user.employee_id);
      setEmp(empData);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-[2.5px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4 w-full">
      <h1 className="text-lg font-bold text-white">{user?.display_name}</h1>

      {/* ─── Signing Tasks ─────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Documents to Sign</h2>
        {assignments.length === 0 ? (
          <div className="glass-card p-8 text-center space-y-2">
            <FileCheck size={32} className="text-dark-600 mx-auto" />
            <p className="text-dark-400 text-sm">No pending documents</p>
            <p className="text-dark-600 text-xs">Documents will appear here after your crew leader sends them.</p>
          </div>
        ) : (
          assignments.map((a) => (
            <motion.div key={a.site_report_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3 mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary-400" />
                <span className="text-sm font-semibold text-white">{a.work_address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-dark-400">
                <Calendar size={12} />
                {a.work_date}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/worker/sign/${a.site_report_id}/fall_protection_plan`)}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                    a.fpp_status === "signed"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}
                >
                  <Shield size={13} />
                  FPP {a.fpp_status === "signed" ? "✓ Signed" : "→ Sign"}
                </button>
                <button
                  onClick={() => navigate(`/worker/sign/${a.site_report_id}/hazard_assessment`)}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                    a.ha_status === "signed"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}
                >
                  <AlertTriangle size={13} />
                  HA {a.ha_status === "signed" ? "✓ Signed" : "→ Sign"}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ─── My Certificates ─────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">My Certificates</h2>
        <div className="glass-card p-4 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-dark-600/50 rounded-lg text-xs text-dark-400 font-semibold hover:border-primary-500/30 hover:text-primary-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload size={14} />
            {uploading ? "Uploading..." : "Upload Certificate Photo"}
          </button>

          {emp?.certificates && emp.certificates.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {emp.certificates.map((cert) => (
                <div key={cert.id} className="relative bg-dark-800/50 rounded-lg overflow-hidden border border-dark-600/20 group">
                  {cert.image_path ? (
                    <img
                      src={api.getCertificateImageUrl(emp.id, cert.id)}
                      alt={cert.certificate_type}
                      className="w-full h-24 object-cover"
                    />
                  ) : (
                    <div className="w-full h-24 flex items-center justify-center bg-dark-800/30">
                      <Image size={20} className="text-dark-600" />
                    </div>
                  )}
                  <button
                    onClick={() => deleteCertificate(cert.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 size={10} />
                  </button>
                  <div className="px-2 py-1 text-[10px] text-dark-400 truncate">
                    {cert.certificate_type}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-dark-600 text-center py-4">No certificates uploaded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
