import os
import json
import logging
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.auth.routes import router as auth_router
from app.api.incidents import router as incidents_router
from app.api.triage import router as triage_router, TRIAGE_REPORTS_CACHE
from app.api.settings import router as settings_router
from app.services.sentinel_client import sentinel_client
from app.agent.triage_agent import triage_agent

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sentinel_soc_agent")

app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous AI Triage Agent for Microsoft Sentinel & Defender XDR",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")
app.include_router(triage_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

# Kubernetes Liveness & Readiness Probes
@app.get("/healthz", tags=["Health"])
async def healthz():
    return {"status": "ok", "app": settings.APP_NAME}

@app.get("/readyz", tags=["Health"])
async def readyz():
    return {"status": "ready"}

# Real-time WebSocket Stream for Live Investigation Trails
@app.websocket("/ws/triage/{incident_id}")
async def websocket_triage_stream(websocket: WebSocket, incident_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected for incident triage stream: {incident_id}")
    
    try:
        # Check if incident exists
        incident = await sentinel_client.get_incident(incident_id)
        if not incident:
            await websocket.send_json({
                "event": "ERROR",
                "message": f"Incident {incident_id} not found."
            })
            await websocket.close()
            return

        async def send_progress(event_data: dict):
            try:
                await websocket.send_text(json.dumps(event_data))
            except Exception as e:
                logger.debug(f"WebSocket send error: {e}")

        # Run triage with real-time streaming callback
        report = await triage_agent.triage_incident(
            incident=incident,
            progress_callback=send_progress
        )
        TRIAGE_REPORTS_CACHE[incident_id] = report

        # Final complete message
        await websocket.send_json({
            "event": "INVESTIGATION_COMPLETE",
            "message": "AI investigation completed successfully.",
            "report": report
        })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for incident: {incident_id}")
    except Exception as e:
        logger.error(f"Error in WebSocket triage stream: {e}")
        try:
            await websocket.send_json({"event": "ERROR", "message": str(e)})
        except Exception:
            pass

# Serve Frontend static build if present (for single-container AKS / Docker deployment)
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if not os.path.exists(FRONTEND_DIST):
    FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("ws") or full_path.startswith("healthz") or full_path.startswith("readyz"):
            return None
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend build not found."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
