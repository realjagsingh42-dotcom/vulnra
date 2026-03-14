# VULNRA

VULNRA is an AI Risk Scanner & Compliance Reporter designed to automatically find jailbreaks, prompt injections, and encoding bypasses in any LLM endpoint. It maps vulnerabilities to the EU AI Act & NIST frameworks in real-time.

## Features

### AI Risk Detection
- **Prompt Injection Detection**: Identify direct and indirect chains.
- **Jailbreak Detection**: Recognize DAN, AutoDAN, and HijackKill styles.
- **Encoding Bypasses**: Catch Base64, ROT13, and Unicode obfuscated inputs.
- **Multi-Turn Attack Chains**: Crescendo (5-turn escalating) and GOAT (autonomous) attacks.

### Compliance & Frameworks
- **OWASP LLM 2025**: Complete coverage of all 10 OWASP LLM Top 10 categories.
- **MITRE ATLAS Mapping**: Enterprise compliance framework support.
- **Real-time Compliance Mapping**: Map risks to EU AI Act, NIST AI RMF, and DPDP.

### Platform Features
- **Rate Limiting**: Tier-based API rate limiting with Redis backend.
- **Multi-Engine Support**: Garak and DeepTeam scanning engines.
- **AI Judge Evaluation**: Claude-powered vulnerability assessment.

## Getting Started

Follow the internal documentation to learn how to deploy and operate the scanner nodes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
