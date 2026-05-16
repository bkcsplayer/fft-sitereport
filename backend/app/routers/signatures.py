import uuid
import os
import base64
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.site_report import SiteReport, SiteReportWorker, SiteReportStatus
from app.models.signature import Signature, DocumentSnapshot
from app.models.safety import FallProtectionPlan, HazardAssessment
from app.schemas.signature import (
    SignatureCreate, SignatureResponse, SignatureProgressResponse,
    SignatureMatrixRow, DocumentSnapshotResponse,
)
from app.config import settings
from app.routers.auth import get_token_session

router = APIRouter()


def _generate_snapshot_pdf(sr: SiteReport, sig: Signature, worker_name: str, doc_type: str) -> str:
    from app.services.pdf_generator import generate_fpp_pdf, generate_ha_pdf

    sig_b64 = ""
    if sig.signature_image_path:
        try:
            with open(sig.signature_image_path, "rb") as f:
                sig_b64 = base64.b64encode(f.read()).decode()
        except Exception:
            sig_b64 = ""

    signed_at_str = sig.signed_at.strftime("%Y-%m-%d %H:%M") if sig.signed_at else ""
    crew_leader = next((w.employee_name for w in (sr.workers or []) if w.is_crew_lead), worker_name)

    pdf_bytes = None

    if doc_type == "fall_protection_plan" and sr.fall_protection_plan:
        fpp = sr.fall_protection_plan
        pdf_bytes = generate_fpp_pdf(
            employer_name=fpp.employer_name,
            work_address=sr.work_address,
            work_date=str(sr.work_date),
            crew_leader_name=crew_leader,
            worker_name=worker_name,
            signature_b64=sig_b64,
            signed_at=signed_at_str,
            report_id=str(sr.id),
        )

    elif doc_type == "hazard_assessment" and sr.hazard_assessment:
        pdf_bytes = generate_ha_pdf(
            work_address=sr.work_address,
            work_date=str(sr.work_date),
            crew_leader_name=crew_leader,
            worker_name=worker_name,
            signature_b64=sig_b64,
            signed_at=signed_at_str,
            report_id=str(sr.id),
        )

    if not pdf_bytes:
        raise ValueError("Failed to generate PDF")

    # Save PDF to disk
    pdf_dir = os.path.join(settings.SIGNATURE_STORAGE_PATH, str(sr.id))
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_name = f"{sig.worker_id}_{doc_type}.pdf"
    pdf_path = os.path.join(pdf_dir, pdf_name)
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    return pdf_path


def _compute_status_sigs(sr: SiteReport) -> str:
    workers = sr.workers
    if not workers:
        return sr.status
    sigs = sr.signatures or []
    total_needed = len(workers) * 2
    signed_count = sum(1 for s in sigs if s.status == "signed")
    if signed_count >= total_needed and total_needed > 0:
        return SiteReportStatus.COMPLETED.value
    if signed_count > 0:
        return SiteReportStatus.PENDING_SIGNATURES.value
    return SiteReportStatus.READY_FOR_SIGNATURE.value


@router.post("/", response_model=SignatureResponse)
async def create_signature(data: SignatureCreate, db: AsyncSession = Depends(get_db), session: dict = Depends(get_token_session)):
    # Load site report with all needed relationships
    sr_result = await db.execute(
        select(SiteReport)
        .options(
            selectinload(SiteReport.workers),
            selectinload(SiteReport.signatures),
            selectinload(SiteReport.fall_protection_plan),
            selectinload(SiteReport.hazard_assessment),
        )
        .where(SiteReport.id == data.site_report_id)
    )
    sr = sr_result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")

    # Verify worker is part of this site report
    worker = next((w for w in sr.workers if w.employee_id == data.worker_id), None)
    if not worker:
        raise HTTPException(status_code=400, detail="Worker is not assigned to this site report")

    if data.document_type not in ("fall_protection_plan", "hazard_assessment"):
        raise HTTPException(status_code=400, detail="Invalid document_type")

    # Validate that the document data exists before allowing signature
    if data.document_type == "fall_protection_plan" and not sr.fall_protection_plan:
        raise HTTPException(status_code=400, detail="Fall Protection Plan has not been filled in yet")
    if data.document_type == "hazard_assessment" and not sr.hazard_assessment:
        raise HTTPException(status_code=400, detail="Hazard Assessment has not been filled in yet")

    # Report must be beyond DRAFT (crew lead must have confirmed)
    if sr.status == SiteReportStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Report has not been confirmed for signing yet")

    # Check for existing signature (allow re-sign by replacing)
    existing = await db.execute(
        select(Signature).where(
            Signature.site_report_id == data.site_report_id,
            Signature.worker_id == data.worker_id,
            Signature.document_type == data.document_type,
        )
    )
    sig = existing.scalar_one_or_none()

    # Save signature image to disk
    sig_dir = os.path.join(settings.SIGNATURE_STORAGE_PATH, str(data.site_report_id))
    os.makedirs(sig_dir, exist_ok=True)
    img_name = f"{data.worker_id}_{data.document_type}.png"
    img_path = os.path.join(sig_dir, img_name)

    img_data = base64.b64decode(data.signature_image_base64.split(",")[-1])
    with open(img_path, "wb") as f:
        f.write(img_data)

    if sig:
        sig.signature_image_path = img_path
        sig.confirmation_text = data.confirmation_text
        sig.status = "signed"
        sig.signed_at = datetime.utcnow()
    else:
        sig = Signature(
            site_report_id=data.site_report_id,
            worker_id=data.worker_id,
            worker_name=data.worker_name,
            document_type=data.document_type,
            signature_image_path=img_path,
            confirmation_text=data.confirmation_text,
            status="signed",
            signed_at=datetime.utcnow(),
        )
        db.add(sig)

    await db.flush()

    # Update site report status using fresh signature list
    all_sigs_result = await db.execute(
        select(Signature).where(Signature.site_report_id == data.site_report_id)
    )
    all_sigs = list(all_sigs_result.scalars().all())
    total_needed = len(sr.workers) * 2
    signed_count = sum(1 for s in all_sigs if s.status == "signed")
    if signed_count >= total_needed and total_needed > 0:
        sr.status = SiteReportStatus.COMPLETED.value
    elif signed_count > 0:
        sr.status = SiteReportStatus.PENDING_SIGNATURES.value

    # Auto-generate snapshot (store a simple HTML record)
    worker_name = worker.employee_name or sig.worker_name
    snapshot_html = f"<p>Signed by {worker_name} for {data.document_type} on report {data.site_report_id}</p>"

    # Check for existing snapshot
    existing_snap = await db.execute(
        select(DocumentSnapshot).where(DocumentSnapshot.signature_id == sig.id)
    )
    old_snap = existing_snap.scalar_one_or_none()
    if old_snap:
        old_snap.html_content = snapshot_html
    else:
        snap = DocumentSnapshot(
            site_report_id=data.site_report_id,
            signature_id=sig.id,
            document_type=data.document_type,
            worker_id=data.worker_id,
            html_content=snapshot_html,
        )
        db.add(snap)

    await db.commit()
    await db.refresh(sig)
    return sig


@router.get("/progress/{report_id}", response_model=SignatureProgressResponse)
async def get_signature_progress(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    sr_result = await db.execute(
        select(SiteReport)
        .options(
            selectinload(SiteReport.workers),
            selectinload(SiteReport.signatures),
        )
        .where(SiteReport.id == report_id)
    )
    sr = sr_result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")

    workers = sr.workers
    sigs = sr.signatures or []

    total_needed = len(workers) * 2
    signed_count = sum(1 for s in sigs if s.status == "signed")

    matrix_rows = []
    for w in workers:
        fpp_sig = next((s for s in sigs if s.worker_id == w.employee_id and s.document_type == "fall_protection_plan"), None)
        ha_sig = next((s for s in sigs if s.worker_id == w.employee_id and s.document_type == "hazard_assessment"), None)
        matrix_rows.append(SignatureMatrixRow(
            worker_id=w.employee_id,
            worker_name=w.employee_name,
            is_crew_lead=w.is_crew_lead,
            fall_protection_plan=SignatureResponse.model_validate(fpp_sig) if fpp_sig else None,
            hazard_assessment=SignatureResponse.model_validate(ha_sig) if ha_sig else None,
        ))

    return SignatureProgressResponse(
        total_required=total_needed,
        completed=signed_count,
        status=sr.status,
        matrix=matrix_rows,
    )


@router.get("/document-preview/{report_id}/{doc_type}")
async def get_document_preview(
    report_id: uuid.UUID,
    doc_type: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the full HTML template with data filled in.
    Workers read this (like a contract) before signing.
    """
    from fastapi.responses import HTMLResponse
    from app.services.pdf_generator import FPP_HTML_TEMPLATE, HA_HTML_TEMPLATE

    if doc_type not in ("fall_protection_plan", "hazard_assessment"):
        raise HTTPException(status_code=400, detail="Invalid document type")

    sr_result = await db.execute(
        select(SiteReport)
        .options(
            selectinload(SiteReport.workers),
            selectinload(SiteReport.signatures),
            selectinload(SiteReport.fall_protection_plan),
            selectinload(SiteReport.hazard_assessment),
        )
        .where(SiteReport.id == report_id)
    )
    sr = sr_result.scalar_one_or_none()
    if not sr:
        raise HTTPException(status_code=404, detail="Site report not found")

    template_path = FPP_HTML_TEMPLATE if doc_type == "fall_protection_plan" else HA_HTML_TEMPLATE
    if not os.path.exists(template_path):
        raise HTTPException(status_code=500, detail=f"HTML template not found at {template_path}")

    with open(template_path, "r", encoding="utf-8") as f:
        html = f.read()

    crew_leader = next((w.employee_name for w in (sr.workers or []) if w.is_crew_lead), "")

    # Build a JS snippet that auto-fills the data-bind fields after page load
    fill_values = {}

    # Build signature image data: map canvas data-signature IDs to base64 PNGs
    # FPP canvas IDs: workerSig1..workerSig6 (indexed by worker order)
    # HA canvas IDs:  sig1..sig4             (indexed by worker order)
    signature_data = {}
    workers = sr.workers or []
    sigs = [s for s in (sr.signatures or []) if s.document_type == doc_type and s.status == "signed"]

    for i, w in enumerate(workers):
        sig = next((s for s in sigs if s.worker_id == w.employee_id), None)
        if sig and sig.signature_image_path and os.path.exists(sig.signature_image_path):
            try:
                with open(sig.signature_image_path, "rb") as img_f:
                    b64 = base64.b64encode(img_f.read()).decode()
                if doc_type == "fall_protection_plan":
                    canvas_id = f"workerSig{i+1}"
                else:
                    canvas_id = f"sig{i+1}"
                signature_data[canvas_id] = f"data:image/png;base64,{b64}"
            except Exception:
                pass

    if doc_type == "fall_protection_plan" and sr.fall_protection_plan:
        fpp = sr.fall_protection_plan
        fill_values["workSite"] = sr.work_address or ""
        fill_values["validPeriod"] = "24 Hours"
        # Rescue plan checkboxes
        if fpp.rescue_self:
            fill_values["selfRescue"] = "__checkbox__"
        if fpp.rescue_assisted_roof:
            fill_values["assistedRoofRescue"] = "__checkbox__"
        if fpp.rescue_ladder:
            fill_values["ladderRescue"] = "__checkbox__"
        if fpp.rescue_awp:
            fill_values["awpRescue"] = "__checkbox__"
        if fpp.rescue_fire_dept:
            fill_values["fireDepartmentRescue"] = "__checkbox__"
        # Fall hazards
        if fpp.fall_hazards:
            fill_values["fallHazard1"] = fpp.fall_hazards
        if fpp.fall_protection_system:
            fill_values["fallHazard2"] = fpp.fall_protection_system
        # Anchor fields: map anchor_type to permanentAnchors/reusableAnchors
        if fpp.anchor_type:
            anchor_type_lower = fpp.anchor_type.lower()
            if "reusable" in anchor_type_lower:
                fill_values["reusableAnchors"] = str(fpp.anchor_count or "")
            elif "permanent" in anchor_type_lower:
                fill_values["permanentAnchors"] = str(fpp.anchor_count or "")
            else:
                # Default: put in permanent anchors
                fill_values["permanentAnchors"] = f"{fpp.anchor_type}: {fpp.anchor_count or ''}"
        elif fpp.anchor_count is not None:
            fill_values["permanentAnchors"] = str(fpp.anchor_count)
        # Clearance values
        if fpp.clearance_a is not None:
            fill_values["clearanceA"] = str(fpp.clearance_a)
        if fpp.clearance_b is not None:
            fill_values["clearanceB"] = str(fpp.clearance_b)
        if fpp.clearance_c is not None:
            fill_values["clearanceC"] = str(fpp.clearance_c)
        if fpp.clearance_d is not None:
            fill_values["clearanceD"] = str(fpp.clearance_d)
        if fpp.clearance_e is not None:
            fill_values["clearanceE"] = str(fpp.clearance_e)
        if fpp.clearance_f_total is not None:
            fill_values["clearanceF"] = str(fpp.clearance_f_total)
        # Worker names
        for i, w in enumerate(sr.workers or []):
            if i < 6:
                fill_values[f"workerName{i+1}"] = w.employee_name

    elif doc_type == "hazard_assessment" and sr.hazard_assessment:
        ha = sr.hazard_assessment
        fill_values["date"] = str(sr.work_date)
        fill_values["crewLead"] = crew_leader
        fill_values["address"] = sr.work_address or ""
        if ha.all_hazards_reviewed:
            fill_values["allHazardsReviewed"] = "__checkbox__"
        # Worker names
        for i, w in enumerate(sr.workers or []):
            if i < 4:
                fill_values[f"name{i+1}"] = w.employee_name

    # Generate JS to fill the fields + mobile viewport scaling
    import json
    fill_js = f"""
<style>
/* Mobile-friendly scaling: scale the document to fit viewport */
@media (max-width: 1100px) {{
  .app {{
    display: block !important;
    padding: 0 !important;
  }}
  .panel {{
    display: none !important;
  }}
  .doc {{
    transform-origin: top left;
    width: 1055px;
  }}
  body {{
    overflow-x: hidden;
    background: white;
  }}
}}
</style>
<script>
window.addEventListener('load', function() {{
  var vals = {json.dumps(fill_values)};
  var sigData = {json.dumps(signature_data)};
  for (var key in vals) {{
    var els = document.querySelectorAll('[data-bind="' + key + '"]');
    els.forEach(function(el) {{
      if (vals[key] === '__checkbox__') {{
        el.checked = true;
        el.dispatchEvent(new Event('change', {{bubbles:true}}));
      }} else {{
        el.value = vals[key];
        el.dispatchEvent(new Event('input', {{bubbles:true}}));
      }}
    }});
  }}
  // Hide the edit panel
  var panel = document.querySelector('.panel');
  if (panel) panel.style.display = 'none';
  // Make all inputs read-only
  document.querySelectorAll('input, textarea, select').forEach(function(el) {{
    el.setAttribute('readonly', 'readonly');
    el.setAttribute('disabled', 'disabled');
  }});
  // Replace signature canvases with actual signature images
  document.querySelectorAll('canvas.signature-pad').forEach(function(c) {{
    var sigId = c.getAttribute('data-signature');
    if (sigData[sigId]) {{
      // Create an <img> to replace the canvas, using the same position/size styles
      var img = document.createElement('img');
      img.src = sigData[sigId];
      img.style.cssText = c.style.cssText;
      img.style.position = 'absolute';
      img.style.objectFit = 'contain';
      img.style.pointerEvents = 'none';
      img.style.border = 'none';
      img.style.background = 'transparent';
      c.parentNode.insertBefore(img, c);
      c.style.display = 'none';
    }} else {{
      // No signature for this canvas — just hide it
      c.style.display = 'none';
    }}
  }});

  // Mobile: scale the document to fit screen width
  function scaleDoc() {{
    var docEl = document.querySelector('.doc');
    if (!docEl) return;
    var vw = window.innerWidth;
    if (vw < 1100) {{
      var scale = vw / 1080;
      docEl.style.transform = 'scale(' + scale + ')';
      docEl.style.transformOrigin = 'top left';
      // Set container height to exactly match scaled content (prevents blank page)
      var realH = docEl.scrollHeight * scale;
      docEl.parentElement.style.height = realH + 'px';
      docEl.parentElement.style.overflow = 'hidden';
    }}
  }}
  // Delay to let images/fonts render, then scale
  setTimeout(scaleDoc, 100);
  window.addEventListener('resize', scaleDoc);
}});
</script>
"""

    # Inject the fill script right before </body>
    html = html.replace("</body>", fill_js + "</body>")

    return HTMLResponse(content=html)


