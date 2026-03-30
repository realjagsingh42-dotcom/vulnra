"""
app/services/sso_service.py — SSO Service for VULNRA Enterprise.

Supports SAML 2.0 and OIDC authentication flows.
Maps IdP users to existing Supabase accounts by email.
"""

import base64
import hashlib
import logging
import secrets
import time
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib.parse import urlencode, urlparse, parse_qs, quote

import httpx
from fastapi import Request

from app.services.supabase_service import get_supabase

logger = logging.getLogger("vulnra.sso")

PROVIDER_NAME_MAP = {
    "okta": "Okta",
    "azure": "Microsoft Azure AD",
    "azure_ad": "Microsoft Azure AD",
    "microsoft": "Microsoft Azure AD",
    "google": "Google Workspace",
    "google_workspace": "Google Workspace",
    "onelogin": "OneLogin",
    "pingidentity": "Ping Identity",
    "generic_saml": "Generic SAML 2.0",
    "generic_oidc": "Generic OIDC",
}


@dataclass
class SSOConfig:
    id: str
    org_id: str
    provider_type: str
    provider_name: str
    idp_entity_id: str
    idp_sso_url: str
    idp_certificate: str
    idp_logout_url: str
    sp_entity_id: str
    client_id: str
    scopes: str
    enabled: bool
    allowed_domains: list[str]


@dataclass
class SSOUser:
    user_id: str
    org_id: str
    email: str
    name: str
    idp_subject: str


def get_supabase_client():
    return get_supabase()


def get_sso_config(org_id: str, provider_type: str) -> Optional[SSOConfig]:
    """Get SSO configuration for an organization."""
    sb = get_supabase_client()
    res = (
        sb.table("sso_configs")
        .select("*")
        .eq("org_id", org_id)
        .eq("provider_type", provider_type)
        .execute()
    )
    if not res.data:
        return None
    data = res.data[0]
    return SSOConfig(
        id=data["id"],
        org_id=data["org_id"],
        provider_type=data["provider_type"],
        provider_name=data.get("provider_name", ""),
        idp_entity_id=data.get("idp_entity_id", ""),
        idp_sso_url=data.get("idp_sso_url", ""),
        idp_certificate=data.get("idp_certificate", ""),
        idp_logout_url=data.get("idp_logout_url", ""),
        sp_entity_id=data.get("sp_entity_id", ""),
        client_id=data.get("client_id", ""),
        scopes=data.get("scopes", "openid email profile"),
        enabled=data.get("enabled", False),
        allowed_domains=data.get("allowed_domains", []),
    )


def get_all_sso_configs(org_id: str) -> list[SSOConfig]:
    """Get all SSO configurations for an organization."""
    sb = get_supabase_client()
    res = (
        sb.table("sso_configs")
        .select("*")
        .eq("org_id", org_id)
        .execute()
    )
    configs = []
    for data in res.data or []:
        configs.append(
            SSOConfig(
                id=data["id"],
                org_id=data["org_id"],
                provider_type=data["provider_type"],
                provider_name=data.get("provider_name", ""),
                idp_entity_id=data.get("idp_entity_id", ""),
                idp_sso_url=data.get("idp_sso_url", ""),
                idp_certificate=data.get("idp_certificate", ""),
                idp_logout_url=data.get("idp_logout_url", ""),
                sp_entity_id=data.get("sp_entity_id", ""),
                client_id=data.get("client_id", ""),
                scopes=data.get("scopes", "openid email profile"),
                enabled=data.get("enabled", False),
                allowed_domains=data.get("allowed_domains", []),
            )
        )
    return configs


def create_sso_config(
    org_id: str,
    provider_type: str,
    provider_name: str,
    idp_entity_id: str,
    idp_sso_url: str,
    idp_certificate: str = "",
    idp_logout_url: str = "",
    client_id: str = "",
    client_secret: str = "",
    scopes: str = "openid email profile",
    allowed_domains: list[str] = None,
) -> SSOConfig:
    """Create a new SSO configuration."""
    sb = get_supabase_client()
    sp_entity_id = f"vulnra:sso:{org_id}"

    entry = {
        "org_id": org_id,
        "provider_type": provider_type,
        "provider_name": provider_name,
        "idp_entity_id": idp_entity_id,
        "idp_sso_url": idp_sso_url,
        "idp_certificate": idp_certificate,
        "idp_logout_url": idp_logout_url,
        "sp_entity_id": sp_entity_id,
        "client_id": client_id,
        "client_secret": client_secret,
        "scopes": scopes,
        "allowed_domains": allowed_domains or [],
        "enabled": False,
    }

    res = sb.table("sso_configs").insert(entry).execute()
    data = res.data[0]
    return SSOConfig(
        id=data["id"],
        org_id=data["org_id"],
        provider_type=data["provider_type"],
        provider_name=data.get("provider_name", ""),
        idp_entity_id=data.get("idp_entity_id", ""),
        idp_sso_url=data.get("idp_sso_url", ""),
        idp_certificate=data.get("idp_certificate", ""),
        idp_logout_url=data.get("idp_logout_url", ""),
        sp_entity_id=data.get("sp_entity_id", ""),
        client_id=data.get("client_id", ""),
        scopes=data.get("scopes", "openid email profile"),
        enabled=data.get("enabled", False),
        allowed_domains=data.get("allowed_domains", []),
    )


def update_sso_config(
    config_id: str,
    **updates,
) -> Optional[SSOConfig]:
    """Update an SSO configuration."""
    sb = get_supabase_client()
    updates["updated_at"] = "now()"

    if "client_secret" in updates and not updates["client_secret"]:
        del updates["client_secret"]

    res = (
        sb.table("sso_configs")
        .update(updates)
        .eq("id", config_id)
        .execute()
    )
    if not res.data:
        return None
    data = res.data[0]
    return SSOConfig(
        id=data["id"],
        org_id=data["org_id"],
        provider_type=data["provider_type"],
        provider_name=data.get("provider_name", ""),
        idp_entity_id=data.get("idp_entity_id", ""),
        idp_sso_url=data.get("idp_sso_url", ""),
        idp_certificate=data.get("idp_certificate", ""),
        idp_logout_url=data.get("idp_logout_url", ""),
        sp_entity_id=data.get("sp_entity_id", ""),
        client_id=data.get("client_id", ""),
        scopes=data.get("scopes", "openid email profile"),
        enabled=data.get("enabled", False),
        allowed_domains=data.get("allowed_domains", []),
    )


def delete_sso_config(config_id: str) -> bool:
    """Delete an SSO configuration."""
    sb = get_supabase_client()
    sb.table("sso_configs").delete().eq("id", config_id).execute()
    return True


def enable_sso_config(config_id: str, enabled: bool = True) -> bool:
    """Enable or disable an SSO configuration."""
    sb = get_supabase_client()
    sb.table("sso_configs").update({"enabled": enabled, "updated_at": "now()"}).eq("id", config_id).execute()
    return True


def create_sso_session(
    sso_config_id: str,
    redirect_uri: str,
    code_verifier: str = None,
) -> tuple[str, str]:
    """Create an SSO session for OAuth flow."""
    sb = get_supabase_client()
    state = secrets.token_urlsafe(32)
    session_id = str(uuid.uuid4())

    entry = {
        "id": session_id,
        "sso_config_id": sso_config_id,
        "state": state,
        "redirect_uri": redirect_uri,
        "code_verifier": code_verifier,
    }

    sb.table("sso_sessions").insert(entry).execute()
    return session_id, state


def get_sso_session(state: str) -> Optional[dict]:
    """Get SSO session by state token."""
    sb = get_supabase_client()
    res = (
        sb.table("sso_sessions")
        .select("*")
        .eq("state", state)
        .execute()
    )
    if not res.data:
        return None
    return res.data[0]


def delete_sso_session(session_id: str) -> None:
    """Delete an SSO session after use."""
    sb = get_supabase_client()
    sb.table("sso_sessions").delete().eq("id", session_id).execute()


def link_sso_identity(
    user_id: str,
    org_id: str,
    sso_config_id: str,
    idp_subject: str,
    idp_email: str,
    idp_name: str = "",
) -> bool:
    """Link an SSO identity to a Supabase user."""
    sb = get_supabase_client()
    entry = {
        "user_id": user_id,
        "org_id": org_id,
        "sso_config_id": sso_config_id,
        "idp_subject": idp_subject,
        "idp_email": idp_email,
        "idp_name": idp_name,
        "first_login_at": "now()",
        "last_login_at": "now()",
    }

    sb.table("sso_identities").upsert(entry, on_conflict="org_id,idp_subject").execute()
    return True


def update_sso_identity_login(org_id: str, idp_subject: str) -> bool:
    """Update last login time for SSO identity."""
    sb = get_supabase_client()
    sb.table("sso_identities").update({"last_login_at": "now()"}).eq("org_id", org_id).eq("idp_subject", idp_subject).execute()
    return True


def find_user_by_email(email: str) -> Optional[str]:
    """Find a Supabase user by email address."""
    sb = get_supabase_client()
    res = (
        sb.table("profiles")
        .select("id")
        .eq("email", email.lower())
        .execute()
    )
    if res.data:
        return res.data[0]["id"]
    return None


def find_sso_identity(org_id: str, idp_subject: str) -> Optional[SSOUser]:
    """Find an existing SSO identity."""
    sb = get_supabase_client()
    res = (
        sb.table("sso_identities")
        .select("*")
        .eq("org_id", org_id)
        .eq("idp_subject", idp_subject)
        .execute()
    )
    if not res.data:
        return None
    data = res.data[0]
    return SSOUser(
        user_id=data["user_id"],
        org_id=data["org_id"],
        email=data.get("idp_email", ""),
        name=data.get("idp_name", ""),
        idp_subject=data["idp_subject"],
    )


def generate_saml_authn_request(
    config: SSOConfig,
    assertion_consumer_service_url: str,
) -> tuple[str, str]:
    """Generate a SAML Authentication Request."""
    request_id = f"__{secrets.token_hex(16)}"
    issue_instant = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    saml_request = f"""<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="{request_id}"
    Version="2.0"
    IssueInstant="{issue_instant}"
    AssertionConsumerServiceURL="{assertion_consumer_service_url}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>{config.sp_entity_id}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>"""

    encoded = base64.b64encode(saml_request.encode("utf-8")).decode("utf-8")
    return encoded, request_id


def parse_saml_response(
    saml_response: str,
    config: SSOConfig,
    request_id: str,
) -> Optional[SSOUser]:
    """Parse and validate a SAML response."""
    try:
        decoded = base64.b64decode(saml_response).decode("utf-8")
    except Exception as e:
        logger.warning(f"[sso] Failed to decode SAML response: {e}")
        return None

    try:
        root = ET.fromstring(decoded)
    except Exception as e:
        logger.warning(f"[sso] Failed to parse SAML XML: {e}")
        return None

    ns = {
        "saml": "urn:oasis:names:tc:SAML:2.0:assertion",
        "samlp": "urn:oasis:names:tc:SAML:2.0:protocol",
    }

    issuer = root.find(".//saml:Issuer", ns)
    if issuer is None or issuer.text != config.idp_entity_id:
        logger.warning(f"[sso] Issuer mismatch: {issuer} != {config.idp_entity_id}")
        return None

    name_id = root.find(".//saml:NameID", ns)
    if name_id is None:
        logger.warning("[sso] No NameID in SAML response")
        return None

    email = name_id.text or ""
    subject = name_id.text or ""

    name_elem = root.find(".//saml:NameID", ns)
    name = name_elem.text if name_elem is not None else ""

    attr_stmt = root.find(".//saml:AttributeStatement", ns)
    if attr_stmt is not None:
        for attr in attr_stmt.findall("saml:Attribute", ns):
            attr_name = attr.get("Name")
            if attr_name in ("email", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"):
                val = attr.find("saml:AttributeValue", ns)
                if val is not None and val.text:
                    email = val.text
            if attr_name in ("name", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"):
                val = attr.find("saml:AttributeValue", ns)
                if val is not None and val.text:
                    name = val.text

    if not email:
        email = subject

    return SSOUser(
        user_id="",
        org_id=config.org_id,
        email=email,
        name=name,
        idp_subject=subject,
    )


def generate_oidc_authorization_url(
    config: SSOConfig,
    redirect_uri: str,
    state: str,
    code_verifier: str = None,
) -> str:
    """Generate OIDC authorization URL."""
    params = {
        "client_id": config.client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": config.scopes,
        "state": state,
    }

    if code_verifier:
        params["code_challenge"] = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip("=")
        params["code_challenge_method"] = "S256"

    return f"{config.idp_sso_url}?{urlencode(params)}"


def exchange_oidc_code(
    config: SSOConfig,
    code: str,
    redirect_uri: str,
) -> Optional[dict]:
    """Exchange OIDC authorization code for tokens."""
    token_url = config.idp_entity_id
    if not token_url.endswith("/oauth/token") and not token_url.endswith("/oauth2/v2.0/token"):
        token_url = f"{token_url}/oauth/token"

    data = {
        "client_id": config.client_id,
        "client_secret": getattr(config, "client_secret", ""),
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        resp = httpx.post(token_url, data=data, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"[sso] OIDC token exchange failed: {e}")
        return None


def get_oidc_userinfo(
    config: SSOConfig,
    access_token: str,
) -> Optional[SSOUser]:
    """Get user info from OIDC userinfo endpoint."""
    userinfo_url = config.idp_entity_id
    if not userinfo_url.endswith("/userinfo"):
        userinfo_url = f"{userinfo_url}/userinfo"

    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        resp = httpx.get(userinfo_url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning(f"[sso] OIDC userinfo failed: {e}")
        return None

    email = data.get("email", "")
    subject = data.get("sub", "")
    name = data.get("name", data.get("display_name", ""))

    return SSOUser(
        user_id="",
        org_id=config.org_id,
        email=email,
        name=name,
        idp_subject=subject,
    )


def validate_allowed_domain(email: str, allowed_domains: list[str]) -> bool:
    """Validate email domain against allowed list."""
    if not allowed_domains:
        return True
    domain = email.split("@")[-1].lower() if "@" in email else ""
    return domain in [d.lower() for d in allowed_domains]


def test_sso_connection(config: SSOConfig) -> tuple[bool, str]:
    """Test SSO configuration by making a metadata request."""
    sb = get_supabase_client()

    try:
        if config.provider_type == "saml":
            if not config.idp_sso_url:
                return False, "Missing IdP SSO URL"
            resp = httpx.get(config.idp_sso_url, timeout=10)
            if resp.status_code >= 400:
                return False, f"IdP SSO URL returned {resp.status_code}"
            sb.table("sso_configs").update({
                "last_tested_at": "now()",
                "last_test_status": "success"
            }).eq("id", config.id).execute()
            return True, "Connection successful"

        elif config.provider_type == "oidc":
            if not config.client_id:
                return False, "Missing Client ID"
            if not config.idp_sso_url:
                return False, "Missing Issuer URL"
            discovery_url = f"{config.idp_sso_url}/.well-known/openid-configuration"
            resp = httpx.get(discovery_url, timeout=10)
            if resp.status_code >= 400:
                return False, "OIDC Discovery failed"
            sb.table("sso_configs").update({
                "last_tested_at": "now()",
                "last_test_status": "success"
            }).eq("id", config.id).execute()
            return True, "Connection successful"

    except Exception as e:
        sb.table("sso_configs").update({
            "last_tested_at": "now()",
            "last_test_status": f"failed: {str(e)[:100]}"
        }).eq("id", config.id).execute()
        return False, str(e)[:200]

    return False, "Unknown provider type"


def get_org_sso_identities(org_id: str) -> list[dict]:
    """Get all SSO identities for an organization."""
    sb = get_supabase_client()
    res = (
        sb.table("sso_identities")
        .select("*, profiles(email, full_name)")
        .eq("org_id", org_id)
        .order("last_login_at", desc=True)
        .execute()
    )
    return res.data or []
