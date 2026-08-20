"""Build deterministic DOCX/PDF output locators for AVES official forms.

The script never edits the retained official templates.  It resolves each
verified checklist mapping to a concrete DOCX table row and PDF row box, then
writes a compact runtime manifest consumed by the browser application.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import pdfplumber
from docx import Document


ROOT = Path(__file__).resolve().parents[1]
MAPPINGS = ROOT / "form-mappings"
TEMPLATES = ROOT / "form-templates"
APP_ASSETS = ROOT / "app" / "form-assets"
LIBRARY = ROOT / "data" / "madde_kutuphanesi.json"


FORMS = {
    "UB_FR_38_R04": {
        "code": "ÜB.FR.38",
        "revision": "R.04",
        "standard": "81-20",
        "docx": "UB_FR_38_R04.docx",
        "pdf": "UB_FR_38_R04.pdf",
        "mapping": "ub-fr-38-r04.mapping.json",
        "measurement_mapping": "ub-fr-38-r04.measurement-mapping.json",
        "checklist_tables": [10, 11],
        "criterion_cell": 1,
        "result_cell": 3,
        "measurement_cell": 4,
        "notes_cell": 5,
        "preinspection_table": 4,
        "preinspection_result_cell": 3,
        "preinspection_notes_cell": 4,
        "basic_table": 5,
        "component_table": 6,
        "drive_table": 7,
        "shaft_table": 8,
        "pdf_columns": {"result": [323.4, 370.22], "measurement": [370.22, 423.53], "notes": [423.53, 529.85]},
        "result_values": {"Kontrol tamamlandı": "✓", "Olumsuz bulgu": "×", "Uygulanmaz": "-"},
    },
    "UB_FR_39_R02": {
        "code": "ÜB.FR.39",
        "revision": "R.02",
        "standard": "81-1/2+A3",
        "docx": "UB_FR_39_R02.docx",
        "pdf": "UB_FR_39_R02.pdf",
        "mapping": "ub-fr-39-r02.mapping.json",
        "measurement_mapping": "ub-fr-39-r02.measurement-mapping.json",
        "checklist_tables": [12],
        "criterion_cell": 2,
        "result_cell": 5,
        "measurement_cell": 3,
        "notes_cell": 6,
        "preinspection_table": 5,
        "preinspection_result_cell": 2,
        "preinspection_notes_cell": 3,
        "basic_table": 6,
        "component_table": 7,
        "drive_table": 8,
        "shaft_table": 9,
        "pdf_columns": {"measurement": [522.62, 593.69], "result": [650.35, 692.83], "notes": [692.83, 827.6]},
        "result_values": {"Kontrol tamamlandı": "1", "Olumsuz bulgu": "2", "Uygulanmaz": "3"},
    },
}

# Rows whose official wording was deliberately simplified/split in the app.
# These locators were checked directly against the retained R.04 DOCX.
DOCX_OVERRIDES = {
    "UB_FR_38_R04": {
        "MAD-0036": [10, 32], "MAD-0037": [10, 33], "MAD-0077": [10, 86],
        "MAD-0269": [11, 10], "MAD-0270": [11, 11], "MAD-0275": [11, 16],
        "MAD-0282": [11, 25], "MAD-0284": [11, 28], "MAD-0290": [11, 36],
        "MAD-0296": [11, 42], "MAD-0305": [11, 51], "MAD-0306": [11, 52],
        "MAD-0307": [11, 53], "MAD-0549": [11, 310],
    }
}

PDF_OVERRIDES = {
    "UB_FR_38_R04": {
        "MAD-0017": [2, 710.35, 779.39],
        "MAD-0123": [12, 721.69, 771.07],
    },
    "UB_FR_39_R02": {
        "MAD-0310": [6, 282.60, 526.28],
    },
}


def norm(value: str | None) -> str:
    value = (value or "").casefold().replace("ı", "i")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "", value)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def row_key(table_index: int, row_index: int) -> tuple[int, int]:
    return table_index, row_index


def assign_docx_rows(form_key: str, spec: dict, mappings: list[dict], library: dict[str, dict]) -> tuple[dict, list]:
    document = Document(TEMPLATES / spec["docx"])
    candidates: list[dict] = []
    for table_index in spec["checklist_tables"]:
        table = document.tables[table_index]
        for row_index, row in enumerate(table.rows):
            text = row.cells[spec["criterion_cell"]].text.strip()
            if text:
                candidates.append({
                    "table": table_index,
                    "row": row_index,
                    "text": text,
                    "norm": norm(text),
                    "standard": norm(row.cells[0].text),
                })

    by_text: dict[str, list[dict]] = defaultdict(list)
    for candidate in candidates:
        by_text[candidate["norm"]].append(candidate)

    result: dict[str, dict] = {}
    used: set[tuple[int, int]] = set()
    pending: list[tuple[dict, str]] = []
    mapping_groups: dict[str, list[dict]] = defaultdict(list)
    for mapping in mappings:
        source = library[mapping["madde_id"]]
        official = source.get("resmi_madde_metni") or source.get("denetci_yonlendirmesi") or ""
        mapping_groups[norm(official)].append(mapping)

    for madde_id, (table_index, row_index) in DOCX_OVERRIDES.get(form_key, {}).items():
        result[madde_id] = {
            "table": table_index, "row": row_index,
            "result_cell": spec["result_cell"],
            "measurement_cell": spec["measurement_cell"],
            "notes_cell": spec["notes_cell"],
        }
        used.add(row_key(table_index, row_index))

    # Repeated official text occurs in different physical sections.  The app
    # ordering and the template ordering are both authoritative, so pair each
    # equal-text group in order when cardinality agrees.
    for official_norm, group in mapping_groups.items():
        group = [item for item in group if item["madde_id"] not in result]
        if not group:
            continue
        rows = by_text.get(official_norm, [])
        if official_norm and len(rows) == len(group):
            for mapping, candidate in zip(sorted(group, key=lambda x: x["app_sira_no"]), rows):
                result[mapping["madde_id"]] = {
                    "table": candidate["table"], "row": candidate["row"],
                    "result_cell": spec["result_cell"],
                    "measurement_cell": spec["measurement_cell"],
                    "notes_cell": spec["notes_cell"],
                }
                used.add(row_key(candidate["table"], candidate["row"]))
        else:
            for mapping in group:
                pending.append((mapping, official_norm))

    unresolved = []
    for mapping, official_norm in pending:
        # Named top-of-form measurement blocks deliberately have no checklist
        # result row; their field-level locators are handled separately.
        if mapping["madde_id"] in {"MAD-0008A", "MAD-0008B", "MAD-0008C", "MAD-0008D", "MAD-0008E"}:
            continue
        available = [c for c in candidates if row_key(c["table"], c["row"]) not in used]
        standard = norm(mapping.get("standart_madde_no"))
        scored = []
        for candidate in available:
            text_score = SequenceMatcher(None, official_norm, candidate["norm"]).ratio()
            std_score = SequenceMatcher(None, standard, candidate["standard"]).ratio() if standard else 0
            scored.append((text_score + 0.15 * std_score, text_score, candidate))
        scored.sort(key=lambda item: item[0], reverse=True)
        if scored and scored[0][1] >= 0.72:
            candidate = scored[0][2]
            result[mapping["madde_id"]] = {
                "table": candidate["table"], "row": candidate["row"],
                "result_cell": spec["result_cell"],
                "measurement_cell": spec["measurement_cell"],
                "notes_cell": spec["notes_cell"],
            }
            used.add(row_key(candidate["table"], candidate["row"]))
        else:
            unresolved.append({"madde_id": mapping["madde_id"], "best_score": scored[0][1] if scored else 0})
    return result, unresolved


def pdf_rows(pdf_path: Path) -> list[dict]:
    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            for table in page.find_tables():
                width = table.bbox[2] - table.bbox[0]
                if width < page.width * 0.75:
                    continue
                extracted = table.extract()
                for row_index, row in enumerate(table.rows):
                    values = extracted[row_index] if row_index < len(extracted) else []
                    cells = [cell for cell in row.cells if cell]
                    if not cells:
                        continue
                    # Criteria are the widest text-bearing cell in official
                    # checklist rows.  Header and footer rows naturally fail
                    # later text matching.
                    text_cells = []
                    for cell, value in zip(row.cells, values):
                        if cell and value:
                            text_cells.append((cell[2] - cell[0], value))
                    if not text_cells:
                        continue
                    criterion = max(text_cells, key=lambda item: item[0])[1]
                    y0 = min(cell[1] for cell in cells)
                    y1 = max(cell[3] for cell in cells)
                    standard = next((value for value in values[:3] if value), "")
                    rows.append({"page": page_index, "y0": y0, "y1": y1, "text": criterion,
                        "norm": norm(criterion), "standard": norm(standard)})
    return rows


def assign_pdf_rows(form_key: str, spec: dict, mappings: list[dict], library: dict[str, dict]) -> tuple[dict, list]:
    candidates = pdf_rows(TEMPLATES / spec["pdf"])
    result = {}
    unresolved = []
    used: set[tuple[int, int, int]] = set()
    for madde_id, (page, y0, y1) in PDF_OVERRIDES.get(form_key, {}).items():
        result[madde_id] = {
            "page": page, "y0": y0, "y1": y1,
            "result": spec["pdf_columns"]["result"],
            "measurement": spec["pdf_columns"]["measurement"],
            "notes": spec["pdf_columns"]["notes"],
        }
        used.add((page, round(y0), round(y1)))
    for mapping in mappings:
        if mapping["madde_id"] in result:
            continue
        if mapping["madde_id"] in {"MAD-0008A", "MAD-0008B", "MAD-0008C", "MAD-0008D", "MAD-0008E"}:
            continue
        source = library[mapping["madde_id"]]
        official = norm(source.get("resmi_madde_metni") or source.get("denetci_yonlendirmesi") or "")
        standard = norm(mapping.get("standart_madde_no"))
        allowed_pages = {page - 1 for page in mapping.get("candidate_pdf_pages", [])}
        pool = [c for c in candidates if (not allowed_pages or c["page"] in allowed_pages) and (c["page"], round(c["y0"]), round(c["y1"])) not in used]
        scored = []
        for candidate in pool:
            text_score = SequenceMatcher(None, official, candidate["norm"]).ratio()
            candidate_standard = candidate.get("standard") or ""
            standard_exact = bool(standard and candidate_standard and (standard in candidate_standard or candidate_standard in standard))
            score = text_score + (0.55 if standard_exact else 0)
            scored.append((score, text_score, standard_exact, candidate))
        scored.sort(key=lambda x: x[0], reverse=True)
        if scored and (scored[0][1] >= 0.70 or (scored[0][2] and scored[0][1] >= 0.20)):
            _, _, _, candidate = scored[0]
            result[mapping["madde_id"]] = {
                "page": candidate["page"], "y0": round(candidate["y0"], 2), "y1": round(candidate["y1"], 2),
                "result": spec["pdf_columns"]["result"],
                "measurement": spec["pdf_columns"]["measurement"],
                "notes": spec["pdf_columns"]["notes"],
            }
            used.add((candidate["page"], round(candidate["y0"]), round(candidate["y1"])))
        else:
            unresolved.append({"madde_id": mapping["madde_id"], "best_score": scored[0][1] if scored else 0, "pages": sorted(allowed_pages)})
    return result, unresolved


def main() -> None:
    library_rows = json.loads(LIBRARY.read_text(encoding="utf-8"))
    library = {row["madde_id"]: row for row in library_rows}
    APP_ASSETS.mkdir(parents=True, exist_ok=True)
    manifest = {"schema_version": 1, "forms": {}}
    failures = []
    for key, spec in FORMS.items():
        mapping = json.loads((MAPPINGS / spec["mapping"]).read_text(encoding="utf-8"))
        checklist = mapping["checklist_mappings"]
        docx, docx_unresolved = assign_docx_rows(key, spec, checklist, library)
        pdf, pdf_unresolved = assign_pdf_rows(key, spec, checklist, library)
        expected = len(checklist) - sum(1 for item in checklist if item["madde_id"] in {"MAD-0008A", "MAD-0008B", "MAD-0008C", "MAD-0008D", "MAD-0008E"})
        manifest["forms"][key] = {
            "code": spec["code"], "revision": spec["revision"], "standard": spec["standard"],
            "docx_template": f"form-assets/{spec['docx']}", "pdf_template": f"form-assets/{spec['pdf']}",
            "docx_sha256": sha256(TEMPLATES / spec["docx"]), "pdf_sha256": sha256(TEMPLATES / spec["pdf"]),
            "mapping_sha256": sha256(MAPPINGS / spec["mapping"]),
            "measurement_mapping_sha256": sha256(MAPPINGS / spec["measurement_mapping"]),
            "result_values": spec["result_values"],
            "preinspection": {
                item["madde_id"]: {"table": spec["preinspection_table"], "row": index + 1,
                    "result_cell": spec["preinspection_result_cell"], "notes_cell": spec["preinspection_notes_cell"]}
                for index, item in enumerate(mapping.get("preinspection_mappings", []))
            },
            "docx_rows": docx, "pdf_rows": pdf,
            "layout": {name: spec[name] for name in ["basic_table", "component_table", "drive_table", "shaft_table"]},
            "validation": {"expected": expected, "docx_mapped": len(docx), "pdf_mapped": len(pdf),
                "docx_unresolved": docx_unresolved, "pdf_unresolved": pdf_unresolved},
        }
        if len(docx) != expected or len(pdf) != expected:
            failures.append((key, expected, len(docx), len(pdf), docx_unresolved, pdf_unresolved))

    (APP_ASSETS / "form-output-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    for spec in FORMS.values():
        for name in [spec["docx"], spec["pdf"]]:
            target = APP_ASSETS / name
            target.write_bytes((TEMPLATES / name).read_bytes())
    if failures:
        raise SystemExit(json.dumps(failures, ensure_ascii=False, indent=2))
    print(json.dumps({key: value["validation"] for key, value in manifest["forms"].items()}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
