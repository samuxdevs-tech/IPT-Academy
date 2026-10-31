"""
High-Performance Video Renderer V3 (100% Pure Native Audio Edition)
Skia -> Preallocated BGRA Buffer -> FFmpeg stdin pipe
"""

import os
import sys
import json
import time
import subprocess
import skia

from character import Character2D
from board import Blackboard

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEOS_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "videos"))
os.makedirs(VIDEOS_DIR, exist_ok=True)

def render_video(output_mp4=None):
    if output_mp4 is None:
        output_mp4 = os.path.join(VIDEOS_DIR, "A1-M01-L001.mp4")
        
    master_audio_wav = os.path.join(CURRENT_DIR, "master_audio.wav")
    timeline_json_path = os.path.join(CURRENT_DIR, "master_audio_timeline.json")
    
    if not os.path.exists(master_audio_wav) or not os.path.exists(timeline_json_path):
        raise FileNotFoundError("Audio or timeline not found.")
        
    with open(timeline_json_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
        
    total_dur = meta["total_duration"]
    lines = meta["lines"]
    
    fps = 30
    total_frames = int(total_dur * fps)
    w, h = 1920, 1080
    
    print(f"============================================================", flush=True)
    print(f"Rendering Video V3 (100% Pure Audio): A1-M01-L001", flush=True)
    print(f"Duration: {total_dur:.2f}s | FPS: {fps} | Total Frames: {total_frames}", flush=True)
    print(f"Output: {output_mp4}", flush=True)
    print(f"============================================================", flush=True)
    
    # Initialize Skia Surface
    surface = skia.Surface(w, h)
    canvas = surface.getCanvas()
    
    # Pre-render static background
    board = Blackboard(w, h)
    board.draw_background_and_frame(canvas)
    bg_snapshot = surface.makeImageSnapshot()
    
    # Preallocate fast read buffer
    info = skia.ImageInfo.Make(w, h, skia.kBGRA_8888_ColorType, skia.kPremul_AlphaType)
    raw_buffer = bytearray(w * h * 4)
    stride = w * 4
    
    char = Character2D(base_x=280, base_y=750)
    
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-pix_fmt", "bgra",
        "-s", f"{w}x{h}",
        "-r", str(fps),
        "-i", "-",               # Read raw video from stdin
        "-i", master_audio_wav,  # Read audio from wav
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "160k",
        "-af", "loudnorm=I=-16",
        "-movflags", "+faststart",
        output_mp4
    ]
    
    proc = subprocess.Popen(
        ffmpeg_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    start_time = time.time()
    last_print = time.time()
    
    try:
        for frame_idx in range(total_frames):
            t = frame_idx / fps
            
            # Check speaker & speaking state
            is_speaking = False
            active_speaker = None
            is_silence_gap = False
            
            for line in lines:
                if line["start"] <= t <= line["end"]:
                    if line["speaker"] == "silence":
                        is_silence_gap = True
                    else:
                        is_speaking = True
                        active_speaker = line["speaker"]
                    break
                    
            # Character Poses mapped to timeline
            if t < 5.2:
                char.set_pose("welcome")
            elif t < 17.37:
                char.set_pose("explain")
            elif 17.37 <= t < 22.97:
                char.set_pose("explain")
            elif 22.97 <= t < 27.31:
                char.set_pose("point_r")
            elif 27.31 <= t < 39.42:
                char.set_pose("explain")
            elif 39.42 <= t < 55.44:
                char.set_pose("point_r_high")
            elif 55.44 <= t < 60.20:
                char.set_pose("chest_hand")
            elif 60.20 <= t < 64.83:
                char.set_pose("explain")
            elif 64.83 <= t < 73.42:
                char.set_pose("point_r")
            elif 73.42 <= t < 80.51:
                char.set_pose("explain")
            elif 80.51 <= t < 87.82:
                char.set_pose("point_r")
            elif 87.82 <= t < 95.17:
                char.set_pose("explain")
            elif 95.17 <= t < 100.34:
                char.set_pose("point_r") # Pointing at model sentence
            elif 100.34 <= t < 105.82:
                char.set_pose("explain")
            elif 105.82 <= t <= 109.32:
                char.set_pose("listen_attentive") # Silence gap: waiting for student!
            else:
                char.set_pose("welcome")
                
            # Update character physics
            char.update(t, is_speaking=is_speaking, dt=1.0/fps)
            
            # 1. Blit static background
            canvas.drawImage(bg_snapshot, 0, 0)
            
            # 2. Draw Active Blackboard Scene
            if t < 17.37:
                board.draw_scene_1_welcome(canvas, t / 17.37)
            elif 17.37 <= t < 39.42:
                reveal_t = max(0.0, (t - 22.97) / 2.0)
                board.draw_scene_2_hello(canvas, (t - 17.37) / 22.05, reveal_t)
            elif 39.42 <= t < 64.83:
                board.draw_scene_3_grammar(canvas, (t - 39.42) / 25.41)
            elif 64.83 <= t < 88.32:
                board.draw_scene_4_courtesy(canvas, (t - 64.83) / 23.49, active_speaker=active_speaker)
            else:
                # Scene 5 (Practice Turn)
                silence_start = 105.82
                silence_end = 109.32
                if t < silence_start:
                    timer_val = 0.0
                elif t <= silence_end:
                    timer_val = (t - silence_start) / (silence_end - silence_start)
                else:
                    timer_val = 1.0
                board.draw_scene_5_practice(canvas, (t - 88.32) / 36.5, timer_val, is_silence_gap)
                
            # 3. Draw Character Rig
            char.draw(canvas, t)
            
            # 4. Direct RAM transfer to FFmpeg
            surface.readPixels(info, raw_buffer, stride, 0, 0)
            proc.stdin.write(raw_buffer)
            
            if time.time() - last_print > 3.0 or frame_idx == total_frames - 1:
                pct = (frame_idx + 1) / total_frames * 100
                fps_render = (frame_idx + 1) / (time.time() - start_time)
                eta = (total_frames - (frame_idx + 1)) / max(1.0, fps_render)
                print(f"Rendering V3: {pct:5.1f}% | Frame {frame_idx+1}/{total_frames} | Speed: {fps_render:4.1f} fps | ETA: {eta:.0f}s", flush=True)
                last_print = time.time()
                
    except Exception as e:
        print(f"Render error: {e}", file=sys.stderr, flush=True)
        proc.stdin.close()
        proc.kill()
        raise e
        
    proc.stdin.close()
    proc.wait()
    
    elapsed = time.time() - start_time
    print(f"Render V3 completed in {elapsed:.1f}s!", flush=True)
    print(f"Saved to: {output_mp4}", flush=True)
    
    if os.path.exists(output_mp4):
        size_mb = os.path.getsize(output_mp4) / (1024 * 1024)
        print(f"Final MP4 Size: {size_mb:.2f} MB", flush=True)
        
    return output_mp4

if __name__ == "__main__":
    render_video()
