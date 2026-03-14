"""Tests for compliance module."""
import pytest
from app.core.compliance import (
    OWASP_LLM_CATEGORIES,
    CATEGORY_TO_OWASP,
    REGULATORY_MAPPINGS,
    MITRE_ATLAS_TACTICS,
    MITRE_ATLAS_TECHNIQUES,
    get_owasp_category,
    get_compliance_mapping,
    get_all_owasp_categories,
    get_mitre_atlas_tactics,
    get_mitre_atlas_techniques,
)


def test_mitre_atlas_mappings():
    """Test MITRE ATLAS mappings exist for all OWASP categories."""
    assert "mitre_atlas" in REGULATORY_MAPPINGS
    assert len(REGULATORY_MAPPINGS["mitre_atlas"]) == 10
    
    # Check each OWASP category has MITRE ATLAS mapping
    for owasp_cat in OWASP_LLM_CATEGORIES.keys():
        mapping = REGULATORY_MAPPINGS["mitre_atlas"].get(owasp_cat)
        assert mapping is not None, f"Missing MITRE ATLAS mapping for {owasp_cat}"
        assert "techniques" in mapping
        assert "tactics" in mapping


def test_mitre_atlas_tactics():
    """Test MITRE ATLAS tactics are defined."""
    tactics = get_mitre_atlas_tactics()
    assert len(tactics) == 12
    
    # Check key tactics exist
    assert "TA0001" in tactics
    assert "TA0002" in tactics
    assert "TA0010" in tactics
    assert "TA0012" in tactics


def test_mitre_atlas_techniques():
    """Test MITRE ATLAS techniques are defined."""
    techniques = get_mitre_atlas_techniques()
    assert len(techniques) >= 7
    
    # Check key techniques exist
    assert "T0001.001" in techniques
    assert "T0001.002" in techniques
    assert "T0010.001" in techniques


def test_mitre_atlas_owasp_mapping():
    """Test MITRE ATLAS maps correctly to OWASP categories."""
    # LLM01 (Prompt Injection) should map to T0001.001 and T0001.002
    llm01_mapping = REGULATORY_MAPPINGS["mitre_atlas"]["LLM01"]
    assert "T0001.001" in llm01_mapping["techniques"]
    assert "T0001.002" in llm01_mapping["techniques"]
    
    # LLM02 (Sensitive Info Disclosure) should map to T0010.001
    llm02_mapping = REGULATORY_MAPPINGS["mitre_atlas"]["LLM02"]
    assert "T0010.001" in llm02_mapping["techniques"]


def test_get_mitre_atlas_mapping():
    """Test getting MITRE ATLAS mapping for specific category."""
    mapping = get_compliance_mapping("LLM01", "mitre_atlas")
    assert "techniques" in mapping
    assert "tactics" in mapping
    assert len(mapping["techniques"]) > 0
    assert len(mapping["tactics"]) > 0


def test_all_frameworks_present():
    """Test all expected frameworks are in regulatory mappings."""
    expected_frameworks = ["eu_ai_act", "dpdp", "nist_ai_rmf", "mitre_atlas"]
    for framework in expected_frameworks:
        assert framework in REGULATORY_MAPPINGS, f"Missing {framework} in mappings"
