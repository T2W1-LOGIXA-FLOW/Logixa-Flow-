from __future__ import annotations

from datetime import datetime, timezone
import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..llm.router import LLMRouter
from ..security import require_admin
from ..cache import cache_client

router = APIRouter()


def _admin_owner_id(admin: dict) -> str:
    owner_id = admin.get("sub")
    if not isinstance(owner_id, str) or not owner_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin identity required",
        )
    return owner_id.strip()


def _record_chat_audit(
    db: Session,
    *,
    actor_id: str,
    action: str,
    session_id: str,
    result: str,
    deletion_mode: str | None = None,
) -> None:
    details = {
        "actor_id": actor_id,
        "action": action,
        "object": session_id,
        "result": result,
    }
    if deletion_mode is not None:
        details["deletion_mode"] = deletion_mode
    db.add(
        models.AnalyticsEvent(
            event_type="admin_chat_audit",
            details=json.dumps(details, ensure_ascii=True),
        )
    )


@router.post("/query", response_model=schemas.ChatQueryResponse)
def chat_query(
    request: schemas.ChatQueryRequest,
    user_ip: str | None = Query(default=None),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Process a chat query with AI integration.
    """
    owner_id = _admin_owner_id(admin)
    session: models.ChatSession | None = None
    
    if request.session_id:
        session = db.query(models.ChatSession).filter(
            models.ChatSession.session_id == request.session_id,
            models.ChatSession.owner_id == owner_id,
            models.ChatSession.is_active == True
        ).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    if not session:
        # Create new session
        session = models.ChatSession(
            session_id=str(uuid4()),
            owner_id=owner_id,
            title=request.query[:50] + "..." if len(request.query) > 50 else request.query,
            agent_id=request.agent_id or "default",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    
    # Save user message
    user_message = models.ChatMessage(
        session_id=session.id,
        role="user",
        content=request.query,
        agent_id=None,
        model_used=None,
        tokens_used=None,
        cost_estimate=None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    ai_response = generate_ai_response(request.query, request.context, request.agent_id, db, role="admin")
    
    # Save agent message
    agent_message = models.ChatMessage(
        session_id=session.id,
        role="agent",
        content=ai_response["content"],
        agent_id=ai_response["agent_id"],
        model_used=ai_response["model_used"],
        tokens_used=ai_response["tokens_used"],
        cost_estimate=ai_response["cost_estimate"],
        created_at=datetime.now(timezone.utc),
    )
    db.add(agent_message)
    
    # Update session
    session.updated_at = datetime.now(timezone.utc)
    session.agent_id = ai_response["agent_id"]
    
    db.commit()
    db.refresh(agent_message)
    db.refresh(session)
    
    return schemas.ChatQueryResponse(
        response=ai_response["content"],
        agent_id=ai_response["agent_id"],
        session_id=session.session_id,
        message_id=agent_message.id,
        model_used=ai_response["model_used"],
    )


@router.post("/public-query")
def public_chat_query(
    request: schemas.ChatQueryRequest,
    db: Session = Depends(get_db),
    http_request: Request = None,
) -> dict:
    """
    Public AI assistant endpoint for the website chat experience.

    This route intentionally does not require admin auth and does not write
    chat sessions to the admin database. Admin chat history stays private.

    Rate limit: 5 requests per minute per client IP.
    """
    # Determine client IP (respect X-Forwarded-For if present)
    ip = None
    xff = None
    if http_request is not None:
        xff = http_request.headers.get("x-forwarded-for")
    if xff:
        ip = xff.split(",")[0].strip()
    elif http_request and http_request.client:
        ip = http_request.client.host
    else:
        ip = "unknown"

    # Simple per-IP counter stored in cache_client (supports Redis or in-memory)
    key = f"public_chat:{ip}"
    count_raw = cache_client.get(key)
    try:
        count = int(count_raw) if count_raw is not None else 0
    except Exception:
        count = 0
    if count >= 5:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")
    cache_client.set(key, str(count + 1), ttl_seconds=60)

    ai_response = generate_ai_response(request.query, request.context, request.agent_id or "public", db, role="user")
    return {
        "response": ai_response["content"],
        "agent_id": ai_response["agent_id"],
        "model_used": ai_response["model_used"],
    }


def generate_ai_response(
    query: str,
    context: list[schemas.ChatMessageBase],
    agent_id: str | None,
    db: Session,
    role: str = "admin",
) -> dict:
    """
    Generate AI response using the agent system.
    Uses the configured LLM router when provider keys are available, with a local fallback.
    """
    import os
    
    model_used = os.getenv("AI_AGENT_MODEL", "local-planner")
    agent_id = agent_id or "default"
    context_lines = []
    for message in context[-6:]:
        context_lines.append(f"{message.role}: {message.content}")

    prompt = (
        "You are Logixa Flow's AI assistant for Myanmar supply-chain intelligence. "
        "Answer clearly and practically for logistics, procurement, manufacturing, retail, and SME teams. "
        "Match the user's language: if they write in Burmese/Myanmar, reply in natural Myanmar business language. "
        "If they write in English, reply in English. "
        "Use natural Myanmar business terminology when responding in Burmese. "
        "Only use information supported by the prompt or general supply-chain knowledge. "
        "If the user asks whether Burmese is supported, confirm that yes, you can respond in Burmese. "
        "If the user asks for operational next steps, give concise steps.\n\n"
        f"Agent ID: {agent_id}\n"
        f"Recent context:\n{chr(10).join(context_lines) if context_lines else 'No previous context.'}\n\n"
        f"User question: {query}"
    )

    try:
        router = LLMRouter(db, role=role)
        response_text, model_used = router.generate_with_provider(prompt)
    except Exception:
        response_text = (
            "AI provider is not available yet. Add a valid GEMINI_API_KEY, OPENROUTER_API_KEY, "
            "or GROQ_API_KEY in the backend environment, then redeploy. "
            f"Received query: '{query}'."
        )
    
    return {
        "role": "agent",
        "content": response_text,
        "agent_id": agent_id,
        "model_used": model_used,
        "tokens_used": 0,
        "cost_estimate": 0.0,
    }


@router.get("/sessions", response_model=list[schemas.ChatSessionOut])
def get_chat_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Get all chat sessions for the admin.
    """
    owner_id = _admin_owner_id(admin)
    sessions = (
        db.query(models.ChatSession)
        .filter(
            models.ChatSession.owner_id == owner_id,
            models.ChatSession.is_active == True,
        )
        .order_by(models.ChatSession.updated_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return sessions


@router.get("/sessions/{session_id}", response_model=schemas.ChatSessionOut)
def get_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Get a specific chat session by session_id.
    """
    owner_id = _admin_owner_id(admin)
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id,
        models.ChatSession.owner_id == owner_id,
        models.ChatSession.is_active == True
    ).first()
    
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    return session


@router.get("/sessions/{session_id}/messages", response_model=list[schemas.ChatMessageOut])
def get_chat_messages(
    session_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Get all messages for a specific chat session.
    """
    owner_id = _admin_owner_id(admin)
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id,
        models.ChatSession.owner_id == owner_id,
        models.ChatSession.is_active == True
    ).first()
    
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    # Get messages
    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session.id)
        .order_by(models.ChatMessage.created_at.asc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    
    return messages


@router.patch("/sessions/{session_id}/title")
def update_session_title(
    session_id: str,
    title: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Update the title of a chat session.
    """
    owner_id = _admin_owner_id(admin)
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id,
        models.ChatSession.owner_id == owner_id,
        models.ChatSession.is_active == True
    ).first()
    
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    session.title = title
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    
    return {"message": "Session title updated successfully"}


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Delete a chat session (soft delete by setting is_active to False).
    """
    owner_id = _admin_owner_id(admin)
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id,
        models.ChatSession.owner_id == owner_id,
        models.ChatSession.is_active == True,
    ).first()
    
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    # Soft delete
    session.is_active = False
    session.deleted_at = datetime.now(timezone.utc)
    session.deleted_by = owner_id
    session.updated_at = datetime.now(timezone.utc)
    _record_chat_audit(
        db,
        actor_id=owner_id,
        action="delete_session",
        session_id=session_id,
        result="success",
        deletion_mode="soft_delete",
    )
    db.commit()
    
    return None


@router.get("/stats")
def get_chat_stats(
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """
    Get statistics about chat usage.
    """
    owner_id = _admin_owner_id(admin)
    active_sessions = db.query(models.ChatSession).filter(
        models.ChatSession.owner_id == owner_id,
        models.ChatSession.is_active == True,
    )
    total_sessions = active_sessions.count()
    total_messages = db.query(models.ChatMessage).join(
        models.ChatSession,
        models.ChatMessage.session_id == models.ChatSession.id,
    ).filter(
        models.ChatSession.owner_id == owner_id,
        models.ChatSession.is_active == True,
    ).count()
    active_sessions_today = db.query(models.ChatSession).filter(
        models.ChatSession.owner_id == owner_id,
        models.ChatSession.is_active == True,
        models.ChatSession.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    
    return {
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "active_sessions_today": active_sessions_today,
    }
