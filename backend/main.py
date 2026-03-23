from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Lights Out API")

# Path to the frontend directory
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")

# Mount the frontend directory to serve static files (HTML, CSS, JS)
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8080 to match the old server.ps1 behavior
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
