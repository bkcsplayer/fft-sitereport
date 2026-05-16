# Legacy schemas (v1.0)
from app.schemas.legacy import (
    ReportCreate, ReportResponse, ReportListItem,
    AttendanceRecordCreate, AttendanceRecordResponse,
    MilestoneCreate, MilestoneResponse,
    VoiceRecordingResponse, VoiceTranscribeResponse,
    DropdownOptionCreate, DropdownOptionResponse,
    AdminStats,
)
# v2.0 schemas
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeListItem as EmployeeListItemSchema,
    CertificateCreate, CertificateResponse,
)
from app.schemas.site_report import (
    SiteReportCreate, SiteReportUpdate, SiteReportResponse, SiteReportListItem,
    SiteReportWorkerCreate, SiteReportWorkerResponse,
)
from app.schemas.signature import (
    SignatureCreate, SignatureResponse, SignatureMatrixRow,
    SignatureProgressResponse, DocumentSnapshotResponse,
)
from app.schemas.safety import (
    FallProtectionPlanCreate, FallProtectionPlanResponse,
    HazardAssessmentCreate, HazardAssessmentResponse,
)
