import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

app = FastAPI(title="Synthwave AI Portal")

# Locate static directory relative to the project root
BASE_DIR = Path(__file__).resolve().parent.parent
static_dir = BASE_DIR / "static"

# Ensure static directory exists
os.makedirs(str(static_dir), exist_ok=True)

class NoCacheStaticFiles(StaticFiles):
    def is_not_modified(self, response_headers, request_headers) -> bool:
        return False
    async def get_response(self, path: str, scope):
        resp = await super().get_response(path, scope)
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp

# Mount the static directory
app.mount("/static/assets", NoCacheStaticFiles(directory=str(BASE_DIR / "assets")), name="assets")
app.mount("/static", NoCacheStaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
async def root():
    # Redirect root to the index.html inside static
    return RedirectResponse(url="/static/index.html")
