from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..llm.router import LLMRouter
from ..security import require_admin

router = APIRouter()


@router.post("/query", response_model=schemas.ChatQueryResponse)
def chat_query(
    request: schemas.ChatQueryRequest,
    user_ip: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Process a chat query with AI integration.
    """
    # Get or create chat session
    session: models.ChatSession | None = None
    
    if request.session_id:
        session = db.query(models.ChatSession).filter(
            models.ChatSession.session_id == request.session_id,
            models.ChatSession.is_active == True
        ).first()
    
    if not session:
        # Create new session
        session = models.ChatSession(
            session_id=str(uuid4()),
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
    
    ai_response = generate_ai_response(request.query, request.context, request.agent_id, db)
    
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


def generate_ai_response(
    query: str,
    context: list[schemas.ChatMessageBase],
    agent_id: str | None,
    db: Session,
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
        "You are Logixa Flow's private admin AI assistant for Myanmar supply-chain intelligence. "
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
        router = LLMRouter(db)
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
    _: dict = Depends(require_admin),
):
    """
    Get all chat sessions for the admin.
    """
    sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.is_active == True)
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
    _: dict = Depends(require_admin),
):
    """
    Get a specific chat session by session_id.
    """
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id,
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
    _: dict = Depends(require_admin),
):
    """
    Get all messages for a specific chat session.
    """
    # First find the session
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id,
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
    _: dict = Depends(require_admin),
):
    """
    Update the title of a chat session.
    """
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id,
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
    _: dict = Depends(require_admin),
):
    """
    Delete a chat session (soft delete by setting is_active to False).
    """
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    # Soft delete
    session.is_active = False
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return None


@router.get("/stats")
def get_chat_stats(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get statistics about chat usage.
    """
    total_sessions = db.query(models.ChatSession).filter(models.ChatSession.is_active == True).count()
    total_messages = db.query(models.ChatMessage).count()
    active_sessions_today = db.query(models.ChatSession).filter(
        models.ChatSession.is_active == True,
        models.ChatSession.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    
    return {
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "active_sessions_today": active_sessions_today,
    }
