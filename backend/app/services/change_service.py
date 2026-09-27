from skimage.metrics import structural_similarity as ssim
import cv2
import numpy as np
import requests

class ChangeService:
    @staticmethod
    def analyze_change(before_url: str, after_url: str):
        try:
            req_before = requests.get(before_url)
            req_after = requests.get(after_url)
            
            img_b_arr = np.frombuffer(req_before.content, np.uint8)
            img_a_arr = np.frombuffer(req_after.content, np.uint8)
            
            img_b = cv2.imdecode(img_b_arr, cv2.IMREAD_GRAYSCALE)
            img_a = cv2.imdecode(img_a_arr, cv2.IMREAD_GRAYSCALE)
            
            # Align sizes for baseline SSIM
            img_a = cv2.resize(img_a, (img_b.shape[1], img_b.shape[0]))
            
            score, _ = ssim(img_b, img_a, full=True)
            change_detected = score < 0.85
            
            return {
                "change_detected": bool(change_detected),
                "change_score": float(score),
                "summary": "Significant structural change detected." if change_detected else "Minimal structural change detected."
            }
        except Exception as e:
            print(f"[ERROR] Change analysis failed: {e}")
            return {
                "change_detected": False,
                "change_score": 1.0,
                "summary": "Could not compute change due to an image processing error."
            }
