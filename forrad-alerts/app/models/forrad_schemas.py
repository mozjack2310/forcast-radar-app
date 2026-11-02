import re
from typing import Any, Dict, Final, List, Optional
from pydantic import BaseModel, Field

DEFAULT_DESCRIPTION_FALLBACK: Final[str] = "No official description provided by National Weather Service."

__all__ = [
    "DEFAULT_DESCRIPTION_FALLBACK",
    "ForRadAlert",
    "_normalize_nws_text",
    "_extract_polygon_rings",
]


def _normalize_nws_text(raw_text: Optional[str]) -> Optional[str]:
    """
    Normalizes legacy NWS AWIPS 65-character hard-wrapped teletype prose.
    Preserves double newlines (paragraphs) and Impact-Based Warning (IBW) tags (...TAG...).
    """
    if not raw_text:
        return None

    text = raw_text.replace("\r\n", "\n").strip()
    paragraphs = re.split(r"\n\s*\n", text)
    cleaned_paragraphs: List[str] = []

    for para in paragraphs:
        lines = para.split("\n")
        if any("..." in line or line.strip().startswith(("*", "-", "•")) for line in lines):
            cleaned_paragraphs.append("\n".join(line.strip() for line in lines if line.strip()))
        else:
            joined = " ".join(line.strip() for line in lines if line.strip())
            if joined:
                cleaned_paragraphs.append(joined)

    return "\n\n".join(cleaned_paragraphs)


def _extract_polygon_rings(geometry: Optional[Dict[str, Any]]) -> Optional[List[Any]]:
    """
    Extracts GeoJSON coordinate rings from geometry payloads.
    Returns coordinate list if valid Polygon/MultiPolygon, else None.
    """
    if not geometry or not isinstance(geometry, dict):
        return None

    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")

    if geom_type in ("Polygon", "MultiPolygon") and coords and len(coords) > 0:
        return coords

    return None


class ForRadAlert(BaseModel):
    """Sanitized, Imperial-normalized weather hazard model for ForRad."""
    alert_id: str = Field(..., description="Unique NWS alert identifier")
    event: str = Field(default="Weather Alert", description="Hazard event designation")
    severity: str = Field(default="Unknown", description="NWS severity categorization")
    headline: Optional[str] = Field(default=None, description="Executive alert headline")
    description: str = Field(
        default=DEFAULT_DESCRIPTION_FALLBACK,
        description="Full meteorological alert description or fallback sentinel"
    )
    instruction: Optional[str] = Field(default=None, description="Actionable safety instructions")
    active_areas: List[str] = Field(default_factory=list, description="Targeted geographic areas")
    has_polygon: bool = Field(default=False, description="True if precise vector polygon coordinates exist")
    polygon_coordinates: Optional[List[Any]] = Field(default=None, description="GeoJSON polygon coordinate array")

    # Backward-compatible property aliases
    @property
    def id(self) -> str:
        return self.alert_id

    @property
    def event_type(self) -> str:
        return self.event

    @property
    def area_desc(self) -> Optional[str]:
        return "; ".join(self.active_areas) if self.active_areas else None

    @property
    def coordinates(self) -> Optional[List[Any]]:
        return self.polygon_coordinates

    @classmethod
    def from_nws_feature(cls, feature: Any) -> "ForRadAlert":
        """Transforms a raw dict or NWSAlertFeature Pydantic model into a ForRadAlert."""
        if hasattr(feature, "properties"):
            feat_id = getattr(feature, "id", None)
            props = getattr(feature, "properties", None)
            geom = getattr(feature, "geometry", None)
            props_dict = props.model_dump() if hasattr(props, "model_dump") else (props if isinstance(props, dict) else {})
            geom_dict = geom.model_dump() if hasattr(geom, "model_dump") else (geom if isinstance(geom, dict) else None)
        elif isinstance(feature, dict):
            feat_id = feature.get("id")
            props_dict = feature.get("properties") or {}
            geom_dict = feature.get("geometry")
        else:
            feat_id = None
            props_dict = {}
            geom_dict = None

        # Clean description with fallback
        raw_desc = props_dict.get("description")
        normalized_desc = _normalize_nws_text(raw_desc) if raw_desc and raw_desc.strip() else DEFAULT_DESCRIPTION_FALLBACK

        # Clean instruction
        raw_inst = props_dict.get("instruction")
        normalized_inst = _normalize_nws_text(raw_inst) if raw_inst and raw_inst.strip() else None

        # Clean headline (unwrap newlines to single space)
        raw_headline = props_dict.get("headline")
        clean_headline = " ".join(raw_headline.split()) if raw_headline and raw_headline.strip() else None

        # Extract active areas from semicolon-delimited areaDesc
        area_raw = props_dict.get("areaDesc")
        active_areas = [a.strip() for a in area_raw.split(";") if a.strip()] if area_raw else []

        # Extract geometry coordinates
        rings = _extract_polygon_rings(geom_dict)

        return cls(
            alert_id=str(feat_id or props_dict.get("id", "UNKNOWN_ALERT_ID")),
            event=props_dict.get("event", "Weather Alert"),
            severity=props_dict.get("severity", "Unknown"),
            headline=clean_headline,
            description=normalized_desc or DEFAULT_DESCRIPTION_FALLBACK,
            instruction=normalized_inst,
            active_areas=active_areas,
            has_polygon=(rings is not None),
            polygon_coordinates=rings,
        )
