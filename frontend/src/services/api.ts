const BASE_URL = "/api";

export interface ReportListItem {
  id: string;
  work_date: string;
  work_address: string;
  crew_leader_name: string;
  panels_installed_today: number;
  status: string;
  created_at: string;
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

export interface ReportDetail extends ReportListItem {
  daily_plan_completed: boolean | null;
  daily_plan_incomplete_reason: string | null;
  daily_plan_incomplete_other_reason: string | null;
  summary: string | null;
  updated_at: string;
  attendance_records: {
    id: string;
    employee_name: string;
    arrival_time: string;
    departure_time: string;
  }[];
  milestones: {
    id: string;
    milestone_type: string;
    estimated_completion_time: string;
    actual_completion_time: string;
    completed_as_expected: boolean;
    delay_reason: string | null;
    delay_other_reason: string | null;
  }[];
  voice_recordings: VoiceRecordingInfo[];
}

export const api = {
  async getOptions(category: string): Promise<DropdownOption[]> {
    const res = await fetch(`${BASE_URL}/options/${category}`);
    if (!res.ok) return [];
    return res.json();
  },

  async createReport(data: any): Promise<any> {
    const res = await fetch(`${BASE_URL}/reports/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getReports(params?: { crew_leader?: string; status?: string }): Promise<ReportListItem[]> {
    const query = new URLSearchParams();
    if (params?.crew_leader) query.set("crew_leader", params.crew_leader);
    if (params?.status) query.set("status", params.status);
    const res = await fetch(`${BASE_URL}/reports/?${query}`);
    if (!res.ok) return [];
    return res.json();
  },

  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch(`${BASE_URL}/admin/stats`);
    return res.json();
  },

  async getReport(id: string): Promise<ReportDetail> {
    const res = await fetch(`${BASE_URL}/reports/${id}`);
    if (!res.ok) throw new Error("Report not found");
    return res.json();
  },

  getAudioUrl(recordingId: string): string {
    return `${BASE_URL}/voice/${recordingId}/audio`;
  },

  async getAdminReports(limit = 50, offset = 0): Promise<ReportListItem[]> {
    const res = await fetch(`${BASE_URL}/admin/reports?limit=${limit}&offset=${offset}`);
    if (!res.ok) return [];
    return res.json();
  },

  async createOption(category: string, value: string): Promise<DropdownOption> {
    const res = await fetch(`${BASE_URL}/options/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, value, sort_order: 0 }),
    });
    return res.json();
  },

  async deleteOption(optionId: string): Promise<void> {
    await fetch(`${BASE_URL}/options/${optionId}`, { method: "DELETE" });
  },

  async transcribeAudio(audioBlob: Blob, fieldId: string): Promise<TranscribeResult> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("field_id", fieldId);
    const res = await fetch(`${BASE_URL}/voice/transcribe`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  transcribeAudioStream(
    audioBlob: Blob,
    fieldId: string,
    onProgress: (data: any) => void
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("field_id", fieldId);

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
                onProgress(data);
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
};
