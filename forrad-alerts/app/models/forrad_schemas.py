import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.nws_schemas import NWSAlertFeature


def _normalize_nws_text(raw_text: Optional[str]) -> Optional[str]:
    """
    Cleans hard-wrapped 68-char NWS bulletin lines into readable paragraphs
    while strictly preserving double newlines and Impact-Based Warning (IBW) tags.
    """
    if not raw_text:
        return None
    cleaned = raw_text.replace("\r\n", "\n").strip()
    if not cleaned:
        return None
    paragraphs = re.split(r"\n\s*\n", cleaned)
    normalized_paragraphs: List[str] = []
    for paragraph in paragraphs:
        lines = [line.strip() for line in paragraph.split("\n") if line.strip()]
        if not lines:
            continue
        # Preserve explicit list items, bullet points, or NWS "...TAG..." lines
        if any(
            line.startswith(("*", "-", "•")) or "..." in line
            for line in lines
        ):
            normalized_paragraphs.append("\n".join(lines))
        else:
            normalized_paragraphs.append(" ".join(lines))
    return "\n\n".join(normalized_paragraphs)


def _extract_polygon_rings(geometry: Optional[Dict[str, Any]]) -> Optional[List[Any]]:
    """
    Extracts coordinate arrays from GeoJSON Polygon or MultiPolygon structures.
    """
    if not geometry or not isinstance(geometry, dict):
        return None
    coords = geometry.get("coordinates")
    if not coords or not isinstance(coords, list):
        return None
    return coords


class ForRadAlert(BaseModel):
    """
    The strictly-typed sanitized alert contract sent to Next.js and MatrixPortal.
    """
    alert_id: str = Field(description="Unique NWS alert identifier")
    event_type: str = Field(description="NWS event name, e.g., Tornado Warning")
    severity_level: str = Field(description="Extreme, Severe, Moderate, Minor, or Unknown")
    urgency: str = Field(description="Immediate, Expected, Future, Past, or Unknown")
    headline: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Concise summary headline from NWS"
    )
    description: str = Field(
        default="No additional bulletin details provided by the National Weather Service.",
        max_length=32000,
        description="Full official NWS bulletin text"
    )
    instruction: Optional[str] = Field(
        default=None,
        max_length=8000,
        description="Precautionary and preparedness instructions"
    )
    active_areas: List[str] = Field(description="List of affected counties or forecast zones")
    start_time: datetime = Field(description="Effective timestamp of the bulletin")
    end_time: datetime = Field(description="Expiration timestamp of the bulletin")
    has_polygon: bool = Field(description="True if a spatial boundary polygon exists")
    polygon_coordinates: Optional[List[Any]] = Field(
        default=None,
        description="GeoJSON coordinate arrays for Leaflet rendering"
    )

    @classmethod
    def from_nws_feature(cls, feature: NWSAlertFeature) -> "ForRadAlert":
        props = feature.properties
        raw_areas = props.areaDesc.split(";") if props.areaDesc else []
        cleaned_areas = [area.strip() for area in raw_areas if area.strip()]
        polygon_coords = _extract_polygon_rings(feature.geometry)

        normalized_desc = _normalize_nws_text(props.description)
        if not normalized_desc:
            normalized_desc = (
                props.headline
                or "No additional bulletin details provided by the National Weather Service."
            )

        return cls(
            alert_id=feature.id or props.id,
            event_type=props.event,
            severity_level=props.severity,
            urgency=props.urgency,
            headline=_normalize_nws_text(props.headline),
            description=normalized_desc,
            instruction=_normalize_nws_text(props.instruction),
            active_areas=cleaned_areas,
            start_time=props.effective,
            end_time=props.expires,
            has_polygon=polygon_coords is not None,
            polygon_coordinates=polygon_coords,
        )
