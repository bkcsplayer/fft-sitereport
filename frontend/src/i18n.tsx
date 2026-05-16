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
  "video.noAddress": { zh: "请先填写工作地址", en: "Please fill in the work address first" },

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

  // ─── v2.0: New pages ──────────────────────────────────

  "home.title": { zh: "工地安全报告", en: "Site Safety Report" },
  "home.subtitle": { zh: "v2.0 — 完整工地安全方案", en: "v2.0 — Complete Site Safety Package" },
  "home.newReport": { zh: "新建工地报告", en: "New Site Report" },
  "home.newReportDesc": { zh: "创建新的安全报告，含高空作业保护方案及危险评估", en: "Start a new safety report with FPP & Hazard Assessment" },
  "home.siteReports": { zh: "工地报告", en: "Site Reports" },
  "home.siteReportsDesc": { zh: "查看所有工地报告及签署状态", en: "View all site reports and signature status" },
  "home.employees": { zh: "员工管理", en: "Employee Admin" },
  "home.employeesDesc": { zh: "管理员工及证书", en: "Manage employees and certificates" },
  "home.legacyReport": { zh: "日报 (旧版)", en: "Daily Report (Legacy)" },
  "home.legacyReportDesc": { zh: "原版每日领队日报", en: "Original daily crew leader report" },

  "wizard.step.media": { zh: "现场媒体", en: "Site Media" },
  "wizard.step.basic": { zh: "基本信息", en: "Basic Info" },
  "wizard.step.crew": { zh: "员工选择", en: "Crew" },
  "wizard.step.fpp": { zh: "高空作业保护方案", en: "FPP" },
  "wizard.step.ha": { zh: "危险评估", en: "HA" },
  "wizard.step.review": { zh: "生成签署", en: "Review" },
  "wizard.next": { zh: "下一步", en: "Next" },
  "wizard.back": { zh: "上一步", en: "Back" },
  "wizard.saving": { zh: "保存中...", en: "Saving..." },
  "wizard.generate": { zh: "生成文件", en: "Generate Documents" },

  "employee.title": { zh: "员工管理", en: "Employee Admin" },
  "employee.subtitle": { zh: "管理员工及证书", en: "Manage employees and certificates" },
  "employee.add": { zh: "添加员工", en: "Add Employee" },
  "employee.name": { zh: "姓名", en: "Name" },
  "employee.role": { zh: "职位", en: "Role" },
  "employee.phone": { zh: "电话", en: "Phone" },
  "employee.email": { zh: "邮箱", en: "Email" },
  "employee.notes": { zh: "备注", en: "Notes" },
  "employee.certs": { zh: "证书", en: "Cert(s)" },
  "employee.inactive": { zh: "未激活", en: "Inactive" },
  "employee.active": { zh: "在岗", en: "Active" },
  "employee.save": { zh: "保存员工", en: "Save Employee" },

  "cert.title": { zh: "证书", en: "Certificates" },
  "cert.add": { zh: "添加", en: "Add" },
  "cert.type": { zh: "类型", en: "Type" },
  "cert.number": { zh: "编号", en: "Number" },
  "cert.issue": { zh: "签发日期", en: "Issue Date" },
  "cert.expiry": { zh: "到期日期", en: "Expiry Date" },
  "cert.valid": { zh: "有效", en: "Valid" },
  "cert.expiring_soon": { zh: "即将到期", en: "Expiring Soon" },
  "cert.expired": { zh: "已过期", en: "Expired" },
  "cert.missing": { zh: "未提供", en: "Missing" },
  "cert.upload": { zh: "上传图片", en: "Upload Image" },
  "cert.changeImage": { zh: "更换图片", en: "Change Image" },
  "cert.uploading": { zh: "上传中...", en: "Uploading..." },
  "cert.delete": { zh: "删除证书", en: "Delete Certificate" },
  "cert.deleteConfirm": { zh: "确认删除此证书？", en: "Delete this certificate?" },
  "cert.addCert": { zh: "添加证书", en: "Add Certificate" },
  "cert.saving": { zh: "保存中...", en: "Saving..." },
  "cert.cancel": { zh: "取消", en: "Cancel" },
  "cert.none": { zh: "暂无证书", en: "No certificates yet" },
  "cert.fall_protection": { zh: "高空作业保护", en: "Fall Protection" },
  "cert.first_aid": { zh: "急救", en: "First Aid" },
  "cert.electrical": { zh: "电气", en: "Electrical" },
  "cert.driver_license": { zh: "驾照", en: "Driver License" },
  "cert.other": { zh: "其他", en: "Other" },

  "sign.title": { zh: "签署文件", en: "Sign Document" },
  "sign.fpp": { zh: "高空作业保护方案", en: "Fall Protection Plan" },
  "sign.ha": { zh: "危险评估", en: "Hazard Assessment" },
  "sign.drawPrompt": { zh: "请在此处签名", en: "Please sign above" },
  "sign.confirm": { zh: "我确认已阅读并理解本文件内容。我承认有责任遵守文件中列出的所有安全程序。", en: "I confirm that I have read and understood this document. I acknowledge my responsibility to follow all safety procedures outlined in this document." },
  "sign.save": { zh: "签署文件", en: "Sign Document" },
  "sign.saving": { zh: "保存中...", en: "Saving..." },
  "sign.done": { zh: "文件已签署", en: "Document Signed" },
  "sign.doneMsg": { zh: "已由以下人员签署：", en: "has been signed by:" },
  "sign.backToReport": { zh: "返回报告", en: "Back to Report" },
  "sign.error": { zh: "签署失败，请重试", en: "Signature failed. Please try again." },

  "snap.title": { zh: "已签署文件", en: "Signed Document" },
  "snap.open": { zh: "打开", en: "Open" },
  "snap.notFound": { zh: "未找到文件", en: "No document specified" },
  "snap.goBack": { zh: "返回", en: "Go Back" },

  "reportList.title": { zh: "工地报告", en: "Site Reports" },
  "reportList.subtitle": { zh: "完整安全报告档案", en: "Complete safety report dossiers" },
  "reportList.new": { zh: "新建工地报告", en: "New Site Report" },
  "reportList.empty": { zh: "暂无工地报告", en: "No site reports yet" },
  "reportList.signed": { zh: "已签署", en: "signed" },
  "reportList.crew": { zh: "领队", en: "Crew" },

  "reportDetail.title": { zh: "报告详情", en: "Report Detail" },
  "reportDetail.basicInfo": { zh: "基本信息", en: "Basic Information" },
  "reportDetail.crew": { zh: "工作人员", en: "Crew" },
  "reportDetail.video": { zh: "现场视频", en: "Site Video" },
  "reportDetail.noVideo": { zh: "未录制视频", en: "No video recorded" },
  "reportDetail.audio": { zh: "语音记录", en: "Audio Notes" },
  "reportDetail.noAudio": { zh: "无语音记录", en: "No audio notes" },
  "reportDetail.fpp": { zh: "高空作业保护方案", en: "Fall Protection Plan" },
  "reportDetail.ha": { zh: "危险评估", en: "Hazard Assessment" },
  "reportDetail.signatures": { zh: "签署状态", en: "Signatures" },
  "reportDetail.signingPanel": { zh: "打开签署面板", en: "Open Signing Panel" },
  "reportDetail.back": { zh: "返回报告列表", en: "Back to Reports" },
  "reportDetail.notFound": { zh: "未找到报告", en: "Report not found" },

  "signature.complete": { zh: "已完成", en: "Complete" },
  "signature.pending": { zh: "待签署", en: "Pending" },
  "signature.worker": { zh: "工人", en: "Worker" },
  "signature.fpp": { zh: "高空作业保护方案", en: "Fall Protection Plan" },
  "signature.ha": { zh: "危险评估", en: "Hazard Assessment" },
  "signature.status": { zh: "状态", en: "Status" },
  "signature.signed": { zh: "已签署", en: "Signed" },
  "signature.notSigned": { zh: "未签署", en: "Not Signed" },
  "signature.signNow": { zh: "立即签署", en: "Sign Now" },
  "signature.signaturesCompleted": { zh: "份签署已完成", en: "signatures completed" },
  "signature.lead": { zh: "领队", en: "Lead" },
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
