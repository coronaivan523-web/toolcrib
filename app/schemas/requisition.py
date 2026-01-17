from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

# --- Enums (V2) ---
class RequisitionStatus(str, Enum):
    DRAFT = "DRAFT"
    UNDER_APPROVAL = "UNDER_APPROVAL"
    REWORK_REQUIRED = "REWORK_REQUIRED"
    APPROVED_PRE_PURCHASE = "APPROVED_PRE_PURCHASE"
    APPROVED = "APPROVED"
    ORDERED = "ORDERED"
    RECEIVED = "RECEIVED"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    CLOSED = "CLOSED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    CANCELED = "CANCELED" # Legacy?
    CANCELLED = "CANCELLED" # Constraint
    REJECTED = "REJECTED" # Constraint
    REJECTED_FINAL = "REJECTED_FINAL" # Legacy?

class StepStatus(str, Enum):
    WAITING = "WAITING"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SKIPPED = "SKIPPED"

class ApprovalStepName(str, Enum):
    SOLICITANTE = "SOLICITANTE"
    GERENTE_MX = "GERENTE_MX"
    GERENTE_CH = "GERENTE_CH"
    GERENTE_GENERAL = "GERENTE_GENERAL"

class RequisitionPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"

class ApprovalAction(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    RESUBMIT = "RESUBMIT"
    CANCEL = "CANCEL"

# --- Requisition Attachments ---
class RequisitionAttachmentBase(BaseModel):
    filename: str
    url: str

class RequisitionAttachmentCreate(RequisitionAttachmentBase):
    pass

class RequisitionAttachmentResponse(RequisitionAttachmentBase):
    id: UUID
    requisition_id: UUID
    uploaded_by: Optional[UUID] = None
    uploaded_at: datetime

# --- Requisition Items ---
class RequisitionItemBase(BaseModel):
    material_id: int
    quantity_requested: int
    unit: Optional[str] = None
    notes: Optional[str] = None
    supplier: Optional[str] = None
    cost_center: Optional[str] = None
    project_code: Optional[str] = None
    monthly_consumption: Optional[float] = None
    cause: Optional[str] = None

class RequisitionItemCreate(RequisitionItemBase):
    pass

class RequisitionItemResponse(RequisitionItemBase):
    id: UUID
    requisition_id: UUID
    quantity_approved: Optional[int] = None
    quantity_received: Optional[int] = 0
    material_name: Optional[str] = None 
    material: Optional[Dict[str, Any]] = None

# --- Incoming Payloads ---
class IncomingItem(BaseModel):
    item_id: UUID
    material_id: int
    quantity: int

class IncomingPayload(BaseModel):
    items: List[IncomingItem]

# --- Requisition Approvals (Workflows) ---
class RequisitionApprovalResponse(BaseModel):
    id: UUID
    requisition_id: UUID
    step_order: int
    step_name: str
    step_status: StepStatus
    assigned_to_user_id: Optional[UUID] = None
    action_by_user_id: Optional[UUID] = None
    assigned_at: Optional[datetime] = None
    action_at: Optional[datetime] = None
    comment: Optional[str] = None
    created_at: datetime
    approver: Optional[Dict[str, Any]] = None

# --- Actions Payloads ---
class CustomApprovalStep(BaseModel):
    user_id: UUID
    label: str
    order: int

class RequisitionSubmit(BaseModel):
    gerente_mx_id: Optional[UUID] = None
    gerente_ch_id: Optional[UUID] = None
    gerente_gral_id: Optional[UUID] = None
    custom_approvals: Optional[List[CustomApprovalStep]] = None
    resubmission_comment: Optional[str] = None # New field for correction notes

class RequisitionReject(BaseModel):
    comment: str = Field(..., min_length=1, description="Reason for rejection is required")

class RequisitionApprove(BaseModel):
    comment: Optional[str] = None

# --- Requisitions Main ---
class RequisitionBase(BaseModel):
    priority: RequisitionPriority = RequisitionPriority.NORMAL
    justification: Optional[str] = None
    # V2 Fields
    purchase_justification: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    cause: Optional[str] = None
    criticality_requested: Optional[str] = None # C1, C2, C3, C4
    criticality_assigned: Optional[str] = None
    requester_name: Optional[str] = None
    requester_id: Optional[UUID] = None

class RequisitionCreate(RequisitionBase):
    items: List[RequisitionItemCreate]
    attachments: Optional[List[RequisitionAttachmentCreate]] = []

class RequisitionUpdate(RequisitionBase):
    items: Optional[List[RequisitionItemCreate]] = None
    attachments: Optional[List[RequisitionAttachmentCreate]] = None

class RequisitionResponse(RequisitionBase):
    id: UUID
    folio: int
    req_number: Optional[str] = None
    requester_id: UUID
    status: RequisitionStatus
    
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    
    # Nested
    items: List[RequisitionItemResponse] = []
    approvals: List[RequisitionApprovalResponse] = []
    attachments: List[RequisitionAttachmentResponse] = []
    requester: Optional[Dict[str, Any]] = None
    creator: Optional[Dict[str, Any]] = None

    # Approver assignments snapshot
    gerente_mx_id: Optional[UUID] = None
    gerente_ch_id: Optional[UUID] = None
    gerente_gral_id: Optional[UUID] = None
