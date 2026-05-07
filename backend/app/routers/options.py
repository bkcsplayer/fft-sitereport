from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import DropdownOption
from app.schemas import DropdownOptionCreate, DropdownOptionResponse

router = APIRouter()


@router.get("/{category}", response_model=list[DropdownOptionResponse])
async def get_options(category: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DropdownOption)
        .where(DropdownOption.category == category, DropdownOption.is_active == True)
        .order_by(DropdownOption.sort_order)
    )
    return result.scalars().all()


@router.post("/", response_model=DropdownOptionResponse)
async def create_option(data: DropdownOptionCreate, db: AsyncSession = Depends(get_db)):
    option = DropdownOption(
        category=data.category,
        value=data.value,
        sort_order=data.sort_order,
    )
    db.add(option)
    await db.commit()
    await db.refresh(option)
    return option


@router.delete("/{option_id}")
async def delete_option(option_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DropdownOption).where(DropdownOption.id == option_id))
    option = result.scalar_one_or_none()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    option.is_active = False
    await db.commit()
    return {"status": "deleted"}
