"""
Centralized compliance mapping for OWASP LLM Top 10 and regulatory frameworks.
"""

# OWASP LLM 2025 Categories
OWASP_LLM_CATEGORIES = {
    "LLM01": {
        "name": "Prompt Injection",
        "description": "Attacks that inject malicious prompts to manipulate model behavior",
        "severity": "CRITICAL"
    },
    "LLM02": {
        "name": "Sensitive Information Disclosure",
        "description": "Unintended exposure of sensitive data through model outputs",
        "severity": "CRITICAL"
    },
    "LLM03": {
        "name": "Supply Chain Vulnerabilities",
        "description": "Vulnerabilities in model development and deployment pipeline",
        "severity": "HIGH"
    },
    "LLM04": {
        "name": "Data and Model Poisoning",
        "description": "Manipulation of training data or model parameters",
        "severity": "HIGH"
    },
    "LLM05": {
        "name": "Improper Output Handling",
        "description": "Failure to validate or sanitize model outputs",
        "severity": "HIGH"
    },
    "LLM06": {
        "name": "Excessive Agency",
        "description": "Model having more capabilities than intended",
        "severity": "MEDIUM"
    },
    "LLM07": {
        "name": "System Prompt Leakage",
        "description": "Exposure of system prompts or instructions",
        "severity": "MEDIUM"
    },
    "LLM08": {
        "name": "Vector and Embedding Weaknesses",
        "description": "Vulnerabilities in RAG systems and embedding models",
        "severity": "HIGH"
    },
    "LLM09": {
        "name": "Misinformation",
        "description": "Generation of false or misleading information",
        "severity": "MEDIUM"
    },
    "LLM10": {
        "name": "Unbounded Consumption",
        "description": "Resource exhaustion attacks on LLM APIs",
        "severity": "MEDIUM"
    }
}

# Internal category to OWASP mapping
CATEGORY_TO_OWASP = {
    "JAILBREAK": "LLM01",
    "PROMPT_INJECTION": "LLM01",
    "PII_LEAK": "LLM02",
    "SUPPLY_CHAIN": "LLM03",
    "DATA_POISONING": "LLM04",
    "POLICY_BYPASS": "LLM05",
    "EXCESSIVE_AGENCY": "LLM06",
    "SYSTEM_PROMPT_LEAKAGE": "LLM07",
    "VECTOR_WEAKNESS": "LLM08",
    "MISINFORMATION": "LLM09",
    "UNBOUNDED_CONSUMPTION": "LLM10",
    "DATA_EXFIL": "LLM02"
}

# MITRE ATLAS Tactics and Techniques
MITRE_ATLAS_TACTICS = {
    "TA0001": {"name": "Initial Access", "description": "AI system access techniques"},
    "TA0002": {"name": "Execution", "description": "Running malicious code/queries"},
    "TA0003": {"name": "Persistence", "description": "Maintaining access to AI systems"},
    "TA0004": {"name": "Privilege Escalation", "description": "Gaining higher permissions"},
    "TA0005": {"name": "Defense Evasion", "description": "Avoiding detection mechanisms"},
    "TA0006": {"name": "Credential Access", "description": "Stealing AI model credentials"},
    "TA0007": {"name": "Discovery", "description": "Learning about AI system internals"},
    "TA0008": {"name": "Lateral Movement", "description": "Moving within AI infrastructure"},
    "TA0009": {"name": "Collection", "description": "Gathering AI model data"},
    "TA0010": {"name": "Exfiltration", "description": "Extracting AI model data"},
    "TA0011": {"name": "Command and Control", "description": "Communicating with compromised AI"},
    "TA0012": {"name": "Impact", "description": "Damaging AI system functionality"},
}

# MITRE ATLAS Techniques
MITRE_ATLAS_TECHNIQUES = {
    "T0001.001": {"name": "Direct Prompt Injection", "tactic": "TA0001"},
    "T0001.002": {"name": "Indirect Prompt Injection", "tactic": "TA0001"},
    "T0001.003": {"name": "Model Poisoning", "tactic": "TA0001"},
    "T0010.001": {"name": "Training Data Extraction", "tactic": "TA0010"},
    "T0043.001": {"name": "Adversarial Examples", "tactic": "TA0012"},
    "T0048.001": {"name": "Tool Poisoning", "tactic": "TA0004"},
    "T0012.001": {"name": "Resource Exhaustion", "tactic": "TA0012"},
}

# Regulatory compliance mappings
REGULATORY_MAPPINGS = {
    "eu_ai_act": {
        "LLM01": {"articles": ["Art. 9", "Art. 13"], "fine_eur": 15_000_000},
        "LLM02": {"articles": ["Art. 13", "Art. 17"], "fine_eur": 20_000_000},
        "LLM03": {"articles": ["Art. 15"], "fine_eur": 10_000_000},
        "LLM04": {"articles": ["Art. 15"], "fine_eur": 10_000_000},
        "LLM05": {"articles": ["Art. 13"], "fine_eur": 15_000_000},
        "LLM06": {"articles": ["Art. 9"], "fine_eur": 10_000_000},
        "LLM07": {"articles": ["Art. 9"], "fine_eur": 10_000_000},
        "LLM08": {"articles": ["Art. 15"], "fine_eur": 10_000_000},
        "LLM09": {"articles": ["Art. 13"], "fine_eur": 15_000_000},
        "LLM10": {"articles": ["Art. 9"], "fine_eur": 10_000_000}
    },
    "dpdp": {
        "LLM01": {"sections": ["Sec. 8", "Sec. 11"], "fine_inr": 250_000_000},
        "LLM02": {"sections": ["Sec. 8", "Sec. 11", "Sec. 16"], "fine_inr": 250_000_000},
        "LLM03": {"sections": ["Sec. 8"], "fine_inr": 100_000_000},
        "LLM04": {"sections": ["Sec. 8"], "fine_inr": 100_000_000},
        "LLM05": {"sections": ["Sec. 8"], "fine_inr": 150_000_000},
        "LLM06": {"sections": ["Sec. 8"], "fine_inr": 100_000_000},
        "LLM07": {"sections": ["Sec. 8"], "fine_inr": 100_000_000},
        "LLM08": {"sections": ["Sec. 8"], "fine_inr": 100_000_000},
        "LLM09": {"sections": ["Sec. 8"], "fine_inr": 150_000_000},
        "LLM10": {"sections": ["Sec. 8"], "fine_inr": 100_000_000}
    },
    "nist_ai_rmf": {
        "LLM01": {"functions": ["GOVERN 1.1", "MAP 2.1", "MEASURE 2.5"]},
        "LLM02": {"functions": ["GOVERN 1.1", "MAP 2.1"]},
        "LLM03": {"functions": ["GOVERN 1.1", "MANAGE 2.2"]},
        "LLM04": {"functions": ["GOVERN 1.1", "MANAGE 2.2"]},
        "LLM05": {"functions": ["GOVERN 1.1", "MEASURE 2.5"]},
        "LLM06": {"functions": ["GOVERN 1.1", "MANAGE 2.2"]},
        "LLM07": {"functions": ["GOVERN 1.1"]},
        "LLM08": {"functions": ["GOVERN 1.1", "MAP 2.1"]},
        "LLM09": {"functions": ["GOVERN 1.1", "MEASURE 2.5"]},
        "LLM10": {"functions": ["GOVERN 1.1", "MANAGE 2.2"]}
    },
    "mitre_atlas": {
        "LLM01": {
            "techniques": ["T0001.001", "T0001.002"],
            "tactics": ["TA0001", "TA0002"],
            "description": "Prompt Injection attacks"
        },
        "LLM02": {
            "techniques": ["T0010.001"],
            "tactics": ["TA0009", "TA0010"],
            "description": "Training Data Extraction"
        },
        "LLM03": {
            "techniques": ["T0001.003"],
            "tactics": ["TA0001"],
            "description": "Model Poisoning"
        },
        "LLM04": {
            "techniques": ["T0001.003"],
            "tactics": ["TA0001"],
            "description": "Training Data Manipulation"
        },
        "LLM05": {
            "techniques": ["T0043.001"],
            "tactics": ["TA0012"],
            "description": "Adversarial Examples"
        },
        "LLM06": {
            "techniques": ["T0048.001"],
            "tactics": ["TA0004"],
            "description": "Tool Manipulation"
        },
        "LLM07": {
            "techniques": ["T0001.002"],
            "tactics": ["TA0007"],
            "description": "Indirect Prompt Injection"
        },
        "LLM08": {
            "techniques": ["T0043.001"],
            "tactics": ["TA0001"],
            "description": "Embedding Manipulation"
        },
        "LLM09": {
            "techniques": ["T0043.001"],
            "tactics": ["TA0012"],
            "description": "Adversarial Misinformation"
        },
        "LLM10": {
            "techniques": ["T0012.001"],
            "tactics": ["TA0012"],
            "description": "Resource Exhaustion"
        }
    }
}

def get_owasp_category(internal_category: str) -> str:
    """Get OWASP category for internal category."""
    return CATEGORY_TO_OWASP.get(internal_category, "LLM09")  # Default to misinformation

def get_compliance_mapping(owasp_category: str, framework: str) -> dict:
    """Get compliance mapping for OWASP category and framework."""
    return REGULATORY_MAPPINGS.get(framework, {}).get(owasp_category, {})

def get_mitre_atlas_tactics() -> dict:
    """Get all MITRE ATLAS tactics."""
    return MITRE_ATLAS_TACTICS

def get_mitre_atlas_techniques() -> dict:
    """Get all MITRE ATLAS techniques."""
    return MITRE_ATLAS_TECHNIQUES

def get_all_owasp_categories() -> dict:
    """Get all OWASP LLM categories."""
    return OWASP_LLM_CATEGORIES
