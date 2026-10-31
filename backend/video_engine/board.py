"""
Board & UI Graphics Engine (Skia) - V2 (Pedagogical Excellence)
Features:
- Native Vector Icons (zero unicode emoji tofu / no boxes).
- Friendly Figurative Pronunciation [ he - LÓU ] + US standard.
- Active multi-speaker dialogue scaffolding (David & Ana glow states).
- Silent countdown practice bar without overlapping voice audio.
"""

import math
import skia

class VectorIcons:
    @staticmethod
    def draw_star(canvas, cx, cy, radius, color):
        paint = skia.Paint(Color=color, AntiAlias=True)
        path = skia.Path()
        for i in range(10):
            r = radius if i % 2 == 0 else radius * 0.45
            angle = i * math.pi / 5 - math.pi / 2
            x = cx + math.cos(angle) * r
            y = cy + math.sin(angle) * r
            if i == 0:
                path.moveTo(x, y)
            else:
                path.lineTo(x, y)
        path.close()
        canvas.drawPath(path, paint)

    @staticmethod
    def draw_bulb(canvas, cx, cy, radius, color):
        # Lightbulb icon
        paint = skia.Paint(Color=color, AntiAlias=True)
        # Bulb top
        canvas.drawCircle(cx, cy - radius * 0.2, radius * 0.7, paint)
        # Bulb base
        base_rect = skia.Rect(cx - radius * 0.35, cy + radius * 0.2, cx + radius * 0.35, cy + radius * 0.7)
        canvas.drawRRect(skia.RRect.MakeRectXY(base_rect, 4, 4), paint)

    @staticmethod
    def draw_check(canvas, cx, cy, radius, color):
        paint = skia.Paint(
            Color=color,
            Style=skia.Paint.kStroke_Style,
            StrokeWidth=radius * 0.25,
            StrokeCap=skia.Paint.kRound_Cap,
            StrokeJoin=skia.Paint.kRound_Join,
            AntiAlias=True
        )
        path = skia.Path()
        path.moveTo(cx - radius * 0.6, cy + radius * 0.05)
        path.lineTo(cx - radius * 0.15, cy + radius * 0.5)
        path.lineTo(cx + radius * 0.6, cy - radius * 0.45)
        canvas.drawPath(path, paint)

    @staticmethod
    def draw_cross(canvas, cx, cy, radius, color):
        paint = skia.Paint(
            Color=color,
            Style=skia.Paint.kStroke_Style,
            StrokeWidth=radius * 0.25,
            StrokeCap=skia.Paint.kRound_Cap,
            AntiAlias=True
        )
        r = radius * 0.5
        canvas.drawLine(cx - r, cy - r, cx + r, cy + r, paint)
        canvas.drawLine(cx + r, cy - r, cx - r, cy + r, paint)

    @staticmethod
    def draw_mic(canvas, cx, cy, radius, color):
        paint = skia.Paint(Color=color, AntiAlias=True)
        # Mic capsule
        capsule = skia.Rect(cx - radius * 0.3, cy - radius * 0.6, cx + radius * 0.3, cy + radius * 0.2)
        canvas.drawRRect(skia.RRect.MakeRectXY(capsule, radius * 0.3, radius * 0.3), paint)
        # Mic arc
        arc_paint = skia.Paint(
            Color=color,
            Style=skia.Paint.kStroke_Style,
            StrokeWidth=radius * 0.18,
            StrokeCap=skia.Paint.kRound_Cap,
            AntiAlias=True
        )
        arc_rect = skia.Rect(cx - radius * 0.55, cy - radius * 0.3, cx + radius * 0.55, cy + radius * 0.45)
        arc_path = skia.Path()
        arc_path.addArc(arc_rect, 0, 180)
        canvas.drawPath(arc_path, arc_paint)
        # Mic stem
        canvas.drawLine(cx, cy + radius * 0.45, cx, cy + radius * 0.75, arc_paint)
        canvas.drawLine(cx - radius * 0.4, cy + radius * 0.75, cx + radius * 0.4, cy + radius * 0.75, arc_paint)

    @staticmethod
    def draw_target(canvas, cx, cy, radius, color):
        paint = skia.Paint(
            Color=color,
            Style=skia.Paint.kStroke_Style,
            StrokeWidth=radius * 0.2,
            AntiAlias=True
        )
        canvas.drawCircle(cx, cy, radius * 0.8, paint)
        canvas.drawCircle(cx, cy, radius * 0.4, paint)
        canvas.drawCircle(cx, cy, radius * 0.1, skia.Paint(Color=color, AntiAlias=True))


class Blackboard:
    def __init__(self, w=1920, h=1080):
        self.w = w
        self.h = h
        
        self.bx = 560
        self.by = 90
        self.bw = 1280
        self.bh = 900
        
        self.c_bg_dark = skia.Color(15, 23, 42)          # Slate-900
        self.c_board_bg = skia.Color(22, 32, 50)        # Deep classroom slate
        self.c_board_border = skia.Color(45, 60, 88)
        self.c_text_main = skia.Color(248, 250, 252)
        self.c_text_muted = skia.Color(148, 163, 184)
        
        # Grammatical color code
        self.c_subject = skia.Color(47, 111, 237)       # #2F6FED Blue
        self.c_verb = skia.Color(229, 72, 77)           # #E5484D Red
        self.c_complement = skia.Color(48, 164, 108)    # #30A46C Green
        self.c_gold = skia.Color(245, 158, 11)          # #F59E0B Amber
        
        # Typography
        self.font_title = skia.Font(skia.Typeface("Segoe UI"), 44)
        self.font_large = skia.Font(skia.Typeface("Segoe UI"), 56)
        self.font_sub = skia.Font(skia.Typeface("Segoe UI"), 26)
        self.font_body = skia.Font(skia.Typeface("Segoe UI"), 24)
        self.font_badge = skia.Font(skia.Typeface("Segoe UI"), 18)
        self.font_countdown = skia.Font(skia.Typeface("Segoe UI"), 72)

    def draw_background_and_frame(self, canvas):
        canvas.drawRect(skia.Rect(0, 0, self.w, self.h), skia.Paint(Color=self.c_bg_dark))
        canvas.drawRect(skia.Rect(0, 840, self.w, self.h), skia.Paint(Color=skia.Color(10, 16, 28)))
        
        # Shadow
        shadow_rect = skia.Rect(self.bx + 8, self.by + 12, self.bx + self.bw + 8, self.by + self.bh + 12)
        canvas.drawRRect(skia.RRect.MakeRectXY(shadow_rect, 24, 24), skia.Paint(Color=skia.Color(0, 0, 0, 70), AntiAlias=True))
        
        # Board
        board_rect = skia.Rect(self.bx, self.by, self.bx + self.bw, self.by + self.bh)
        canvas.drawRRect(skia.RRect.MakeRectXY(board_rect, 24, 24), skia.Paint(Color=self.c_board_bg, AntiAlias=True))
        
        border_paint = skia.Paint(Color=self.c_board_border, Style=skia.Paint.kStroke_Style, StrokeWidth=3, AntiAlias=True)
        canvas.drawRRect(skia.RRect.MakeRectXY(board_rect, 24, 24), border_paint)
        
        # Header Bar
        header_paint = skia.Paint(Color=skia.Color(30, 44, 70), AntiAlias=True)
        canvas.drawRRect(skia.RRect.MakeRectXY(skia.Rect(self.bx + 30, self.by + 20, self.bx + self.bw - 30, self.by + 80), 12, 12), header_paint)
        
        text_paint = skia.Paint(Color=self.c_text_main, AntiAlias=True)
        canvas.drawString("IPT Course • English A1", self.bx + 55, self.by + 48, self.font_badge, text_paint)
        
        muted_paint = skia.Paint(Color=self.c_text_muted, AntiAlias=True)
        canvas.drawString("•   Unit 1: Greetings & Introductions", self.bx + 265, self.by + 48, self.font_badge, muted_paint)
        
        pill_rect = skia.Rect(self.bx + self.bw - 170, self.by + 32, self.bx + self.bw - 50, self.by + 68)
        canvas.drawRRect(skia.RRect.MakeRectXY(pill_rect, 18, 18), skia.Paint(Color=self.c_subject, AntiAlias=True))
        canvas.drawString("A1.1 CEFR", self.bx + self.bw - 156, self.by + 57, self.font_badge, text_paint)

    def draw_scene_1_welcome(self, canvas, progress):
        cx = self.bx + self.bw / 2
        top_y = self.by + 160
        
        canvas.drawString("¡Bienvenido a tu Primer Paso en Inglés!", cx - 380, top_y, self.font_title, skia.Paint(Color=self.c_text_main, AntiAlias=True))
        canvas.drawString("Aprenderemos a saludar y presentarte con naturalidad y confianza.", cx - 370, top_y + 50, self.font_sub, skia.Paint(Color=self.c_text_muted, AntiAlias=True))
        
        cards = [
            ("1. Saludo Universal", "La palabra exacta para iniciar cualquier conversación.", self.c_subject),
            ("2. Decir Quién Eres", "Estructura directa: Sujeto + Verbo + Tu Nombre.", self.c_verb),
            ("3. Cortesía Real", "La frase clave para responder cuando conoces a alguien.", self.c_complement)
        ]
        
        card_w, card_h = 360, 240
        start_x = self.bx + 70
        y = top_y + 140
        
        for i, (title, desc, color) in enumerate(cards):
            x = start_x + i * (card_w + 50)
            rect = skia.Rect(x, y, x + card_w, y + card_h)
            canvas.drawRRect(skia.RRect.MakeRectXY(rect, 16, 16), skia.Paint(Color=skia.Color(30, 42, 65), AntiAlias=True))
            canvas.drawRRect(skia.RRect.MakeRectXY(skia.Rect(x, y, x + card_w, y + 8), 4, 4), skia.Paint(Color=color, AntiAlias=True))
            canvas.drawString(title, x + 25, y + 55, self.font_sub, skia.Paint(Color=self.c_text_main, AntiAlias=True))
            self._draw_multiline_text(canvas, desc, x + 25, y + 105, 300, 32, self.font_body, skia.Paint(Color=self.c_text_muted, AntiAlias=True))
            
        tip_y = y + card_h + 80
        tip_rect = skia.Rect(cx - 390, tip_y, cx + 390, tip_y + 80)
        canvas.drawRRect(skia.RRect.MakeRectXY(tip_rect, 16, 16), skia.Paint(Color=skia.Color(24, 52, 90), AntiAlias=True))
        
        # Native Vector Star (No tofu)
        VectorIcons.draw_star(canvas, cx - 355, tip_y + 40, 16, self.c_gold)
        canvas.drawString("Recuerda: No buscamos perfección desde el día uno, buscamos hacernos entender.", cx - 325, tip_y + 48, self.font_body, skia.Paint(Color=self.c_gold, AntiAlias=True))

    def draw_scene_2_hello(self, canvas, progress, reveal_t):
        top_y = self.by + 160
        start_x = self.bx + 80
        
        canvas.drawString("1. La Palabra Universal de Saludo", start_x, top_y, self.font_title, skia.Paint(Color=self.c_text_main, AntiAlias=True))
        
        # Clean typography for "Hello!" with smooth reveal underline
        word_x = start_x + 60
        word_y = top_y + 180
        canvas.drawString("Hello!", word_x, word_y, self.font_large, skia.Paint(Color=self.c_subject, AntiAlias=True))
        
        # Animated underline
        ul_w = min(1.0, reveal_t) * 220
        canvas.drawRect(skia.Rect(word_x, word_y + 15, word_x + ul_w, word_y + 21), skia.Paint(Color=self.c_subject, AntiAlias=True))
        
        # Friendly Figurative Phonetics (A1-friendly)
        ph_rect = skia.Rect(word_x + 320, word_y - 80, word_x + 850, word_y + 25)
        canvas.drawRRect(skia.RRect.MakeRectXY(ph_rect, 16, 16), skia.Paint(Color=skia.Color(34, 48, 74), AntiAlias=True))
        
        canvas.drawString("Pronunciación fácil:", word_x + 345, word_y - 35, self.font_badge, skia.Paint(Color=self.c_text_muted, AntiAlias=True))
        canvas.drawString("[ he - LÓU ]", word_x + 510, word_y - 30, self.font_sub, skia.Paint(Color=self.c_gold, AntiAlias=True))
        canvas.drawString("Estándar US:  /hɛˈloʊ/", word_x + 345, word_y + 8, self.font_badge, skia.Paint(Color=self.c_text_muted, AntiAlias=True))
        
        # Phonetic Card with Native Vector Bulb (No tofu)
        tip_y = word_y + 90
        tip_rect = skia.Rect(start_x, tip_y, start_x + 1100, tip_y + 260)
        canvas.drawRRect(skia.RRect.MakeRectXY(tip_rect, 20, 20), skia.Paint(Color=skia.Color(28, 40, 64), AntiAlias=True))
        
        VectorIcons.draw_bulb(canvas, start_x + 55, tip_y + 50, 16, self.c_gold)
        canvas.drawString("Secreto de Pronunciación para Hispanohablantes", start_x + 85, tip_y + 55, self.font_sub, skia.Paint(Color=self.c_gold, AntiAlias=True))
        
        canvas.drawString("• En español, la letra 'H' es completamente muda (ej. 'hola').", start_x + 50, tip_y + 115, self.font_body, skia.Paint(Color=self.c_text_main, AntiAlias=True))
        canvas.drawString("• En inglés, la 'H' suena como un suspiro suave de aire tibio, NO como la 'J' del español.", start_x + 50, tip_y + 160, self.font_body, skia.Paint(Color=self.c_text_main, AntiAlias=True))
        
        VectorIcons.draw_check(canvas, start_x + 60, tip_y + 215, 12, self.c_complement)
        canvas.drawString("Correcto: /h/... Hello   (Suave, relajado, sin raspar la garganta).", start_x + 85, tip_y + 222, self.font_body, skia.Paint(Color=self.c_complement, AntiAlias=True))

    def draw_scene_3_grammar(self, canvas, progress):
        top_y = self.by + 140
        start_x = self.bx + 80
        
        canvas.drawString("2. Estructura de Presentación Personal", start_x, top_y, self.font_title, skia.Paint(Color=self.c_text_main, AntiAlias=True))
        canvas.drawString("En inglés no decimos 'yo me llamo' ni 'yo tengo'. Decimos simplemente: Yo soy.", start_x, top_y + 45, self.font_sub, skia.Paint(Color=self.c_text_muted, AntiAlias=True))
        
        blocks_y = top_y + 110
        blocks = [
            ("I", "Sujeto (Yo)", self.c_subject, 180),
            ("+", "", self.c_text_muted, 50),
            ("am  /  'm", "Verbo (Soy)", self.c_verb, 280),
            ("+", "", self.c_text_muted, 50),
            ("[Tu Nombre]", "Nombre", self.c_complement, 340)
        ]
        
        cur_x = start_x + 40
        for text, label, color, bw in blocks:
            if label == "":
                canvas.drawString(text, cur_x + 12, blocks_y + 70, self.font_large, skia.Paint(Color=color, AntiAlias=True))
            else:
                rect = skia.Rect(cur_x, blocks_y, cur_x + bw, blocks_y + 110)
                canvas.drawRRect(skia.RRect.MakeRectXY(rect, 14, 14), skia.Paint(Color=skia.Color(26, 38, 60), AntiAlias=True))
                canvas.drawRRect(skia.RRect.MakeRectXY(rect, 14, 14), skia.Paint(Color=color, Style=skia.Paint.kStroke_Style, StrokeWidth=3, AntiAlias=True))
                canvas.drawString(text, cur_x + 25, blocks_y + 55, self.font_title, skia.Paint(Color=self.c_text_main, AntiAlias=True))
                canvas.drawString(label, cur_x + 25, blocks_y + 92, self.font_badge, skia.Paint(Color=color, AntiAlias=True))
            cur_x += bw + 20
            
        ex_y = blocks_y + 170
        ex_rect = skia.Rect(start_x, ex_y, start_x + 1100, ex_y + 280)
        canvas.drawRRect(skia.RRect.MakeRectXY(ex_rect, 18, 18), skia.Paint(Color=skia.Color(24, 34, 54), AntiAlias=True))
        
        canvas.drawString("Ejemplos Reales (Voz Nativa):", start_x + 40, ex_y + 50, self.font_sub, skia.Paint(Color=self.c_text_muted, AntiAlias=True))
        
        self._draw_sentence_parts(canvas, start_x + 40, ex_y + 110, [
            ("I'm", self.c_subject),
            (" Carlos.", self.c_complement),
            ("   →   \"Soy Carlos.\"", self.c_text_muted)
        ])
        
        self._draw_sentence_parts(canvas, start_x + 40, ex_y + 170, [
            ("I'm", self.c_subject),
            (" Ana.", self.c_complement),
            ("      →   \"Soy Ana.\"", self.c_text_muted)
        ])
        
        warn_rect = skia.Rect(start_x + 40, ex_y + 205, start_x + 1060, ex_y + 255)
        canvas.drawRRect(skia.RRect.MakeRectXY(warn_rect, 10, 10), skia.Paint(Color=skia.Color(60, 25, 30), AntiAlias=True))
        
        VectorIcons.draw_cross(canvas, start_x + 65, ex_y + 230, 10, skia.Color(250, 120, 120))
        canvas.drawString("Evita el error típico: Decir \"I have Carlos\" en vez de \"I am Carlos\".", start_x + 85, ex_y + 238, self.font_body, skia.Paint(Color=skia.Color(250, 160, 160), AntiAlias=True))

    def draw_scene_4_courtesy(self, canvas, progress, active_speaker=None):
        top_y = self.by + 140
        start_x = self.bx + 80
        
        canvas.drawString("3. La Frase Mágica de Cortesía", start_x, top_y, self.font_title, skia.Paint(Color=self.c_text_main, AntiAlias=True))
        
        card_y = top_y + 50
        card_rect = skia.Rect(start_x, card_y, start_x + 1100, card_y + 170)
        canvas.drawRRect(skia.RRect.MakeRectXY(card_rect, 20, 20), skia.Paint(Color=skia.Color(28, 44, 72), AntiAlias=True))
        
        canvas.drawString("Nice to meet you!", start_x + 50, card_y + 75, self.font_large, skia.Paint(Color=self.c_complement, AntiAlias=True))
        canvas.drawString("Significa: \"Mucho gusto en conocerte\" o \"Encantado de conocerte\".", start_x + 50, card_y + 130, self.font_sub, skia.Paint(Color=self.c_text_main, AntiAlias=True))
        
        # Dialogue Scaffolding with 2 Distinct Visual Roles (David & Ana)
        conv_y = card_y + 200
        canvas.drawString("Diálogo Real (David y Ana se conocen):", start_x, conv_y + 35, self.font_sub, skia.Paint(Color=self.c_text_muted, AntiAlias=True))
        
        # Card David (Guy)
        is_david_speaking = (active_speaker == "en_m")
        david_rect = skia.Rect(start_x, conv_y + 60, start_x + 1100, conv_y + 150)
        david_bg = skia.Color(35, 55, 95) if is_david_speaking else skia.Color(24, 34, 52)
        canvas.drawRRect(skia.RRect.MakeRectXY(david_rect, 14, 14), skia.Paint(Color=david_bg, AntiAlias=True))
        if is_david_speaking:
            canvas.drawRRect(skia.RRect.MakeRectXY(david_rect, 14, 14), skia.Paint(Color=self.c_subject, Style=skia.Paint.kStroke_Style, StrokeWidth=3, AntiAlias=True))
            
        canvas.drawString("David (Voz Masculina):", start_x + 35, conv_y + 110, self.font_body, skia.Paint(Color=self.c_subject, AntiAlias=True))
        canvas.drawString("\"Hello! I'm David.\"", start_x + 320, conv_y + 110, self.font_title, skia.Paint(Color=self.c_text_main, AntiAlias=True))
        
        # Card Ana (Jenny)
        is_ana_speaking = (active_speaker == "en_f")
        ana_rect = skia.Rect(start_x, conv_y + 170, start_x + 1100, conv_y + 260)
        ana_bg = skia.Color(25, 60, 45) if is_ana_speaking else skia.Color(24, 34, 52)
        canvas.drawRRect(skia.RRect.MakeRectXY(ana_rect, 14, 14), skia.Paint(Color=ana_bg, AntiAlias=True))
        if is_ana_speaking:
            canvas.drawRRect(skia.RRect.MakeRectXY(ana_rect, 14, 14), skia.Paint(Color=self.c_complement, Style=skia.Paint.kStroke_Style, StrokeWidth=3, AntiAlias=True))
            
        canvas.drawString("Ana (Voz Femenina):", start_x + 35, conv_y + 220, self.font_body, skia.Paint(Color=self.c_complement, AntiAlias=True))
        canvas.drawString("\"Hello David! Nice to meet you.\"", start_x + 320, conv_y + 220, self.font_title, skia.Paint(Color=self.c_text_main, AntiAlias=True))

    def draw_scene_5_practice(self, canvas, progress, timer_val, is_silence_gap):
        top_y = self.by + 140
        start_x = self.bx + 80
        
        VectorIcons.draw_target(canvas, start_x + 25, top_y - 12, 18, self.c_gold)
        canvas.drawString("¡Ahora es tu turno de hablar!", start_x + 60, top_y, self.font_title, skia.Paint(Color=self.c_gold, AntiAlias=True))
        canvas.drawString("Di la frase completa frente a tu pantalla con tu nombre real:", start_x, top_y + 45, self.font_sub, skia.Paint(Color=self.c_text_muted, AntiAlias=True))
        
        # Target Complete Challenge Card
        card_y = top_y + 80
        card_rect = skia.Rect(start_x, card_y, start_x + 1100, card_y + 180)
        canvas.drawRRect(skia.RRect.MakeRectXY(card_rect, 20, 20), skia.Paint(Color=skia.Color(30, 48, 80), AntiAlias=True))
        
        phrase = "\"Hello, I'm [Tu Nombre]. Nice to meet you!\""
        canvas.drawString(phrase, start_x + 50, card_y + 105, self.font_title, skia.Paint(Color=self.c_text_main, AntiAlias=True))
        
        # Countdown Timer Bar (With Visual Countdown Numbers during silence)
        bar_y = card_y + 210
        bar_w = 1100
        canvas.drawRect(skia.Rect(start_x, bar_y, start_x + bar_w, bar_y + 14), skia.Paint(Color=skia.Color(40, 55, 80), AntiAlias=True))
        
        fill_w = bar_w * min(1.0, max(0.0, timer_val))
        canvas.drawRect(skia.Rect(start_x, bar_y, start_x + fill_w, bar_y + 14), skia.Paint(Color=self.c_complement, AntiAlias=True))
        
        if is_silence_gap:
            # Show big crisp countdown numbers 3... 2... 1...
            cd_val = max(1, 3 - int(timer_val * 3))
            cd_text = str(cd_val)
            VectorIcons.draw_mic(canvas, start_x + bar_w/2 - 60, bar_y + 60, 20, self.c_complement)
            canvas.drawString(f"Habla ahora... {cd_text}", start_x + bar_w/2 - 20, bar_y + 70, self.font_sub, skia.Paint(Color=self.c_complement, AntiAlias=True))
            
        next_y = bar_y + 100
        next_rect = skia.Rect(start_x, next_y, start_x + 1100, next_y + 180)
        canvas.drawRRect(skia.RRect.MakeRectXY(next_rect, 18, 18), skia.Paint(Color=skia.Color(20, 32, 50), AntiAlias=True))
        
        VectorIcons.draw_check(canvas, start_x + 60, next_y + 45, 14, self.c_complement)
        canvas.drawString("¡Paso 1 Completado con Éxito!", start_x + 90, next_y + 52, self.font_title, skia.Paint(Color=self.c_complement, AntiAlias=True))
        
        canvas.drawString("1. Realiza el Quiz interactivo de 2 minutos (justo abajo del reproductor).", start_x + 60, next_y + 105, self.font_body, skia.Paint(Color=self.c_text_muted, AntiAlias=True))
        canvas.drawString("2. Presiona el botón de micrófono en la plataforma para evaluar tu voz con IA.", start_x + 60, next_y + 145, self.font_body, skia.Paint(Color=self.c_subject, AntiAlias=True))

    def _draw_sentence_parts(self, canvas, x, y, parts):
        cur_x = x
        for text, color in parts:
            p = skia.Paint(Color=color, AntiAlias=True)
            canvas.drawString(text, cur_x, y, self.font_title, p)
            glyphs = self.font_title.textToGlyphs(text)
            widths = self.font_title.getWidths(glyphs)
            cur_x += sum(widths)

    def _draw_multiline_text(self, canvas, text, x, y, max_w, line_h, font, paint):
        words = text.split(" ")
        lines, cur_line = [], []
        for word in words:
            test_line = " ".join(cur_line + [word])
            glyphs = font.textToGlyphs(test_line)
            w = sum(font.getWidths(glyphs))
            if w > max_w and cur_line:
                lines.append(" ".join(cur_line))
                cur_line = [word]
            else:
                cur_line.append(word)
        if cur_line:
            lines.append(" ".join(cur_line))
            
        for i, l in enumerate(lines):
            canvas.drawString(l, x, y + i * line_h, font, paint)
