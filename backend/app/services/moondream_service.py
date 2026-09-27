import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.generation import GenerationMixin
from transformers import GenerationConfig
from PIL import Image
import json
import re

class MoondreamService:
    _instance = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        model_id = "vikhyatk/moondream2"
        print("[INFO] Loading Moondream2 Service...")
            
        self.model = AutoModelForCausalLM.from_pretrained(
            model_id, trust_remote_code=True
        ).to(self.device)
            
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)

    def analyze_image(self, image: Image.Image) -> dict:
        enc_image = self.model.encode_image(image)
        prompt = """Analyze this image for field project evidence. Return ONLY a valid JSON object with exactly these keys:
{
  "description": "one concise sentence describing what is happening",
  "activity": "the main activity or work occurring",
  "scene": "the environment or location type",
  "objects": ["visible", "objects", "and", "equipment"],
  "project_signals": ["domain", "keywords", "useful", "for", "project", "categorization"]
}
Rules: concise, visible facts only, no invented details. Output strictly JSON."""

        answer = self.model.answer_question(enc_image, prompt, self.tokenizer)
        print(f"[MOONDREAM] Raw answer: {answer[:300]}")

        parsed = None
        try:
            match = re.search(r'\{.*\}', answer, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
            else:
                parsed = json.loads(answer)
        except Exception:
            print(f"[MOONDREAM] JSON parse failed. Using raw text as description.")
            parsed = None

        if parsed is None:
            parsed = {
                "description": answer.strip(),
                "activity": "",
                "scene": "",
                "objects": [],
                "project_signals": []
            }

        # Normalize all fields: strip whitespace, remove empty entries
        def clean_str(s):
            return s.strip() if isinstance(s, str) else ""

        def clean_list(lst):
            if not isinstance(lst, list):
                return []
            return [s.strip() for s in lst if isinstance(s, str) and s.strip()]

        normalized = {
            "description": clean_str(parsed.get("description", "")),
            "activity": clean_str(parsed.get("activity", "")),
            "scene": clean_str(parsed.get("scene", "")),
            "objects": clean_list(parsed.get("objects", [])),
            "project_signals": clean_list(parsed.get("project_signals", [])),
        }
        print(f"[MOONDREAM] Normalized output: {normalized}")
        return normalized
