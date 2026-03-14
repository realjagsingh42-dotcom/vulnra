"""
API tests for MCP scan endpoint
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from app.main import app
from app.services.mcp_scanner import MCPScanResult, MCPVulnerability


@pytest.fixture
def client():
    """Create a test client"""
    # Disable rate limiting for tests by patching the limiter instance's check_request_limit method
    # We need to patch it on the instance that's already created in scans.py
    from app.api.endpoints import scans
    
    def noop_check_request(*args, **kwargs):
        return None
    
    # Patch the check_request_limit method on the specific limiter instance
    with patch.object(scans.limiter, 'check_request_limit', side_effect=noop_check_request):
        yield TestClient(app)

@pytest.fixture
def mock_supabase_user():
    """Create a mock Supabase user object"""
    mock_user = MagicMock()
    mock_user.id = "test-user-id"
    mock_user.email = "test@example.com"
    return mock_user

@pytest.fixture(autouse=True)
def reset_supabase_singleton():
    """Reset the Supabase singleton before each test"""
    import app.services.supabase_service as supabase_service
    supabase_service._sb = None
    yield
    supabase_service._sb = None


@pytest.fixture
def mock_scan_result():
    """Mock scan result for testing"""
    return MCPScanResult(
        server_url="https://example.com/mcp",
        status="SUCCESS",
        tools_found=3,
        vulnerabilities=[
            MCPVulnerability(
                id="test-1",
                name="Test Vulnerability",
                description="Test description",
                severity="HIGH",
                cvss_score=7.5,
                owasp_category="LLM01",
                mitre_technique="T0001.001",
                evidence={"detail": "test"},
                remediation="Test remediation",
            )
        ],
        risk_score=50.0,
        overall_severity="HIGH",
        scan_duration=1.5,
    )


class TestMCPEndpoint:
    """Test cases for /scan/mcp endpoint"""

    def test_mcp_scan_endpoint_exists(self, client):
        """Test that the MCP scan endpoint exists"""
        with patch("app.services.supabase_service.get_supabase") as mock_sb:
            mock_sb.return_value = None
            response = client.post("/scan/mcp")
            # Should get 422 (validation error) or 401 (unauthorized) rather than 404
            assert response.status_code in [422, 401, 403]

    def test_mcp_scan_success(self, client, mock_scan_result, mock_supabase_user):
        """Test successful MCP scan"""
        # Mock Supabase service for middleware and get_current_user
        mock_sb = MagicMock()
        mock_user_resp = MagicMock()
        mock_user_resp.user = mock_supabase_user
        # Configure get_user to return the mock response regardless of token
        mock_sb.auth.get_user.return_value = mock_user_resp
        
        # Patch get_supabase where it's imported in security module
        with patch("app.core.security.get_supabase", return_value=mock_sb):
            # Also patch get_user_tier where it's imported in security module
            with patch("app.core.security.get_user_tier", return_value="pro"):
                # Patch get_supabase for the middleware as well
                with patch("app.services.supabase_service.get_supabase", return_value=mock_sb):
                    with patch("app.services.supabase_service.get_user_tier", return_value="pro"):
                        with patch("app.api.endpoints.scans.scan_mcp_server") as mock_scan:
                            mock_scan.return_value = mock_scan_result

                            with patch("app.api.endpoints.scans.check_scan_quota") as mock_quota:
                                mock_quota.return_value = {"allowed": True}

                                response = client.post(
                                    "/scan/mcp",
                                    json={"server_url": "https://example.com/mcp"},
                                    headers={"Authorization": "Bearer test-token"}
                                )

                                assert response.status_code == 200
                                data = response.json()
                                assert data["server_url"] == "https://example.com/mcp"
                                assert data["status"] == "SUCCESS"
                                assert data["risk_score"] == 50.0
                                assert data["overall_severity"] == "HIGH"
                                assert len(data["vulnerabilities"]) == 1

    def test_mcp_scan_invalid_url(self, client, mock_supabase_user):
        """Test MCP scan with invalid URL"""
        # Mock Supabase service for middleware
        mock_sb = MagicMock()
        mock_user_resp = MagicMock()
        mock_user_resp.user = mock_supabase_user
        mock_sb.auth.get_user.return_value = mock_user_resp
        
        # Patch get_supabase where it's imported in security module
        with patch("app.core.security.get_supabase", return_value=mock_sb):
            with patch("app.core.security.get_user_tier", return_value="pro"):
                with patch("app.services.supabase_service.get_supabase", return_value=mock_sb):
                    with patch("app.services.supabase_service.get_user_tier", return_value="pro"):
                        response = client.post(
                            "/scan/mcp",
                            json={"server_url": "not-a-url"},
                            headers={"Authorization": "Bearer test-token"}
                        )

                        assert response.status_code == 422  # Validation error

    def test_mcp_scan_private_ip_blocked(self, client, mock_supabase_user):
        """Test that private IPs are blocked"""
        # Mock Supabase service for middleware
        mock_sb = MagicMock()
        mock_user_resp = MagicMock()
        mock_user_resp.user = mock_supabase_user
        mock_sb.auth.get_user.return_value = mock_user_resp
        
        # Patch get_supabase where it's imported in security module
        with patch("app.core.security.get_supabase", return_value=mock_sb):
            with patch("app.core.security.get_user_tier", return_value="pro"):
                with patch("app.services.supabase_service.get_supabase", return_value=mock_sb):
                    with patch("app.services.supabase_service.get_user_tier", return_value="pro"):
                        response = client.post(
                            "/scan/mcp",
                            json={"server_url": "http://192.168.1.1/mcp"},
                            headers={"Authorization": "Bearer test-token"}
                        )

                        assert response.status_code == 400
                        assert "private IPs" in response.json()["detail"]

    def test_mcp_scan_quota_exceeded(self, client, mock_supabase_user):
        """Test MCP scan with quota exceeded"""
        # Mock Supabase service for middleware
        mock_sb = MagicMock()
        mock_user_resp = MagicMock()
        mock_user_resp.user = mock_supabase_user
        mock_sb.auth.get_user.return_value = mock_user_resp
        
        # Patch get_supabase where it's imported in security module
        with patch("app.core.security.get_supabase", return_value=mock_sb):
            with patch("app.core.security.get_user_tier", return_value="free"):
                with patch("app.services.supabase_service.get_supabase", return_value=mock_sb):
                    with patch("app.services.supabase_service.get_user_tier", return_value="free"):
                        with patch("app.api.endpoints.scans.check_scan_quota") as mock_quota:
                            mock_quota.return_value = {"allowed": False, "reason": "Daily limit exceeded"}

                            response = client.post(
                                "/scan/mcp",
                                json={"server_url": "https://example.com/mcp"},
                                headers={"Authorization": "Bearer test-token"}
                            )

                            assert response.status_code == 429
                            data = response.json()
                            assert data["error"] == "quota_exceeded"

    def test_mcp_scan_error_handling(self, client, mock_supabase_user):
        """Test error handling in MCP scan"""
        # Mock Supabase service for middleware
        mock_sb = MagicMock()
        mock_user_resp = MagicMock()
        mock_user_resp.user = mock_supabase_user
        mock_sb.auth.get_user.return_value = mock_user_resp
        
        # Patch get_supabase where it's imported in security module
        with patch("app.core.security.get_supabase", return_value=mock_sb):
            with patch("app.core.security.get_user_tier", return_value="pro"):
                with patch("app.services.supabase_service.get_supabase", return_value=mock_sb):
                    with patch("app.services.supabase_service.get_user_tier", return_value="pro"):
                        with patch("app.api.endpoints.scans.scan_mcp_server") as mock_scan:
                            mock_scan.side_effect = Exception("Scan failed")

                            with patch("app.api.endpoints.scans.check_scan_quota") as mock_quota:
                                mock_quota.return_value = {"allowed": True}

                                response = client.post(
                                    "/scan/mcp",
                                    json={"server_url": "https://example.com/mcp"},
                                    headers={"Authorization": "Bearer test-token"}
                                )

                                assert response.status_code == 500
                                assert "Scan failed" in response.json()["detail"]


class TestMCPSchema:
    """Test cases for MCP request schema"""

    def test_mcp_request_valid_url(self, client, mock_supabase_user):
        """Test valid URL in MCP request"""
        # Mock Supabase service for middleware
        mock_sb = MagicMock()
        mock_user_resp = MagicMock()
        mock_user_resp.user = mock_supabase_user
        mock_sb.auth.get_user.return_value = mock_user_resp
        
        # Patch get_supabase where it's imported in security module
        with patch("app.core.security.get_supabase", return_value=mock_sb):
            with patch("app.core.security.get_user_tier", return_value="pro"):
                with patch("app.services.supabase_service.get_supabase", return_value=mock_sb):
                    with patch("app.services.supabase_service.get_user_tier", return_value="pro"):
                        # This will fail due to missing quota check, but we're testing schema validation
                        response = client.post(
                            "/scan/mcp",
                            json={"server_url": "https://example.com/mcp"},
                            headers={"Authorization": "Bearer test-token"}
                        )

                        # Should not be 422 (validation error)
                        assert response.status_code != 422

    def test_mcp_request_missing_url(self, client, mock_supabase_user):
        """Test MCP request without URL"""
        # Mock Supabase service for middleware
        mock_sb = MagicMock()
        mock_user_resp = MagicMock()
        mock_user_resp.user = mock_supabase_user
        mock_sb.auth.get_user.return_value = mock_user_resp
        
        # Patch get_supabase where it's imported in security module
        with patch("app.core.security.get_supabase", return_value=mock_sb):
            with patch("app.core.security.get_user_tier", return_value="pro"):
                with patch("app.services.supabase_service.get_supabase", return_value=mock_sb):
                    with patch("app.services.supabase_service.get_user_tier", return_value="pro"):
                        response = client.post(
                            "/scan/mcp",
                            json={},
                            headers={"Authorization": "Bearer test-token"}
                        )

                        assert response.status_code == 422