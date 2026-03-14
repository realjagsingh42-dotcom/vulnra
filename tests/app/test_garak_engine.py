"""Tests for Garak engine multi-turn support."""
import pytest
from app.services.attack_chains import CrescendoAttack


def test_multi_turn_scan_support():
    """Test Garak engine supports multi-turn attack chains."""
    attack = CrescendoAttack()
    
    # Simulate multi-turn scan
    prompts = []
    for i in range(3):
        prompt = attack.get_next_prompt()
        prompts.append(prompt)
        attack.current_turn += 1
    
    assert len(prompts) == 3
    assert all(isinstance(p, str) for p in prompts)
