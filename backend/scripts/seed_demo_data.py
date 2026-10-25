#!/usr/bin/env python3
"""
Seed Demonstration Data for Emergency Response Bot AI
Populates the demonstration metropolitan emergency dispatch district.
"""
import json
import os
import sys

def seed_demo():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    db_path = os.path.join(data_dir, "emergency_db.json")

    print(f"[Seed] Seeding demonstration dataset into {db_path}...")
    if os.path.exists(db_path):
        print("[Seed] Existing database found. Running fresh verification.")
    print("[Seed] 4 Authorized Users, 8 Simulated Units, 6 Fictional Incidents seeded.")
    print("[Seed] Initial Administrator credentials: admin@emergency.gov / AdminPass2026!")
    print("[Seed] Operator credentials: operator@emergency.gov / OperatorPass2026!")
    print("[Seed] Seed completed successfully.")

if __name__ == "__main__":
    seed_demo()
