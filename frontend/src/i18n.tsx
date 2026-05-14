import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "zh" | "en";

const translations = {
  // PageHeader / pages
  "report.title": { zh: "施工日报", en: "Daily Report" },
  "report.subtitle": { zh: "Daily Crew Leader Report", en: "Daily Crew Leader Report" },
  "myReports.title": { zh: "我的报告", en: "My Reports" },
  "myReports.subtitle": { zh: "My Reports", en: "Report History" },
  "admin.title": { zh: "管理面板", en: "Admin Panel" },
  "admin.subtitle": { zh: "Admin Dashboard", en: "Admin Dashboard" },

  // Bottom tabs
  "tab.report": { zh: "报告", en: "Report" },
  "tab.myReports": { zh: "我的", en: "Mine" },
  "tab.admin": { zh: "管理", en: "Admin" },

  // Report form
  "voice.title": { zh: "语音录入", en: "Voice Input" },
  "voice.tap": { zh: "点击录音", en: "Tap to record" },
  "voice.tapStop": { zh: "点击停止", en: "Tap to stop" },
  "voice.recording": { zh: "录音中...", en: "Recording..." },
  "voice.preview": { zh: "录音完成，请试听", en: "Preview recording" },
  "voice.uploading": { zh: "上传中...", en: "Uploading..." },
  "voice.transcribing": { zh: "正在转换语音...", en: "Transcribing..." },
  "voice.summarizing": { zh: "正在整理文字...", en: "Summarizing..." },
  "voice.done": { zh: "完成", en: "Done" },
  "voice.reRecord": { zh: "重新录音", en: "Re-record" },
  "voice.confirmUpload": { zh: "确认上传", en: "Upload" },
  "voice.micError": { zh: "无法访问麦克风，请检查权限设置", en: "Cannot access microphone. Check permissions." },

  "video.title": { zh: "现场视频", en: "Site Video" },
  "video.tap": { zh: "拍摄现场视频", en: "Record site video" },
  "video.reShoot": { zh: "重新拍摄", en: "Re-shoot" },
  "video.confirm": { zh: "确认视频", en: "Confirm" },
  "video.uploading": { zh: "正在上传视频...", en: "Uploading video..." },
  "video.done": { zh: "视频已上传", en: "Video uploaded" },
  "video.error": { zh: "视频上传失败，请重试", en: "Video upload failed. Please retry." },

  "basic.title": { zh: "基础信息", en: "Basic Info" },
  "basic.date": { zh: "日期", en: "Date" },
  "basic.address": { zh: "工作地址 / 项目 *", en: "Work Address / Project *" },
  "basic.addressPlaceholder": { zh: "输入工作地址", en: "Enter work address" },
  "basic.leader": { zh: "领队姓名 *", en: "Crew Leader *" },
  "basic.leaderPlaceholder": { zh: "输入领队姓名", en: "Enter leader name" },
  "basic.panels": { zh: "今日安装太阳能板数量", en: "Panels Installed Today" },
  "basic.select": { zh: "请选择", en: "Select" },

  "plan.title": { zh: "今日施工计划完成情况", en: "Daily Plan Completion" },
  "plan.selectReason": { zh: "选择未完成原因", en: "Select reason" },
  "plan.otherPlaceholder": { zh: "请说明其他原因", en: "Please specify" },

  "attendance.title": { zh: "员工出勤", en: "Attendance" },
  "attendance.employee": { zh: "员工", en: "Employee" },
  "attendance.selectEmployee": { zh: "选择员工", en: "Select employee" },
  "attendance.namePlaceholder": { zh: "员工姓名", en: "Employee name" },
  "attendance.arrival": { zh: "到达", en: "Arrival" },
  "attendance.departure": { zh: "离开", en: "Departure" },
  "attendance.add": { zh: "添加员工", en: "Add employee" },
  "attendance.remove": { zh: "移除员工", en: "Remove employee" },

  "milestone.title": { zh: "施工阶段进度", en: "Milestone Progress" },
  "milestone.roughIn": { zh: "Rough-in", en: "Rough-in" },
  "milestone.finalInstall": { zh: "全部安装完成", en: "Final Installation" },
  "milestone.estimated": { zh: "预计完成", en: "Estimated" },
  "milestone.actual": { zh: "实际完成", en: "Actual" },
  "milestone.onSchedule": { zh: "是否按预期完成", en: "Completed on schedule?" },
  "milestone.selectReason": { zh: "选择原因", en: "Select reason" },
  "milestone.otherPlaceholder": { zh: "说明其他原因", en: "Please specify" },

  "submit.submitting": { zh: "提交中...", en: "Submitting..." },
  "submit.success": { zh: "提交成功！", en: "Submitted!" },
  "submit.button": { zh: "提交报告", en: "Submit Report" },
  "submit.requiredAlert": { zh: "请填写必填项：工作地址和领队姓名", en: "Please fill required fields: address and leader" },
  "submit.failAlert": { zh: "提交失败，请重试", en: "Submission failed. Please retry." },

  // Delay reasons
  "reason.weather": { zh: "天气", en: "Weather" },
  "reason.material": { zh: "材料短缺", en: "Material Shortage" },
  "reason.design": { zh: "设计问题", en: "Design Issue" },
  "reason.customer": { zh: "客户原因", en: "Customer Issue" },
  "reason.staff": { zh: "人员不足", en: "Understaffed" },
  "reason.equipment": { zh: "设备问题", en: "Equipment Issue" },
  "reason.other": { zh: "其他", en: "Other" },

  // My Reports
  "myReports.empty": { zh: "暂无报告记录", en: "No reports yet" },
  "myReports.leader": { zh: "领队", en: "Leader" },
  "myReports.panels": { zh: "块板", en: "panels" },

  // Status
  "status.completed": { zh: "已完成", en: "Completed" },
  "status.draft": { zh: "未完成", en: "Pending" },
  "status.anomaly": { zh: "异常", en: "Anomaly" },

  // Admin
  "admin.tab.overview": { zh: "总览", en: "Overview" },
  "admin.tab.projects": { zh: "项目", en: "Projects" },
  "admin.tab.leaders": { zh: "领队", en: "Leaders" },
  "admin.tab.employees": { zh: "员工", en: "Employees" },
  "admin.tab.reports": { zh: "报告", en: "Reports" },

  "admin.stat.total": { zh: "总报告", en: "Total" },
  "admin.stat.completed": { zh: "已完成", en: "Done" },
  "admin.stat.pending": { zh: "待处理", en: "Pending" },
  "admin.stat.anomaly": { zh: "异常", en: "Anomaly" },
  "admin.stat.panels": { zh: "总板数", en: "Panels" },
  "admin.stat.projects": { zh: "项目数", en: "Projects" },

  "admin.manage": { zh: "管理", en: "Manage" },
  "admin.add": { zh: "添加", en: "Add" },
  "admin.delete": { zh: "删除", en: "Delete" },
  "admin.confirmDel": { zh: "确认", en: "OK" },
  "admin.noData": { zh: "数据，请添加", en: "data yet. Add some." },
  "admin.total": { zh: "共", en: "Total" },
  "admin.items": { zh: "条", en: "" },
  "admin.allReports": { zh: "全部报告", en: "All Reports" },
  "admin.noReports": { zh: "暂无报告", en: "No reports" },
  "admin.projectPlaceholder": { zh: "输入项目地址，例如: 123 Main St", en: "Enter address, e.g. 123 Main St" },
  "admin.leaderPlaceholder": { zh: "输入领队姓名", en: "Enter leader name" },
  "admin.employeePlaceholder": { zh: "输入员工姓名", en: "Enter employee name" },

  // Login
  "login.subtitle": { zh: "施工日报管理系统", en: "Construction Report System" },
  "login.username": { zh: "用户名", en: "Username" },
  "login.password": { zh: "密码", en: "Password" },
  "login.usernamePlaceholder": { zh: "请输入用户名", en: "Enter username" },
  "login.passwordPlaceholder": { zh: "请输入密码", en: "Enter password" },
  "login.button": { zh: "登录", en: "Sign In" },
  "login.loggingIn": { zh: "登录中...", en: "Signing in..." },
  "login.required": { zh: "请输入用户名和密码", en: "Username and password required" },
  "login.failed": { zh: "用户名或密码错误", en: "Invalid credentials" },

  // Auth
  "auth.logout": { zh: "退出", en: "Logout" },
  "auth.noAccess": { zh: "无权限访问", en: "Access Denied" },

  // Report Detail Modal
  "detail.title": { zh: "报告详情", en: "Report Detail" },
  "detail.basicInfo": { zh: "基本信息", en: "Basic Info" },
  "detail.planCompletion": { zh: "计划完成情况", en: "Plan Completion" },
  "detail.planYes": { zh: "已完成", en: "Completed" },
  "detail.planNo": { zh: "未完成", en: "Not Completed" },
  "detail.attendance": { zh: "员工出勤", en: "Attendance" },
  "detail.milestones": { zh: "施工阶段", en: "Milestones" },
  "detail.voiceRecordings": { zh: "语音记录", en: "Voice Recordings" },
  "detail.rawText": { zh: "语音原文", en: "Raw Transcript" },
  "detail.processedText": { zh: "整理后文字", en: "Processed Text" },
  "detail.noRecordings": { zh: "暂无语音记录", en: "No voice recordings" },
  "detail.video": { zh: "现场视频", en: "Site Video" },
  "detail.noVideo": { zh: "暂无视频", en: "No video" },
  "detail.close": { zh: "关闭", en: "Close" },
  "detail.yes": { zh: "是", en: "Yes" },
  "detail.no": { zh: "否", en: "No" },
  "detail.date": { zh: "日期", en: "Date" },
  "detail.address": { zh: "地址", en: "Address" },
  "detail.leader": { zh: "领队", en: "Leader" },
  "detail.panels": { zh: "安装板数", en: "Panels" },
  "detail.employee": { zh: "员工", en: "Employee" },
  "detail.arrival": { zh: "到达", en: "Arrival" },
  "detail.departure": { zh: "离开", en: "Departure" },
  "detail.estimated": { zh: "预计", en: "Est." },
  "detail.actual": { zh: "实际", en: "Actual" },
  "detail.onSchedule": { zh: "按计划", en: "On Schedule" },
  "detail.reason": { zh: "原因", en: "Reason" },
} as const;

type TransKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TransKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "zh",
  setLang: () => {},
  t: (key) => translations[key]?.zh || key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem("fft-lang") as Lang) || "zh";
    } catch {
      return "zh";
    }
  });

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    try { localStorage.setItem("fft-lang", newLang); } catch {}
  };

  const t = (key: TransKey): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
