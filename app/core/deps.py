"""
app/core/deps.py — Shared FastAPI dependencies.

Import require_db() instead of duplicating the get_supabase() + 503 guard
pattern across endpoint modules.
"""

from fastapi import HTTPException


def require_db():
    """
    Return the Supabase client, or raise HTTP 503 if unavailable.

    Usage in endpoint functions::

        from app.core.deps import require_db

        def my_helper():
            sb = require_db()
            ...

    Usage as a FastAPI Depends::

        from fastapi import Depends
        from app.core.deps import require_db

        @router.get("/example")
        async def endpoint(sb=Depends(require_db)):
            ...
    """
    from app.services.supabase_service import get_supabase
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=503, detail="Database unavailable")
    return sb
