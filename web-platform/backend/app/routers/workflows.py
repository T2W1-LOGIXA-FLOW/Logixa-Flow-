"""
Example router: simple workflows listing and run trigger

Replace the in-memory registry with your DB-backed workflow store or
definitions. Triggering enqueues a job and returns 202 Accepted with a job id.
"""
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.security import require_admin

router = APIRouter(prefix="/api/admin/workflows", tags=["admin", "workflows"])


# Simple in-memory example registry; replace with DB or filesystem-backed defs
_WORKFLOWS = [
    {"id": "daily-summary", "name": "Daily Summary"},
    {"id": "sync-posts", "name": "Sync Posts"},
]


@router.get("")
async def list_workflows(_admin=Depends(require_admin)) -> List[Dict]:
    """Return list of workflows available to run."""
    return _WORKFLOWS


@router.post("/run", status_code=status.HTTP_202_ACCEPTED)
async def run_workflow(payload: Dict, _admin=Depends(require_admin)):
    """Trigger a workflow run by workflow_id (enqueue and return job id)."""
    workflow_id = payload.get("workflow_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id required")

    if not any(w["id"] == workflow_id for w in _WORKFLOWS):
        raise HTTPException(status_code=404, detail="workflow not found")

    # enqueue_workflow_run(workflow_id)
    job_id = f"wf-{workflow_id}-job"
    return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"job_id": job_id, "status": "queued"})

# Optional: add GET /{id}/status and history endpoints as needed
