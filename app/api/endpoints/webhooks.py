"""
VULNRA — Webhooks Endpoints
POST   /api/webhooks              — create webhook
GET    /api/webhooks              — list user's webhooks
DELETE /api/webhooks/{id}         — delete webhook
PATCH  /api/webhooks/{id}         — toggle active / update name
POST   /api/webhooks/{id}/test    — send test payload
"""

import logging
import secrets
import time
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user
from app.core.deps import require_db
from app.services.webhook_delivery import get_webhook_limit, deliver_webhook

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_EVENTS = {"scan.complete", "sentinel.alert", "scan.failed"}


# ── Models ────────────────────────────────────────────────────────────────────

class WebhookCreate(BaseModel):
    name: str
    url: str
    events: List[str] = ["scan.complete"]


class WebhookPatch(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None
    events: Optional[List[str]] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_webhooks(user_id: str) -> list:
    sb = require_db()
    resp = sb.table("webhooks").select("*").eq("user_id", user_id).order("created_at").execute()
    return resp.data or []


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/api/webhooks", status_code=201)
async def create_webhook(
    body: WebhookCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    tier = current_user.get("tier", "free")
    limit = get_webhook_limit(tier)

    if limit == 0:
        raise HTTPException(403, "Webhooks require a Pro or Enterprise subscription")

    existing = _user_webhooks(user_id)
    if len(existing) >= limit:
        raise HTTPException(
            403,
            f"Webhook limit reached ({limit} for {tier.upper()} tier). "
            "Upgrade to add more webhooks."
        )

    # Validate events
    bad = [e for e in body.events if e not in VALID_EVENTS]
    if bad:
        raise HTTPException(400, f"Invalid events: {bad}. Valid: {sorted(VALID_EVENTS)}")

    if not body.url.startswith(("https://", "http://")):
        raise HTTPException(400, "URL must start with https:// or http://")

    secret = secrets.token_hex(32)

    sb = require_db()
    resp = sb.table("webhooks").insert({
        "user_id": user_id,
        "name":    body.name.strip()[:80],
        "url":     body.url.strip(),
        "events":  body.events,
        "secret":  secret,
        "active":  True,
    }).execute()

    row = resp.data[0]
    # Return secret only on creation
    return {**row, "secret": secret}


@router.get("/api/webhooks")
async def list_webhooks(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    tier = current_user.get("tier", "free")
    hooks = _user_webhooks(user_id)
    # Never return secret in list
    for h in hooks:
        h.pop("secret", None)
    return {
        "webhooks": hooks,
        "count": len(hooks),
        "limit": get_webhook_limit(tier),
        "tier": tier,
    }


@router.patch("/api/webhooks/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    body: WebhookPatch,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    sb = require_db()

    # Ownership check
    check = sb.table("webhooks").select("id").eq("id", webhook_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(404, "Webhook not found")

    fields: dict = {}
    if body.name is not None:
        fields["name"] = body.name.strip()[:80]
    if body.active is not None:
        fields["active"] = body.active
    if body.events is not None:
        bad = [e for e in body.events if e not in VALID_EVENTS]
        if bad:
            raise HTTPException(400, f"Invalid events: {bad}")
        fields["events"] = body.events

    if not fields:
        raise HTTPException(400, "Nothing to update")

    sb.table("webhooks").update(fields).eq("id", webhook_id).execute()
    return {"status": "ok", "id": webhook_id, **fields}


@router.delete("/api/webhooks/{webhook_id}", status_code=204)
async def delete_webhook(
    webhook_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    sb = require_db()

    check = sb.table("webhooks").select("id").eq("id", webhook_id).eq("user_id", user_id).execute()
    if not check.data:
        raise HTTPException(404, "Webhook not found")

    sb.table("webhooks").delete().eq("id", webhook_id).execute()


@router.post("/api/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    sb = require_db()

    rows = sb.table("webhooks").select("*").eq("id", webhook_id).eq("user_id", user_id).execute()
    if not rows.data:
        raise HTTPException(404, "Webhook not found")

    hook = rows.data[0]

    test_payload = {
        "event": "test",
        "delivery_id": str(uuid.uuid4()),
        "timestamp": int(time.time()),
        "data": {
            "message": "This is a test delivery from VULNRA.",
            "webhook_id": webhook_id,
            "webhook_name": hook["name"],
        },
    }

    ok, code = deliver_webhook(hook, test_payload)
    return {
        "success": ok,
        "status_code": code,
        "message": "Test delivery succeeded" if ok else f"Test delivery failed (HTTP {code})",
    }
