import logging
from typing import Optional
from fastapi import Header, HTTPException, Depends, status
from app.services.supabase_service import get_supabase, get_user_tier

logger = logging.getLogger("vulnra.security")

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependency to get the current authenticated user from Supabase.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]

    # API key path — vk_live_ prefix
    if token.startswith("vk_live_"):
        from app.services.supabase_service import get_api_key_user
        user = get_api_key_user(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked API key",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    sb = get_supabase()
    if not sb:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )

    try:
        # Verify token with Supabase
        user_resp = sb.auth.get_user(token)
        if not user_resp or not user_resp.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        
        user = user_resp.user
        tier = get_user_tier(user.id)
        
        return {
            "id": user.id,
            "email": user.email,
            "tier": tier
        }
    except Exception as e:
        logger.error(f"Auth verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )

def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Dependency to ensure user is an admin (Enterprise tier for now)."""
    if current_user.get("tier") != "enterprise":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return current_user
