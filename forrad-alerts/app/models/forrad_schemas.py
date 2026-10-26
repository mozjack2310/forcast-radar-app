import re
from datetime import datetime
from typing import Any, Dict, Final, FrozenSet, List, Optional, Tuple
from pydantic import BaseModel, Field

from app.models.nws_schemas import NWSAlertFeature

# ==============================================================================
# DATA CONSTANTS (Strictly Isolated from Executable Logic)
# ==============================================================================
DEFAULT_DESCRIPTION_FALLBACK: Final[str] = (
    "No additional bulletin details provided by the National Weather Service."
)
PRESERVED_LINE_PREFIXES: Final[Tuple[str, ...]] = ("*", "-", "•")
IBW_TAG_DELIMITER: Final[str] = "..."
SUPPORTED_GEOJSON_TYPES: Final[FrozenSet[str]] = frozenset({"Polygon", "MultiPolygon"})
PARAGRAPH_SPLIT_PATTERN: Final[re.Pattern[str]] = re.compile(r"\n\s*\n")


# ==============================================================================
# PURE TRANSFORMATION UTILITIES (Zero Deep Nesting)
# ==============================================================================
def _should_preserve_line_breaks(lines: List[str]) -> bool:
    """
    Determines whether a paragraph block contains NWS Impact-Based Warning (IBW)
    tags (e.g., 'HAIL THREAT...RADAR INDICATED') or explicit list items.
    """
    return any(
        line.startswith(PRESERVED_LINE_PREFIXES) or IBW_TAG_DELIMITER in line
        for line in lines
    )


def _format_paragraph_block(raw_paragraph: str) -> str:
    """
    Normalizes a single paragraph block, unwrapping 65-char teletype lines
    while preserving explicit list items and IBW threat rows.
    """
    lines = [line.strip() for line in raw_paragraph.split("\n") if line.strip()]
    if not lines:
        return ""
    if _should_preserve_line_breaks(lines):
        return "\n".join(lines)
    return " ".join(lines)


def _normalize_nws_text(raw_text: Optional[str]) -> Optional[str]:
    """
    Cleans hard-wrapped 65-char NWS bulletin lines into readable paragraphs
    while strictly preserving double newlines and Impact-Based Warning (IBW) tags.
    """
    if not raw_text:
        return None

    cleaned = raw_text.replace("\r\n", "\n").strip()
    if not cleaned:
        return None

    raw_paragraphs = PARAGRAPH_SPLIT_PATTERN.split(cleaned)
    normalized_paragraphs = [
        formatted
        for paragraph in raw_paragraphs
        if (formatted := _format_paragraph_block(paragraph))
    ]
    if not normalized_paragraphs:
        return None

    return "\n\n".join(normalized_paragraphs)


def _extract_polygon_rings(geometry: Optional[Dict[str, Any]]) -> Optional[List[Any]]:
    """
    Extracts coordinate arrays from GeoJSON Polygon or MultiPolygon structures
    for downstream React-Leaflet rendering.
    """
    if not geometry or not isinstance(geometry, dict):
        return None

    geo_type = geometry.get("type")
    if geo_type not in SUPPORTED_GEOJSON_TYPES:
        return None

    coords = geometry.get("coordinates")
    if not coords or not isinstance(coords, list):
        return None

    return coords


# ==============================================================================
# PHASE 1B: SANITIZED MODELS (ForRad Schema Contract)
# ==============================================================================
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
        description="Concise summary headline from NWS",
    )
    description: str = Field(
        default=DEFAULT_DESCRIPTION_FALLBACK,
        max_length=32000,
        description="Full official NWS bulletin text",
    )
    instruction: Optional[str] = Field(
        default=None,
        max_length=8000,
        description="Precautionary and preparedness instructions",
    )
    active_areas: List[str] = Field(description="List of affected counties or forecast zones")
    start_time: datetime = Field(description="Effective timestamp of the bulletin")
    end_time: datetime = Field(description="Expiration timestamp of the bulletin")
    has_polygon: bool = Field(description="True if a spatial boundary polygon exists")
    polygon_coordinates: Optional[List[Any]] = Field(
        default=None,
        description="GeoJSON coordinate arrays for Leaflet rendering",
    )

    @classmethod
    def from_nws_feature(cls, feature: NWSAlertFeature) -> "ForRadAlert":
        props = feature.properties
        raw_areas = props.areaDesc.split(";") if props.areaDesc else []
        cleaned_areas = [area.strip() for area in raw_areas if area.strip()]
        polygon_coords = _extract_polygon_rings(feature.geometry)

        normalized_headline = _normalize_nws_text(props.headline)
        normalized_desc = (
            _normalize_nws_text(props.description)
            or normalized_headline
            or DEFAULT_DESCRIPTION_FALLBACK
        )

        return cls(
            alert_id=feature.id or props.id,
            event_type=props.event,
            severity_level=props.severity,
            urgency=props.urgency,
            headline=normalized_headline,
            description=normalized_desc,
            instruction=_normalize_nws_text(props.instruction),
            active_areas=cleaned_areas,
            start_time=props.effective,
            end_time=props.expires,
            has_polygon=polygon_coords is not None,
            polygon_coordinates=polygon_coords,
        )
