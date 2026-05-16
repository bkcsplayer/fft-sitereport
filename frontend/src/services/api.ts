const BASE_URL = "/api";

let _token: string | null = null;

export function setApiToken(token: string | null) {
  _token = token;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }
  return headers;
}

export interface DropdownOption {
  id: string;
  category: string;
  value: string;
  is_active: boolean;
  sort_order: number;
}

export interface AdminStats {
  total_reports: number;
  completed_reports: number;
  pending_reports: number;
  anomaly_reports: number;
  total_panels_installed: number;
  active_projects: number;
}

// ─── v2.0 Types ───────────────────────────────────────────

export interface EmployeeListItem {
  id: string;
  name: string;
  role: string;  // "worker" or "crew_lead"
  is_active: boolean;
  username: string | null;
  certificate_count: number;
}

export interface CertificateInfo {
  id: string;
  employee_id: string;
  certificate_type: string;
  certificate_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  image_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface EmployeeDetail extends EmployeeListItem {
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  certificates: CertificateInfo[];
}

export interface SiteReportWorker {
  id: string;
  employee_id: string;
  employee_name: string;
  is_crew_lead: boolean;
  clock_in_time: string | null;
  clock_out_time: string | null;
}

export interface SiteReportListItem {
  id: string;
  work_date: string;
  work_address: string;
  crew_lead_name: string | null;
  installation_quantity: number;
  status: string;
  signature_progress: string | null;
  created_at: string;
}

export interface SiteReportVideo {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface SiteReportAudio {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  duration_seconds: number | null;
  created_at: string;
}

export interface FallProtectionPlanData {
  id?: string;
  site_report_id?: string;
  employer_name: string;
  fall_hazards: string | null;
  fall_protection_system: string | null;
  anchor_type: string | null;
  anchor_count: number | null;
  system_procedures: string | null;
  rescue_self: boolean;
  rescue_assisted_roof: boolean;
  rescue_ladder: boolean;
  rescue_awp: boolean;
  rescue_fire_dept: boolean;
  clearance_a: number | null;
  clearance_b: number | null;
  clearance_c: number | null;
  clearance_d: number | null;
  clearance_e: number | null;
  clearance_f_total: number | null;
}

export interface HazardAssessmentData {
  id?: string;
  site_report_id?: string;
  all_hazards_reviewed: boolean | null;
  hazard_items: any[] | null;
}

export interface SignatureInfo {
  id: string;
  site_report_id: string;
  worker_id: string;
  worker_name: string;
  document_type: string;
  signature_image_path: string | null;
  confirmation_text: string;
  status: string;
  signed_at: string | null;
}

export interface SignatureMatrixRow {
  worker_id: string;
  worker_name: string;
  is_crew_lead: boolean;
  fall_protection_plan: SignatureInfo | null;
  hazard_assessment: SignatureInfo | null;
}

export interface SignatureProgress {
  total_required: number;
  completed: number;
  status: string;
  matrix: SignatureMatrixRow[];
}

export interface WorkerAssignment {
  site_report_id: string;
  work_date: string;
  work_address: string;
  status: string;
  is_crew_lead: boolean;
  clock_in_time: string | null;
  clock_out_time: string | null;
  fpp_status: string;
  ha_status: string;
}

export interface Milestone {
  id: string;
  site_report_id: string;
  milestone_type: string;
  estimated_completion_time: string;
  actual_completion_time: string;
  completed_as_expected: boolean;
  delay_reason: string | null;
  delay_other_reason: string | null;
}

export interface SiteReportDetail {
  id: string;
  work_date: string;
  work_address: string;
  employer: string;
  crew_lead_id: string | null;
  installation_quantity: number;
  site_contact: string | null;
  firefly_contact: string | null;
  status: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  workers: SiteReportWorker[];
  videos: SiteReportVideo[];
  audio_files: SiteReportAudio[];
  fall_protection_plan: FallProtectionPlanData | null;
  hazard_assessment: HazardAssessmentData | null;
  signature_progress: SignatureProgress;
  milestones: Milestone[];
}

export interface TranscribeResult {
  recording_id: string;
  raw_text: string;
  processed_text: string;
}

export interface VoiceRecordingInfo {
  id: string;
  field_id: string;
  file_path: string;
  file_size: number;
  duration_seconds: number | null;
  mime_type: string;
  created_at: string;
  transcript_raw: string | null;
  transcript_processed: string | null;
}

function jsonHeaders(): Record<string, string> {
  return { ...authHeaders(), "Content-Type": "application/json" };
}

export const api = {
  async getOptions(category: string): Promise<DropdownOption[]> {
    const res = await fetch(`${BASE_URL}/options/${category}`);
    if (!res.ok) return [];
    return res.json();
  },

  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch(`${BASE_URL}/admin/stats`);
    return res.json();
  },

  getAudioUrl(recordingId: string): string {
    return `${BASE_URL}/voice/${recordingId}/audio`;
  },

  async createOption(category: string, value: string): Promise<DropdownOption> {
    const res = await fetch(`${BASE_URL}/options/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ category, value, sort_order: 0 }),
    });
    return res.json();
  },

  async deleteOption(optionId: string): Promise<void> {
    await fetch(`${BASE_URL}/options/${optionId}`, { method: "DELETE" });
  },

  async transcribeAudio(audioBlob: Blob, fieldId: string, siteReportId?: string): Promise<TranscribeResult> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("field_id", fieldId);
    if (siteReportId) formData.append("site_report_id", siteReportId);
    const res = await fetch(`${BASE_URL}/voice/transcribe`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  transcribeAudioStream(
    audioBlob: Blob,
    fieldId: string,
    siteReportId?: string,
    onProgress?: (data: any) => void
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("field_id", fieldId);
      if (siteReportId) formData.append("site_report_id", siteReportId);

      try {
        const res = await fetch(`${BASE_URL}/voice/transcribe-stream`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          reject(new Error(`HTTP ${res.status}`));
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          reject(new Error("No reader"));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                onProgress?.(data);
              } catch {}
            }
          }
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },

  // ─── v2.0: Employees ──────────────────────────────────

  async getEmployees(includeInactive = false): Promise<EmployeeListItem[]> {
    const params = new URLSearchParams();
    params.set("include_inactive", String(includeInactive));
    if (_token) params.set("token", _token);
    const res = await fetch(`${BASE_URL}/employees/?${params}`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  async getEmployee(id: string): Promise<EmployeeDetail> {
    const res = await fetch(`${BASE_URL}/employees/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Employee not found");
    return res.json();
  },

  async createEmployee(data: { name: string; role?: string; phone?: string; email?: string; notes?: string; username?: string; password?: string }): Promise<EmployeeDetail> {
    const res = await fetch(`${BASE_URL}/employees/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateEmployee(id: string, data: any): Promise<EmployeeDetail> {
    const res = await fetch(`${BASE_URL}/employees/${id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteEmployee(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/employees/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Delete failed");
  },

  async addCertificate(employeeId: string, data: any): Promise<CertificateInfo> {
    const res = await fetch(`${BASE_URL}/employees/${employeeId}/certificates`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async uploadCertificateImage(employeeId: string, certId: string, file: File): Promise<void> {
    const form = new FormData();
    form.append("image", file);
    await fetch(`${BASE_URL}/employees/${employeeId}/certificates/${certId}/image`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
  },

  getCertificateImageUrl(employeeId: string, certId: string): string {
    let url = `${BASE_URL}/employees/${employeeId}/certificates/${certId}/image`;
    if (_token) url += `?token=${encodeURIComponent(_token)}`;
    return url;
  },

  async deleteCertificate(employeeId: string, certId: string): Promise<void> {
    await fetch(`${BASE_URL}/employees/${employeeId}/certificates/${certId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  },

  // ─── v2.0: Site Reports ───────────────────────────────

  async createSiteReport(data: any): Promise<SiteReportDetail> {
    const res = await fetch(`${BASE_URL}/site-reports/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getSiteReports(status?: string): Promise<SiteReportListItem[]> {
    const params = status ? `?status=${status}` : "";
    const res = await fetch(`${BASE_URL}/site-reports/${params}`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  async getSiteReport(id: string): Promise<SiteReportDetail> {
    const res = await fetch(`${BASE_URL}/site-reports/${id}`);
    if (!res.ok) throw new Error("Site report not found");
    return res.json();
  },

  async updateSiteReport(id: string, data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/site-reports/${id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async confirmSiteReport(id: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/site-reports/${id}/confirm`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Confirm failed");
    }
    return res.json();
  },

  async updateSiteReportWorkers(reportId: string, workerIds: string[], crewLeadId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/site-reports/${reportId}/workers`, {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify({ worker_ids: workerIds, crew_lead_id: crewLeadId }),
    });
    return res.json();
  },

  // ─── v2.0: Video / Audio ──────────────────────────────

  async uploadSiteVideo(reportId: string, file: File): Promise<any> {
    const form = new FormData();
    form.append("video", file);
    const res = await fetch(`${BASE_URL}/site-reports/${reportId}/videos`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    return res.json();
  },

  getSiteVideoUrl(reportId: string, videoId: string): string {
    return `${BASE_URL}/site-reports/${reportId}/videos/${videoId}`;
  },

  async uploadSiteAudio(reportId: string, file: File, duration?: number): Promise<any> {
    const form = new FormData();
    form.append("audio", file);
    if (duration) form.append("duration", String(duration));
    const res = await fetch(`${BASE_URL}/site-reports/${reportId}/audio`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    return res.json();
  },

  getSiteAudioUrl(reportId: string, audioId: string): string {
    return `${BASE_URL}/site-reports/${reportId}/audio/${audioId}`;
  },

  // ─── v2.0: FPP / HA ───────────────────────────────────

  async saveFPP(reportId: string, data: FallProtectionPlanData): Promise<FallProtectionPlanData> {
    const res = await fetch(`${BASE_URL}/site-reports/${reportId}/fpp`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getFPP(reportId: string): Promise<FallProtectionPlanData> {
    const res = await fetch(`${BASE_URL}/site-reports/${reportId}/fpp`);
    if (!res.ok) throw new Error("FPP not found");
    return res.json();
  },

  async saveHA(reportId: string, data: HazardAssessmentData): Promise<HazardAssessmentData> {
    const res = await fetch(`${BASE_URL}/site-reports/${reportId}/ha`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getHA(reportId: string): Promise<HazardAssessmentData> {
    const res = await fetch(`${BASE_URL}/site-reports/${reportId}/ha`);
    if (!res.ok) throw new Error("HA not found");
    return res.json();
  },

  // ─── v2.0: Signatures ─────────────────────────────────

  async createSignature(data: {
    site_report_id: string;
    worker_id: string;
    worker_name: string;
    document_type: string;
    signature_image_base64: string;
    confirmation_text: string;
  }): Promise<SignatureInfo> {
    const res = await fetch(`${BASE_URL}/signatures/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let detail = "Signature failed";
      try {
        const err = await res.json();
        detail = err.detail || detail;
      } catch {
        detail = `Server error (${res.status})`;
      }
      throw new Error(detail);
    }
    return res.json();
  },

  async getSignatureProgress(reportId: string): Promise<SignatureProgress> {
    const res = await fetch(`${BASE_URL}/signatures/progress/${reportId}`);
    return res.json();
  },

  getDocumentPreviewUrl(reportId: string, docType: string): string {
    return `${BASE_URL}/signatures/document-preview/${reportId}/${docType}`;
  },

  // ─── v2.0: Snapshots ──────────────────────────────────

  getSnapshotUrl(snapshotId: string): string {
    return `${BASE_URL}/snapshots/${snapshotId}`;
  },

  getSnapshotBySignatureUrl(signatureId: string): string {
    return `${BASE_URL}/snapshots/by-signature/${signatureId}`;
  },

  // ─── Worker Dashboard ───────────────────────────────────

  async getWorkerDashboard(): Promise<{ worker_id: string; assignments: WorkerAssignment[] }> {
    const res = await fetch(`${BASE_URL}/worker/dashboard`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  async getWorkerSigningDocuments(reportId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/worker/site-report/${reportId}/documents`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Documents not available");
    return res.json();
  },

  async workerClockIn(reportId: string): Promise<{ status: string; time: string }> {
    const res = await fetch(`${BASE_URL}/worker/clock-in?site_report_id=${encodeURIComponent(reportId)}`, {
      method: "POST",
      headers: authHeaders(),
    });
    return res.json();
  },

  async workerClockOut(reportId: string): Promise<{ status: string; time: string }> {
    const res = await fetch(`${BASE_URL}/worker/clock-out?site_report_id=${encodeURIComponent(reportId)}`, {
      method: "POST",
      headers: authHeaders(),
    });
    return res.json();
  },

  // ─── Milestones ─────────────────────────────────────────

  async createMilestone(reportId: string, data: any): Promise<Milestone> {
    const res = await fetch(`${BASE_URL}/site-reports/${reportId}/milestones`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getMilestones(reportId: string): Promise<Milestone[]> {
    const res = await fetch(`${BASE_URL}/site-reports/${reportId}/milestones`, {
      headers: authHeaders(),
    });
    return res.json();
  },

  async deleteMilestone(reportId: string, milestoneId: string): Promise<void> {
    await fetch(`${BASE_URL}/site-reports/${reportId}/milestones/${milestoneId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  },
};
