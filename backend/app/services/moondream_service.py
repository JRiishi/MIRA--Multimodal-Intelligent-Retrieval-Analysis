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
        prompt = (
            "Analyze this field project image for visual progress and infrastructure evidence. "
            "Describe the visible civil works, road conditions, site developments, or structures truthfully. "
            "Return strictly a JSON object with these keys:\n"
            '{\n'
            '  "description": "one clear sentence describing what is visible in the image",\n'
            '  "activity": "the main activity, stage, or infrastructure status shown (e.g. completed asphalt road, baseline ground, earthmoving)",\n'
            '  "scene": "the environment type (e.g. paved road, urban street, highway, open field)",\n'
            '  "objects": ["visible object 1", "visible object 2"]\n'
            '}\n'
            "Rules: only include objects actually visible in this specific image. Do not invent objects. Output strictly valid JSON."
        )

        answer = self.model.answer_question(enc_image, prompt, self.tokenizer)
        print(f"[MOONDREAM] Raw answer: {answer[:300]}")

        parsed = None
        # 1. Try standard JSON extraction
        try:
            match = re.search(r'\{.*\}', answer, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
            else:
                parsed = json.loads(answer)
        except Exception:
            pass

        # 2. Resilient fallback for truncated or malformed JSON responses
        if not parsed or not isinstance(parsed, dict):
            parsed = {}
            raw_clean = answer.strip()
            desc_m = re.search(r'"description"\s*:\s*"([^"]+)"', raw_clean)
            if desc_m:
                parsed["description"] = desc_m.group(1)
            act_m = re.search(r'"activity"\s*:\s*"([^"]+)"', raw_clean)
            if act_m:
                parsed["activity"] = act_m.group(1)
            scene_m = re.search(r'"scene"\s*:\s*"([^"]+)"', raw_clean)
            if scene_m:
                parsed["scene"] = scene_m.group(1)
            objs_m = re.search(r'"objects"\s*:\s*\[(.*?)\]', raw_clean, re.DOTALL)
            if objs_m:
                parsed["objects"] = [o.strip(' "\'\n\r') for o in objs_m.group(1).split(',') if o.strip(' "\'\n\r')]
            sig_m = re.search(r'"project_signals"\s*:\s*\[(.*?)\]', raw_clean, re.DOTALL)
            if sig_m:
                parsed["project_signals"] = [s.strip(' "\'\n\r') for s in sig_m.group(1).split(',') if s.strip(' "\'\n\r')]

        # If still completely empty, fallback to raw text as description
        if not parsed.get("description"):
            parsed["description"] = answer.strip()

        # Normalize all fields: strip whitespace, remove duplicates, filter empty entries
        def clean_str(s):
            return s.strip() if isinstance(s, str) else ""

        def clean_list(lst):
            if not isinstance(lst, list):
                return []
            seen = set()
            cleaned = []
            for item in lst:
                if isinstance(item, str):
                    val = item.strip()
                    if val and val not in seen and len(val) < 50:
                        seen.add(val)
                        cleaned.append(val)
            return cleaned

        normalized = {
            "description": clean_str(parsed.get("description", "")),
            "activity": clean_str(parsed.get("activity", "")),
            "scene": clean_str(parsed.get("scene", "")),
            "objects": clean_list(parsed.get("objects", [])),
            "project_signals": clean_list(parsed.get("project_signals", [])),
        }
        print(f"[MOONDREAM] Normalized output: {normalized}")
        return normalized
