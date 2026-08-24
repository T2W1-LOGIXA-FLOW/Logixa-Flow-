from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..security import require_admin

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    estimated_revenue: Optional[float] = 0.0
    estimated_cost: Optional[float] = 0.0


@router.get("/admin/finance/summary")
def finance_summary(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    """Basic finance summary: revenue, expenses, profit."""
    projects: List[models.ProjectRevenue] = db.query(models.ProjectRevenue).all()
    total_estimated_revenue = sum([p.estimated_revenue or 0.0 for p in projects])
    total_estimated_cost = sum([p.estimated_cost or 0.0 for p in projects])
    total_actual_revenue = sum([p.actual_revenue or 0.0 for p in projects])
    total_actual_cost = sum([p.actual_cost or 0.0 for p in projects])

    expense_categories = db.query(models.ExpenseCategory).all()
    total_expense_budgets = sum([e.budget or 0.0 for e in expense_categories])

    company_budget = db.query(models.CompanyBudget).order_by(models.CompanyBudget.updated_at.desc()).first()

    # prefer actuals where available
    revenue = total_actual_revenue or total_estimated_revenue
    expenses = total_actual_cost + total_expense_budgets
    profit = revenue - expenses

    return {
        "revenue": revenue,
        "expenses": expenses,
        "profit": profit,
        "projects_count": len(projects),
        "company_budget": {
            "total_budget": company_budget.total_budget if company_budget else None,
            "spent_amount": company_budget.spent_amount if company_budget else None,
            "currency": company_budget.currency if company_budget else None,
        },
    }


@router.get("/admin/finance/projects")
def list_projects(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
) -> dict:
    projects = db.query(models.ProjectRevenue).order_by(models.ProjectRevenue.created_at.desc()).all()
    out = []
    for p in projects:
        out.append(
            {
                "id": p.id,
                "name": p.name,
                "estimated_revenue": p.estimated_revenue,
                "estimated_cost": p.estimated_cost,
                "actual_revenue": p.actual_revenue,
                "actual_cost": p.actual_cost,
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
        )
    return {"projects": out}


@router.post("/admin/finance/projects", status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), _: dict = Depends(require_admin)) -> dict:
    # create new project revenue entry with provided estimates
    p = models.ProjectRevenue(
        name=payload.name,
        estimated_revenue=payload.estimated_revenue or 0.0,
        estimated_cost=payload.estimated_cost or 0.0,
        actual_revenue=0.0,
        actual_cost=0.0,
        status="planned",
        created_at=models.utc_now(),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"ok": True, "id": p.id}