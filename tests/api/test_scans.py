"""Tests for API scan endpoints."""
import pytest
from app.api.endpoints.scans import MultiTurnScanRequest


def test_multi_turn_scan_request():
    """Test MultiTurnScanRequest model."""
    request = MultiTurnScanRequest(
        url="http://test.com",
        attack_type="crescendo",
        tier="pro"
    )
    
    assert request.attack_type == "crescendo"
    assert request.tier == "pro"
