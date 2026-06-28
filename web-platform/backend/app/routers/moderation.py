from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
import requests
import os
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..security import get_current_user, CurrentUser

router = APIRouter()

class CommentPayload(BaseModel):
    text: str
    post_id: int
    parent_id: int | None = None


class CommentUpdate(BaseModel):
    """Update comment status or feedback."""
    status: str | None = None  # pending, approved, blocked
    likes: int | None = None
    dislikes: int | None = None


HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HF_MODEL = "unitary/toxic-bert"

# ===== POST: Create Comment with Moderation Check =====

@router.post("/comments", response_model=dict)
def add_comment(
    payload: CommentPayload,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> dict:
    """Create a new comment with toxicity moderation check."""
    # 1. Moderation check (Hugging Face) - optional if API key not set
    toxicity_score = 0.0
    status_result = "approved"
    
    if HF_API_KEY:
        try:
            headers = {"Authorization": f"Bearer {HF_API_KEY}"}
            response = requests.post(
                f"https://api-inference.huggingface.co/models/{HF_MODEL}",
                headers=headers,
                json={"inputs": payload.text},
                timeout=5
            )
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                toxicity_score = result[0][0].get("score", 0.0)
        except Exception:
            # Moderation service unavailable - continue with approved
            pass
    
    # 2. Decision
    if toxicity_score > 0.7:
        status_result = "blocked"
        # log to AI Brain
        brain = models.AiMemoryBrain(
            category="Moderation",
            source_title="Blocked comment",
            prompt=payload.text[:500],
            content=f"Toxicity score: {toxicity_score}",
            summary="Inappropriate language detected",
            status="pending",
            is_public=False
        )
        db.add(brain)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your comment contains inappropriate language.")

    # 3. Save comment
    comment = models.Comment(
        text=payload.text,
        post_id=payload.post_id,
        parent_id=payload.parent_id,
        user_id=current_user.id,
        toxicity_score=toxicity_score,
        status=status_result
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return {
        "id": comment.id,
        "status": status_result,
        "toxicity_score": toxicity_score,
        "created_at": comment.created_at.isoformat()
    }


# ===== GET: List Comments =====

@router.get("/comments", response_model=dict)
def list_comments(
    post_id: int | None = Query(None),
    status_filter: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    """List comments with optional filtering by post and status."""
    query = db.query(models.Comment)
    
    if post_id:
        query = query.filter(models.Comment.post_id == post_id)
    
    if status_filter:
        query = query.filter(models.Comment.status == status_filter)
    
    total = query.count()
    comments = query.order_by(models.Comment.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "comments": [
            {
                "id": c.id,
                "text": c.text,
                "post_id": c.post_id,
                "parent_id": c.parent_id,
                "user_id": c.user_id,
                "toxicity_score": c.toxicity_score,
                "status": c.status,
                "likes": c.likes,
                "dislikes": c.dislikes,
                "created_at": c.created_at.isoformat()
            }
            for c in comments
        ]
    }


# ===== GET: Get Comment by ID =====

@router.get("/comments/{comment_id}", response_model=dict)
def get_comment(
    comment_id: int,
    db: Session = Depends(get_db),
) -> dict:
    """Get a specific comment by ID."""
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    return {
        "id": comment.id,
        "text": comment.text,
        "post_id": comment.post_id,
        "parent_id": comment.parent_id,
        "user_id": comment.user_id,
        "toxicity_score": comment.toxicity_score,
        "status": comment.status,
        "likes": comment.likes,
        "dislikes": comment.dislikes,
        "created_at": comment.created_at.isoformat(),
        "updated_at": comment.updated_at.isoformat() if hasattr(comment, 'updated_at') else None
    }


# ===== PUT: Update Comment Status or Feedback =====

@router.put("/comments/{comment_id}", response_model=dict)
def update_comment(
    comment_id: int,
    payload: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Update comment status (admin only) or feedback (any user)."""
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    # Only admin can change status
    if payload.status is not None and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can change comment status")
    
    if payload.status is not None:
        if payload.status not in ["pending", "approved", "blocked"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
        comment.status = payload.status
    
    # Any user can update likes/dislikes
    if payload.likes is not None and payload.likes >= 0:
        comment.likes = payload.likes
    
    if payload.dislikes is not None and payload.dislikes >= 0:
        comment.dislikes = payload.dislikes
    
    db.commit()
    db.refresh(comment)
    
    return {
        "id": comment.id,
        "status": comment.status,
        "likes": comment.likes,
        "dislikes": comment.dislikes,
        "message": "Comment updated successfully"
    }


# ===== DELETE: Delete Comment =====

@router.delete("/comments/{comment_id}", response_model=dict)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Delete a comment (admin or comment owner)."""
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    # Check permission (admin or comment owner)
    if current_user.role != "admin" and comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins or comment owner can delete")
    
    db.delete(comment)
    db.commit()
    
    return {"id": comment_id, "message": "Comment deleted successfully"}


# ===== GET: Get Comments by Post =====

@router.get("/posts/{post_id}/comments", response_model=dict)
def get_post_comments(
    post_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    """Get all comments for a specific post."""
    # Verify post exists
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    
    query = db.query(models.Comment).filter(models.Comment.post_id == post_id)
    total = query.count()
    comments = query.order_by(models.Comment.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "post_id": post_id,
        "total": total,
        "limit": limit,
        "offset": offset,
        "comments": [
            {
                "id": c.id,
                "text": c.text,
                "user_id": c.user_id,
                "status": c.status,
                "likes": c.likes,
                "dislikes": c.dislikes,
                "created_at": c.created_at.isoformat()
            }
            for c in comments
        ]
    }
