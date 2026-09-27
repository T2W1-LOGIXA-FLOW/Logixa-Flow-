from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, ForeignKey

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False, default="news", index=True)
    category = Column(String(80), nullable=False, default="Supply Chain", index=True)
    excerpt = Column(String(500), nullable=False, default="")
    content_html = Column(Text, nullable=False)
    image_url = Column(String(1000), nullable=True)
    source_url = Column(String(1000), nullable=True)
    is_published = Column(Boolean, default=False, nullable=False, index=True)
    status = Column(String(40), default="draft", nullable=False, index=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    company = Column(String(160), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class DashboardMetric(Base):
    __tablename__ = "dashboard_metrics"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(80), unique=True, nullable=False, index=True)
    title = Column(String(160), nullable=False)
    value = Column(String(80), nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(120), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class IntelligenceSource(Base):
    __tablename__ = "intelligence_sources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    url = Column(String(1000), nullable=True)
    source_type = Column(String(40), default="manual", nullable=False, index=True)
    category = Column(String(80), default="Supply Chain", nullable=False, index=True)
    trust_level = Column(String(40), default="standard", nullable=False, index=True)
    trust_score = Column(Float, default=0.5, nullable=False)
    notes = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AiMemoryBrain(Base):
    __tablename__ = "ai_memory_brain"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(80), default="Supply Chain", nullable=False, index=True)
    source_title = Column(String(255), nullable=False, index=True)
    source_url = Column(String(1000), nullable=True)
    prompt = Column(Text, nullable=False, default="")
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=False, default="")
    status = Column(String(40), default="pending", nullable=False, index=True)
    is_public = Column(Boolean, default=False, nullable=False, index=True)
    post_slug = Column(String(255), nullable=True, index=True)
    confidence_score = Column(Float, default=0.0, nullable=False)
    hallucination_score = Column(Float, default=0.0, nullable=False)
    feedback_score = Column(Integer, default=0, nullable=False)  # -1 (unhelpful) or 1 (helpful)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    objective = Column(Text, nullable=False)
    model = Column(String(80), default="local-planner", nullable=False)
    status = Column(String(40), default="completed", nullable=False, index=True)
    final_memory_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AgentFeedbackEvent(Base):
    __tablename__ = "agent_feedback_events"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, nullable=False, index=True)
    rating = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class AgentStep(Base):
    __tablename__ = "agent_steps"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, nullable=False, index=True)
    step_order = Column(Integer, nullable=False, default=0)
    agent = Column(String(80), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String(80), primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    description = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class WorkflowNodeRecord(Base):
    __tablename__ = "workflow_nodes"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(String(80), ForeignKey("workflows.id"), nullable=False, index=True)
    node_id = Column(String(80), nullable=False, index=True)
    node_type = Column(String(40), nullable=False, default="task")
    name = Column(String(120), nullable=False)
    depends_on = Column(Text, nullable=False, default="[]")
    retry_count = Column(Integer, nullable=False, default=0)
    timeout_seconds = Column(Integer, nullable=False, default=30)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class ScheduledWorkflowJob(Base):
    __tablename__ = "scheduled_workflow_jobs"

    id = Column(String(80), primary_key=True, index=True)
    run_id = Column(String(80), ForeignKey("workflow_runs.id"), nullable=False, unique=True, index=True)
    workflow_id = Column(String(80), ForeignKey("workflows.id"), nullable=False, index=True)
    priority = Column(Integer, nullable=False, default=0)
    scheduled_for = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(40), nullable=False, default="queued", index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class WorkflowRunRecord(Base):
    __tablename__ = "workflow_runs"

    id = Column(String(80), primary_key=True, index=True)
    workflow_id = Column(String(80), ForeignKey("workflows.id"), nullable=False, index=True)
    status = Column(String(40), nullable=False, default="queued", index=True)
    current_node = Column(String(80), nullable=True)
    completed_nodes = Column(Text, nullable=False, default="[]")
    error = Column(Text, nullable=True)
    execution_log = Column(Text, nullable=False, default="[]")
    metrics_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    details = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class FeedSource(Base):
    __tablename__ = "feed_sources"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(1000), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False, default="")
    category = Column(String(80), default="Supply Chain", nullable=False, index=True)
    trust_level = Column(String(40), default="standard", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    last_scrape_at = Column(DateTime(timezone=True), nullable=True)
    last_scrape_status = Column(String(40), default="idle", nullable=False)
    scrape_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class DocumentEmbedding(Base):
    __tablename__ = "document_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String(40), nullable=False, index=True)
    source_id = Column(String(64), nullable=False, index=True)
    chunk_index = Column(Integer, default=0, nullable=False)
    title = Column(String(255), nullable=False, default="")
    content = Column(Text, nullable=False)
    embedding_json = Column(Text, nullable=False)
    embedding_model = Column(String(120), nullable=False, default="hash:fallback")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)  # future: users table
    toxicity_score = Column(Float, default=0.0)
    status = Column(String(20), default="pending", index=True)  # pending, approved, blocked
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class VehicleType(Base):
    __tablename__ = "vehicle_types"
    id = Column(String(50), primary_key=True, index=True)  # e.g., "20ft_container", "40ft_container", "custom"
    name = Column(String(100), nullable=False)  # e.g., "20ft Container", "Custom Vehicle"
    length_cm = Column(Float, nullable=False)  # Length in centimeters
    width_cm = Column(Float, nullable=False)  # Width in centimeters
    height_cm = Column(Float, nullable=False)  # Height in centimeters
    max_weight_kg = Column(Float, nullable=False)  # Maximum weight in kg
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class LogisticsEstimate(Base):
    __tablename__ = "logistics_estimates"
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String(50), ForeignKey("vehicle_types.id"), nullable=False, index=True)
    carton_length_cm = Column(Float, nullable=False)
    carton_width_cm = Column(Float, nullable=False)
    carton_height_cm = Column(Float, nullable=False)
    carton_weight_kg = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    vehicle_length_cm = Column(Float, nullable=False)
    vehicle_width_cm = Column(Float, nullable=False)
    vehicle_height_cm = Column(Float, nullable=False)
    vehicle_max_weight_kg = Column(Float, nullable=False)
    estimated_capacity_percent = Column(Float, nullable=False)
    estimated_weight_percent = Column(Float, nullable=False)
    can_fit_by_volume = Column(Boolean, nullable=False)
    can_fit_by_weight = Column(Boolean, nullable=False)
    total_estimates = Column(Integer, nullable=False)
    total_volume_cm3 = Column(Float, nullable=False)
    total_weight_kg = Column(Float, nullable=False)
    vehicle_volume_cm3 = Column(Float, nullable=False)
    user_ip = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class EstimationHistory(Base):
    __tablename__ = "estimation_history"
    id = Column(Integer, primary_key=True, index=True)
    estimate_id = Column(Integer, ForeignKey("logistics_estimates.id"), nullable=False, index=True)
    user_email = Column(String(255), nullable=True)  # If user is logged in
    action = Column(String(50), nullable=False)  # "created", "updated", "shared", "exported"
    json_metadata = Column(Text, nullable=True)  # JSON metadata
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Controller(Base):
    __tablename__ = "controllers"
    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    trigger_type = Column(String(100), nullable=False)  # "webhook", "schedule", "manual", etc.
    enabled = Column(Boolean, default=True, nullable=False, index=True)
    config = Column(Text, nullable=True)  # JSON configuration
    last_execution = Column(DateTime(timezone=True), nullable=True)
    success_count = Column(Integer, default=0, nullable=False)
    failure_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class EmailTemplate(Base):
    __tablename__ = "email_templates"
    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    template_html = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class ContentSubmission(Base):
    __tablename__ = "content_submissions"
    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    subject = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False, index=True)  # "pending", "reviewed", "approved", "rejected"
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)  # UUID for public facing
    owner_id = Column(String(255), nullable=True, index=True)  # JWT subject for admin-owned sessions
    user_email = Column(String(255), nullable=True)  # If user is logged in
    title = Column(String(255), nullable=True, default="New Conversation")
    agent_id = Column(String(100), nullable=True)  # Which agent this session is for
    context = Column(Text, nullable=True)  # JSON context for the session
    is_active = Column(Boolean, default=True, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user", "agent", "system"
    content = Column(Text, nullable=False)
    agent_id = Column(String(100), nullable=True)  # Which agent generated this message
    model_used = Column(String(100), nullable=True)  # Which AI model was used
    tokens_used = Column(Integer, nullable=True)  # Token usage tracking
    cost_estimate = Column(Float, nullable=True)  # Estimated cost in USD
    json_metadata = Column(Text, nullable=True)  # JSON metadata
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class ApiUsageLog(Base):
    __tablename__ = "api_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(120), nullable=False, index=True)
    api_key_name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, index=True)
    model = Column(String(255), nullable=True, index=True)
    tokens_used = Column(Integer, nullable=True)
    cost = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class ProjectRevenue(Base):
    __tablename__ = "project_revenues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    estimated_revenue = Column(Float, default=0.0, nullable=False)
    estimated_cost = Column(Float, default=0.0, nullable=False)
    actual_revenue = Column(Float, default=0.0, nullable=False)
    actual_cost = Column(Float, default=0.0, nullable=False)
    status = Column(String(40), default="planned", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    budget = Column(Float, default=0.0, nullable=False)


class CompanyBudget(Base):
    __tablename__ = "company_budgets"

    id = Column(Integer, primary_key=True, index=True)
    total_budget = Column(Float, default=0.0, nullable=False)
    spent_amount = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)