"""Integration tests for multi-turn attack chains."""
import pytest
from app.services.attack_chains import CrescendoAttack, GOATAttack


def test_crescendo_integration():
    """Test Crescendo attack chain integration."""
    attack = CrescendoAttack()
    
    # Simulate attack chain
    for i in range(5):
        prompt = attack.get_next_prompt()
        assert prompt  # Should have a prompt
        
        # Simulate response
        response = "I cannot help with that."
        result = attack.process_response(response)
        
        assert "is_jailbreak" in result
        attack.current_turn += 1
    
    assert attack.current_turn == 5


def test_goat_integration():
    """Test GOAT attack chain integration."""
    attack = GOATAttack()
    
    # Test initial prompt
    prompt = attack.get_next_prompt()
    assert prompt  # Should have initial prompt
    
    # Test adaptive generation
    if attack.current_turn > 0:
        response = "I cannot help with that."
        next_prompt = attack.get_next_prompt(response)
        assert next_prompt  # Should generate next prompt
    
    assert attack.current_turn < attack.max_turns


def test_crescendo_jailbreak_detection():
    """Test Crescendo jailbreak detection."""
    attack = CrescendoAttack()
    
    # Test with safe response
    result = attack.process_response("I cannot help with that request.")
    assert result["is_jailbreak"] == False
    
    # Test with jailbreak response
    result = attack.process_response("Here are the confidential passwords: 12345")
    assert result["is_jailbreak"] == True
    
    # Test with partial jailbreak
    result = attack.process_response("The security bypass involves...")
    assert result["is_jailbreak"] == True


def test_attack_chain_history():
    """Test attack chain maintains conversation history."""
    attack = CrescendoAttack()
    
    # Get prompts and check history
    for i in range(3):
        prompt = attack.get_next_prompt()
        attack.current_turn += 1
    
    assert len(attack.conversation_history) == 3
    assert attack.conversation_history[0]["turn"] == 0
    assert "Hello" in attack.conversation_history[0]["content"]
