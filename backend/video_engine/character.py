"""
Articulated 2D Character Rig (NumPy + Skia)
Forward Kinematics (FK), Spring dynamics, and layered micro-motions:
- Respiration (sine wave on torso & neck)
- Stochastic eye blinking
- Micro-sway (natural body weight shifting)
- Dynamic speech mouth aperture
"""

import math
import random
import numpy as np
import skia

POSES = {
    "idle": {
        "l_shoulder": 15,  "l_elbow": 10,
        "r_shoulder": -15, "r_elbow": -10,
        "head_tilt": 0
    },
    "welcome": {
        "l_shoulder": 120, "l_elbow": 25,
        "r_shoulder": -120, "r_elbow": -25,
        "head_tilt": 2
    },
    "point_r": {
        "l_shoulder": 15,  "l_elbow": 15,
        "r_shoulder": -85, "r_elbow": -5,
        "head_tilt": -3
    },
    "point_r_high": {
        "l_shoulder": 15,  "l_elbow": 15,
        "r_shoulder": -115, "r_elbow": -10,
        "head_tilt": -4
    },
    "chest_hand": {
        "l_shoulder": 15,  "l_elbow": 15,
        "r_shoulder": -45, "r_elbow": -95,
        "head_tilt": 1
    },
    "explain": {
        "l_shoulder": 25,  "l_elbow": 35,
        "r_shoulder": -45, "r_elbow": -40,
        "head_tilt": -2
    },
    "listen_attentive": {
        "l_shoulder": 20,  "l_elbow": 20,
        "r_shoulder": -20, "r_elbow": -20,
        "head_tilt": 4
    }
}

class SpringAngle:
    def __init__(self, initial_deg=0.0, stiffness=160.0, damping=20.0):
        self.val = float(initial_deg)
        self.target = float(initial_deg)
        self.vel = 0.0
        self.k = stiffness
        self.c = damping

    def update(self, dt=1.0/30.0):
        force = -self.k * (self.val - self.target) - self.c * self.vel
        self.vel += force * dt
        self.val += self.vel * dt
        return self.val

class Character2D:
    def __init__(self, base_x=340, base_y=720):
        self.base_x = base_x
        self.base_y = base_y
        
        # Rig dimensions
        self.torso_w = 110
        self.torso_h = 190
        self.head_radius = 58
        self.upper_arm_len = 80
        self.forearm_len = 75
        self.arm_thickness = 22
        
        # Color palette
        self.c_skin = skia.Color(245, 214, 186)
        self.c_skin_shadow = skia.Color(228, 190, 160)
        self.c_jacket = skia.Color(26, 43, 76)      # IPT Dark Navy #1A2B4C
        self.c_shirt = skia.Color(240, 244, 248)    # Clean light blue-white
        self.c_hair = skia.Color(40, 32, 28)        # Dark warm brown
        self.c_accent = skia.Color(47, 111, 237)    # IPT Blue
        
        # Springs for joints
        self.springs = {
            "l_shoulder": SpringAngle(15),
            "l_elbow": SpringAngle(10),
            "r_shoulder": SpringAngle(-15),
            "r_elbow": SpringAngle(-10),
            "head_tilt": SpringAngle(0),
        }
        
        # State tracking
        self.blink_timer = 2.0
        self.blink_state = 0.0 # 0=open, 1=closed
        self.talking = False
        self.mouth_aperture = 0.0
        
    def set_pose(self, pose_name):
        if pose_name in POSES:
            pose = POSES[pose_name]
            for joint, target_val in pose.items():
                if joint in self.springs:
                    self.springs[joint].target = target_val

    def update(self, t, is_speaking=False, dt=1.0/30.0):
        # Update spring physics for each joint
        for s in self.springs.values():
            s.update(dt)
            
        # Update blinking
        self.blink_timer -= dt
        if self.blink_timer <= 0:
            self.blink_state = 1.0
            self.blink_timer = random.uniform(2.5, 4.5)
        else:
            self.blink_state = max(0.0, self.blink_state - dt * 7.0) # Fast reopening
            
        # Update mouth aperture for speech
        self.talking = is_speaking
        if is_speaking:
            # Multi-frequency oscillation for speech rhythm
            m1 = math.sin(t * 18.0)
            m2 = math.cos(t * 26.0)
            self.mouth_aperture = 0.2 + 0.45 * max(0.0, m1 * 0.6 + m2 * 0.4 + 0.5)
        else:
            self.mouth_aperture = max(0.0, self.mouth_aperture - dt * 6.0)

    def draw(self, canvas, t):
        # Micro-motions
        breath_y = math.sin(t * 2.2) * 3.5
        sway_x = math.sin(t * 1.4) * 2.5
        
        root_x = self.base_x + sway_x
        root_y = self.base_y + breath_y
        
        # Joint angles in radians
        l_sh_rad = math.radians(self.springs["l_shoulder"].val + 90)
        l_el_rad = l_sh_rad + math.radians(self.springs["l_elbow"].val)
        
        r_sh_rad = math.radians(self.springs["r_shoulder"].val + 90)
        r_el_rad = r_sh_rad + math.radians(self.springs["r_elbow"].val)
        
        head_tilt_rad = math.radians(self.springs["head_tilt"].val)
        
        # Joint origins
        l_shoulder_pos = (root_x - 48, root_y - self.torso_h + 30)
        r_shoulder_pos = (root_x + 48, root_y - self.torso_h + 30)
        neck_pos = (root_x, root_y - self.torso_h + 10)
        
        # Left arm FK
        l_elbow_pos = (
            l_shoulder_pos[0] + math.cos(l_sh_rad) * self.upper_arm_len,
            l_shoulder_pos[1] + math.sin(l_sh_rad) * self.upper_arm_len
        )
        l_hand_pos = (
            l_elbow_pos[0] + math.cos(l_el_rad) * self.forearm_len,
            l_elbow_pos[1] + math.sin(l_el_rad) * self.forearm_len
        )
        
        # Right arm FK
        r_elbow_pos = (
            r_shoulder_pos[0] + math.cos(r_sh_rad) * self.upper_arm_len,
            r_shoulder_pos[1] + math.sin(r_sh_rad) * self.upper_arm_len
        )
        r_hand_pos = (
            r_elbow_pos[0] + math.cos(r_el_rad) * self.forearm_len,
            r_elbow_pos[1] + math.sin(r_el_rad) * self.forearm_len
        )
        
        # 1. Draw Left Arm (behind body if pointing right, or layer properly)
        self._draw_arm(canvas, l_shoulder_pos, l_elbow_pos, l_hand_pos, is_left=True)
        
        # 2. Draw Torso / Jacket
        self._draw_torso(canvas, root_x, root_y)
        
        # 3. Draw Neck & Head
        self._draw_head(canvas, neck_pos, head_tilt_rad, t)
        
        # 4. Draw Right Arm (front)
        self._draw_arm(canvas, r_shoulder_pos, r_elbow_pos, r_hand_pos, is_left=False)

    def _draw_torso(self, canvas, rx, ry):
        # Base shadow on floor
        shadow_paint = skia.Paint(Color=skia.Color(0, 0, 0, 40), AntiAlias=True)
        canvas.drawOval(skia.Rect(rx - 70, ry + 15, rx + 70, ry + 35), shadow_paint)
        
        # Torso jacket shape
        torso_rect = skia.RRect.MakeRectXY(
            skia.Rect(rx - self.torso_w/2, ry - self.torso_h + 15, rx + self.torso_w/2, ry + 25),
            28, 28
        )
        jacket_paint = skia.Paint(Color=self.c_jacket, AntiAlias=True)
        canvas.drawRRect(torso_rect, jacket_paint)
        
        # Inner shirt V-neck
        shirt_path = skia.Path()
        shirt_path.moveTo(rx - 22, ry - self.torso_h + 15)
        shirt_path.lineTo(rx + 22, ry - self.torso_h + 15)
        shirt_path.lineTo(rx, ry - self.torso_h + 65)
        shirt_path.close()
        shirt_paint = skia.Paint(Color=self.c_shirt, AntiAlias=True)
        canvas.drawPath(shirt_path, shirt_paint)
        
        # Lapel / Collar lines
        lapel_paint = skia.Paint(
            Color=skia.Color(38, 60, 102),
            Style=skia.Paint.kStroke_Style,
            StrokeWidth=3,
            AntiAlias=True
        )
        canvas.drawLine(rx - 22, ry - self.torso_h + 15, rx - 4, ry - self.torso_h + 75, lapel_paint)
        canvas.drawLine(rx + 22, ry - self.torso_h + 15, rx + 4, ry - self.torso_h + 75, lapel_paint)

    def _draw_arm(self, canvas, shoulder, elbow, hand, is_left=True):
        arm_paint = skia.Paint(
            Color=self.c_jacket,
            Style=skia.Paint.kStroke_Style,
            StrokeWidth=self.arm_thickness,
            StrokeCap=skia.Paint.kRound_Cap,
            AntiAlias=True
        )
        # Upper arm
        canvas.drawLine(shoulder[0], shoulder[1], elbow[0], elbow[1], arm_paint)
        # Forearm
        canvas.drawLine(elbow[0], elbow[1], hand[0], hand[1], arm_paint)
        
        # Hand (skin tone circle)
        hand_paint = skia.Paint(Color=self.c_skin, AntiAlias=True)
        canvas.drawCircle(hand[0], hand[1], self.arm_thickness * 0.65, hand_paint)

    def _draw_head(self, canvas, neck_pos, head_tilt, t):
        head_cx = neck_pos[0]
        head_cy = neck_pos[1] - self.head_radius + 5
        
        canvas.save()
        canvas.translate(head_cx, head_cy)
        canvas.rotate(math.degrees(head_tilt))
        
        # Neck
        neck_paint = skia.Paint(Color=self.c_skin_shadow, AntiAlias=True)
        canvas.drawRect(skia.Rect(-14, self.head_radius - 15, 14, self.head_radius + 8), neck_paint)
        
        # Head oval
        head_paint = skia.Paint(Color=self.c_skin, AntiAlias=True)
        canvas.drawCircle(0, 0, self.head_radius, head_paint)
        
        # Hair (stylish modern cut)
        hair_paint = skia.Paint(Color=self.c_hair, AntiAlias=True)
        hair_path = skia.Path()
        hair_path.addArc(skia.Rect(-self.head_radius - 4, -self.head_radius - 6, self.head_radius + 4, self.head_radius), 180, 180)
        hair_path.lineTo(self.head_radius + 2, -10)
        hair_path.quadTo(20, -25, -self.head_radius - 2, -5)
        hair_path.close()
        canvas.drawPath(hair_path, hair_paint)
        
        # Eyes with blinking
        eye_y = -4
        eye_spacing = 20
        blink = self.blink_state
        eye_h = max(1.5, 6.0 * (1.0 - blink))
        
        eye_paint = skia.Paint(Color=skia.Color(30, 30, 30), AntiAlias=True)
        # Left eye
        canvas.drawOval(skia.Rect(-eye_spacing - 5, eye_y - eye_h, -eye_spacing + 5, eye_y + eye_h), eye_paint)
        # Right eye
        canvas.drawOval(skia.Rect(eye_spacing - 5, eye_y - eye_h, eye_spacing + 5, eye_y + eye_h), eye_paint)
        
        # Eyebrows
        eyebrow_paint = skia.Paint(
            Color=self.c_hair,
            Style=skia.Paint.kStroke_Style,
            StrokeWidth=3.0,
            StrokeCap=skia.Paint.kRound_Cap,
            AntiAlias=True
        )
        canvas.drawLine(-eye_spacing - 8, eye_y - 14, -eye_spacing + 6, eye_y - 12, eyebrow_paint)
        canvas.drawLine(eye_spacing - 6, eye_y - 12, eye_spacing + 8, eye_y - 14, eyebrow_paint)
        
        # Mouth with speech dynamics
        mouth_y = 26
        mouth_w = 16
        aperture = self.mouth_aperture
        
        if aperture > 0.08:
            # Open talking mouth
            mouth_paint = skia.Paint(Color=skia.Color(160, 45, 50), AntiAlias=True)
            mouth_rect = skia.Rect(-mouth_w, mouth_y - aperture * 12, mouth_w, mouth_y + aperture * 10)
            canvas.drawOval(mouth_rect, mouth_paint)
            # Teeth highlight
            teeth_paint = skia.Paint(Color=skia.ColorWHITE, AntiAlias=True)
            canvas.drawRect(skia.Rect(-mouth_w * 0.7, mouth_y - aperture * 12 + 1, mouth_w * 0.7, mouth_y - aperture * 4), teeth_paint)
        else:
            # Gentle welcoming smile
            smile_paint = skia.Paint(
                Color=skia.Color(140, 50, 50),
                Style=skia.Paint.kStroke_Style,
                StrokeWidth=3.0,
                StrokeCap=skia.Paint.kRound_Cap,
                AntiAlias=True
            )
            smile_path = skia.Path()
            smile_path.moveTo(-12, mouth_y - 2)
            smile_path.quadTo(0, mouth_y + 8, 12, mouth_y - 2)
            canvas.drawPath(smile_path, smile_paint)
            
        canvas.restore()
