"""
Example router: admin integration triggers

NOTE: Example only. Copy into your project, review, and include the router in
app/main.py using app.include_router(...). These endpoints are protected with
require_admin and return 202 Accepted for background work.
"""
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.security import require_admin
# from app.integration_service import enqueue_pdf_job, trigger_webhook_delivery

router = APIRouter(prefix="/api/admin/integration", tags=["admin", "integration"])


@router.post("/trigger-pdf", status_code=status.HTTP_202_ACCEPTED)
async def trigger_pdf(payload: Dict, _admin=Depends(require_admin)):
    """Trigger a PDF generation job and return 202 with job id.

    Expected payload (example): { "post_id": "...", "template_id": "..." }
    """
    # TODO: Replace with pydantic model and real queueing integration
    post_id = payload.get("post_id")
    if not post_id:
        raise HTTPException(status_code=400, detail="post_id required")

    # job_id = enqueue_pdf_job(payload)
    job_id = f"pdf-job-{post_id}"
    return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"job_id": job_id, "status": "queued"})


@router.post("/trigger-webhook", status_code=status.HTTP_202_ACCEPTED)
async def trigger_webhook(body: Dict, _admin=Depends(require_admin)):
    """Trigger a webhook delivery for a configured integration.

    Expected body (example): { "webhook_id": "..." }
    """
    webhook_id = body.get("webhook_id")
    if not webhook_id:
        raise HTTPException(status_code=400, detail="webhook_id required")

    # job_id = trigger_webhook_delivery(webhook_id)
    job_id = f"webhook-job-{webhook_id}"
    return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"job_id": job_id, "status": "queued"})
