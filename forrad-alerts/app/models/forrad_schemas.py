from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

# Import the NWS feature model so we can use it in our transformer method
from app.models.nws_schemas import NWSAlertFeature

# ==========================================
# PHASE 1B: SANITIZED MODELS (ForRad Schema)
# ==========================================

class ForRadAlert(BaseModel):
    """The lean, strictly-typed model sent to Next.js and the MatrixPortal."""
    alert_id: str
    event_type: str
    severity_level: str
    urgency: str
    active_areas: List[str]
    start_time: datetime
    end_time: datetime
    has_polygon: bool
    polygon_coordinates: Optional[List[Any]] = None
    
    @classmethod
    def from_nws_feature(cls, feature: NWSAlertFeature) -> "ForRadAlert":
        """Transforms the bloated NWS feature into the lean ForRad model."""
        areas = [area.strip() for area in feature.properties.areaDesc.split(";")]
        
        return cls(
            alert_id=feature.id,
            event_type=feature.properties.event,
            severity_level=feature.properties.severity,
            urgency=feature.properties.urgency,
            active_areas=areas,
            start_time=feature.properties.effective,
            end_time=feature.properties.expires,
            has_polygon=feature.geometry is not None,
            polygon_coordinates=feature.geometry.get("coordinates") if feature.geometry else None
        )