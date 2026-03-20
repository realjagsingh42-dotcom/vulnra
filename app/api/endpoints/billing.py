"""
app/api/endpoints/billing.py - Lemon Squeezy billing endpoints for VULNRA.
"""

import hmac
import hashlib
import json
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user
from app.services.supabase_service import (
    get_supabase,
    get_user_tier,
    update_user_subscription,
)

logger = logging.getLogger("vulnra.billing")

router = APIRouter()

_LS_API_BASE = "https://api.lemonsqueezy.com/v1"
_LS_HEADERS = {
    "Accept": "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
}


def _ls_headers() -> dict:
    return {**_LS_HEADERS, "Authorization": f"Bearer {settings.lemonsqueezy_api_key}"}


def _variant_to_tier(variant_id: int) -> str:
    """Map a Lemon Squeezy variant ID to a VULNRA tier string."""
    if variant_id == settings.lemonsqueezy_enterprise_variant_id:
        return "enterprise"
    if variant_id == settings.lemonsqueezy_pro_variant_id:
        return "pro"
    return "free"


# ── Pydantic Models ───────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    product_variant_id: int
    customer_email: Optional[str] = None
    custom_data: Optional[dict] = None


# ── Public Endpoints ──────────────────────────────────────────────────────────

@router.get("/plans")
async def get_plans():
    """Return available subscription plans."""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "features": ["1 scan / day", "Basic probes (DAN)", "Email support"],
                "tier": "free",
                "variant_id": None,
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 49,
                "currency": "USD",
                "interval": "month",
                "features": [
                    "100 scans / day",
                    "40+ vulnerability probes",
                    "Multi-turn attacks (Crescendo, GOAT)",
                    "PDF audit reports",
                    "Priority support",
                ],
                "tier": "pro",
                "variant_id": settings.lemonsqueezy_pro_variant_id or None,
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": 299,
                "currency": "USD",
                "interval": "month",
                "features": [
                    "Unlimited scans",
                    "All probes + MCP scanner",
                    "Custom compliance frameworks",
                    "Team management",
                    "SSO & audit logs",
                    "SLA support",
                ],
                "tier": "enterprise",
                "variant_id": settings.lemonsqueezy_enterprise_variant_id or None,
            },
        ]
    }


# ── Protected Endpoints ───────────────────────────────────────────────────────

@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a Lemon Squeezy hosted checkout session and return the URL."""
    if not settings.lemonsqueezy_api_key:
        raise HTTPException(status_code=500, detail="Billing not configured")

    email = body.customer_email or current_user.get("email", "")
    tier = (body.custom_data or {}).get("tier", "pro")

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "email": email,
                    "custom": {
                        "user_id": current_user["id"],
                        "tier": tier,
                    },
                },
                "product_options": {
                    "redirect_url": f"{settings.frontend_url}/billing/success",
                },
            },
            "relationships": {
                "store": {
                    "data": {"type": "stores", "id": str(settings.lemonsqueezy_store_id)}
                },
                "variant": {
                    "data": {"type": "variants", "id": str(body.product_variant_id)}
                },
            },
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{_LS_API_BASE}/checkouts",
                headers=_ls_headers(),
                json=payload,
            )

        if resp.status_code not in (200, 201):
            logger.error(f"Lemon Squeezy checkout error {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=502, detail="Checkout creation failed")

        data = resp.json()
        return {
            "checkout_url": data["data"]["attributes"]["url"],
            "checkout_id": data["data"]["id"],
        }

    except httpx.RequestError as exc:
        logger.error(f"Lemon Squeezy network error: {exc}")
        raise HTTPException(status_code=502, detail="Billing service unreachable")


@router.get("/subscription")
async def get_subscription(current_user: dict = Depends(get_current_user)):
    """Return the current user's subscription tier and status."""
    user_id = current_user["id"]
    sb = get_supabase()

    subscription_id = None
    if sb:
        try:
            res = (
                sb.table("profiles")
                .select("tier, lemon_sub_id")
                .eq("id", user_id)
                .single()
                .execute()
            )
            if res.data:
                subscription_id = res.data.get("lemon_sub_id")
        except Exception as exc:
            logger.warning(f"Profile lookup failed: {exc}")

    tier = get_user_tier(user_id)

    return {
        "tier": tier,
        "user_id": user_id,
        "subscription_id": subscription_id,
        "subscription_status": "active" if tier != "free" else "free",
    }


@router.post("/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """Cancel the user's active Lemon Squeezy subscription."""
    if not settings.lemonsqueezy_api_key:
        raise HTTPException(status_code=500, detail="Billing not configured")

    user_id = current_user["id"]
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        res = (
            sb.table("profiles")
            .select("lemon_sub_id, tier")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        logger.error(f"Profile lookup for cancel: {exc}")
        raise HTTPException(status_code=500, detail="Could not retrieve subscription")

    if not res.data or not res.data.get("lemon_sub_id"):
        raise HTTPException(status_code=404, detail="No active subscription found")

    subscription_id = res.data["lemon_sub_id"]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(
                f"{_LS_API_BASE}/subscriptions/{subscription_id}",
                headers=_ls_headers(),
            )

        if resp.status_code not in (200, 204):
            logger.error(f"LS cancel error {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=502, detail="Cancellation failed at billing provider")

    except httpx.RequestError as exc:
        logger.error(f"LS network error on cancel: {exc}")
        raise HTTPException(status_code=502, detail="Billing service unreachable")

    update_user_subscription(current_user["email"], "free", None)
    logger.info(f"Cancelled subscription {subscription_id} for user {user_id}")

    return {"status": "cancelled", "message": "Subscription cancelled. Access reverts to Free tier."}


# ── Webhook Endpoint ──────────────────────────────────────────────────────────

@router.post("/webhook")
async def webhook_handler(
    request: Request,
    x_signature: Optional[str] = Header(None),
):
    """Handle Lemon Squeezy webhook events."""
    if not settings.lemonsqueezy_webhook_secret:
        logger.warning("Webhook secret not configured — ignoring event")
        return JSONResponse(status_code=200, content={"status": "ignored"})

    raw_body = await request.body()

    if x_signature:
        expected = hmac.new(
            settings.lemonsqueezy_webhook_secret.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(x_signature, expected):
            logger.warning("Webhook signature mismatch")
            return JSONResponse(status_code=401, content={"error": "Invalid signature"})

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

    event_type = payload.get("meta", {}).get("event_name", "")
    logger.info(f"Webhook event received: {event_type}")

    try:
        if event_type == "subscription_created":
            await _handle_subscription_created(payload)
        elif event_type in ("subscription_updated", "subscription_resumed"):
            await _handle_subscription_updated(payload)
        elif event_type in ("subscription_cancelled", "subscription_expired", "subscription_paused"):
            await _handle_subscription_downgrade(payload)
        elif event_type == "order_created":
            logger.info(f"Order created: {payload.get('data', {}).get('id')}")
    except Exception as exc:
        logger.error(f"Webhook handler error for {event_type}: {exc}")
        return JSONResponse(status_code=500, content={"error": str(exc)})

    return JSONResponse(status_code=200, content={"status": "processed"})


# ── Webhook Handlers ──────────────────────────────────────────────────────────

async def _handle_subscription_created(payload: dict):
    attrs = payload.get("data", {}).get("attributes", {})
    user_email = attrs.get("user_email")
    subscription_id = str(payload.get("data", {}).get("id", ""))
    variant_id = attrs.get("variant_id", 0)

    # Also check custom_data set during checkout
    custom_data = payload.get("meta", {}).get("custom_data", {})
    tier = custom_data.get("tier") or _variant_to_tier(variant_id)

    if user_email:
        update_user_subscription(user_email, tier, subscription_id)
        logger.info(f"subscription_created: {user_email} → {tier} (sub {subscription_id})")


async def _handle_subscription_updated(payload: dict):
    attrs = payload.get("data", {}).get("attributes", {})
    user_email = attrs.get("user_email")
    subscription_id = str(payload.get("data", {}).get("id", ""))
    variant_id = attrs.get("variant_id", 0)
    status = attrs.get("status", "")

    if status not in ("active", "on_trial"):
        # Paused, past_due, etc. → downgrade
        tier = "free"
    else:
        tier = _variant_to_tier(variant_id)

    if user_email:
        update_user_subscription(user_email, tier, subscription_id)
        logger.info(f"subscription_updated: {user_email} → {tier} (status={status})")


async def _handle_subscription_downgrade(payload: dict):
    attrs = payload.get("data", {}).get("attributes", {})
    user_email = attrs.get("user_email")

    if user_email:
        update_user_subscription(user_email, "free", None)
        logger.info(f"subscription downgraded to free: {user_email}")
