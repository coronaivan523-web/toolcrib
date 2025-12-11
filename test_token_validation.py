
from app.core.security import create_access_token, decode_access_token, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

def test_token_logic():
    print(f"SECRET_KEY used: {SECRET_KEY}")
    print(f"ALGORITHM used: {ALGORITHM}")
    
    # 1. Create Token
    data = {"sub": 1}
    token = create_access_token(data)
    print(f"Generated Token: {token}")
    
    # 2. Decode Token manually
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"Manual Decode Success: {payload}")
    except Exception as e:
        print(f"Manual Decode Failed: {e}")

    # 3. Decode using helper
    payload2 = decode_access_token(token)
    print(f"Helper Decode Result: {payload2}")

if __name__ == "__main__":
    test_token_logic()
