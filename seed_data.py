from app.db.session import SessionLocal
from app.models.user import Role, User
from app.models.inventory import Location, Material
from app.core.security import get_password_hash
import app.db.base # Import all models to ensure they are registered
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    db = SessionLocal()
    try:
        # 1. Roles
        roles = ["Admin", "ToolCrib", "Requester", "Auditor"]
        for role_name in roles:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, permissions={})
                db.add(role)
                logger.info(f"Role created: {role_name}")
        db.commit()

        # 2. Admin User
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                employee_number="00001",
                role_id=admin_role.id,
                is_active=True
            )
            db.add(admin_user)
            logger.info("Admin user created")
        db.commit()

        # 3. Locations
        locations = [
            {"code": "A-01-01", "description": "Pasillo A, Estante 1, Nivel 1"},
            {"code": "A-01-02", "description": "Pasillo A, Estante 1, Nivel 2"},
            {"code": "B-01-01", "description": "Pasillo B, Estante 1, Nivel 1"},
        ]
        for loc_data in locations:
            loc = db.query(Location).filter(Location.code == loc_data["code"]).first()
            if not loc:
                loc = Location(**loc_data)
                db.add(loc)
                logger.info(f"Location created: {loc_data['code']}")
        db.commit()

        # 4. Materials
        materials = [
            {
                "sku": "TAL-001",
                "name": "Taladro Percutor 18V",
                "description": "Taladro inalámbrico industrial",
                "category": "Herramienta Eléctrica",
                "unit_of_measure": "PZA",
                "min_stock": 2,
                "max_stock": 10,
                "location_code": "A-01-01"
            },
            {
                "sku": "GUA-001",
                "name": "Guantes de Seguridad L",
                "description": "Guantes anticorte nivel 5",
                "category": "EPP",
                "unit_of_measure": "PAR",
                "min_stock": 10,
                "max_stock": 100,
                "location_code": "B-01-01"
            }
        ]
        
        for mat_data in materials:
            mat = db.query(Material).filter(Material.sku == mat_data["sku"]).first()
            if not mat:
                loc_code = mat_data.pop("location_code")
                location = db.query(Location).filter(Location.code == loc_code).first()
                if location:
                    mat_data["location_id"] = location.id
                    mat = Material(**mat_data)
                    db.add(mat)
                    logger.info(f"Material created: {mat_data['sku']}")
        db.commit()
        
        logger.info("Seed data initialization completed")

    except Exception as e:
        logger.error(f"Error initializing DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
