from typing import Dict, Any, List

def analyze_incident(title: str, description: str, category: str, casualties: int, location_verified: bool) -> Dict[str, Any]:
    text = (description + " " + title).lower()
    facts: List[str] = []
    uncertainties: List[str] = []
    missing_info: List[str] = []
    resource_needs: List[str] = []

    if casualties > 0:
        facts.append(f"{casualties} potential casualties reported by caller.")
        resource_needs.append("Paramedic / Ambulance (Advanced Life Support)")
    elif any(k in text for k in ["injured", "casualty", "hurt", "bleed"]):
        uncertainties.append("Injury reported in narrative, exact casualty count unquantified.")
        resource_needs.append("Emergency Medical Service triage unit")

    if any(k in text for k in ["trapped", "pinned", "extricat", "stuck"]):
        facts.append("Report indicates occupant/individual trapped requiring physical extrication.")
        resource_needs.append("Heavy Rescue / Hydraulic Extrication Unit")

    if any(k in text for k in ["fire", "smoke", "flame", "burn"]):
        facts.append("Active thermal/combustion hazard identified.")
        resource_needs.append("Fire Engine / Pumper Suppression Company")

    if any(k in text for k in ["fuel", "leak", "chemical", "spill", "gas"]):
        facts.append("Hazardous/flammable material release reported on scene.")
        resource_needs.append("HazMat Spill Containment and Neutralization Unit")

    if not location_verified:
        missing_info.append("Precise GPS coordinates unconfirmed. Location requires operator confirmation.")
        uncertainties.append("Exact entrance gate or cross-street corridor is unverified.")

    if not facts:
        facts.append(f"Original reporter statement logged: '{title}'")
    if not resource_needs:
        resource_needs.append("General Emergency Response Assessment Unit")

    return {
        "normalized_category": category,
        "extracted_facts": facts,
        "known_uncertainties": uncertainties or ["Environmental visibility and structural stability unconfirmed."],
        "missing_information": missing_info or ["On-scene command radio channel frequency."],
        "resource_needs": resource_needs,
        "explanation": f"Identified {len(facts)} facts, {len(resource_needs)} resource requirements, flagged {len(missing_info)} gaps."
    }
