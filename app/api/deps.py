from fastapi import Header, HTTPException, status
from supabase import Client
from app.core.supabase import get_user_client

def get_supabase_client(authorization: str = Header(None)) -> Client:
    """
    Extrae el Bearer Token del header y retorna un cliente de Supabase
    con el contexto del usuario (RLS activado).
    """
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header"
        )

    try:
        # El formato esperado es "Bearer <token>"
        token = authorization.split(" ")[1]
        return get_user_client(token)
    except IndexError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization Header Format. Expected 'Bearer <token>'"
        )
