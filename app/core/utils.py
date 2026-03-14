import ipaddress
import socket
import logging
from urllib.parse import urlparse

logger = logging.getLogger("vulnra.utils")

BLOCKED_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

def is_safe_url(target_url: str) -> bool:
    try:
        parsed = urlparse(target_url)
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        try:
            ip_obj = ipaddress.ip_address(hostname)
            if _is_internal_ip(ip_obj):
                return False
        except ValueError:
            pass

        try:
            resolved_ips = socket.getaddrinfo(hostname, None)
            for family, _, _, _, sockaddr in resolved_ips:
                ip_str = sockaddr[0]
                resolved_ip_obj = ipaddress.ip_address(ip_str)
                if _is_internal_ip(resolved_ip_obj):
                    return False
        except socket.gaierror:
            return False

        if hostname.lower() in ("localhost", "0.0.0.0", "127.0.0.1", "::1"):
            return False

        return True
    except Exception:
        return False

def _is_internal_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_unspecified:
        return True
    for blocked in BLOCKED_RANGES:
        if ip in blocked:
            return True
    return False
