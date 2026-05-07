"""Seed initial dropdown options into the database."""
import asyncio
from app.database import async_session, init_db
from app.models import DropdownOption


SEED_DATA = {
    "project_list": [
        "123 Main St, Calgary",
        "456 Oak Ave, Edmonton",
        "789 Pine Rd, Red Deer",
        "321 Maple Dr, Lethbridge",
        "654 Cedar Ln, Airdrie",
    ],
    "crew_leader_list": [
        "张三",
        "李四",
        "王五",
        "赵六",
    ],
    "employee_list": [
        "刘一",
        "陈二",
        "周三",
        "吴四",
        "郑五",
        "钱六",
        "孙七",
        "杨八",
    ],
}


async def seed():
    await init_db()
    async with async_session() as session:
        for category, values in SEED_DATA.items():
            for i, value in enumerate(values):
                option = DropdownOption(
                    category=category,
                    value=value,
                    sort_order=i,
                )
                session.add(option)
        await session.commit()
        print("Seed data inserted successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
