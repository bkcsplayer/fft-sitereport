from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class FallProtectionPlanCreate(BaseModel):
    employer_name: str = "FIREFLY SOLAR"
    fall_hazards: Optional[str] = None
    fall_protection_system: Optional[str] = None
    anchor_type: Optional[str] = None
    anchor_count: Optional[int] = None
    system_procedures: Optional[str] = None
    rescue_self: bool = False
    rescue_assisted_roof: bool = False
    rescue_ladder: bool = False
    rescue_awp: bool = False
    rescue_fire_dept: bool = False
    clearance_a: Optional[float] = None
    clearance_b: Optional[float] = None
    clearance_c: Optional[float] = None
    clearance_d: Optional[float] = None
    clearance_e: Optional[float] = None
    clearance_f_total: Optional[float] = None


class FallProtectionPlanResponse(BaseModel):
    id: UUID
    site_report_id: UUID
    employer_name: str
    fall_hazards: Optional[str] = None
    fall_protection_system: Optional[str] = None
    anchor_type: Optional[str] = None
    anchor_count: Optional[int] = None
    system_procedures: Optional[str] = None
    rescue_self: bool
    rescue_assisted_roof: bool
    rescue_ladder: bool
    rescue_awp: bool
    rescue_fire_dept: bool
    clearance_a: Optional[float] = None
    clearance_b: Optional[float] = None
    clearance_c: Optional[float] = None
    clearance_d: Optional[float] = None
    clearance_e: Optional[float] = None
    clearance_f_total: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HazardAssessmentCreate(BaseModel):
    all_hazards_reviewed: Optional[bool] = None
    hazard_items: Optional[list] = None


class HazardAssessmentResponse(BaseModel):
    id: UUID
    site_report_id: UUID
    all_hazards_reviewed: Optional[bool] = None
    hazard_items: Optional[list] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
