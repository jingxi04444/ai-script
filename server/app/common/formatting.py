from datetime import datetime, timezone
from decimal import Decimal
from typing import Any


def as_id(value: Any) -> str:
    return str(value)


def cn_status(status: str | None) -> str:
    return {
        "enabled": "启用",
        "disabled": "停用",
        "trial": "试用",
        "success": "成功",
        "succeeded": "成功",
        "completed": "成功",
        "failed": "失败",
        "pending": "待处理",
        "running": "重试中",
        "approved": "已通过",
        "rejected": "已驳回",
    }.get(status or "", status or "")


def risk_label(value: str | None) -> str:
    return {"low": "低", "medium": "中", "high": "高"}.get(value or "", value or "低")


def time_label(value: datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.strftime("%Y-%m-%d %H:%M:%S")


def bytes_label(value: int | None) -> str:
    size = float(value or 0)
    units = ["B", "KB", "MB", "GB", "TB"]
    unit = units[0]
    for unit in units:
        if size < 1024 or unit == units[-1]:
            break
        size /= 1024
    if unit == "B":
        return f"{int(size)}{unit}"
    return f"{size:.1f}{unit}"


def decimal_to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return value
