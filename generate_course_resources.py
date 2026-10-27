import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

OUTPUT_DIR = r"D:\My Apps\Datagan Course\frontend\public\resources"
os.makedirs(OUTPUT_DIR, exist_ok=True)

header_fill = PatternFill(start_color="2A2B3F", end_color="2A2B3F", fill_type="solid")
header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
accent_fill = PatternFill(start_color="6D28D2", end_color="6D28D2", fill_type="solid")
accent_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
sub_fill = PatternFill(start_color="EAE8F8", end_color="EAE8F8", fill_type="solid")
sub_font = Font(name="Calibri", size=10, bold=True, color="2A2B3F")
thin_border = Border(
    left=Side(style='thin', color='D1D2E0'),
    right=Side(style='thin', color='D1D2E0'),
    top=Side(style='thin', color='D1D2E0'),
    bottom=Side(style='thin', color='D1D2E0')
)

def style_table(ws, min_row, max_row, min_col, max_col):
    for row in range(min_row, max_row + 1):
        for col in range(min_col, max_col + 1):
            cell = ws.cell(row=row, column=col)
            cell.border = thin_border
            if row == min_row:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            else:
                if row % 2 == 0:
                    cell.fill = PatternFill(start_color="F8F9FC", end_color="F8F9FC", fill_type="solid")
                cell.alignment = Alignment(vertical="center")

def autofit_columns(ws):
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

# ==============================================================================
# 1. PLANTILLA PASO 1: INFRAESTRUCTURA Y ESTRUCTURA DE PREDIO
# ==============================================================================
wb1 = openpyxl.Workbook()

# Sheet 1: Fincas
ws_fincas = wb1.active
ws_fincas.title = "1_Fincas_y_Predios"
ws_fincas.append(["ID_Finca", "Nombre_Predio", "Departamento", "Municipio", "Area_Total_Ha", "Proposito_Productivo", "Propietario_Principal"])
ws_fincas.append(["FINC-01", "Hacienda La Esperanza", "Córdoba", "Montería", 150.5, "Doble Propósito (Carne y Leche)", "Ganadería Ivan Pérez"])
ws_fincas.append(["FINC-02", "Finca El Porvenir", "Antioquia", "Yarumal", 85.0, "Lechería Especializada", "Ganadería Ivan Pérez"])
style_table(ws_fincas, 1, 3, 1, 7)
autofit_columns(ws_fincas)

# Sheet 2: Potreros
ws_pot = wb1.create_sheet("2_Potreros")
ws_pot.append(["ID_Potrero", "Nombre_Potrero", "ID_Finca", "Area_Ha", "Especie_Forrajera", "Topografia", "Fuente_Agua", "Capacidad_Estimada_UGM"])
potreros_sample = [
    ["POT-01", "Potrero El Mango", "FINC-01", 10.0, "Brachiaria decumbens", "Plano", "Acueducto / Bebedero Móvil", 12],
    ["POT-02", "Potrero Las Palmas", "FINC-01", 12.5, "Megathyrsus maximus (Mombaza)", "Ondulado Suave", "Quebrada Natural", 16],
    ["POT-03", "Potrero La Ceiba", "FINC-01", 8.0, "Brachiaria brizantha (Toledo)", "Plano", "Bebedero de Concreto", 10],
    ["POT-04", "Potrero El Cañafistolo", "FINC-01", 15.0, "Estrella africana (Cynodon nlemfuensis)", "Plano", "Canal de Riego", 20]
]
for p in potreros_sample:
    ws_pot.append(p)
style_table(ws_pot, 1, len(potreros_sample) + 1, 1, 8)
autofit_columns(ws_pot)

# Sheet 3: Lotes
ws_lotes = wb1.create_sheet("3_Lotes_de_Manejo")
ws_lotes.append(["ID_Lote", "Nombre_Lote", "ID_Finca", "Categoria_Manejo", "ID_Propietario", "Potrero_Inicial"])
lotes_sample = [
    ["LOT-01", "Vacas Ordeño Alta Producción", "FINC-01", "Lechería", "PROP-01", "POT-01"],
    ["LOT-02", "Novillas de Vientre y Reemplazo", "FINC-01", "Cría y Levante", "PROP-01", "POT-02"],
    ["LOT-03", "Novillos Ceba Comercial", "FINC-01", "Ceba", "PROP-01", "POT-03"],
    ["LOT-04", "Toros Reproductores", "FINC-01", "Reproductores", "PROP-01", "POT-04"]
]
for l in lotes_sample:
    ws_lotes.append(l)
style_table(ws_lotes, 1, len(lotes_sample) + 1, 1, 6)
autofit_columns(ws_lotes)

# Sheet 4: Terceros
ws_ter = wb1.create_sheet("4_Terceros_y_Propietarios")
ws_ter.append(["ID_Tercero", "Tipo_Doc", "Documento_Numero", "Nombre_Completo_o_Razon_Social", "Telefono", "Correo", "Rol_Principal"])
terceros_sample = [
    ["PROP-01", "NIT", "901234567-8", "Ganadería Ivan Pérez S.A.S.", "+57 300 000 0000", "gerencia@ivanperez.tech", "Propietario"],
    ["TERC-02", "C.C.", "100200300", "Iván Samuel Pérez Torrenegra", "+57 300 111 2233", "ivan@ipt.com", "Administrador / Propietario"],
    ["PROV-01", "NIT", "890987654-1", "AgroInsumos del Sinú", "+57 310 999 8877", "ventas@insumos.com", "Proveedor Insumos"],
    ["CLI-01", "NIT", "860001234-5", "Lácteos de la Sabana", "+57 320 555 4433", "acopio@lacteos.com", "Cliente Acopio Leche"]
]
for t in terceros_sample:
    ws_ter.append(t)
style_table(ws_ter, 1, len(terceros_sample) + 1, 1, 7)
autofit_columns(ws_ter)

# Sheet 5: Instrucciones
ws_inst1 = wb1.create_sheet("0_Instrucciones")
ws_inst1.append(["PASO 1: CARGA MASIVA DE INFRAESTRUCTURA - GUÍA OFICIAL DATAGAN 360"])
ws_inst1.append(["1. Esta plantilla define el armazón geográfico y administrativo de tu predio."])
ws_inst1.append(["2. IMPORTANTE: Primero se debe subir esta plantilla de Paso 1 antes de importar el inventario animal."])
ws_inst1.append(["3. Para crear Lotes, es requisito que el 'ID_Propietario' exista previamente en la pestaña de Terceros."])
ws_inst1.append(["4. No alteres los nombres de los encabezados de las columnas para evitar errores de mapeo en el sistema."])
ws_inst1.append(["5. Guarda este archivo en formato .xlsx antes de arrastrarlo a la plataforma en /configuraciones/carga-masiva."])
ws_inst1.cell(1, 1).font = Font(name="Calibri", size=13, bold=True, color="6D28D2")
for r in range(2, 7):
    ws_inst1.cell(r, 1).font = Font(name="Calibri", size=10, italic=True)
autofit_columns(ws_inst1)

path_p1 = os.path.join(OUTPUT_DIR, "Plantilla_Paso1_Infraestructura_DataGan.xlsx")
wb1.save(path_p1)
print(f"Creado: {path_p1}")

# ==============================================================================
# 2. PLANTILLA PASO 2: INVENTARIO INDIVIDUAL DE BOVINOS
# ==============================================================================
wb2 = openpyxl.Workbook()
ws_bov = wb2.active
ws_bov.title = "Inventario_Bovino"
ws_bov.append([
    "Chapeta_Visual", "Microchip_RFID", "Nombre_Bovino", "Raza", "Sexo", 
    "Fecha_Nacimiento", "Categoria", "Peso_Actual_Kg", "ID_Padre", "ID_Madre", 
    "ID_Lote", "ID_Potrero_Actual", "Estado_Productivo", "Precio_Referencia_COP"
])
animales_sample = [
    ["TORO-01", "982000100200301", "Campeón Brahman 01", "Brahman Gris", "Macho", "2021-03-15", "Toro Reproductor", 765.0, "TORO-BASE-A", "VACA-BASE-B", "LOT-04", "POT-04", "Activo", 9500000],
    ["VACA-01", "982000100200302", "Mariposa Girolando", "Girolando 5/8", "Hembra", "2022-05-10", "Vaca en Ordeño", 485.0, "TORO-GYR-09", "VACA-HOL-12", "LOT-01", "POT-01", "Lactancia (Activa)", 5800000],
    ["VACA-02", "982000100200303", "Esmeralda", "Guzerá", "Hembra", "2022-08-22", "Vaca Horra / Seca", 510.0, "TORO-GUZ-01", "VACA-GUZ-04", "LOT-02", "POT-02", "Preñada (Secado)", 6200000],
    ["CRIA-01", "982000123456789", "Princesa 01", "Girolando", "Hembra", "2026-10-14", "Ternera Lactante", 38.0, "TORO-01", "VACA-01", "LOT-01", "POT-01", "Crecimiento", 1800000],
    ["NOV-101", "982000100200305", "Novillo Ceba 101", "Brahman Rojo", "Macho", "2024-01-20", "Novillo Levante", 380.0, "TORO-01", "VACA-02", "LOT-03", "POT-03", "Ceba Intensiva", 3420000]
]
for a in animales_sample:
    ws_bov.append(a)
style_table(ws_bov, 1, len(animales_sample) + 1, 1, 14)
autofit_columns(ws_bov)

ws_ref = wb2.create_sheet("Tablas_de_Referencia")
ws_ref.append(["Categorías Permitidas", "Razas Sugeridas", "Estados Productivos"])
refs_sample = [
    ["Vaca en Ordeño", "Brahman Gris / Rojo", "Lactancia (Activa)"],
    ["Vaca Horra / Seca", "Girolando (3/8, 5/8)", "Preñada (Secado)"],
    ["Novilla de Vientre", "Gyr Lechero", "Vacía / Abierta"],
    ["Novillo Levante", "Guzerá", "Ceba Intensiva"],
    ["Novillo Ceba", "Simmental / Fleckvieh", "Crecimiento"],
    ["Toro Reproductor", "F1 Holstein x Cebú", "En Servicio"],
    ["Ternero(a) Lactante", "Brangus / Braford", "Destetado"]
]
for r in refs_sample:
    ws_ref.append(r)
style_table(ws_ref, 1, len(refs_sample) + 1, 1, 3)
autofit_columns(ws_ref)

path_p2 = os.path.join(OUTPUT_DIR, "Plantilla_Paso2_Inventario_Bovinos.xlsx")
wb2.save(path_p2)
print(f"Creado: {path_p2}")

# ==============================================================================
# 3. CALCULADORA DE AFORO FORRAJERO Y CAPACIDAD DE CARGA UGM
# ==============================================================================
wb3 = openpyxl.Workbook()
ws_aforo = wb3.active
ws_aforo.title = "Calculadora_Aforo_Pradera"

ws_aforo.append(["SISTEMA DE AFORO FORRAJERO DE PRADERAS POR MÉTODO DEL METRO CUADRADO (1m x 1m)"])
ws_aforo.append(["Predio:", "Hacienda La Esperanza", "Potrero Evaluado:", "POT-01 (El Mango)", "Fecha Muestreo:", "2026-10-14"])
ws_aforo.append([])

ws_aforo.append(["Muestra No.", "Ubicación Muestreo", "Peso Verde en Marco 1m² (Gramos)", "Rendimiento Verde (Kg / m²)", "Condición del Pasto"])
muestras = [
    [1, "Zona Alta (Suelo Bien Drenado)", 950, "=C5/1000", "Óptimo rebrote"],
    [2, "Zona Media", 880, "=C6/1000", "Denso"],
    [3, "Zona Próxima a Bebedero", 650, "=C7/1000", "Pisoteo ligero"],
    [4, "Zona Sombreada Silvopastoril", 1100, "=C8/1000", "Alta biomasa"],
    [5, "Zona Central del Potrero", 920, "=C9/1000", "Excelente cobertura"],
    [6, "Zona de Pendiente", 740, "=C10/1000", "Media"],
    [7, "Zona Baja", 1050, "=C11/1000", "Humedad adecuada"],
    [8, "Franja Perimetral", 810, "=C12/1000", "Uniforme"],
    [9, "Zona Central 2", 900, "=C13/1000", "Óptimo"],
    [10, "Zona de Entrada", 600, "=C14/1000", "Desgaste de tránsito"]
]
for m in muestras:
    ws_aforo.append(m)
style_table(ws_aforo, 4, 14, 1, 5)

ws_aforo.append([])
ws_aforo.append(["PARÁMETRO CALCULADO", "VALOR", "UNIDAD", "INTERPRETACIÓN ZOOTÉCNICA"])
ws_aforo.append(["Promedio Ponderado Forraje Verde (FV)", "=PROMEDIO(D5:D14)", "Kg FV / m²", "Producción media por cada metro cuadrado cortado a ras"])
ws_aforo.append(["Producción Bruta por Hectárea (10.000 m²)", "=B17*10000", "Kg FV / Ha", "Oferta verde total sin descontar pisoteo ni rechazo"])
ws_aforo.append(["Factor de Pérdida por Pisoteo y Heces", 0.25, "% Pérdida", "25% estándar en pastoreo rotacional guiado"])
ws_aforo.append(["Forraje Verde Aprovechable Neto", "=B18*(1-B19)", "Kg FV Aprovechable / Ha", "Biomasa realmente consumible por los animales"])
ws_aforo.append(["Porcentaje Estimado de Materia Seca (MS)", 0.22, "% Materia Seca", "22% típico en gramíneas tropicales maduras"])
ws_aforo.append(["Producción Neta de Materia Seca", "=B20*B21", "Kg MS / Ha", "Energía y nutrientes netos disponibles para el hato"])
style_table(ws_aforo, 16, 22, 1, 4)

ws_aforo.append([])
ws_aforo.append(["PLANIFICACIÓN DE CARGA ANIMAL Y ROTACIÓN SEGÚN LEYES DE VOISIN"])
ws_aforo.append(["Área Total del Potrero", 10.0, "Hectáreas (Ha)", "Superficie útil medida con SIG"])
ws_aforo.append(["Oferta Neta Total en el Potrero", "=B20*B25", "Kg Forraje Verde Neto", "Total de alimento disponible en el lote"])
ws_aforo.append(["Consumo Diario por 1 UGM (Bovino 450 Kg)", 45.0, "Kg FV / día", "Equivalente al 10% del peso vivo diario"])
ws_aforo.append(["Días de Ocupación Deseados", 2, "Días", "Máximo 2 a 3 días para evitar que el animal coma el rebrote"])
ws_aforo.append(["Capacidad de Carga Máxima Instantánea", "=INT(B26/(B27*B28))", "Bovinos Adultos (UGM)", "Número óptimo de animales a introducir sin degradar pasto"])
ws_aforo.append(["Carga Animal por Hectárea", "=B29/B25", "UGM / Ha", "Métrica clave registrada en DataGan 360"])
ws_aforo.append(["Periodo de Descanso Requerido", 35, "Días de Reposo", "Días para alcanzar el punto óptimo de reposo (POR)"])
ws_aforo.append(["Número Mínimo de Potreros para el Ciclo", "=(B31/B28)+1", "Potreros Requeridos", "Fórmula de Voisin: (Descanso / Ocupación) + 1"])
style_table(ws_aforo, 24, 32, 1, 4)
autofit_columns(ws_aforo)

path_p3 = os.path.join(OUTPUT_DIR, "Calculadora_Aforo_y_Capacidad_UGM.xlsx")
wb3.save(path_p3)
print(f"Creado: {path_p3}")

# ==============================================================================
# 4. FORMATO DE CONTROL LECHERO Y EVALUACIÓN DE EFICIENCIA
# ==============================================================================
wb4 = openpyxl.Workbook()
ws_leche = wb4.active
ws_leche.title = "Control_Lechero_Diario"

ws_leche.append(["DATAGAN 360 - PLANILLA OFICIAL DE CONTROL LECHERO INDIVIDUAL Y POR HATO"])
ws_leche.append(["Fecha:", "2026-10-14", "Lote en Ordeño:", "LOT-01 (Alta Producción)", "Potrero Asignado:", "POT-01"])
ws_leche.append([])

ws_leche.append([
    "Chapeta", "Nombre Vaca", "Días en Leche (DEL)", "Ordeño AM (Litros)", 
    "Ordeño PM (Litros)", "Total Día (Litros)", "% Grasa", "% Proteína", 
    "Calidad CMT (Ubre)", "Observaciones de Manejo"
])
vacas_leche = [
    ["VACA-01", "Mariposa Girolando", 65, 12.5, 9.5, "=D5+E5", 3.85, 3.20, "Negativo (Sana)", "Excelente pico de lactancia"],
    ["VACA-02", "Esperanza F1", 110, 10.0, 7.5, "=D6+E6", 4.10, 3.35, "Negativo (Sana)", "Consumo normal"],
    ["VACA-03", "Paloma", 45, 14.0, 11.0, "=D7+E7", 3.70, 3.15, "Negativo (Sana)", "Alta persistencia"],
    ["VACA-04", "Canela", 180, 8.5, 6.0, "=D8+E8", 4.30, 3.45, "Grado 1 (Monitorear)", "Tratamiento preventivo con sellador"],
    ["VACA-05", "Baviera", 210, 7.0, 5.0, "=D9+E9", 4.40, 3.50, "Negativo (Sana)", "Próxima a programación de secado"],
    ["VACA-06", "Luna Llena", 90, 11.5, 8.5, "=D10+E10", 3.90, 3.25, "Negativo (Sana)", "Inseminada el 01/10/2026"],
    ["VACA-07", "Reina del Valle", 130, 9.5, 7.0, "=D11+E11", 4.05, 3.30, "Negativo (Sana)", "Preñez confirmada por ecografía"]
]
for v in vacas_leche:
    ws_leche.append(v)
style_table(ws_leche, 4, len(vacas_leche) + 4, 1, 10)

ws_leche.append([])
ws_leche.append(["MÉTRICA ZOOTÉCNICA RESUMEN", "VALOR CALCULADO", "BENCHMARK META", "INTERPRETACIÓN"])
ws_leche.append(["Producción Total del Ordeño", "=SUM(F5:F11)", "Tanque Frío", "Suma diaria acumulada para venta o transformación"])
ws_leche.append(["Promedio Litros / Vaca / Día", "=AVERAGE(F5:F11)", "> 15.0 L/vaca (Doble Propósito >8L)", "Métrica nuclear sincronizada en Dashboard DataGan"])
ws_leche.append(["Total Vacas Ordeñadas", "=COUNTA(A5:A11)", "100% Lote Activo", "Consistencia zootécnica"])
ws_leche.append(["Porcentaje Promedio Grasa", "=AVERAGE(G5:G11)", "3.80% - 4.20%", "Bonificación económica de la industria"])
ws_leche.append(["Porcentaje Promedio Proteína", "=AVERAGE(H5:H11)", "3.10% - 3.40%", "Rendimiento quesero y precio al productor"])
style_table(ws_leche, 13, 18, 1, 4)
autofit_columns(ws_leche)

path_p4 = os.path.join(OUTPUT_DIR, "Formato_Control_Lechero_y_Curva_Lactancia.xlsx")
wb4.save(path_p4)
print(f"Creado: {path_p4}")

# ==============================================================================
# 5. GUÍA ZOOTÉCNICA EN WORD: MÉTRICAS MAESTRAS DATAGAN 360
# ==============================================================================
doc1 = docx.Document()
sections = doc1.sections
for s in sections:
    s.top_margin = Inches(1)
    s.bottom_margin = Inches(1)
    s.left_margin = Inches(1)
    s.right_margin = Inches(1)

# Portada
title_p = doc1.add_paragraph()
title_p.paragraph_format.space_before = Pt(40)
title_p.paragraph_format.space_after = Pt(10)
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run_title = title_p.add_run("DATAGAN 360\nMANUAL ZOOTÉCNICO DE MÉTRICAS Y TELEMETRÍA GANADERA")
run_title.font.name = "Calibri"
run_title.font.size = Pt(22)
run_title.font.bold = True
run_title.font.color.rgb = RGBColor(0x6D, 0x28, 0xD2)

sub_p = doc1.add_paragraph()
sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
sub_p.paragraph_format.space_after = Pt(30)
run_sub = sub_p.add_run("Compendio Operativo de Fórmulas, Benchmarks Nacionales y Toma de Decisiones en Campo")
run_sub.font.name = "Calibri"
run_sub.font.size = Pt(13)
run_sub.font.color.rgb = RGBColor(0x59, 0x5C, 0x73)

meta_p = doc1.add_paragraph()
meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
meta_p.paragraph_format.space_after = Pt(40)
run_meta = meta_p.add_run("Autor: Iván Samuel Pérez Torrenegra & Equipo Técnico IPT\nEcosistema Educativo TecnoGan Academy\nFecha de Edición: 2026")
run_meta.font.name = "Calibri"
run_meta.font.size = Pt(10)
run_meta.font.italic = True

doc1.add_page_break()

# Contenido
h1 = doc1.add_heading("1. Fundamentos de la Analítica Cuantitativa en DataGan 360", level=1)
p1 = doc1.add_paragraph(
    "La ganadería moderna de precisión se distancia radicalmente del manejo intuitivo y empírico. "
    "El software DataGan 360 integra la telemetría satelital (SIG), sensores RFID y registros productivos "
    "para transformar cada evento de campo (un pesaje, un parto, un aforo o un ordeño) en indicadores de alta rentabilidad."
)

doc1.add_heading("2. Las Métricas Nucleares del Hato", level=1)

metricas_doc = [
    ("Litros por Vaca / Día (Eficiencia de Ordeño)", 
     "Litros_Vaca_Dia = Produccion_Tanque_Litros / Vacas_En_Ordeño", 
     "Rango Crítico: < 8 L | Promedio Comercial: 9.8 L | Meta Alta Producción: > 18 L", 
     "Mide la productividad neta de la línea de ordeño. En sistemas de trópico bajo con doble propósito, un promedio superior a 9.5 L/vaca/día garantiza solvencia económica en costos fijos."),
    
    ("Ganancia Diaria de Peso (GDP en Ceba y Levante)", 
     "GDP = ((Peso_Final_Kg - Peso_Inicial_Kg) * 1000) / Dias_Transcurridos", 
     "Rango Deficitario: < 350 g/día | Estándar: 450 - 650 g/día | Alto Rendimiento: > 850 g/día", 
     "Determina la velocidad de conversión de forraje en masa muscular y grasa. Permite estimar la fecha exacta en la que un novillo alcanzará el peso de beneficio (450-480 kg), acortando el ciclo de ceba de 36 a 24 meses."),
    
    ("Carga Animal y Unidades Gran Ganado por Hectárea (UGM / Ha)", 
     "UGM_Ha = (Total_Bovinos_Convertidos_A_UGM) / Area_Util_Pastoreo_Ha", 
     "Pastoreo Continuo Extensivo: 0.5 - 0.8 UGM/ha | Rotacional Guiado: 1.5 - 2.5 UGM/ha | Silvopastoril Intensivo: > 3.5 UGM/ha", 
     "1 UGM equivale a un bovino adulto de 450 kg de peso vivo. Este índice evalúa la presión de pastoreo sobre el suelo y previene el sobrepastoreo o subpastoreo."),
    
    ("Tasa de Extracción Zootécnica (% Anual)", 
     "Tasa_Extraccion = (Animales_Vendidos_Sacrificados / Inventario_Promedio_Anual) * 100", 
     "Promedio Tradicional: 12% - 15% | Ganadería Eficiente: 22% - 28%", 
     "Indica qué proporción del capital biológico de la finca se convierte en liquidez anual sin descapitalizar la base reproductiva del hato.")
]

for titulo, formula, benchmark, desc in metricas_doc:
    doc1.add_heading(titulo, level=2)
    p_f = doc1.add_paragraph()
    r_f = p_f.add_run(f"Fórmula: {formula}")
    r_f.font.bold = True
    r_f.font.color.rgb = RGBColor(0x6D, 0x28, 0xD2)
    
    p_b = doc1.add_paragraph()
    r_b = p_b.add_run(f"Benchmarks de Referencia: {benchmark}")
    r_b.font.italic = True
    
    doc1.add_paragraph(desc)

path_doc1 = os.path.join(OUTPUT_DIR, "Guia_Zootecnica_Metricas_DataGan_360.docx")
doc1.save(path_doc1)
print(f"Creado: {path_doc1}")

# ==============================================================================
# 6. PROTOCOLO SANITARIO Y DE MANEJO REPRODUCTIVO (WORD)
# ==============================================================================
doc2 = docx.Document()
for s in doc2.sections:
    s.top_margin = Inches(1)
    s.bottom_margin = Inches(1)
    s.left_margin = Inches(1)
    s.right_margin = Inches(1)

p_tit2 = doc2.add_paragraph()
p_tit2.paragraph_format.space_before = Pt(30)
p_tit2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_t2 = p_tit2.add_run("DATAGAN 360\nPROTOCOLO TÉCNICO DE IATF Y SANIDAD DE UBRE")
r_t2.font.name = "Calibri"
r_t2.font.size = Pt(20)
r_t2.font.bold = True
r_t2.font.color.rgb = RGBColor(0x6D, 0x28, 0xD2)

doc2.add_heading("1. Cronograma Operativo de Sincronización IATF (3 Maniobras)", level=1)
iatf_table = doc2.add_table(rows=1, cols=4)
iatf_table.alignment = WD_TABLE_ALIGNMENT.CENTER
hdr_cells = iatf_table.rows[0].cells
hdr_cells[0].text = "Día y Hora"
hdr_cells[1].text = "Fármaco / Dosis"
hdr_cells[2].text = "Objetivo Fisiológico"
hdr_cells[3].text = "Alerta Crítica en DataGan"

pasos_iatf = [
    ("Día 0 (08:00 AM)", "Dispositivo intravaginal P4 (1.0 - 1.2 g) + 2.0 mg Benzoato de Estradiol", "Simular cuerpo lúteo artificial y provocar atresia del folículo dominante anterior.", "Registrar lote y fecha de inserción en /salud/servicio."),
    ("Día 8 (08:00 AM)", "Retiro de dispositivo P4 + 500 mcg Cloprostenol (PGF2a) + 300 UI eCG + 1.0 mg Cipionato Estradiol", "Lisis del cuerpo lúteo natural, estímulo del crecimiento folicular y programación del pico preovulatorio de LH.", "Verificar que el 100% de hembras conservaron el dispositivo."),
    ("Día 10 (48 - 54h posretiro)", "Inseminación con semen descongelado a 37°C por 40 seg. No se requiere celo visual.", "Depositar semen en el cuerpo del útero coincidiendo con la ovulación sincronizada.", "Ingresar toro/pajilla, técnico inseminador y código de pajilla en la plataforma.")
]

for d, f, obj, alert in pasos_iatf:
    row_cells = iatf_table.add_row().cells
    row_cells[0].text = d
    row_cells[1].text = f
    row_cells[2].text = obj
    row_cells[3].text = alert

doc2.add_heading("2. Protocolo de Diagnóstico y Triaje de Mastitis (Prueba CMT)", level=1)
p_cmt = doc2.add_paragraph(
    "La prueba de California Mastitis Test (CMT) se debe efectuar semanalmente en todas las vacas del lote de ordeño. "
    "El reactivo rompe las membranas de las células somáticas (leucocitos) liberando su ADN, lo que produce una gelificación "
    "proporcional a la severidad de la inflamación mamaria."
)

p_regla = doc2.add_paragraph()
r_regla = p_regla.add_run("REGLA ESTRICTA DE TIEMPOS DE RETIRO:\n")
r_regla.font.bold = True
r_regla.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)
p_regla.add_run(
    "Cualquier animal tratado con antimicrobianos (Ceftiofur, Penicilinas, Oxitetraciclinas) debe ser registrado en "
    "DataGan 360 con sus días de retiro estipulados por el fabricante. La leche de estos cuartos no puede ingresar al tanque "
    "frío ni comercializarse hasta completar el periodo de eliminación metabólica."
)

path_doc2 = os.path.join(OUTPUT_DIR, "Protocolo_Sanitario_y_Manejo_IATF.docx")
doc2.save(path_doc2)
print(f"Creado: {path_doc2}")

print("=== Todos los recursos reales generados con éxito ===")
