# Datagan Course — Plan Curricular Maestro de Temas (topics.md)

Este documento constituye la guía curricular exhaustiva de **Datagan Course**, estructurada a partir del ecosistema tecnológico, zootécnico y financiero de **DataGan 360**. Cada módulo detalla los fundamentos teóricos, fórmulas matemáticas, variables operativas, metodologías de campo y su aplicación directa en la toma de decisiones empresariales ganaderas.

---

## Índice General de Módulos

1. [Módulo 1: Arquitectura Predial, Roles & Gobernanza Administrativa](#módulo-1-arquitectura-predial-roles--gobernanza-administrativa)
2. [Módulo 2: Manejo de Praderas, Capacidad de Carga & Sistemas Silvopastoriles](#módulo-2-manejo-de-praderas-capacidad-de-carga--sistemas-silvopastoriles)
3. [Módulo 3: Dinámica del Inventario Bovino, Lotes & Trazabilidad Individual](#módulo-3-dinámica-del-inventario-bovino-lotes--trazabilidad-individual)
4. [Módulo 4: Fisiología de la Producción de Leche & Curvas de Lactancia](#módulo-4-fisiología-de-la-producción-de-leche--curvas-de-lactancia)
5. [Módulo 5: Evaluación Ponderal, Ganancia Diaria de Peso (GDP) & Ceba](#módulo-5-evaluación-ponderal-ganancia-diaria-de-peso-gdp--ceba)
6. [Módulo 6: Eficiencia Reproductiva, Días Abiertos & Mejoramiento Genético](#módulo-6-eficiencia-reproductiva-días-abiertos--mejoramiento-genético)
7. [Módulo 7: Salud Animal, Protocolos Veterinarios & Trazabilidad Oficial ICA](#módulo-7-salud-animal-protocolos-veterinarios--trazabilidad-oficial-ica)
8. [Módulo 8: Economía Ganadera, Costos Unitarios & Rentabilidad del Hato](#módulo-8-economía-ganadera-costos-unitarios--rentabilidad-del-hato)
9. [Módulo 9: Telemetría IoT, Estrés Calórico (ITH) & Bienestar Animal](#módulo-9-telemetría-iot-estrés-calórico-ith--bienestar-animal)
10. [Módulo 10: Modelado Estadístico, Analítica Predictiva & Benchmarking Sectorial](#módulo-10-modelado-estadístico-analítica-predictiva--benchmarking-sectorial)

---

## Módulo 1: Arquitectura Predial, Roles & Gobernanza Administrativa

### 1.1 Modelado Territorial y Catastral de Fincas
- **Definición y Delimitación Perimetral:** Métodos de delimitación por coordenadas geográficas (WGS84 / EPSG:4326), topografía plana vs. quebrada y cálculo de área útil ganadera frente a áreas de reserva forestal o cuerpos hídricos.
- **Micro-zonificación:** División de predios en bloques productivos, corredores de tránsito, servidumbres y callejones de arreo.
- **Infraestructura Fija:** Ubicación geoespacial de establos, corrales, bretes, básculas, salas de ordeño, tanques de enfriamiento, reservorios de agua y saladeros.

### 1.2 Seguridad Operativa y Modelo de Permisos (RBAC)
- **Matriz de Privilegios:**
  - *Propietario / Gerente General:* Acceso irrestricto a balances financieros, reportería tributaria, modificaciones catastrales y auditoría de inventario.
  - *Administrador de Campo / Mayordomo:* Registro y consulta de movimientos de ganado, pesajes, controles de ordeño y despachos.
  - *Médico Veterinario / Zootecnista:* Módulo clínico, prescripción farmacológica, planes reproductivos e historial patológico.
  - *Operarios y Vaqueros:* Acceso móvil offline limitado a lectura de chapetas, reportes rápidos de novedades (celo, aborto, muerte) y pesajes en brete.
- **Trazabilidad de Auditoría (Audit Log):** Registro inmutable de creaciones, ediciones y bajas de registros para evitar fraude y pérdidas invisibles de ganado.

### 1.3 Gestión de Terceros y Relaciones Comerciales
- **Proveedores de Insumos:** Control de casas comerciales veterinarias, plantas de concentrado, agroquímicos y distribuidoras de biológicos.
- **Compradores y Comercializadores:** Registro de acopiadores de leche cruda, subastas ganaderas, frigoríficos y comisionistas de ganado en pie.
- **Contratos y Condiciones de Pago:** Gestión de plazos comerciales, descuentos por calidad higiénico-sanitaria y retenciones parafiscales (Fondo Nacional del Ganado).

---

## Módulo 2: Manejo de Praderas, Capacidad de Carga & Sistemas Silvopastoriles

### 2.1 Ecosistema de Pasturas y Fisiología Forrajera
- **Especies Forrajeras Tropicales:** Adaptación de gramíneas (géneros *Brachiaria/Urochloa*, *Megathyrsus maximus*, *Cynodon*, *Pennisetum*) según piso térmico, régimen hídrico y fertilidad del suelo.
- **Curva de Crecimiento del Pasto:** Fases de rebrote, punto óptimo de reposo (POR), lignificación de la fibra y pérdida de proteína bruta.
- **Aforo de Pasturas:** Metodología del doble muestreo por metro cuadrado, cálculo de biomasa verde total (BVT), biomasa verde aprovechable (BVA) y porcentaje de materia seca (% MS).

### 2.2 Dinámica del Pastoreo Rotacional Intensivo
- **Leyes Universales del Pastoreo (Principios de Voisin):**
  - Ley del reposo suficiente: tiempo que la planta necesita para reconstituir reservas energéticas en la raíz.
  - Ley de la ocupación mínima: evitar que el animal coseche el rebrote del mismo pasto en una misma rotación.
  - Ley de los rendimientos máximos y del rendimiento regular.
- **Métricas Operativas de Potrero:**
  - *Tiempo Promedio en Potrero (`tiempo_potrero`):* Rangos recomendados (1 a 7 días en rotacional intensivo; >21 días clasificado como riesgo severo de degradación).
  - *Período de Descanso (`rotacion_promedio`):* Cálculo de días entre salida y reingreso (óptimo 21 a 45 días en trópico bajo húmedo).
  - *Índice de Ocupación de Potreros (`indice_ocupacion_potreros`):* Proporción de potreros ocupados simultáneamente en relación con la rotación global.

### 2.3 Capacidad de Carga y Presión de Pastoreo
- **Unidad Gran Ganado (UGM):** Estandarización a animal tipo de 450 kg de peso vivo. Tablas de conversión por edad y sexo (ternero, añojo, novillo, vaca parida, toro reproductor).
- **Carga Animal Física (`carga_animal`):** Cabezas por hectárea (anim/ha). Promedios nacionales colombianos (0.9 anim/ha en ganadería extensiva vs. 2.5 a 3.5 anim/ha en pastoreo tecnificado).
- **Carga Animal en UGM (`carga_animal_ugm`):** Requerimiento diario de materia seca (2.8% a 3.2% del peso vivo) vs. oferta forrajera neta.
- **Riesgo de Sobrepastoreo y Compactación:** Destrucción de la estructura física del suelo, compactación por pezuña, proliferación de malezas invasoras y merma en la velocidad de infiltración de agua.

### 2.4 Sistemas Silvopastoriles Intensivos (SSPi)
- **Estratificación Botánica:** Asociación de gramíneas mejoradas con arbustos forrajeros de alta proteína (*Leucaena leucocephala*, *Trichanthera gigantea*) y árboles de dosel maderables o frutales.
- **Beneficios Bioeconómicos:** Fijación biológica de nitrógeno al suelo, reducción de temperatura ambiental superficial en 3°C a 6°C, aumento del consumo voluntario por confort térmico y captura de carbono.

---

## Módulo 3: Dinámica del Inventario Bovino, Lotes & Trazabilidad Individual

### 3.1 Identificación Individual y Estructura Genealógica
- **Sistemas de Marcación:** Identificación visual tradicional (número a fuego/hierro frío), tatuaje auricular y doble chapeta (caravana visual + microchip RFID / RFID HDX/FDX).
- **Hoja de Vida Individual del Bovino:** Fecha exacta de nacimiento, sexo, raza pura o cruce racial (F1, trihíbrido), color de capa, peso al nacimiento y procedencia (cría propia vs. compra).
- **Genealogía y Consanguinidad:** Determinación del árbol genealógico (padre, madre, abuelos), coeficientes de endogamia (Wright) y selección dirigida para evitar depresión consanguínea.

### 3.2 Conformación y Movilidad de Lotes
- **Estratificación Zootécnica de Lotes:**
  - Lote Terneros lactantes / Cunas (0 a 8 meses).
  - Lote Levante o Recría (8 a 18 meses).
  - Lote Novillas de Vientre (18 a 24 meses / aptas para primer servicio).
  - Lote Vacas Horras / Secas (gestantes en periodo no lactante).
  - Lote Vacas de Ordeño (divididas por nivel de producción: alta, media, baja).
  - Lote Ceba / Engorde Intensivo (novillos terminales con dietas de alta densidad energética).
  - Lote Toros Reproductores.
- **Transferencia y Reasignación (`bovinos/transferencia`):** Registro de cambio de lote y potrero con actualización de requerimientos nutricionales automáticos.

### 3.3 Trazabilidad Oficial y Homologación SINIGAN v6
- **Dispositivo de Identificación Nacional (DIN):** Correspondencia de la numeración nacional regulada por el ICA y FEDEGAN con el identificador interno del software.
- **Planillas de Inventario Oficial:** Cuadre de existencias vivas, bajas por muerte, salidas por venta o sacrificio y expedición de certificados de no movilización sin causa.

---

## Módulo 4: Fisiología de la Producción de Leche & Curvas de Lactancia

### 4.1 Fisiología del Ordeño y Rutina Higiénica
- **Anatomía de la Glándula Mamaria:** Alvéolos mamarios, conductos galactóforos, cisterna de la glándula, cisterna del pezón y esfínter estriado.
- **Neuroendocrinología de la Bajada de Leche:** Rol de la oxitocina, estímulos táctiles y auditivos; antagonismo de la adrenalina en situaciones de estrés o maltrato que bloquean la eyección de leche.
- **Rutina de Ordeño Limpio:** Despunte (detección temprana de mastitis subclínica con fondo negro), presellado desinfectante, secado individual con toalla de papel, colocación de pezoneras sin entrada de aire y sellado de barrera post-ordeño.

### 4.2 Indicadores Críticos de Productividad Lechera
- **Producción Total de Leche (`produccion_leche_total`):** Volumen acumulado del hato en litros o botellas por periodo (sumatoria de turnos mañana y tarde).
- **Vacas en Lactancia (`vacas_lactancia`):** Conteo de hembras produciendo activamente leche frente al total de hembras del hato adulto. Meta de hato tecnificado: >80% de las vacas paridas en ordeño permanente.
- **Rendimiento Promedio por Vaca (`rendimiento_promedio_leche`):**
  $$\text{Rendimiento (L/vaca/día)} = \frac{\text{Producción Total de Leche}}{\text{Vacas-Día Ordeñadas}}$$
  - *Benchmarks FEDEGAN:* Promedio nacional doble propósito: 4.5 L/vaca/día; Top 10% tecnificado: $\ge 10.0$ L/vaca/día; lecherías especializadas de trópico alto: 18 - 25 L/vaca/día.
- **Variación Diaria de Producción (`ganancia_diaria_promedio`):** Monitoreo de $\Delta$ L/día por animal y por hato para identificar anomalías alimenticias o cambios climáticos repentinos.

### 4.3 Curvas de Lactancia y Modelado Matemático
- **Fases de la Curva de Lactancia:**
  1. Fase Ascendente (semanas 1 a 6): aumento progresivo hasta alcanzar el pico de lactancia (*peak milk*).
  2. Pico de Lactancia: indicador del potencial genético y reserva corporal; cada litro adicional en el pico representa entre 200 y 250 litros adicionales en la lactancia total.
  3. Fase de Persistencia (semanas 8 a 44): declive natural esperado entre 7% y 9% mensual en vacas adultas (5% en novillas de primer parto).
- **Animal Top Productor (`animal_top_leche`) y Ranking de Productividad:** Identificación de las vacas del percentil superior para selección de madres de toros o multiplicación embrionaria.

---

## Módulo 5: Evaluación Ponderal, Ganancia Diaria de Peso (GDP) & Ceba

### 5.1 Protocolo de Pesaje y Control de Errores de Medición
- **Dinámica de Pesaje en Brete:** Básculas mecánicas vs. celdas de carga electrónicas; frecuencia estándar recomendada (cada 28 a 35 días).
- **Factores de Distorsión en Báscula:** Contenido del tracto gastrointestinal (desbaste por ayuno previo de 12 horas vs. pesaje a lleno), deshidratación por transporte y errores de digitación.
- **Validación Metodológica de Intervalos:**
  - Intervalo mínimo entre pesajes de 14 días para diluir el margen de error intrínseco del instrumento ($\pm 2-5\text{ kg}$).
  - Filtro zootécnico de valores atípicos: descarte de registros con $|\text{GDP}| > 2.5\text{ kg/día}$ como anomalías de lectura.

### 5.2 Ganancia Diaria de Peso (GDP) Individual y por Lote
- **Cálculo de GDP Individual (`gdp_individual`):**
  $$\text{GDP} = \frac{\text{Peso Actual} - \text{Peso Anterior}}{\text{Días Transcurridos}}$$
  - *Escala de Desempeño:*
    - Crítico / Pérdida: $< 0.40\text{ kg/día}$ (déficit energético o parasitosis).
    - Aceptable: $0.40 - 0.60\text{ kg/día}$ (pastoreo tradicional de trópico bajo sin suplemento).
    - Excelente: $\ge 0.60\text{ kg/día}$ (pasturas mejoradas con suplementación proteica/energética o sistemas silvopastoriles).
- **Ganancia de Peso por Lote (`ganancia_peso_lote`):** Agregación del diferencial ponderal de los animales que componen el grupo, evitando la exclusión de pérdidas para no inflar la media real del lote.
- **Peso Promedio del Hato (`peso_promedio_ganado`):** Consideración de un único peso (el más reciente) por animal para evitar sesgos de sobre-ponderación.

### 5.3 Estrategias de Ceba y Rendimiento en Canal
- **Fases del Engorde:** Crecimiento esquelético inicial, deposición muscular (proteína + agua) y terminación con deposición de grasa subcutánea e intramuscular (marmoleo).
- **Eficiencia de Extracción de Carne (`kg_carne_ha`):**
  $$\text{Kg Carne/ha/año} = \frac{\sum \text{Peso de Animales Vendidos en 365 días}}{\text{Área Total de la Finca (ha)}}$$
  - *Benchmark Sectorial:* Promedio nacional colombiano: 180 kg/ha/año; fincas de alta tecnificación: $\ge 350\text{ kg/ha/año}$.

---

## Módulo 6: Eficiencia Reproductiva, Días Abiertos & Mejoramiento Genético

### 6.1 Ciclo Estral, Detección de Celo y Sincronización
- **Fisiología Reproductiva Bovina:** Duración del ciclo estral (promedio 21 días, rango 18-24 días), fases folicular y lútea, picos de hormonas clave (GnRH, FSH, LH, Estrógenos, Progesterona, Prostaglandina $F_{2\alpha}$).
- **Signos Primarios y Secundarios de Celo:** El reflejo de inmovilidad (aceptar la monta), moco cervical cristalino, tumefacción vulvar, inquietud y disminución del consumo.
- **Protocolos de Inseminación Artificial a Tiempo Fijo (IATF):** Uso de dispositivos intravaginales liberadores de progesterona, benzoato/cipionato de estradiol y prostaglandinas para programar ovulaciones en masa sin detección visual de celo.

### 6.2 Indicadores Clave de Desempeño Reproductivo (KPIs)
- **Días Abiertos (`dias_abiertos`):** Días transcurridos entre el parto de la vaca y el servicio fecundante confirmado por palpación o ecografía.
  - *Costo Financiero del Día Abierto:* Cada día abierto adicional por encima de los 90 a 110 días óptimos le cuesta al ganadero entre \$15.000 y \$20.000 COP en mantenimiento de un animal improductivo.
  - *Rangos:* Óptimo $<90$ días; Aceptable 90-120 días; Crítico $>120$ días.
- **Intervalo Entre Partos (IEP) (`intervalo_interpartos`):** Periodo transcurrido entre dos pariciones sucesivas.
  - *Meta Zootécnica Universal:* 1 parto por vaca cada 365 a 400 días (12 a 13.3 meses).
  - *Realidad Nacional Colombia:* Promedio de 420 a 450 días; Top fincas tecnificadas: $\le 385$ días.
- **Tasa de Preñez (`tasa_prenhez`):** Proporción de hembras servidas que resultan efectivamente preñadas tras diagnóstico ginecológico. Promedio nacional: 50%; sistemas optimizados: $\ge 65-70\%$.
- **Servicios por Concepción (`servicios_concepcion`):** Número de montas o inseminaciones necesarias para lograr una gestación confirmada. Excelente $<1.8$; Aceptable $1.8 - 2.5$; Alerta $>2.5$.
- **Relación Vaca:Toro en Monta Natural (`toros_activos`):** Capacidad de servicio del reproductor (1 toro por cada 25 a 30 hembras en potrero).

### 6.3 Mortalidad Neonatal y Tasa de Parición
- **Registros de Partos y Nacimientos (`partos_mes`, `terneros_mes`):** Concentración estacional de partos según curvas de disponibilidad forrajera para asegurar alta producción de leche posparto.
- **Manejo del Ternero Recién Nacido:** Curación profunda de ombligo con tintura de yodo al 7%, consumo obligatorio de calostro de alta calidad en las primeras 6 horas de vida (inmunoglobulinas IgG $>50\text{ mg/mL}$) y pesado inicial.

---

## Módulo 7: Salud Animal, Protocolos Veterinarios & Trazabilidad Oficial ICA

### 7.1 Medicina Preventiva y Programa de Bioseguridad
- **Enfermedades de Control Oficial (Resoluciones ICA):**
  - *Fiebre Aftosa:* Ciclos semestrales de vacunación obligatoria de todo el inventario bovino y bufalino.
  - *Brucelosis Bovina:* Vacunación de terneras entre 3 y 9 meses de edad (cepas RB51 o Cepa 19).
  - *Rabia Paresiante:* Zonas endémicas con presencia del murciélago hematófago *Desmodus rotundus*.
- **Plan Sanitario Estratégico:** Control sistemático de parásitos gastrointestinales y pulmonares, hemotrópicos (*Anaplasma marginale*, *Babesia bovis/bigemina* transmitidos por garrapata *Rhipicephalus microplus*) y baños acaricidas estratégicos.

### 7.2 Gestión de Fármacos, Tratamientos y Periodo de Retiro
- **Tratamientos Activos (`tratamientos_activos`) y Registro Clínico:** Dosificación exacta basada en el peso vivo medido en báscula, evitando subdosificaciones (que generan resistencia antimicrobiana) o sobredosis tóxicas.
- **Periodo de Retiro (LMG - Límite Máximo de Residuos):** Tiempo obligatorio posterior a la aplicación de antibióticos, antiparasitarios o antiinflamatorios en el cual la leche o la carne del animal tratado no puede ser destinada para consumo humano ni entregada a plantas receptoras.
- **Índice de Cumplimiento ICA (`cumplimiento_ica`):** Modelo algorítmico interno que pondera:
  $$\text{Índice ICA} = 0.40 \cdot \text{Trazabilidad} + 0.40 \cdot \text{Cobertura Vacunación} + 0.20 \cdot \text{Guías de Movilización}$$

### 7.3 Epidemiología de Hato y Tasas de Mortalidad
- **Salud General del Hato (`salud_general`):** Porcentaje de animales activos con diagnóstico patológico en los últimos 30 días (Meta: $<5\%$; Alerta: $>15\%$).
- **Tasa de Mortalidad Anual (`mortalidad`):** Porcentaje de muertes registradas respecto a la población expuesta en los últimos 365 días. Rango aceptable en explotaciones tropicales: $<3\%$; estados de alerta: $\ge 5\%$.

---

## Módulo 8: Economía Ganadera, Costos Unitarios & Rentabilidad del Hato

### 8.1 Estructura de Costos Operativos y Clasificación Financiera
- **Costos Fijos vs. Variables en Ganadería:**
  - *Costos Variables:* Suplementos, concentrados, sales mineralizadas, medicamentos veterinarios, vacunas, combustibles y jornales transitorios.
  - *Costos Fijos:* Sueldos fijos de mayordomos y administradores, depreciación de infraestructura (cercas, corrales, maquinaria), mantenimiento básico de praderas e impuestos territoriales.
- **Ingresos del Ejercicio (`ingresos`):** Venta de leche cruda por liquidación quincenal, venta de novillos de ceba, vacas de descarte, terneros al destete y reproductores.
- **Egresos Operativos (`egresos`):** Total de desembolsos depurados de compras de insumos, nómina y servicios.
- **Balance del Período (`balance`):** Diferencia neta $\text{Ingresos} - \text{Egresos}$ excluyendo transacciones de financiación y préstamos.

### 8.2 Costeo Unitario: Kilo de Carne y Litro de Leche
- **Metodología de Reparto de Costos Conjuntos:** En fincas mixtas o de doble propósito, la asignación de egresos entre carne y leche se realiza en proporción al peso económico de los ingresos de cada actividad:
  $$\text{Participación Carne} = \frac{\text{Ingresos por Animales}}{\text{Ingresos Totales}} \quad (\text{acotada entre 15\% y 85\%})$$
  $$\text{Participación Leche} = 1 - \text{Participación Carne}$$
- **Costo por Litro de Leche (`costo_litro_leche`):**
  $$\text{Costo/L} = \frac{\text{Egresos 12 meses} \times \text{Participación Leche}}{\text{Litros Producidos 12 meses}}$$
  - *Rangos de Referencia:* Excelente $< \$700\text{ COP/L}$; Aceptable $\$700 - \$1.100\text{ COP/L}$; Crítico $> \$1.100\text{ COP/L}$.
- **Costo por Kilo de Carne Producido (`costo_kg_carne`):**
  $$\text{Costo/kg} = \frac{\text{Egresos 12 meses} \times \text{Participación Carne}}{\text{Kg Peso Vivo Vendidos en 12 meses}}$$
  - *Rangos de Referencia:* Excelente $< \$4.500\text{ COP/kg}$; Aceptable $\$4.500 - \$6.500\text{ COP/kg}$; Elevado $> \$6.500\text{ COP/kg}$.

### 8.3 Valoración Patrimonial del Inventario Biológico y Tasa de Extracción
- **Valor Comercial del Hato (`valor_hato`):** Valoración contable y financiera de los semovientes a precio de mercado:
  $$\text{Valor Hato} = \sum (\text{Peso Animal} \times \text{Precio de Referencia del Kg en Pie})$$
- **Tasa de Extracción del Hato (`tasa_extraccion`):** Proporción del inventario medio vendido comercialmente en el lapso de un año. Meta de alta rotación: $\ge 22\%$; ganaderías lentas: $<15\%$.
- **Margen por Cabeza (`margen_cabeza`) y Rentabilidad Global (`rentabilidad`):** Rendimiento financiero porcentual sobre los ingresos brutos generados.

---

## Módulo 9: Telemetría IoT, Estrés Calórico (ITH) & Bienestar Animal

### 9.1 Redes Inalámbricas y Sensores de Campo (LoRaWAN)
- **Topología de Redes Rurales:** Instalación de pasarelas (Gateways) LoRaWAN montadas en antenas repetidoras para cobertura de largo alcance (10 a 15 km en línea de vista) con ultra-bajo consumo energético.
- **Nodos Sensores en Potrero:** Estaciones meteorológicas compactas alimentadas por paneles solares (temperatura ambiente, humedad relativa, anemómetro, pluviómetro de balancín y radiómetro).
- **Collares y Aretes Inteligentes:** Acelerómetros triaxiales para monitoreo de rumia, actividad locomotora, detección temprana de cojeras y escape de linderos.

### 9.2 El Índice de Temperatura-Humedad (ITH)
- **Fórmula Oficial de Cálculo del ITH (NRC, 1971):**
  $$\text{ITH} = 0.8 \cdot T + \left(\frac{HR}{100}\right) \cdot (T - 14.4) + 46.4$$
  donde $T$ es la temperatura ambiente en grados Celsius (°C) y $HR$ es la humedad relativa en porcentaje (%).
- **Clasificación del Estrés Calórico Bovina (Escala de Armstrong):**
  - **$\text{ITH} < 72$ (Zona de Confort):** Metabolismo basal óptimo, consumo voluntario de forraje al 100%, producción de leche sostenida.
  - **$\text{ITH } 72 - 78$ (Estrés Leve):** Aumento de frecuencia respiratoria ($>60$ resp/min), vasodilatación periférica; inicio de caída en consumo forrajero (1% a 3%) y alteración en calidad del esperma.
  - **$\text{ITH } 79 - 88$ (Estrés Moderado):** Respiración laboriosa, babeo activo; reducción del 10% al 20% en producción lechera, retención de placenta y caída de la tasa de concepción al primer servicio.
  - **$\text{ITH } 89 - 98$ (Estrés Severo):** Jadeo con lengua expuesta, taquicardia; colapso inmunológico, pérdidas gestacionales tempranas y riesgo inminente de choque calórico.
  - **$\text{ITH } \ge 99$ (Riesgo Mortal):** Mortalidad aguda por fallo multiorgánico en animales no adaptados.

### 9.3 Mitigación Ambiental y Geocercas de Seguridad
- **Infraestructura de Sombra y Refrigeración:** Distribución de mallas sombra (80% polisombra), árboles de dosel y sistemas de aspersión con ventilación forzada en corrales de espera de ordeño.
- **Monitoreo de Ausentismo (`localizacion/ausentismo`):** Alertas en tiempo real por triangulación cuando un collar o arete deja de comunicarse con la antena base o cruza el perímetro georreferenciado del predio.

---

## Módulo 10: Modelado Estadístico, Analítica Predictiva & Benchmarking Sectorial

### 10.1 Proyecciones de Producción mediante Regresión Lineal (OLS)
- **Modelo de Tendencia Temporal:**
  $$\hat{y}_t = \beta_0 + \beta_1 \cdot t$$
  Ajustado mediante Mínimos Cuadrados Ordinarios (OLS) sobre series temporales de 90 días de producción láctea o pesajes continuos.
- **Banda de Predicción al 80% de Confianza:**
  $$\text{Banda}_{80\%} = \hat{y}_t \pm t_{0.90, n-2} \cdot s_e \cdot \sqrt{1 + \frac{1}{n} + \frac{(t - \bar{t})^2}{\sum (t_i - \bar{t})^2}}$$
  Permite modelar el piso y techo de volumen para planificar compromisos de entrega de leche o acuerdos de entrega de novillos en subastas.

### 10.2 Análisis de Correlación Bivariada (Pearson)
- **Coeficiente de Correlación Lineal ($r$):**
  $$r = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2 \sum (y_i - \bar{y})^2}}$$
- **Casos de Aplicación en Ganadería:**
  - Correlación entre días en lactancia y producción diaria de leche (esperada negativa tras pico de lactancia).
  - Correlación entre suministro de suplemento proteico/concentrado y ganancia de peso (GDP).
  - Correlación entre ITH promedio semanal y porcentaje de concepción de hembras servidas.

### 10.3 Benchmarking Sectorial Ganadero
- **Comparación Cuantitativa de Desempeño:** Contraste dinámico de los índices de la empresa agropecuaria contra los parámetros oficiales publicados por FEDEGAN, Ministerio de Agricultura y Desarrollo Rural (MADR), e instituciones internacionales de investigación tropical (CIAT, AGROSAVIA).
- **Identificación de Brechas Operativas:** Transformación de indicadores semaforizados (Rojo/Amarillo/Verde) en planes de acción técnicos orientados a maximizar el margen de contribución del hato.

---

*Documento curricular consolidado en el marco del proyecto Datagan Course.*
