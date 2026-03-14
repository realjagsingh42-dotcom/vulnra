# OWASP LLM 2025 Support

VULNRA now supports **complete coverage** of all 10 OWASP LLM Top 10 categories.

## OWASP LLM Top 10 Categories

| # | Category | Status | Description |
|---|----------|--------|-------------|
| 1 | **Prompt Injection** | ✅ Full | Direct and indirect prompt injection attacks |
| 2 | **Sensitive Information Disclosure** | ✅ Full | Unintended exposure of sensitive data |
| 3 | **Supply Chain Vulnerabilities** | ✅ Full | Vulnerabilities in model development pipeline |
| 4 | **Data and Model Poisoning** | ✅ Full | Manipulation of training data or parameters |
| 5 | **Improper Output Handling** | ✅ Full | Failure to validate or sanitize outputs |
| 6 | **Excessive Agency** | ✅ Full | Model having more capabilities than intended |
| 7 | **System Prompt Leakage** | ✅ Full | Exposure of system prompts or instructions |
| 8 | **Vector and Embedding Weaknesses** | ✅ Full | Vulnerabilities in RAG systems |
| 9 | **Misinformation** | ✅ Full | Generation of false or misleading information |
| 10 | **Unbounded Consumption** | ✅ Full | Resource exhaustion attacks on LLM APIs |

## Implementation Details

### Garak Engine Probes

VULNRA maps Garak probes to OWASP categories:

```python
PROBE_TO_CATEGORY = {
    "dan":                "LLM01",  # Prompt Injection
    "promptinject":       "LLM01",  # Prompt Injection
    "encoding":           "LLM01",  # Prompt Injection
    "leakreplay":         "LLM02",  # Sensitive Information Disclosure
    "leakage":            "LLM02",  # Sensitive Information Disclosure
    "prompt_leakage":     "LLM07",  # System Prompt Leakage
    "continuation":       "LLM05",  # Improper Output Handling
    "rag":                "LLM08",  # Vector/Embedding Weaknesses
    "resource":           "LLM10",  # Unbounded Consumption
}
```

### DeepTeam Engine Vulnerabilities

VULNRA maps DeepTeam vulnerabilities to OWASP categories:

```python
VULNERABILITY_TYPES = {
    "prompt_injection":   "LLM01",
    "jailbreak":          "LLM01",
    "pii_leakage":        "LLM02",
    "prompt_leakage":     "LLM07",
    "excessive_agency":   "LLM06",
    "misinformation":     "LLM09",
    "vector_weakness":    "LLM08",
    "unbounded_consumption": "LLM10",
}
```

## Compliance Mapping

Each OWASP category is mapped to regulatory frameworks:

### EU AI Act
- **LLM01**: Art. 9, Art. 13 (Fine: €15M)
- **LLM02**: Art. 13, Art. 17 (Fine: €20M)
- **LLM03**: Art. 15 (Fine: €10M)
- **LLM04**: Art. 15 (Fine: €10M)
- **LLM05**: Art. 13 (Fine: €15M)
- **LLM06**: Art. 9 (Fine: €10M)
- **LLM07**: Art. 9 (Fine: €10M)
- **LLM08**: Art. 15 (Fine: €10M)
- **LLM09**: Art. 13 (Fine: €15M)
- **LLM10**: Art. 9 (Fine: €10M)

### India DPDP
- **LLM01**: Sec. 8, Sec. 11 (Fine: ₹250M)
- **LLM02**: Sec. 8, Sec. 11, Sec. 16 (Fine: ₹250M)
- **LLM03**: Sec. 8 (Fine: ₹100M)
- **LLM04**: Sec. 8 (Fine: ₹100M)
- **LLM05**: Sec. 8 (Fine: ₹150M)
- **LLM06**: Sec. 8 (Fine: ₹100M)
- **LLM07**: Sec. 8 (Fine: ₹100M)
- **LLM08**: Sec. 8 (Fine: ₹100M)
- **LLM09**: Sec. 8 (Fine: ₹150M)
- **LLM10**: Sec. 8 (Fine: ₹100M)

### NIST AI RMF
- **LLM01**: GOVERN 1.1, MAP 2.1, MEASURE 2.5
- **LLM02**: GOVERN 1.1, MAP 2.1
- **LLM03**: GOVERN 1.1, MANAGE 2.2
- **LLM04**: GOVERN 1.1, MANAGE 2.2
- **LLM05**: GOVERN 1.1, MEASURE 2.5
- **LLM06**: GOVERN 1.1, MANAGE 2.2
- **LLM07**: GOVERN 1.1
- **LLM08**: GOVERN 1.1, MAP 2.1
- **LLM09**: GOVERN 1.1, MEASURE 2.5
- **LLM10**: GOVERN 1.1, MANAGE 2.2

## API Usage

### Scan Endpoint

```bash
POST /api/scan
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://target-llm.com",
  "tier": "pro"
}
```

### Response with OWASP Categories

```json
{
  "scan_id": "uuid",
  "risk_score": 7.5,
  "findings": [
    {
      "category": "JAILBREAK",
      "owasp_category": "LLM01",
      "severity": "HIGH",
      "detail": "Model vulnerable to DAN jailbreak",
      "compliance": {
        "eu_ai_act": {"articles": ["Art. 9", "Art. 13"], "fine_eur": 15000000},
        "dpdp": {"sections": ["Sec. 8", "Sec. 11"], "fine_inr": 250000000},
        "nist_ai_rmf": {"functions": ["GOVERN 1.1", "MAP 2.1", "MEASURE 2.5"]}
      }
    }
  ]
}
```

## Frontend Integration

### OWASP Filter

The scanner UI now includes an OWASP category filter:

1. **Select OWASP Category**: Filter findings by specific OWASP category
2. **View Compliance Details**: See regulatory mappings for each finding
3. **Generate Reports**: Export OWASP-compliant audit reports

### Compliance Badge

Each finding displays:
- **OWASP Category**: LLM01, LLM02, etc.
- **Severity Level**: HIGH, MEDIUM, LOW
- **Regulatory Fines**: EU AI Act, DPDP, NIST mappings

## Testing

VULNRA includes comprehensive tests for OWASP coverage:

```bash
# Run OWASP coverage tests
pytest tests/integration/test_owasp_coverage.py -v
```

## Future Enhancements

- **OWASP LLM 2026**: Support for new categories as they're released
- **Custom Categories**: User-defined OWASP mappings
- **Automated Compliance Reports**: PDF exports with OWASP mappings

## References

- [OWASP LLM Top 10 2025](https://owasp.org/www-project-large-language-model-security/)
- [OWASP LLM AI Security & Privacy Guide](https://owasp.org/www-project-llm-ai-security-privacy-guide/)
- [VULNRA Research](docs/research/)
