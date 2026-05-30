from __future__ import annotations

import csv
from io import BytesIO, StringIO
from typing import Any
from xml.etree import ElementTree
from zipfile import ZipFile


def parse_import_file(file_name: str, content: bytes) -> dict[str, Any]:
    lower = file_name.lower()
    rows = _parse_csv(content) if lower.endswith(".csv") else _parse_xlsx(content)
    if not rows:
        return {"rows": [], "fields": {}, "rowCount": 0}
    headers = [str(value).strip() for value in rows[0]]
    data_rows = [row for row in rows[1:] if any(str(value).strip() for value in row)]
    records = [dict(zip(headers, [*row, *([""] * max(0, len(headers) - len(row)))])) for row in data_rows]
    first = records[0] if records else {}
    return {
        "rows": records,
        "rowCount": len(records),
        "fields": {
            "productModel": _pick(first, ["产品型号", "型号", "productModel", "model"]),
            "productName": _pick(first, ["产品名称", "商品名称", "productName", "product"]),
            "productPrice": _pick(first, ["价格", "产品价格", "price", "productPrice"]),
            "productSlogan": _pick(first, ["产品slogan", "slogan", "产品口号", "productSlogan"]),
            "primarySellingPoint": _pick(first, ["主卖点", "核心卖点", "primarySellingPoint", "mainSellingPoint"]),
            "auxiliarySellingPoint": _pick(first, ["辅助卖点", "其他卖点", "auxiliarySellingPoint", "sellingPoints"]),
            "targetGroups": _pick(first, ["目标人群", "适合人群", "用户人群", "targetGroups", "suitableCrowd"]),
            "suitableScene": _pick(first, ["使用场景", "适用场景", "场景", "suitableScene"]),
            "specialSellingPoint": _pick(first, ["差异化说明", "特色卖点", "差异化卖点", "specialSellingPoint"]),
            "otherRequirements": _pick(first, ["备注", "其他要求", "otherRequirements"]),
        },
    }


def map_import_record(row: dict[str, Any]) -> dict[str, str]:
    return {
        "productModel": _pick(row, ["产品型号", "型号", "productModel", "model"]),
        "productName": _pick(row, ["产品名称", "商品名称", "productName", "product"]),
        "productPrice": _pick(row, ["价格", "产品价格", "price", "productPrice"]),
        "productSlogan": _pick(row, ["产品slogan", "slogan", "产品口号", "productSlogan"]),
        "specialSellingPoint": _pick(row, ["特色卖点", "差异化说明", "差异化卖点", "specialSellingPoint"]),
        "primarySellingPoint": _pick(row, ["主卖点", "核心卖点", "primarySellingPoint", "mainSellingPoint"]),
        "auxiliarySellingPoint": _pick(row, ["辅助卖点", "其他卖点", "auxiliarySellingPoint", "sellingPoints"]),
        "targetGroups": _pick(row, ["目标人群", "适合人群", "用户人群", "targetGroups", "suitableCrowd"]),
        "suitableScene": _pick(row, ["目标场景", "使用场景", "适用场景", "场景", "suitableScene"]),
        "otherRequirements": _pick(row, ["备注", "其他要求", "otherRequirements"]),
    }


def _parse_csv(content: bytes) -> list[list[str]]:
    text = content.decode("utf-8-sig", errors="ignore")
    return [row for row in csv.reader(StringIO(text))]


def _parse_xlsx(content: bytes) -> list[list[str]]:
    with ZipFile(BytesIO(content)) as archive:
        shared_strings = _shared_strings(archive)
        sheet_name = _first_sheet_name(archive)
        root = ElementTree.fromstring(archive.read(sheet_name))
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    rows: list[list[str]] = []
    for row in root.findall(".//x:sheetData/x:row", ns):
        values: list[str] = []
        for cell in row.findall("x:c", ns):
            values.append(_cell_value(cell, shared_strings, ns))
        rows.append(values)
    return rows


def _shared_strings(archive: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    values: list[str] = []
    for item in root.findall("x:si", ns):
        values.append("".join(node.text or "" for node in item.findall(".//x:t", ns)))
    return values


def _first_sheet_name(archive: ZipFile) -> str:
    names = [name for name in archive.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")]
    if not names:
        raise ValueError("No worksheet found")
    return sorted(names)[0]


def _cell_value(cell: ElementTree.Element, shared_strings: list[str], ns: dict[str, str]) -> str:
    value = cell.find("x:v", ns)
    raw = value.text if value is not None else ""
    if cell.attrib.get("t") == "s" and raw.isdigit():
        index = int(raw)
        return shared_strings[index] if index < len(shared_strings) else ""
    inline = cell.find("x:is/x:t", ns)
    return inline.text if inline is not None else raw


def _normalize(value: str) -> str:
    return value.replace(" ", "").replace("_", "").replace("-", "").replace("/", "").lower()


def _pick(row: dict[str, Any], aliases: list[str]) -> str:
    normalized = { _normalize(key): str(value or "").strip() for key, value in row.items() }
    for alias in aliases:
        target = _normalize(alias)
        for key, value in normalized.items():
            if value and (key == target or key in target or target in key):
                return value
    return ""
