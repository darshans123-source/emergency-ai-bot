from typing import Dict, Any, List

def assess_priority(title: str, description: str, category: str, casualties: int, location_verified: bool, analysis: Dict[str, Any]) -> Dict[str, Any]:
    text = (description + " " + title).lower()

    if len(text.strip()) < 15 and casualties == 0:
        return {
            "recommended_priority": "UNASSESSED",
            "score": 0,
            "explanation": "Insufficient information provided to assess emergency severity score.",
            "evidence": ["Minimal report description logged"],
            "missing_info": ["Detailed incident nature", "Casualty estimates", "Immediate hazards"],
            "confidence": 0.1,
            "disclaimer": "DECISION SUPPORT ONLY. Authorized human operator triage review required."
        }

    life_danger = 0
    if any(k in text for k in ["cardiac", "unresponsive", "not breathing", "cpr"]):
        life_danger += 38
    elif any(k in text for k in ["trapped", "pinned", "extricat"]):
        life_danger += 34
    elif casualties > 0 or any(k in text for k in ["injured", "casualty", "bleed"]):
        life_danger += 15

    if any(k in text for k in ["fuel leak", "explosion", "flammable"]):
        life_danger = min(40, life_danger + 15)

    casualty_scale = 25 if casualties >= 4 else (18 if casualties >= 2 else (10 if casualties == 1 else 0))
    hazard_severity = 18 if category == "ROAD_ACCIDENT" and "overturn" in text else (20 if category == "FIRE_INCIDENT" else 12)
    uncertainty_pts = 15 if location_verified else 5

    score = min(100, max(5, life_danger + casualty_scale + hazard_severity + uncertainty_pts))

    if score >= 80:
        prio = "CRITICAL"
    elif score >= 60:
        prio = "HIGH"
    elif score >= 35:
        prio = "MEDIUM"
    else:
        prio = "LOW"

    return {
        "recommended_priority": prio,
        "score": score,
        "explanation": f"Assessed as {prio} (Score: {score}/100) based on life danger ({life_danger}/40), casualty factor ({casualty_scale}/25), and hazard type ({hazard_severity}/20).",
        "evidence": [f"Life danger score: {life_danger}", f"Casualties: {casualties}", f"Category: {category}"],
        "missing_info": analysis.get("missing_information", []),
        "confidence": 0.94 if location_verified and casualties > 0 else 0.76,
        "disclaimer": "DECISION SUPPORT ONLY. Not a clinically certified triage system. Operator override permitted."
    }
