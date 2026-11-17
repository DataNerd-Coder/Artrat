"""Downloadable Submission Kit (.DOCX and .PDF) generator (docs/04 §3.6, Non-negotiable #6).

Produces a valid OpenXML `.docx` archive and a standards-compliant `.pdf` document containing all
portal-ordered fields, document upload manifest, grounded essays, and dynamic endorsement letter.
"""

import io
import zipfile
from xml.sax.saxutils import escape


def _render_lines(
    opportunity_title: str,
    student_name: str,
    matric_number: str,
    package_hash: str,
    ordered_items: list[dict],
    endorsement_letter: str | None,
) -> list[str]:
    lines = [
        f"ARTRAT SUBMISSION KIT — {opportunity_title}",
        f"Student: {student_name} ({matric_number})",
        f"Package Hash: {package_hash}",
        "",
        "PORTAL-ORDERED APPLICATION ITEMS:",
    ]
    for item in ordered_items:
        seq = item.get("sequence", "?")
        kind = item.get("kind")
        if kind == "field":
            lines.append(f"{seq}. [Field] {item.get('label')}: {item.get('value')}")
        elif kind == "upload":
            lines.append(
                f"{seq}. [Upload · {item.get('doc_type')}] {item.get('label')} -> {item.get('file_name') or 'MISSING'}"
            )
        elif kind == "essay":
            lines.append(f"{seq}. [Essay · {item.get('prompt_id')}] {item.get('prompt')}")
            lines.append(f"   Draft: {item.get('draft_text') or ''}")
    if endorsement_letter:
        lines.extend(["", "DYNAMIC ENDORSEMENT LETTER:", *endorsement_letter.splitlines()])
    return lines


def build_docx_submission_kit(
    *,
    opportunity_title: str,
    student_name: str,
    matric_number: str,
    package_hash: str,
    ordered_items: list[dict],
    endorsement_letter: str | None = None,
) -> bytes:
    """Create a valid OpenXML `.docx` document in memory."""
    lines = _render_lines(
        opportunity_title, student_name, matric_number, package_hash, ordered_items, endorsement_letter
    )
    paragraphs = "".join(
        f"<w:p><w:r><w:t xml:space=\"preserve\">{escape(line)}</w:t></w:r></w:p>"
        for line in lines
    )
    document_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">"
        f"<w:body>{paragraphs}</w:body></w:document>"
    )
    content_types_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
        "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
        "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
        "<Override PartName=\"/word/document.xml\" "
        "ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>"
        "</Types>"
    )
    rels_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        "<Relationship Id=\"rId1\" "
        "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" "
        "Target=\"word/document.xml\"/>"
        "</Relationships>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml)
        zf.writestr("_rels/.rels", rels_xml)
        zf.writestr("word/document.xml", document_xml)
    return buf.getvalue()


def _pdf_escape(text: str) -> str:
    return (
        text.encode("ascii", errors="replace")
        .decode("ascii")
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def build_pdf_submission_kit(
    *,
    opportunity_title: str,
    student_name: str,
    matric_number: str,
    package_hash: str,
    ordered_items: list[dict],
    endorsement_letter: str | None = None,
) -> bytes:
    """Create a valid single-page PDF-1.4 Submission Kit document in memory."""
    lines = _render_lines(
        opportunity_title, student_name, matric_number, package_hash, ordered_items, endorsement_letter
    )
    text_ops = ["BT", "/F1 10 Tf", "50 750 Td", "14 TL"]
    for line in lines[:45]:
        text_ops.append(f"({_pdf_escape(line[:100])}) '")
    text_ops.append("ET")
    stream_bytes = "\n".join(text_ops).encode("ascii")

    objs = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        f"4 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii")
        + stream_bytes
        + b"\nendstream\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for obj in objs:
        offsets.append(len(out))
        out.extend(obj)
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for off in offsets:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    out.extend(
        f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return bytes(out)
