import os
import torch
import imageio
import boto3
import uuid
from celery import Celery
from diffusers import DiffusionPipeline, VideoToVideoSDPipeline, DPMSolverMultistepScheduler

# 1. Initialize Celery
celery_app = Celery(
    "video_worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

# 2. Global model variables
t2v_pipe = None
v2v_pipe = None

def load_models():
    global t2v_pipe, v2v_pipe
    if t2v_pipe is None:
        print("Loading Base Text-to-Video Model...")
        t2v_pipe = DiffusionPipeline.from_pretrained(
            "cerspense/zeroscope_v2_576w",
            torch_dtype=torch.float16
        )
        t2v_pipe.scheduler = DPMSolverMultistepScheduler.from_config(t2v_pipe.scheduler.config)
        
        # Move directly to your RTX 3080 Ti (Fixes accelerate bug & runs faster!)
        t2v_pipe.to("cuda") 
        t2v_pipe.enable_vae_slicing() # Keeps your 12GB VRAM safe

        print("Loading Video-to-Video Stitching Pipeline...")
        v2v_pipe = VideoToVideoSDPipeline.from_pretrained(
            "cerspense/zeroscope_v2_576w", 
            torch_dtype=torch.float16
        )
        v2v_pipe.scheduler = DPMSolverMultistepScheduler.from_config(v2v_pipe.scheduler.config)
        
        # Move directly to your RTX 3080 Ti
        v2v_pipe.to("cuda")
        v2v_pipe.enable_vae_slicing() 
        print("Models loaded successfully!")

# 3. AWS S3 Configuration (Commented out if saving locally)
s3_client = boto3.client(
    's3',
    aws_access_key_id='YOUR_AWS_ACCESS_KEY',
    aws_secret_access_key='YOUR_AWS_SECRET_KEY',
    region_name='us-east-1'
)
BUCKET_NAME = "your-zeroscope-videos-bucket"

@celery_app.task(bind=True)
def generate_video_task(self, prompt: str, target_seconds: int):
    """
    Generates video in 5-second chunks and stitches them together for long videos.
    """
    load_models()
    
    fps = 8
    frames_per_chunk = 40  # 5 seconds at 8fps
    num_chunks = max(1, target_seconds // 5)
    
    all_frames = []
    
    try:
        for chunk_idx in range(num_chunks):
            self.update_state(state='PROCESSING', meta={'status': f'Generating part {chunk_idx + 1} of {num_chunks}...'})
            
            if chunk_idx == 0:
                # Chunk 1: Pure Text-to-Video
                chunk_result = t2v_pipe(
                    prompt, 
                    num_inference_steps=25, 
                    num_frames=frames_per_chunk
                ).frames[0]
                all_frames.extend(chunk_result)
                
            else:
                # Chunk 2+: Video-to-Video (Extending the previous clip)
                # Take the last 8 frames (1 second) to maintain continuity
                init_video = all_frames[-8:] 
                
                chunk_result = v2v_pipe(
                    prompt, 
                    video=init_video, 
                    num_inference_steps=25, 
                    num_frames=frames_per_chunk,
                    strength=0.75 # High strength allows scene progression while matching context
                ).frames[0]
                
                # Drop the first 8 frames of the new result so it doesn't stutter/overlap
                all_frames.extend(chunk_result[8:])
                
        self.update_state(state='PROCESSING', meta={'status': 'Stitching and encoding MP4...'})
        
        # Save to MP4
        local_filename = f"/tmp/{uuid.uuid4()}.mp4"
        imageio.mimsave(local_filename, all_frames, fps=fps)
        
        # Upload to S3 (Or change this to just return local_filename if testing locally)
        self.update_state(state='PROCESSING', meta={'status': 'Uploading to cloud...'})
        s3_filename = f"generated/{os.path.basename(local_filename)}"
        
        s3_client.upload_file(
            local_filename, 
            BUCKET_NAME, 
            s3_filename,
            ExtraArgs={'ACL': 'public-read', 'ContentType': 'video/mp4'}
        )
        
        video_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_filename}"
        os.remove(local_filename) # Clean up the server drive
        
        return {"video_url": video_url, "prompt": prompt}

    except Exception as e:
        print(f"Error generating video: {e}")
        self.update_state(state='FAILED', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise e
