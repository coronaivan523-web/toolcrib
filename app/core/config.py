from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Tool Crib API"
    API_V1_STR: str = "/api/v1"
    
    # Supabase - Configuración Crítica
    SUPABASE_URL: str
    SUPABASE_KEY: str  # Esta debe ser la ANON KEY para clientes públicos, o SERVICE_ROLE solo si se usa con cuidado
    SUPABASE_SERVICE_KEY: Optional[str] = None # SERVICE ROLE KEY (Solo para uso administrativo interno)
    
    # Seguridad
    SECRET_KEY: str # Clave para firmar JWTs propios (si aplica) o validaciones internas
    
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://localhost:3000"
    ]
    
    ENVIRONMENT: str = "development"
    FRONTEND_ORIGIN: Optional[str] = None

    class Config:
        case_sensitive = True
        # Prioridad: variables de entorno del sistema > archivo .env
        env_file = ".env"
        extra = "ignore" # Ignorar variables extra en .env

settings = Settings()
