from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator

from app.core.security import get_current_user
from app.services.supabase_service import (
    create_api_key, list_api_keys, revoke_api_key, _API_KEY_LIMITS
)

router = APIRouter()


class CreateKeyRequest(BaseModel):
    name: str

    @validator("name")
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty.")
        if len(v) > 60:
            raise ValueError("Name must be 60 characters or fewer.")
        return v


@router.post("/keys")
async def create_key(
    body: CreateKeyRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new API key. The raw key is returned exactly once."""
    user_id = current_user["id"]
    tier    = current_user["tier"]

    try:
        result = create_api_key(user_id, body.name, tier)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    limit = _API_KEY_LIMITS.get(tier, _API_KEY_LIMITS["free"])
    return JSONResponse(
        status_code=201,
        content={
            "id":     result["id"],
            "key":    result["key"],   # shown only once
            "prefix": result["prefix"],
            "name":   body.name,
            "limit":  limit,
        },
    )


@router.get("/keys")
async def get_keys(current_user: dict = Depends(get_current_user)):
    """List all API keys for the authenticated user."""
    tier  = current_user["tier"]
    keys  = list_api_keys(current_user["id"])
    limit = _API_KEY_LIMITS.get(tier, _API_KEY_LIMITS["free"])
    return JSONResponse(content={"keys": keys, "limit": limit, "tier": tier})


@router.delete("/keys/{key_id}")
async def delete_key(
    key_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Revoke an API key immediately."""
    ok = revoke_api_key(key_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Key not found or already revoked.")
    return JSONResponse(content={"revoked": True, "id": key_id})
