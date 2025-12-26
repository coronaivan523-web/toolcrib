from typing import List, Optional
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
    CANCELED = "CANCELED"
    REJECTED_FINAL = "REJECTED_FINAL"

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
    material_name: Optional[str] = None 

# --- Requisition Approvals (Workflows) ---
class RequisitionApprovalResponse(BaseModel):
    id: UUID
    requisition_id: UUID
    step_order: int
    step_name: ApprovalStepName
    step_status: StepStatus
    assigned_to_user_id: Optional[UUID] = None
    action_by_user_id: Optional[UUID] = None
    assigned_at: Optional[datetime] = None
    action_at: Optional[datetime] = None
    comment: Optional[str] = None
    created_at: datetime

# --- Actions Payloads ---
class RequisitionSubmit(BaseModel):
    gerente_mx_id: UUID
    gerente_ch_id: UUID
    gerente_gral_id: Optional[UUID] = None

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

class RequisitionCreate(RequisitionBase):
    items: List[RequisitionItemCreate]
    attachments: Optional[List[RequisitionAttachmentCreate]] = []

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

    # Approver assignments snapshot
    gerente_mx_id: Optional[UUID] = None
    gerente_ch_id: Optional[UUID] = None
    gerente_gral_id: Optional[UUID] = None
