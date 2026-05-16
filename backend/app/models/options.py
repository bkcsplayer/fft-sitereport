import uuid
import enum
from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

class OptionCategory(str, enum.Enum):
    PROJECT_LIST = "project_list"
    CREW_LEADER_LIST = "crew_leader_list"
    EMPLOYEE_LIST = "employee_list"

class DropdownOption(Base):
    __tablename__ = "dropdown_options"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[str] = mapped_column(String(300), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
