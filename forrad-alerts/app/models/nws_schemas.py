from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# ==========================================
# PHASE 1A: RAW INGESTION MODELS (NWS Schema)
# ==========================================

class NWSAlertProperties(BaseModel):
    """Exactly what we care about from the raw NWS payload."""
    id: str = Field(alias="id") # NWS sometimes nests the ID in properties too
    event: str = Field(description="The type of weather event (e.g., 'Heat Advisory')")
    headline: Optional[str] = Field(default=None)
    description: str = Field(description="Full text of the alert")
    instruction: Optional[str] = Field(default=None)
    severity: str 
    urgency: str
    areaDesc: str = Field(description="Semicolon delimited list of counties/zones")
    effective: datetime
    expires: datetime

class NWSAlertFeature(BaseModel):
    id: str
    type: str = "Feature"
    geometry: Optional[Dict[str, Any]] = None
    properties: NWSAlertProperties

class NWSFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[NWSAlertFeature]