import os
import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException

SUPABASE_URL = os.getenv("SUPABASE_URL")  # e.g. https://xxxx.supabase.co
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# PyJWKClient fetches (and caches) Supabase's public signing keys from
# this well-known URL -- these are what let us verify a token's
# signature actually came from Supabase, without sharing any secret.
_jwks_client = PyJWKClient(JWKS_URL)


def verify_token(token: str) -> str:
    """
    Verifies a Supabase-issued JWT and returns the user's ID (the 'sub'
    claim inside it). Raises HTTPException if the token is missing,
    expired, or doesn't verify against Supabase's public key.
    """
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",  # Supabase sets this on every user token
        )
        return payload["sub"]  # 'sub' = subject = the user's unique ID
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def get_current_user_id(authorization: str = Header(None)) -> str:
    """
    A FastAPI dependency -- use with Depends(get_current_user_id) on any
    route that needs to know who's calling it. Reads the standard
    'Authorization: Bearer <token>' header.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    return verify_token(token)