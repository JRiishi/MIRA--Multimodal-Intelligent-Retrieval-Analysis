import json
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

class ChatService:
    _instance = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
        
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print("[INFO] Loading Qwen Chat Model for Reasoning...")
        model_id = "Qwen/Qwen2.5-3B-Instruct"
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_id)
            self.model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float16).to(self.device)
            self.model_loaded = True
        except Exception as e:
            print(f"[WARNING] Could not load Qwen: {e}")
            self.model_loaded = False
            
    def answer_question(self, question: str, context: list) -> str:
        if not self.model_loaded:
            raise Exception("Chat model (Qwen) failed to load. Please check your GPU VRAM or model cache.")
            
        system = "You are a Project Intelligence AI. Answer the user's question using ONLY the provided project evidence. Do not invent facts."
        context_str = ""
        for i, ev in enumerate(context):
            context_str += f"\nEvidence {i+1} ({ev.get('timestamp', 'Unknown date')}): Activity is {ev.get('activity')}. Description: {ev.get('description')}."
            
        prompt = f"Context:\n{context_str}\n\nQuestion: {question}"
        
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ]
        
        text = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer([text], return_tensors="pt").to(self.device)
        generated_ids = self.model.generate(inputs.input_ids, max_new_tokens=256)
        generated_ids = [output_ids[len(input_ids):] for input_ids, output_ids in zip(inputs.input_ids, generated_ids)]
        
        return self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
