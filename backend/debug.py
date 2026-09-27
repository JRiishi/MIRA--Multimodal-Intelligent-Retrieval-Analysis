from app.main import app
import traceback
try:
    app.openapi()
except Exception:
    traceback.print_exc()
