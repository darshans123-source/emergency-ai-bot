from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime

@dataclass
class UserModel:
    id: str
    name: str
    email: str
    password_hash: str
    role: str  # 'reporter' | 'operator' | 'admin'
    organization: str
    created_at: str

@dataclass
class IncidentLocationModel:
    address: str
    latitude: Optional[float]
    longitude: Optional[float]
    verified: bool
    notes: Optional[str] = None

@dataclass
class IncidentModel:
    id: str
    title: str
    category: str
    description: str
    status: str
    priority: str
    location: IncidentLocationModel
    casualties_count: int
    reporter_id: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    image_url: Optional[str] = None
    assigned_operator_id: Optional[str] = None
    assigned_operator_name: Optional[str] = None
    is_demo: bool = True
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    priority_recommendation: Optional[Dict[str, Any]] = None

@dataclass
class ResourceModel:
    id: str
    name: str
    type: str  # 'AMBULANCE' | 'FIRE_UNIT' | 'POLICE_PATROL' | 'RESCUE_TEAM' | 'GENERAL_SUPPORT'
    status: str  # 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'UNAVAILABLE'
    latitude: float
    longitude: float
    address: str
    capacity: str
    operational_notes: str
    assigned_incident_id: Optional[str] = None
    is_demo: bool = True
    last_verified_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

@dataclass
class ResourceAssignmentModel:
    id: str
    incident_id: str
    resource_id: str
    resource_name: str
    resource_type: str
    status: str  # 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RELEASED'
    distance_km: float
    estimated_duration_mins: float
    match_score: int
    recommendation_reason: str
    rejection_reason: Optional[str] = None
    requested_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    released_at: Optional[str] = None
