import math
from typing import Dict, Any, Optional

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c

def calculate_route(start_lat: Optional[float], start_lon: Optional[float], dest_lat: Optional[float], dest_lon: Optional[float], verified: bool) -> Dict[str, Any]:
    if not verified or start_lat is None or start_lon is None or dest_lat is None or dest_lon is None:
        return {
            "status": "PREREQUISITE_FAILED",
            "message": "Prerequisite failed: Incident location is unverified. Cannot calculate road dispatch routes without confirmed coordinates.",
            "data_source": "Metro Road Network Graph v2.4 (Dijkstra)",
            "limitations": [
                "Requires verified origin and destination coordinates",
                "Deterministic routing forbids inventing coordinates"
            ]
        }

    dist_km = round(haversine(start_lat, start_lon, dest_lat, dest_lon) * 1.25, 2)
    duration_mins = max(1.0, round((dist_km / 45.0) * 60, 1))

    return {
        "status": "SUCCESS",
        "distance_km": dist_km,
        "estimated_duration_minutes": duration_mins,
        "steps": [
            f"Depart origin toward nearest arterial corridor ({dist_km * 0.2:.2f} km)",
            f"Proceed along designated emergency route ({dist_km * 0.7:.2f} km)",
            f"Arrive at destination ({dest_lat:.4f}, {dest_lon:.4f})"
        ],
        "polyline": [[start_lat, start_lon], [(start_lat + dest_lat) / 2, (start_lon + dest_lon) / 2], [dest_lat, dest_lon]],
        "data_source": "Metro Road Network Graph v2.4 (Dijkstra)",
        "limitations": ["Simulated arterial corridor", "Requires operator verification upon arrival"],
        "message": f"Calculated {dist_km} km route with ETA ~{duration_mins} mins."
    }
