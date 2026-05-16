import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, UserCog, Shield, AlertTriangle, CheckCircle2, X, ChevronDown } from "lucide-react";
import { api, EmployeeListItem, CertificateInfo } from "../services/api";

interface SelectedWorker {
  employee_id: string;
  employee_name: string;
  is_crew_lead: boolean;
}

interface Props {
  selected: SelectedWorker[];
  onChange: (workers: SelectedWorker[], crewLeadId: string | null) => void;
}

export function EmployeeSelector({ selected, onChange }: Props) {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [certStatuses, setCertStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getEmployees().then((emps) => {
      setEmployees(emps);
      setLoading(false);
    });
  }, []);

  const toggleWorker = async (emp: EmployeeListItem) => {
    const already = selected.find((w) => w.employee_id === emp.id);
    if (already) {
      const next = selected.filter((w) => w.employee_id !== emp.id);
      const crewLeadId = next.find((w) => w.is_crew_lead)?.employee_id ?? null;
      onChange(next, crewLeadId);
    } else {
      const detail = await api.getEmployee(emp.id);
      const fppCert = detail.certificates.find((c) => c.certificate_type === "fall_protection");
      const status = getCertStatus(fppCert);
      setCertStatuses((prev) => ({ ...prev, [emp.id]: status }));

      const isLead = detail.role === "crew_lead" && !selected.some((w) => w.is_crew_lead);
      const next = [...selected, { employee_id: emp.id, employee_name: emp.name, is_crew_lead: isLead }];
      const crewLeadId = next.find((w) => w.is_crew_lead)?.employee_id ?? null;
      onChange(next, crewLeadId);
    }
  };

  const setCrewLead = (employeeId: string) => {
    const next = selected.map((w) => ({
      ...w,
      is_crew_lead: w.employee_id === employeeId,
    }));
    onChange(next, employeeId);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-[2.5px] border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {employees.map((emp) => {
          const isSelected = selected.some((w) => w.employee_id === emp.id);
          const isLead = selected.some((w) => w.employee_id === emp.id && w.is_crew_lead);
          const certStatus = certStatuses[emp.id];

          return (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                isSelected ? "border-primary-500/30 bg-primary-600/5" : ""
              }`}
              onClick={() => toggleWorker(emp)}
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? "bg-primary-500 border-primary-500" : "border-dark-500"
                }`}
              >
                {isSelected && <CheckCircle2 size={12} className="text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-dark-100 font-medium truncate">{emp.name}</span>
                  <span className={`text-[10px] ${emp.role === "crew_lead" ? "text-amber-400" : "text-dark-500"}`}>{emp.role === "crew_lead" ? "Crew Lead" : "Worker"}</span>
                  {emp.role === "crew_lead" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-500/12 text-amber-400 border border-amber-500/20">
                      Leader
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {certStatus && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        certStatus === "valid"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : certStatus === "expiring_soon"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {certStatus === "valid" ? "FP Valid" : certStatus === "expiring_soon" ? "FP Expiring Soon" : "FP Missing/Expired"}
                    </span>
                  )}
                  {emp.certificate_count > 0 && (
                    <span className="text-[10px] text-dark-500">{emp.certificate_count} cert(s)</span>
                  )}
                </div>
              </div>

              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCrewLead(emp.id);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all active:scale-95 cursor-pointer ${
                    isLead
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                      : "bg-dark-800/50 text-dark-400 border border-dark-600/25"
                  }`}
                >
                  <UserCog size={11} />
                  {isLead ? "Crew Lead" : "Set Lead"}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="bg-dark-800/30 rounded-xl p-3 text-xs text-dark-400">
          <span className="font-semibold text-dark-200">{selected.length} worker(s) selected</span>
          {" — "}
          {selected.find((w) => w.is_crew_lead)
            ? `Crew Lead: ${selected.find((w) => w.is_crew_lead)!.employee_name}`
            : "No crew lead assigned"}
        </div>
      )}
    </div>
  );
}

function getCertStatus(cert: CertificateInfo | undefined): string {
  if (!cert) return "missing";
  if (!cert.expiry_date) return "valid";
  const expiry = new Date(cert.expiry_date);
  const now = new Date();
  if (expiry < now) return "expired";
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 30) return "expiring_soon";
  return "valid";
}
