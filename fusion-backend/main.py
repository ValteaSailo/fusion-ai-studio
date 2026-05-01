from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from worker import generate_video_task, celery_app
from celery.result import AsyncResult

app = FastAPI(title="Zeroscope API")

# Allow React frontend to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Model
class PromptRequest(BaseModel):
    prompt: str
    duration: str = "5s"  # E.g., "5s", "10s", or "20s" from frontend

@app.post("/generate")
def generate_video(request: PromptRequest):
    """
    Receives prompt, pushes to Celery queue, returns task_id immediately.
    """
    # Map the string duration from the frontend to actual seconds
    duration_map = {
        "5s": 5,
        "10s": 10,
        "20s": 20
    }
    target_seconds = duration_map.get(request.duration, 5)
    
    # Send task to Celery with the target seconds
    task = generate_video_task.delay(request.prompt, target_seconds)
    
    return {
        "status": "queued",
        "task_id": task.id,
        "message": f"Video generation ({request.duration}) has been added to the queue."
    }

@app.get("/status/{task_id}")
def get_status(task_id: str):
    """
    Frontend polls this endpoint to check if the video is ready.
    """
    task_result = AsyncResult(task_id, app=celery_app)
    
    if task_result.state == 'PENDING':
        return {"state": "PENDING", "status": "Waiting in queue..."}
        
    elif task_result.state == 'PROCESSING':
        # Custom state sent from our worker.py so the user sees progress
        return {"state": "PROCESSING", "status": task_result.info.get('status', 'Processing...')}
        
    elif task_result.state == 'SUCCESS':
        return {
            "state": "SUCCESS", 
            "status": "Complete!",
            "video_url": task_result.result.get("video_url")
        }
        
    elif task_result.state == 'FAILED':
        return {"state": "FAILED", "status": "Error during generation."}
        
    return {"state": task_result.state}
