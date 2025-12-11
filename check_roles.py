
from app.db.session import SessionLocal
from app.db import base # Load all models
from app.models.user import Role

db = SessionLocal()
roles = db.query(Role).all()
for r in roles:
    print(f"Role ID: {r.id}, Name: '{r.name}'")
db.close()
