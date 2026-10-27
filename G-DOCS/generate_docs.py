import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def create_document():
    doc = docx.Document()

    # Configurar márgenes estándar de 1 pulgada (2.54 cm)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Colores institucionales TecnoGan
    PRIMARY_COLOR = RGBColor(25, 110, 108)      # Teal TecnoGan (#196e6c)
    DARK_COLOR = RGBColor(22, 28, 45)           # Azul Noche (#161c2d)
    MUTED_COLOR = RGBColor(89, 92, 115)         # Gris Grafito (#595c73)
    GOLD_COLOR = RGBColor(196, 113, 13)         # Dorado Zootécnico (#c4710d)

    # Función auxiliar para formatear párrafos
    def add_styled_heading(text, level, color=PRIMARY_COLOR, space_before=14, space_after=6):
        h = doc.add_heading(text, level=level)
        h.paragraph_format.space_before = Pt(space_before)
        h.paragraph_format.space_after = Pt(space_after)
        h.paragraph_format.keep_with_next = True
        run = h.runs[0]
        run.font.color.rgb = color
        run.font.name = 'Calibri'
        return h

    def add_p(text, space_after=6, line_spacing=1.15, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = line_spacing
        if bold_prefix:
            b_run = p.add_run(bold_prefix)
            b_run.bold = True
            b_run.font.name = 'Calibri'
            b_run.font.size = Pt(11)
            b_run.font.color.rgb = DARK_COLOR
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(11)
        run.font.color.rgb = DARK_COLOR
        return p

    def add_bullet(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            b_run = p.add_run(bold_prefix)
            b_run.bold = True
            b_run.font.name = 'Calibri'
            b_run.font.size = Pt(10.5)
            b_run.font.color.rgb = DARK_COLOR
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(10.5)
        run.font.color.rgb = DARK_COLOR
        return p

    def add_callout(text, title="Aspecto Destacado"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.5)
        
        # Color de fondo tenue y borde izquierdo
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F4F8F8"/>')
        tcPr.append(shd)
        
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>'
            f'<w:left w:val="single" w:sz="24" w:space="0" w:color="196E6C"/>'
            f'<w:top w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'<w:bottom w:val="none"/>'
            f'</w:tcBorders>'
        )
        tcPr.append(borders)

        cp = cell.paragraphs[0]
        cp.paragraph_format.space_after = Pt(4)
        cp.paragraph_format.space_before = Pt(4)
        tr = cp.add_run(f"★  {title}\n")
        tr.bold = True
        tr.font.name = 'Calibri'
        tr.font.size = Pt(10.5)
        tr.font.color.rgb = PRIMARY_COLOR

        br = cp.add_run(text)
        br.font.name = 'Calibri'
        br.font.size = Pt(10)
        br.font.color.rgb = DARK_COLOR
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # -------------------------------------------------------------
    # PORTADA Y ENCABEZADO EJECUTIVO
    # -------------------------------------------------------------
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(24)
    title_p.paragraph_format.space_after = Pt(4)
    r_sub = title_p.add_run("TECNOGAN AGROTECH • ACADEMIA Y SIMULACIÓN GANADERA\n")
    r_sub.font.name = 'Calibri'
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = PRIMARY_COLOR
    r_sub.bold = True

    r_title = title_p.add_run("TecnoGan Academy (DataGan Course)\nDocumento Maestro de Arquitectura y Valor Estratégico")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(22)
    r_title.font.color.rgb = DARK_COLOR
    r_title.bold = True

    meta_p = doc.add_paragraph()
    meta_p.paragraph_format.space_after = Pt(20)
    meta_run = meta_p.add_run("Versión de Producción 2.0 • Octubre 2026 • Plataforma Oficial de Acreditación Zootécnica")
    meta_run.font.name = 'Calibri'
    meta_run.font.size = Pt(10)
    meta_run.font.color.rgb = MUTED_COLOR

    add_callout(
        "Este documento recopila la especificación integral de TecnoGan Academy, articulando tanto la infraestructura técnica de software sobre la que opera el ecosistema como el fundamento comercial y social que respalda su adopción en empresas ganaderas, gremios y profesionales del campo.",
        title="Síntesis del Documento"
    )

    # -------------------------------------------------------------
    # PARTE 1: MEMORIA TÉCNICA
    # -------------------------------------------------------------
    add_styled_heading("1. Memoria Técnica del Sistema", level=1, color=PRIMARY_COLOR, space_before=20)

    add_p(
        "TecnoGan Academy es una plataforma web progresiva de alto rendimiento concebida para brindar una experiencia de aprendizaje interactiva, fluida y resiliente. Su ingeniería combina el renderizado híbrido de última generación, almacenamiento distribuido de contenidos multimedia y sincronización reactiva en tiempo real para telemetría, evaluaciones y diplomas."
    )

    add_styled_heading("Arquitectura de Software y Capas del Sistema", level=2, color=DARK_COLOR)
    add_p("El sistema se encuentra desacoplado en tres capas especializadas:")
    add_bullet("Next.js 16 con App Router y Turbopack como núcleo de renderizado, empaquetado y enrutamiento en el cliente. Interfaz construida con React 19 y Tailwind CSS para diseño adaptativo a dispositivos móviles, tablets y estaciones de trabajo.", bold_prefix="Capa de Presentación e Interacción: ")
    add_bullet("Firebase Realtime Database (RTDB) gestiona la persistencia de cursos, módulos, lecciones, evaluaciones, recursos descargables, notas al segundo, preguntas del foro y certificados oficiales. Las reglas de base de datos aseguran integridad y aislamiento.", bold_prefix="Capa de Datos en Tiempo Real: ")
    add_bullet("Worker especializado sobre Cloudflare R2 con enlace directo de alta velocidad para streaming de lecciones en video (MP4/WebM), portadas de cursos en alta definición y documentos adjuntos (Word, Excel, PDF).", bold_prefix="Capa de Almacenamiento Multimedia: ")

    add_styled_heading("Módulos Funcionales y Rutas de la Aplicación", level=2, color=DARK_COLOR)
    add_bullet("Página de inicio con vitrina académica de Cursos Disponibles, barras individuales de progreso, accesos modulares a cada fase y enlace a certificado.", bold_prefix="Portal Principal (/): ")
    add_bullet("Reproductor de lección con control de calidad, puntos de verificación en video (Checkpoints), evaluaciones obligatorias de módulo, bloqueo secuencial configurable, botón desplegable de recursos y Pop Quizes, toma de notas con timecode y foro interactivo de dudas.", bold_prefix="Aula Virtual (/course): ")
    add_bullet("Simulador de reconocimiento visual y juicio zootécnico frente a situaciones clínicas, reproductivas y alimentarias, filtrado dinámicamente por curso.", bold_prefix="Reflejo Operativo - Fase 2 (/scenarios): ")
    add_bullet("Réplica interactiva del software de gestión DataGan 360, permitiendo ejecutar misiones de auditoría, balance de dietas y pesajes en una finca simulada.", bold_prefix="Sandbox Finca Ficticia - Fase 3 (/sandbox): ")
    add_bullet("Generador de diplomas zootécnicos verificados, cálculo de calificación media, horas estimadas de estudio, competencias certificadas y funciones de descarga e impresión.", bold_prefix="Acreditación Oficial (/certificate): ")
    add_bullet("Consola integral para administradores que permite crear cursos desde cero, cargar portadas a R2, reordenar secciones y lecciones por arrastre (Drag & Drop), gestionar recursos descargables y pop quizes, y regular la visibilidad de fases.", bold_prefix="Admin Studio (/admin): ")
    add_bullet("Módulos para registrar métricas agronómicas (Glosario de 73 métricas), diseñar misiones de sandbox y supervisar telemetría de estudiantes.", bold_prefix="Herramientas Avanzadas (/admin/metrics, /missions, /scenarios, /analytics): ")

    add_styled_heading("Políticas de Datos y Progresión Académica", level=2, color=DARK_COLOR)
    add_p(
        "Para garantizar la asimilación del conocimiento y evitar saltos indebidos de contenido, el motor del aula virtual evalúa dinámicamente el estado de avance según tres políticas configurables por el administrador:"
    )
    add_bullet("Cada lección exige haber aprobado la evaluación o visualización de la lección previa antes de desbloquear la siguiente.", bold_prefix="1. Modo Secuencial por Lección (lesson_strict): ")
    add_bullet("Permite libertad dentro de un mismo módulo, pero exige completar la totalidad de lecciones de dicho módulo para habilitar el siguiente bloque temático.", bold_prefix="2. Modo Secuencial por Módulo (module_strict): ")
    add_bullet("Navegación abierta, recomendada para cursos de consulta rápida o material de referencia zootécnica.", bold_prefix="3. Modo Libre (free): ")

    add_styled_heading("Procedimiento de Compilación y Despliegue", level=2, color=DARK_COLOR)
    add_p(
        "La plataforma se exporta como una compilación estática de alto rendimiento (Static HTML/JS Bundle) alojada en Firebase Hosting, garantizando tiempos de carga inferiores a 800 milisegundos y disponibilidad ininterrumpida global."
    )
    add_bullet("Verificación de contratos y consistencia de tipos: 'npx tsc --noEmit'", bold_prefix="Paso 1: ")
    add_bullet("Generación del paquete optimizado de producción: 'npm run build'", bold_prefix="Paso 2: ")
    add_bullet("Publicación con control de caché: 'firebase deploy --only hosting --project datagan-course'", bold_prefix="Paso 3: ")

    # -------------------------------------------------------------
    # PARTE 2: PROPUESTA Y VALOR ESTRATÉGICO
    # -------------------------------------------------------------
    add_styled_heading("2. Propuesta y Valor Estratégico", level=1, color=PRIMARY_COLOR, space_before=20)

    add_styled_heading("El Reto en la Ganadería Moderna", level=2, color=DARK_COLOR)
    add_p(
        "Tradicionalmente, la administración pecuaria se ha sustentado en la intuición y registros fragmentados en libretas de campo. Este enfoque ocasiona pérdidas silenciosas en ganancia diaria de peso, retrasos en intervalos entre partos y sobrecostos por desperdicio de insumos nutricionales. La falta de capacitación práctica en herramientas de precisión impide que el productor y sus operarios transformen los datos brutos en decisiones rentables."
    )

    add_styled_heading("Nuestra Respuesta al Sector", level=2, color=DARK_COLOR)
    add_p(
        "TecnoGan Academy democratiza la ganadería de precisión eliminando la barrera entre la teoría académica y la ejecución en el corral. A través de un método de inmersión progresiva, los participantes no solo observan clases en video dictadas por expertos, sino que se enfrentan a decisiones críticas en simuladores y operan software de hato en tiempo real sin temor a equivocarse o comprometer animales reales."
    )

    add_styled_heading("A Quién Está Dirigido", level=2, color=DARK_COLOR)
    add_p("El ecosistema formativo está diseñado para generar impacto en toda la cadena de valor pecuaria:")
    add_bullet("Que buscan elevar el margen de rentabilidad de sus predios mediante decisiones basadas en números y no en conjeturas.", bold_prefix="Productores y Propietarios de Hato: ")
    add_bullet("Interesados en dominar las 73 métricas zootécnicas clave y presentar reportes de impacto a gerencia.", bold_prefix="Médicos Veterinarios y Zootecnistas: ")
    add_bullet("Responsables de digitalizar inventarios, programar palpaciones y controlar la suplementación en campo.", bold_prefix="Administradores de Finca y Mayordomos: ")
    add_bullet("Que requieren experiencia práctica demostrable antes de ingresar al mercado laboral agroempresarial.", bold_prefix="Estudiantes de Carreras Agropecuarias: ")

    add_styled_heading("Factores Distintivos Frente a la Capacitación Tradicional", level=2, color=DARK_COLOR)
    add_bullet("A diferencia de cursos pasivos donde el alumno solo mira conferencias, aquí cada módulo incluye simuladores de juicio clínico y misiones operativas.", bold_prefix="Metodología por Fases Prácticas: ")
    add_bullet("Cada clase cuenta con guías de campo en Word y Excel, cuestionarios de verificación al instante y métricas calculadas en vivo.", bold_prefix="Recursos Aplicables desde el Primer Día: ")
    add_bullet("Los certificados no se entregan por simple asistencia; exigen demostrar al menos el 80% de rendimiento verificable en las evaluaciones integradas.", bold_prefix="Acreditación con Rigor Técnico: ")
    add_bullet("La interfaz es intuitiva y limpia, diseñada para profesionales de campo que necesitan acceder con fluidez desde cualquier lugar.", bold_prefix="Cero Jerga Inútil y Experiencia Directa: ")

    add_styled_heading("La Experiencia de Aprendizaje en Cuatro Etapas", level=2, color=DARK_COLOR)
    add_bullet("El estudiante asimila los conceptos zootécnicos fundamentales mediante videoclases de alta resolución, respondiendo puntos de comprobación para fijar conceptos.", bold_prefix="Etapa 1 — Adquisición Conceptual (Aula Virtual): ")
    add_bullet("El usuario analiza imágenes y situaciones de campo simuladas para ejercitar su velocidad de diagnóstico frente a anomalías en condición corporal o manejo.", bold_prefix="Etapa 2 — Agudeza Diagnóstica (Reflejo Operativo): ")
    add_bullet("En un entorno virtual que clona el programa DataGan 360, el alumno ingresa registros, analiza curvas de lactancia y resuelve desafíos reales de una finca ficticia.", bold_prefix="Etapa 3 — Simulación Práctica (Sandbox Finca): ")
    add_bullet("Al culminar con más del 80% de aciertos, el sistema emite el diploma oficial con firma del Equipo Directivo de TecnoGan, detallando las competencias alcanzadas y las horas acreditadas.", bold_prefix="Etapa 4 — Acreditación y Respaldo Oficial: ")

    add_styled_heading("Beneficios Tangibles para la Empresa Ganadera", level=2, color=DARK_COLOR)
    add_bullet("Mayor ganancia diaria de peso (GDP) y reducción de días abiertos mediante monitoreo exacto de indicadores zootécnicos.", bold_prefix="Aumento de Productividad: ")
    add_bullet("Al entrenar en el Sandbox, el personal aprende a interpretar costos de ración antes de aplicar cambios en los comederos.", bold_prefix="Ahorro en Alimentos y Medicamentos: ")
    add_bullet("Equipos alineados con un mismo vocabulario técnico y criterios homogéneos para evaluar la condición del ganado.", bold_prefix="Estandarización del Equipo de Trabajo: ")
    add_bullet("Diplomas respaldados por TecnoGan que certifican la aptitud del personal en buenas prácticas de ganadería inteligente.", bold_prefix="Prestigio y Credibilidad Comercial: ")

    add_styled_heading("Seguridad, Autenticidad y Confianza Institucional", level=2, color=DARK_COLOR)
    add_p(
        "La integridad de los registros académicos es una prioridad absoluta. Los diplomas emitidos cuentan con un identificador único verificable en tiempo real, respaldado por la base de datos institucional de TecnoGan. Esto previene la falsificación de certificados y asegura a asociaciones, cooperativas y empleadores que cada acreditación corresponde a un proceso de aprendizaje rigurosamente completado y validado."
    )

    output_path = r"D:\My Apps\Datagan Course\G-DOCS\TecnoGan-DataGan-Course-Documentacion.docx"
    doc.save(output_path)
    print(f"Documento guardado exitosamente en: {output_path}")

if __name__ == '__main__':
    create_document()
