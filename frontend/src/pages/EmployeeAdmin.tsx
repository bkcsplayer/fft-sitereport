import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, User, ChevronRight, Shield, Key, X, Copy, Check, Eye, EyeOff, Trash2 } from "lucide-react";
import { api, EmployeeListItem } from "../services/api";
import { PageHeader } from "../components/PageHeader";

export function EmployeeAdmin() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [manageId, setManageId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await api.getEmployees(true);
    setEmployees(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (emp: EmployeeListItem) => {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      await api.deleteEmployee(emp.id);
      load();
    } catch (err: any) {
      alert("Delete failed: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="px-4 py-6 space-y-4 w-full">
      <PageHeader title="Employee Admin" subtitle="Manage crew leaders and workers" />

      <button
        onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600/12 border border-primary-500/25 rounded-xl text-primary-300 text-sm font-semibold active:scale-[0.97] transition-all cursor-pointer"
      >
        <Plus size={16} />
        Add Employee
      </button>

      {showAdd && (
        <AddEmployeeForm
          onDone={() => { setShowAdd(false); load(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-14">
          <div className="w-8 h-8 border-[2.5px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card overflow-hidden"
            >
              <div className="p-3.5 flex items-center gap-3 cursor-pointer card-hover" onClick={() => navigate(`/employees/${emp.id}`)}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  emp.role === "crew_lead" ? "bg-amber-500/15 border border-amber-500/25" : "bg-dark-700/50 border border-dark-600/30"
                }`}>
                  {emp.role === "crew_lead" ? <Shield size={16} className="text-amber-400" /> : <User size={16} className="text-dark-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-dark-100 font-medium truncate">{emp.name}</span>
                    {emp.role === "crew_lead" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-500/12 text-amber-400 border border-amber-500/20 flex-shrink-0">Crew Lead</span>
                    )}
                    {emp.username && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 flex-shrink-0">{emp.username}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-dark-500">{emp.role === "crew_lead" ? "Crew Lead" : "Worker"}</span>
                    <span className="text-[10px] text-dark-500">{emp.certificate_count} cert(s)</span>
                    {!emp.is_active && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {emp.role === "crew_lead" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setManageId(manageId === emp.id ? null : emp.id); }}
                      className="p-1.5 rounded-lg bg-dark-800/50 border border-dark-600/30 text-amber-400 hover:text-amber-300 cursor-pointer"
                      title="Manage Account"
                    >
                      <Key size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(emp); }}
                    className="p-1.5 rounded-lg bg-dark-800/50 border border-dark-600/30 text-dark-500 hover:text-red-400 hover:border-red-500/30 cursor-pointer transition-colors"
                    title="Delete Employee"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} className="text-dark-600" />
                </div>
              </div>

              {/* Expandable Account Manager */}
              <AnimatePresence>
                {manageId === emp.id && (
                  <AccountManager key={`acct-${emp.id}`} emp={emp} onUpdated={load} onClose={() => setManageId(null)} />
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountManager({ emp, onUpdated, onClose }: { emp: EmployeeListItem; onUpdated: () => void; onClose: () => void }) {
  const [username, setUsername] = useState(emp.username || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [accountRole, setAccountRole] = useState(emp.role);

  const handleSave = async () => {
    if (!username.trim()) return;
    setSaving(true);
    const data: any = { role: accountRole, username: username.trim() };
    if (password.trim()) data.password = password.trim();
    await api.updateEmployee(emp.id, data);
    setSaving(false);
    setPassword("");
    onUpdated();
  };

  const copyCurl = async (type: string) => {
    const host = window.location.origin;
    let cmd = "";
    if (type === "update") {
      cmd = `curl -X PATCH "${host}/api/employees/${emp.id}?token=ADMIN_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"username":"${username || "USERNAME"}","password":"NEW_PASSWORD"}'`;
    } else if (type === "delete") {
      cmd = `curl -X DELETE "${host}/api/employees/${emp.id}?token=ADMIN_TOKEN"`;
    }
    await navigator.clipboard.writeText(cmd);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 pb-4 space-y-3 border-t border-dark-600/20 pt-3 overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-white">Account: {emp.name}</span>
        </div>
        <button onClick={onClose} className="p-1 text-dark-500 cursor-pointer"><X size={14} /></button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-dark-500 mb-1 block">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Login username"
            autoComplete="off"
            className="input-field w-full text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] text-dark-500 mb-1 block">New Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep"
              autoComplete="new-password"
              className="input-field w-full text-sm pr-8"
            />
            <button
              onClick={() => setShowPw(!showPw)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-500 cursor-pointer"
            >
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Role Toggle */}
      <div>
        <label className="text-[10px] text-dark-500 mb-1.5 block">Account Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAccountRole("worker")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              accountRole === "worker"
                ? "bg-dark-700/60 border-dark-500/40 text-dark-200"
                : "bg-dark-800/30 border-dark-600/20 text-dark-500"
            }`}
          >
            <User size={13} />
            Worker
          </button>
          <button
            type="button"
            onClick={() => setAccountRole("crew_lead")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              accountRole === "crew_lead"
                ? "bg-amber-500/12 border-amber-500/30 text-amber-400"
                : "bg-dark-800/30 border-dark-600/20 text-dark-500"
            }`}
          >
            <Shield size={13} />
            Crew Lead
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !username.trim()}
        className="w-full btn-primary text-sm py-2 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Credentials"}
      </button>

      {/* Curl Commands */}
      <div className="space-y-1.5 pt-1">
        <p className="text-[10px] text-dark-500 flex items-center gap-1">
          <span className="w-3 h-px bg-dark-600 flex-shrink-0" />
          API / Curl
          <span className="w-3 h-px bg-dark-600 flex-shrink-0 flex-1" />
        </p>
        <div className="space-y-1">
          <button
            onClick={() => copyCurl("update")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-dark-800/40 border border-dark-600/20 text-[10px] text-dark-400 font-mono text-left cursor-pointer hover:border-dark-500/40 transition-colors"
          >
            <span className="truncate">PATCH — update credentials</span>
            {copied === "update" ? <Check size={12} className="text-emerald-400 flex-shrink-0 ml-1" /> : <Copy size={12} className="text-dark-500 flex-shrink-0 ml-1" />}
          </button>
          <button
            onClick={() => copyCurl("delete")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-dark-800/40 border border-dark-600/20 text-[10px] text-dark-400 font-mono text-left cursor-pointer hover:border-red-500/30 transition-colors"
          >
            <span className="truncate">DELETE — remove employee</span>
            {copied === "delete" ? <Check size={12} className="text-emerald-400 flex-shrink-0 ml-1" /> : <Copy size={12} className="text-dark-500 flex-shrink-0 ml-1" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const ROLE_PRESETS = ["Installer", "Electrician", "Foreman", "Technician", "Operator", "Inspector", "Apprentice"];

function AddEmployeeForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState(ROLE_PRESETS[0]);
  const [customPosition, setCustomPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [accountRole, setAccountRole] = useState<string>("worker");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const finalPosition = position === "__custom__" ? customPosition.trim() : position;

  const handleSave = async () => {
    if (!name.trim()) return;
    if (accountRole === "crew_lead" && (!username.trim() || !password.trim())) {
      alert("Crew leaders require a username and password for login");
      return;
    }
    setSaving(true);
    await api.createEmployee({
      name: name.trim(),
      role: accountRole,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      username: accountRole === "crew_lead" ? username.trim() : undefined,
      password: accountRole === "crew_lead" ? password : undefined,
    });
    setSaving(false);
    onDone();
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card p-4 space-y-3 border-primary-500/30 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">New Employee</h3>
        <button onClick={onCancel} className="p-1 text-dark-400 cursor-pointer"><X size={16} /></button>
      </div>

      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className="input-field w-full text-sm" />

      {/* Role Type: Worker vs Crew Lead */}
      <div>
        <label className="text-[10px] text-dark-500 mb-1.5 block">Account Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAccountRole("worker")}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              accountRole === "worker"
                ? "bg-dark-700/60 border-dark-500/40 text-dark-200"
                : "bg-dark-800/30 border-dark-600/20 text-dark-500"
            }`}
          >
            <User size={13} />
            Worker
          </button>
          <button
            type="button"
            onClick={() => setAccountRole("crew_lead")}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              accountRole === "crew_lead"
                ? "bg-amber-500/12 border-amber-500/30 text-amber-400"
                : "bg-dark-800/30 border-dark-600/20 text-dark-500"
            }`}
          >
            <Shield size={13} />
            Crew Lead
          </button>
        </div>
      </div>

      {/* Position / Job Role */}
      <div>
        <label className="text-[10px] text-dark-500 mb-1.5 block">Position</label>
        <div className="flex gap-1.5 flex-wrap">
          {ROLE_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setPosition(r)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                position === r
                  ? "bg-primary-600/15 border-primary-500/30 text-primary-400"
                  : "bg-dark-800/30 border-dark-600/20 text-dark-500 hover:border-dark-500/40"
              }`}
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPosition("__custom__")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
              position === "__custom__"
                ? "bg-primary-600/15 border-primary-500/30 text-primary-400"
                : "bg-dark-800/30 border-dark-600/20 text-dark-500 hover:border-dark-500/40"
            }`}
          >
            Other
          </button>
        </div>
        {position === "__custom__" && (
          <input
            type="text"
            value={customPosition}
            onChange={(e) => setCustomPosition(e.target.value)}
            placeholder="Enter position..."
            className="input-field w-full text-sm mt-1.5"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="input-field w-full text-sm" />
        <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field w-full text-sm" />
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="input-field w-full text-sm min-h-[50px] resize-none" />

      {/* Crew Lead Credentials */}
      {accountRole === "crew_lead" && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-amber-500/5 rounded-xl p-3 space-y-2 border border-amber-500/15 overflow-hidden">
          <div className="flex items-center gap-2">
            <Key size={12} className="text-amber-400" />
            <span className="text-[10px] text-amber-400 font-semibold">Login Credentials</span>
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username *"
            autoComplete="off"
            className="input-field w-full text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password *"
            autoComplete="new-password"
            className="input-field w-full text-sm"
          />
          <p className="text-[9px] text-dark-500">Can log in to create and manage site reports.</p>
        </motion.div>
      )}

      <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary w-full text-sm disabled:opacity-50">
        {saving ? "Saving..." : "Save Employee"}
      </button>
    </motion.div>
  );
}
