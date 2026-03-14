"""Tests for multi-turn attack chain services."""
import pytest
from app.services.attack_chains import CrescendoAttack, GOATAttack


def test_crescendo_attack_initialization():
    """Test Crescendo attack initializes correctly."""
    attack = CrescendoAttack()
    assert attack.turns == 5
    assert attack.current_turn == 0


def test_goat_attack_initialization():
    """Test GOAT attack initializes correctly."""
    attack = GOATAttack()
    assert attack.max_turns == 10
    assert attack.attacker_model == "claude-3-haiku-20240307"
