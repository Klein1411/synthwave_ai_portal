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

# Mount the static directory
app.mount("/static/assets", StaticFiles(directory=str(BASE_DIR / "assets")), name="assets")
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
async def root():
    # Redirect root to the index.html inside static
    return RedirectResponse(url="/static/index.html")
