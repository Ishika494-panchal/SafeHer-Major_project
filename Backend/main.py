from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
from jwt.algorithms import ECAlgorithm, RSAAlgorithm
import requests

import os
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()

app = FastAPI(title="SafeHer Backend API")

# ─────────────────────────────────────────────
# CORS — allow React dev server to call this API
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Supabase project config
# ─────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables")

SUPABASE_HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
}

# ─────────────────────────────────────────────
# JWT Verification Helpers
# ─────────────────────────────────────────────
def get_jwks():
    """Fetch Supabase public JWKS keys.
    
    The correct endpoint is /auth/v1/.well-known/jwks.json
    (not /auth/v1/jwks which returns 404).
    """
    response = requests.get(
        f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
        headers={"apikey": SUPABASE_ANON_KEY}
    )
    response.raise_for_status()
    return response.json()


def get_public_key(token: str):
    """Detect algorithm from JWT header and find matching public key.
    
    PyJWT 2.x removed get_default_algorithms(); use the algorithm
    classes (ECAlgorithm, RSAAlgorithm) directly instead.
    """
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    alg = header.get("alg", "ES256")

    jwks_data = get_jwks()
    for key_data in jwks_data.get("keys", []):
        if key_data.get("kid") == kid:
            kty = key_data.get("kty", "EC")
            if kty == "EC":
                public_key = ECAlgorithm.from_jwk(key_data)
            elif kty == "RSA":
                public_key = RSAAlgorithm.from_jwk(key_data)
            else:
                raise ValueError(f"Unsupported key type: {kty}")
            return public_key, alg

    raise ValueError(f"No matching JWKS key found for kid={kid}")


security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency: verify Supabase JWT and return the decoded payload."""
    token = credentials.credentials
    try:
        public_key, alg = get_public_key(token)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[alg],
            options={"verify_aud": False, "verify_exp": True}
        )
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Token missing user identity")
        return payload

    except jwt.exceptions.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.exceptions.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")


# ─────────────────────────────────────────────
# Request body schemas
# ─────────────────────────────────────────────
class AuthRequest(BaseModel):
    email: str
    password: str


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "SafeHer API is active and running."}


@app.get("/debug-token")
def debug_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Development helper — returns raw unverified JWT claims without signature check.
    Useful for inspecting what claims the frontend token contains.
    """
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        claims = jwt.decode(token, options={"verify_signature": False})
        return {
            "header": header,
            "claims": claims,
            "note": "Signature NOT verified — for debugging only"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode token: {str(e)}")


@app.post("/signup")
def signup(body: AuthRequest):
    """
    Register a new user via Supabase Auth.
    Accepts email + password, creates the user account.
    """
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/signup",
        headers=SUPABASE_HEADERS,
        json={"email": body.email, "password": body.password}
    )

    data = response.json()

    # Supabase returns error field when signup fails
    if response.status_code not in (200, 201) or data.get("error"):
        error_msg = data.get("error_description") or data.get("msg") or data.get("error") or "Signup failed"
        raise HTTPException(status_code=response.status_code, detail=error_msg)

    return {
        "message": "Signup successful! Please check your email to confirm your account.",
        "user_id": data.get("id") or (data.get("user") or {}).get("id"),
        "email": body.email,
    }


@app.post("/login")
def login(body: AuthRequest):
    """
    Log in an existing user via Supabase Auth.
    Returns access_token + refresh_token on success.
    """
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers=SUPABASE_HEADERS,
        json={"email": body.email, "password": body.password}
    )

    data = response.json()

    if response.status_code != 200 or data.get("error"):
        error_msg = data.get("error_description") or data.get("msg") or data.get("error") or "Login failed"
        raise HTTPException(status_code=response.status_code, detail=error_msg)

    return {
        "message": "Login successful!",
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "token_type": data.get("token_type", "bearer"),
        "expires_in": data.get("expires_in"),
        "user": {
            "id": data.get("user", {}).get("id"),
            "email": data.get("user", {}).get("email"),
            "role": data.get("user", {}).get("role"),
        }
    }


@app.get("/me")
def read_me(current_user: dict = Depends(get_current_user)):
    """Protected route — returns verified user info decoded from JWT."""
    return {
        "user_id": current_user.get("sub"),
        "email": current_user.get("email"),
        "role": current_user.get("role"),
        "verified": True,
        "message": "Token successfully verified by SafeHer backend!"
    }
