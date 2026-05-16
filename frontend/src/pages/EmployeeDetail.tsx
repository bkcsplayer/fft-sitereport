import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Image, Key, Upload } from "lucide-react";
import { api, EmployeeDetail as EmpDetail, CertificateInfo } from "../services/api";

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [emp, setEmp] = useState<EmpDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const data = await api.getEmployee(id);
    setEmp(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const cert = await api.addCertificate(id, { certificate_type: "document" });
        await api.uploadCertificateImage(id, cert.id, file);
      } catch {}
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-[2.5px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-dark-500">Employee not found</p>
        <button onClick={() => navigate("/employees")} className="mt-3 text-primary-400 text-sm">Back to Employees</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4 w-full">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/employees")} className="p-2 rounded-lg bg-dark-800/50 border border-dark-600/30 text-dark-400 cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{emp.name}</h1>
          <p className="text-xs text-dark-500">{emp.role === "crew_lead" ? "Crew Lead" : "Worker"} · {emp.is_active ? "Active" : "Inactive"}</p>
        </div>
      </div>

      {/* Info */}
      <div className="glass-card p-4 space-y-2 text-xs">
        {emp.phone && <InfoRow label="Phone" value={emp.phone} />}
        {emp.email && <InfoRow label="Email" value={emp.email} />}
        {emp.notes && <InfoRow label="Notes" value={emp.notes} />}
        {emp.username && <InfoRow label="Username" value={emp.username} />}
        {emp.role === "crew_lead" && (
          <div className="flex justify-between items-center">
            <span className="text-dark-500">Login Account</span>
            <span className="text-emerald-400 text-[10px] font-semibold">Active</span>
          </div>
        )}
      </div>

      {/* Crew Lead Credentials (admin only) */}
      <CredentialsEditor emp={emp} onUpdated={load} />

      {/* Certificates */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Certificates ({emp.certificates.length})</h2>
        <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600/10 border border-primary-500/20 text-primary-400 text-xs font-medium active:scale-95 transition-all cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          <Upload size={12} />
          {uploading ? "Uploading..." : "Upload Images"}
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {emp.certificates.length === 0 ? (
        <p className="text-center text-dark-500 text-xs py-6">No certificates uploaded yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence>
            {emp.certificates.map((cert) => (
              <CertificateCard key={cert.id} cert={cert} employeeId={emp.id} onDeleted={load} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-dark-500">{label}</span>
      <span className="text-dark-200">{value}</span>
    </div>
  );
}

function CertificateCard({ cert, employeeId, onDeleted }: { cert: CertificateInfo; employeeId: string; onDeleted: () => void }) {
  const handleDelete = async () => {
    if (!confirm("Delete this certificate image?")) return;
    await api.deleteCertificate(employeeId, cert.id);
    onDeleted();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card overflow-hidden relative group"
    >
      {cert.image_path ? (
        <img src={api.getCertificateImageUrl(employeeId, cert.id)} alt="cert" className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-28 bg-dark-800/50 flex items-center justify-center">
          <Image size={24} className="text-dark-600" />
        </div>
      )}
      <button
        onClick={handleDelete}
        className="absolute top-1 right-1 p-1 rounded-md bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}

function CredentialsEditor({ emp, onUpdated }: { emp: EmpDetail; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(emp.username || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) return;
    setSaving(true);
    const data: any = { role: "crew_lead", username: username.trim() };
    if (password.trim()) data.password = password.trim();
    await api.updateEmployee(emp.id, data);
    setSaving(false);
    setEditing(false);
    setPassword("");
    onUpdated();
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-800/30 border border-dark-600/20 rounded-xl text-dark-400 text-xs font-medium active:scale-95 transition-all cursor-pointer"
      >
        <Key size={13} className="text-amber-400" />
        {emp.username ? "Edit Login Credentials" : "Create Login Account"}
      </button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card p-4 space-y-3 border-amber-500/30 overflow-hidden">
      <div className="flex items-center gap-2">
        <Key size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Login Credentials</h3>
      </div>
      <p className="text-[10px] text-dark-500">This crew leader can log in to the system and create reports.</p>
      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Login username" autoComplete="off" className="input-field w-full text-sm" />
      </div>
      <div>
        <label className="text-[10px] text-dark-500 mb-1 block">{emp.username ? "New Password (leave blank to keep)" : "Password"}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={emp.username ? "Leave blank to keep current" : "Set password"} autoComplete="new-password" className="input-field w-full text-sm" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => setEditing(false)} className="flex-1 btn-secondary text-sm py-2.5">Cancel</button>
        <button onClick={handleSave} disabled={saving || !username.trim()} className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-50">
          {saving ? "Saving..." : "Save Credentials"}
        </button>
      </div>
    </motion.div>
  );
}
