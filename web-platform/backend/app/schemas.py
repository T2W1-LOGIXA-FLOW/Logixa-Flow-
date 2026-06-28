from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl

PostType = Literal["news", "education", "analysis"]
PostCategory = Literal["Supply Chain", "Logistics", "Procurement", "Operations Excellence", "News"]
PostStatus = Literal["draft", "published"]
BrainStatus = Literal["pending", "approved", "rejected", "published"]


class PostBase(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    slug: str = Field(min_length=3, max_length=255, pattern=r"^[a-z0-9\-_]+$")
    type: PostType = "news"
    category: PostCategory = "Supply Chain"
    excerpt: str = Field(default="", max_length=500)
    content_html: str = Field(min_length=20)
    image_url: str | None = Field(default=None, max_length=1000)
    source_url: HttpUrl | None = None
    is_published: bool = False
    status: PostStatus = "draft"


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    type: PostType | None = None
    category: PostCategory | None = None
    excerpt: str | None = Field(default=None, max_length=500)
    content_html: str | None = Field(default=None, min_length=20)
    image_url: str | None = Field(default=None, max_length=1000)
    source_url: HttpUrl | None = None
    is_published: bool | None = None
    status: PostStatus | None = None


class PostOut(PostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    company: str | None = Field(default=None, max_length=160)
    message: str = Field(min_length=10, max_length=5000)


class ContactOut(ContactCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class SubscriberCreate(BaseModel):
    email: EmailStr


class SubscriberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime


class NewsletterSendRequest(BaseModel):
    subject: str = Field(min_length=3, max_length=255)
    body_html: str = Field(min_length=10)
    test_mode: bool = False


class NewsletterSendResponse(BaseModel):
    status: str
    recipients: int
    task_ids: list[str]
    test_mode: bool


class LoginRequest(BaseModel):
    username: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=4, max_length=200)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class DashboardMetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    title: str
    value: str
    display_order: int
    updated_at: datetime


class DashboardMetricUpdate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    value: str = Field(min_length=1, max_length=80)


class AISettingOut(BaseModel):
    selected_model: Literal["gemini", "llama3", "deepseek", "groq"]


class AISettingUpdate(BaseModel):
    selected_model: Literal["gemini", "llama3", "deepseek", "groq"]


class UploadOut(BaseModel):
    url: str


class BulkImportRecord(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    category: PostCategory = "Supply Chain"
    excerpt: str = Field(default="", max_length=500)
    content_html: str = Field(default="<p>Draft imported from calendar file.</p>", min_length=10)
    slug: str | None = Field(default=None, max_length=255)


class BulkImportRequest(BaseModel):
    records: list[BulkImportRecord] = Field(min_length=1, max_length=200)


class BulkImportOut(BaseModel):
    imported: int
    slugs: list[str]


class IntelligenceSourceCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    url: str | None = Field(default=None, max_length=1000)
    source_type: Literal["manual", "url", "rss", "file"] = "manual"
    category: PostCategory = "Supply Chain"
    trust_level: Literal["standard", "verified", "high"] = "standard"
    notes: str = Field(default="", max_length=8000)


class IntelligenceSourceOut(IntelligenceSourceCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class AgentRunRequest(BaseModel):
    message: str = Field(min_length=8, max_length=4000)
    source_ids: list[int] = Field(default_factory=list, max_length=12)


class AgentStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: int
    step_order: int
    agent: str
    message: str
    created_at: datetime


class AiMemoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: PostCategory
    source_title: str
    source_url: str | None
    prompt: str
    content: str
    summary: str
    status: BrainStatus
    is_public: bool
    post_slug: str | None
    confidence_score: float = 0.0
    hallucination_score: float = 0.0
    created_at: datetime
    updated_at: datetime


class AgentRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    objective: str
    model: str
    status: str
    final_memory_id: int | None
    steps: list[AgentStepOut] = []
    memory: AiMemoryOut | None = None
    created_at: datetime
    updated_at: datetime


class AgentFeedbackRequest(BaseModel):
    run_id: int
    rating: Literal["positive", "negative"]


class AgentFeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: int
    rating: str
    created_at: datetime


class BrainPublishRequest(BaseModel):
    publish_now: bool = False


class SourceFetchRequest(BaseModel):
    feed_url: str = Field(min_length=8, max_length=1000)
    category: PostCategory = "Supply Chain"
    trust_level: Literal["standard", "verified", "high"] = "standard"
    limit: int = Field(default=5, ge=1, le=20)


class SourceFetchOut(BaseModel):
    imported: int
    skipped: int


class CliDraftImport(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    content_markdown: str = Field(min_length=10)
    source_url: str | None = Field(default=None, max_length=1000)
    slug: str | None = Field(default=None, max_length=255)
    category: PostCategory = "Supply Chain"
    ai_model: str = Field(default="cli", max_length=80)


class FeedSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    title: str
    category: PostCategory = "Supply Chain"
    trust_level: Literal["standard", "verified", "high"] = "standard"
    is_active: bool = True
    last_scrape_at: datetime | None = None
    last_scrape_status: str = "idle"
    scrape_count: int = 0
    created_at: datetime
    updated_at: datetime


class AnalyticsDataOut(BaseModel):
    date: str
    agent_runs: int
    pending_approvals: int
    published_posts: int
    sources_added: int


# Logistics Estimator Schemas
LengthUnit = Literal["cm", "m", "inch"]
WeightUnit = Literal["kg", "lb"]


class VehicleTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    length_cm: float
    width_cm: float
    height_cm: float
    max_weight_kg: float
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class VehicleTypeCreate(BaseModel):
    id: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=100)
    length_cm: float = Field(gt=0)
    width_cm: float = Field(gt=0)
    height_cm: float = Field(gt=0)
    max_weight_kg: float = Field(gt=0)
    description: str | None = Field(default=None, max_length=500)


class CartonDimensions(BaseModel):
    length: float = Field(gt=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    weight: float = Field(gt=0)
    quantity: int = Field(gt=0)
    length_unit: LengthUnit = "cm"
    weight_unit: WeightUnit = "kg"


class EstimationRequest(BaseModel):
    carton: CartonDimensions
    vehicle_id: str = Field(min_length=2, max_length=50)
    custom_vehicle: VehicleTypeCreate | None = None
    save_estimate: bool = False
    notes: str | None = Field(default=None, max_length=1000)


class EstimationResultOut(BaseModel):
    capacity_percent: float
    weight_percent: float
    can_fit_by_volume: bool
    can_fit_by_weight: bool
    total_estimates: int
    total_volume_cm3: float
    total_weight_kg: float
    vehicle_volume_cm3: float
    details: dict


class LogisticsEstimateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: str
    carton_length_cm: float
    carton_width_cm: float
    carton_height_cm: float
    carton_weight_kg: float
    quantity: int
    vehicle_length_cm: float
    vehicle_width_cm: float
    vehicle_height_cm: float
    vehicle_max_weight_kg: float
    estimated_capacity_percent: float
    estimated_weight_percent: float
    can_fit_by_volume: bool
    can_fit_by_weight: bool
    total_estimates: int
    total_volume_cm3: float
    total_weight_kg: float
    vehicle_volume_cm3: float
    notes: str | None = None
    created_at: datetime


class EstimationHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    estimate_id: int
    user_email: str | None = None
    action: str
    json_metadata: str | None = None
    created_at: datetime


# AI Chat System Schemas
class ChatMessageBase(BaseModel):
    role: Literal["user", "agent", "system"] = "user"
    content: str = Field(min_length=1, max_length=10000)


class ChatMessageCreate(ChatMessageBase):
    session_id: int | None = None  # If None, will create new session


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    role: Literal["user", "agent", "system"]
    content: str
    agent_id: str | None = None
    model_used: str | None = None
    tokens_used: int | None = None
    cost_estimate: float | None = None
    created_at: datetime


class ChatSessionCreate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    agent_id: str | None = Field(default=None, max_length=100)
    context: dict | None = None


class ChatSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    user_email: str | None = None
    title: str
    agent_id: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ChatQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    context: list[ChatMessageBase] = Field(default_factory=list)
    session_id: str | None = Field(default=None, max_length=64)
    agent_id: str | None = Field(default=None, max_length=100)


class ChatQueryResponse(BaseModel):
    response: str
    agent_id: str
    session_id: str
    message_id: int
    model_used: str


# Controller System Schemas
class ControllerBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    trigger_type: str = Field(min_length=2, max_length=100)
    enabled: bool = True
    config: str | None = None  # JSON string


class ControllerCreate(ControllerBase):
    id: str = Field(min_length=2, max_length=100)


class ControllerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    trigger_type: str | None = Field(default=None, min_length=2, max_length=100)
    enabled: bool | None = None
    config: str | None = None  # JSON string


class ControllerOut(ControllerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    last_execution: datetime | None = None
    success_count: int
    failure_count: int
    created_at: datetime
    updated_at: datetime


# Email Templates System Schemas
class EmailTemplateBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    subject: str = Field(min_length=2, max_length=500)
    template_html: str = Field(min_length=10)
    is_active: bool = True
    description: str | None = Field(default=None, max_length=1000)


class EmailTemplateCreate(EmailTemplateBase):
    id: str = Field(min_length=2, max_length=100)


class EmailTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    subject: str | None = Field(default=None, min_length=2, max_length=500)
    template_html: str | None = Field(default=None, min_length=10)
    is_active: bool | None = None
    description: str | None = Field(default=None, max_length=1000)


class EmailTemplateOut(EmailTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


# Content Submissions System Schemas
class ContentSubmissionBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=50)
    subject: str = Field(min_length=2, max_length=500)
    message: str = Field(min_length=10)
    status: str = Field(default="pending", max_length=50)


class ContentSubmissionCreate(ContentSubmissionBase):
    id: str = Field(min_length=2, max_length=100)


class ContentSubmissionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    subject: str | None = Field(default=None, min_length=2, max_length=500)
    message: str | None = Field(default=None, min_length=10)
    status: str | None = Field(default=None, max_length=50)
    read_at: datetime | None = None


class ContentSubmissionOut(ContentSubmissionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    read_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
