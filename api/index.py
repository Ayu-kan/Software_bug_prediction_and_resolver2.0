import sys
import os

# Add root and src directories to Python path for serverless runtime
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

src_dir = os.path.join(root_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from backend.main import app

# Export app instance for Vercel ASGI Serverless Handler
handler = app