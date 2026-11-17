"""Network boundary guard: discovery may only reach the public web (docs/06, docs/03 browser row)."""

import ipaddress
import socket
from urllib.parse import urlsplit


class BlockedUrl(ValueError):
    pass


def assert_public_http_url(url: str) -> str:
    """Reject non-http(s) schemes, credentials in URLs, and hosts resolving to non-public IPs."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise BlockedUrl(f"scheme {parts.scheme!r} is not allowed")
    if parts.username or parts.password:
        raise BlockedUrl("credentials in URLs are not allowed")
    host = parts.hostname
    if not host:
        raise BlockedUrl("URL has no host")
    try:
        infos = socket.getaddrinfo(host, parts.port or (443 if parts.scheme == "https" else 80))
    except socket.gaierror as exc:
        raise BlockedUrl(f"cannot resolve {host}") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise BlockedUrl(f"{host} resolves to non-public address {ip}")
    return url
