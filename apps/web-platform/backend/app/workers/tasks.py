from __future__ import annotations

import asyncio
import logging

from .celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="logixa_flow.execute_workflow",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
)
def execute_workflow_task(self, run_id: str) -> str:
    """Execute one durable workflow run outside the web process."""
    from app.routers import workflow

    run = workflow._load_run_state(run_id)
    if run is None:
        logger.warning("Workflow run %s no longer exists", run_id)
        return "missing"

    definition = workflow._load_workflow_definition(run.workflow_id)
    if definition is None:
        logger.error("Workflow definition %s no longer exists", run.workflow_id)
        workflow._mark_job_terminal(run_id, "failed")
        return "failed"

    workflow._WORKFLOW_RUNS[run_id] = run
    workflow._WORKFLOW_STORAGE[definition.id] = definition

    if not workflow._claim_job(run_id):
        logger.info("Workflow run %s was already claimed", run_id)
        return "already-claimed"

    try:
        asyncio.run(workflow._execute_workflow(run_id))
    except Exception:
        logger.exception("Celery workflow task failed", extra={"run_id": run_id})
        workflow._release_job_claim(run_id)
        raise
    return workflow._WORKFLOW_RUNS[run_id].state.status
