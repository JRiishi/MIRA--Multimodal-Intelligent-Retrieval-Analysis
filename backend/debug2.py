from transformers import AutoConfig, AutoModelForCausalLM
import traceback
try:
    model_id = "vikhyatk/moondream2"
    revision = "2024-08-26"
    config = AutoConfig.from_pretrained(model_id, trust_remote_code=True, revision=revision)
    if getattr(config, "phi_config", None):
        config.phi_config.pad_token_id = getattr(config.phi_config, "eos_token_id", None)
        if hasattr(config.phi_config, "rope_scaling") and isinstance(config.phi_config.rope_scaling, dict):
            config.phi_config.rope_scaling["type"] = config.phi_config.rope_scaling.get("rope_type", config.phi_config.rope_scaling.get("type", "linear"))
            
    model = AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=True, revision=revision, config=config)
    print("SUCCESS")
except Exception:
    traceback.print_exc()
