import os
import io
import base64
from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

# In Docker, templates are at /doc/. For local dev, fallback to project root doc/.
_DOCKER_DOCS = "/doc"
_LOCAL_DOCS = os.path.join(os.path.dirname(__file__), "..", "..", "..", "doc")
DOCS_DIR = _DOCKER_DOCS if os.path.isdir(_DOCKER_DOCS) else _LOCAL_DOCS

FPP_TEMPLATE = os.path.join(DOCS_DIR, "Fall_Protection_Plan_2Pages_ImageExact.pdf")
HA_TEMPLATE = os.path.join(DOCS_DIR, "Hazard_Assessment_2Pages_ImageExact.pdf")
FPP_HTML_TEMPLATE = os.path.join(DOCS_DIR, "Fall_Protection_Programmable_Template.html")
HA_HTML_TEMPLATE = os.path.join(DOCS_DIR, "Hazard_Assessment_Programmable_Template.html")

# Configuration for coordinates given as (left_pct, top_pct, page_index) where page_index is 0 or 1
COORD = {
    "fpp": {
        "workSite": (28.1517, 20.2549, 0),
        "validPeriod": (28.1517, 23.2059, 0),
        "workerName1": (8.1517, 46.3447, 1), # page 2
        "workerSig1": (28.3412, 46.3447, 1), # page 2
    },
    "ha": {
        "date": (10.3318, 20.7914, 0),
        "crewLead": (44.8341, 20.7914, 0),
        "address": (74.1232, 20.7914, 0),
        "name1": (9.7630, 81.3548, 1), # page 2
        "sig1": (59.5261, 81.3548, 1), # page 2
    }
}

def _create_overlay(data: dict, doc_type: str) -> io.BytesIO:
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=A4)
    
    coords = COORD.get(doc_type, {})
    width, height = A4
    
    def draw_elements(page_idx):
        for field, value in data.items():
            if value and field in coords:
                left_pct, top_pct, p_idx = coords[field]
                if p_idx == page_idx:
                    x = width * (left_pct / 100.0)
                    y = height * (1 - top_pct / 100.0)
                    # if this is a signature field (ends with sig1, signature_img etc), we draw image
                    if "sig" in field.lower():
                        try:
                            sig_b64 = value
                            if "," in sig_b64:
                                sig_b64 = sig_b64.split(",")[1]
                            sig_data = base64.b64decode(sig_b64)
                            img = Image.open(io.BytesIO(sig_data))
                            img_path = io.BytesIO()
                            img.save(img_path, format="PNG")
                            img_path.seek(0)
                            c.drawImage(img_path, x, y - 20, width=100, height=35, preserveAspectRatio=True, mask='auto')
                        except Exception as e:
                            print(f"Failed to draw signature image: {e}")
                    else:
                        c.drawString(x, y - 10, str(value))
    
    # Page 1
    draw_elements(0)
    c.showPage()
    
    # Page 2
    draw_elements(1)
    c.save()
    packet.seek(0)
    return packet

def _merge_pdf(template_path: str, overlay_pdf: io.BytesIO) -> bytes:
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template not found: {template_path}")
        
    reader = PdfReader(template_path)
    writer = PdfWriter()
    
    overlay_reader = PdfReader(overlay_pdf)
    
    for i, page in enumerate(reader.pages):
        if i < len(overlay_reader.pages):
            overlay_page = overlay_reader.pages[i]
            page.merge_page(overlay_page)
        writer.add_page(page)
        
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def generate_fpp_pdf(
    employer_name: str,
    work_address: str,
    work_date: str,
    crew_leader_name: str,
    worker_name: str = "",
    signature_b64: str = "",
    signed_at: str = "",
    report_id: str = "",
    **kwargs
) -> bytes:
    data = {
        "workSite": work_address,
        "validPeriod": "24 Hours",
        "workerName1": worker_name,
        "workerSig1": signature_b64
    }
    overlay = _create_overlay(data, "fpp")
    return _merge_pdf(FPP_TEMPLATE, overlay)


def generate_ha_pdf(
    work_address: str,
    work_date: str,
    crew_leader_name: str,
    worker_name: str = "",
    signature_b64: str = "",
    signed_at: str = "",
    report_id: str = "",
    **kwargs
) -> bytes:
    data = {
        "date": work_date,
        "address": work_address,
        "crewLead": crew_leader_name,
        "name1": worker_name,
        "sig1": signature_b64,
    }
    overlay = _create_overlay(data, "ha")
    return _merge_pdf(HA_TEMPLATE, overlay)
