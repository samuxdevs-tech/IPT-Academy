# Glosario Técnico y Taxonomía de Datagan 360

Este documento contiene la taxonomía oficial de categorías, subcategorías y el catálogo de las **73 métricas e indicadores zootécnico-financieros** extraídos de la plataforma **DataGan 360**.

---

## 1. Mapa de Categorías y Subcategorías de la Plataforma

### Administración & Usuarios
> Gestión de roles, permisos corporativos, accesos de trabajadores, fincas asociadas, terceros y facturación.

| Subcategoría | Ruta | Descripción |
|---|---|---|
| **Roles y Permisos** | `/grupos` | Control de acceso granular y matriz de permisos por perfil. |
| **Trabajadores** | `/users` | Gestión del personal operativo, vaqueros y administradores de finca. |
| **Fincas y Predios** | `/Fincas` | Configuración territorial de predios, áreas totales y georreferenciación. |
| **Terceros** | `/terceros` | Proveedores, veterinarios, compradores y aliados comerciales. |
| **Facturación & Suscripción** | `/facturacion` | Planes (Enterprise IA), límites de animales y ciclos de cobro. |

### Gestión Bovina & Inventario
> Administración integral del hato, división de potreros, conformación de lotes, transferencias y sistemas silvopastoriles.

| Subcategoría | Ruta | Descripción |
|---|---|---|
| **Potreros** | `/potreros` | Delimitación perimetral, estado de ocupación, aforo y capacidad de carga. |
| **Lotes de Manejo** | `/lotes` | Agrupación zootécnica de animales (horras, paridas, levante, ceba). |
| **Inventario de Animales** | `/animales` | Fichas individuales, chapetas, genealogía, pesaje histórico y bajas. |
| **Transferencia de Ganado** | `/bovinos/transferencia` | Movimientos entre lotes, potreros y cambios de predio. |
| **Sistemas Silvopastoriles** | `/bovinos/silvopastoril` | Integración de árboles forrajeros y pasturas para bienestar animal. |

### Producción de Carne & Leche
> Control de pesajes periódicos, curvas de ganancia diaria de peso (GDP) y registros de ordeño diario.

| Subcategoría | Ruta | Descripción |
|---|---|---|
| **Pesaje & Curvas GDP** | `/produccion/pesaje` | Evolución ponderal, control de báscula y tasa de ganancia de peso diaria. |
| **Producción de Leche** | `/produccion/leche` | Ordeños individuales y generales (mañana/tarde), rendimiento por vaca y lote. |

### Trazabilidad & Cumplimiento ICA
> Seguimiento individual, registro de chapetas oficiales, historial de movimientos y exportación SINIGAN v6.

| Subcategoría | Ruta | Descripción |
|---|---|---|
| **Registro de Trazabilidad** | `/trazabilidad/registro` | Identificación oficial de animales y homologación de códigos DIN/SINIGAN. |
| **Historial de Movimientos** | `/trazabilidad/historial` | Registro cronológico de traslados, guías sanitarias de movilización interna (GSMI). |

### Salud, Reproducción & Veterinaria
> Ciclo reproductivo, detección de celos, servicios, inseminación, partos, tratamientos clínicos y planes de vacunación.

| Subcategoría | Ruta | Descripción |
|---|---|---|
| **Detección de Celo** | `/salud/celo` | Monitoreo de celo natural y sincronización para inseminación artificial. |
| **Servicios e Inseminación** | `/salud/servicio` | Registro de montas naturales e IATF con identificación del toro/pajilla. |
| **Veterinaria & Tratamientos** | `/salud/veterinaria` | Diagnósticos clínicos, fármacos aplicados, periodos de retiro y vacunas. |
| **Nacimientos y Partos** | `/salud/nacimiento` | Registro de partos, peso al nacer, vitalidad del ternero e identificación de madre. |
| **Genealogía & Linaje** | `/salud/genealogia` | Árbol genealógico ascendente y descendente, consanguinidad y mérito genético. |

### Finanzas & Control de Costos
> Control financiero ganadero, costos por litro de leche y kilo de carne, valor comercial del hato e inventario de insumos.

| Subcategoría | Ruta | Descripción |
|---|---|---|
| **Inventario de Insumos** | `/finanza/inventario` | Medicamentos, balanceados, sales mineralizadas, semen y herramientas. |
| **Actividades & Labores** | `/finanza/actividades` | Costos de jornales, mantenimiento de cercas, fertilización y siembra. |
| **Compras & Gastos** | `/finanza/compras` | Egresos operativos, adquisición de ganado, forrajes y suministros. |
| **Ventas & Facturación** | `/finanza/ventas` | Comercialización de leche cruda, novillos gordos, terneros y descarte. |
| **Cuentas & Balance** | `/finanza/cuentas` | Cuentas bancarias, caja menor, flujo de caja libre y margen de contribución. |

### Geolocalización, Telemetría & Clima (IoT)
> Red de antenas LoRaWAN/GPS, lecturas de sensores perimetrales, ausentismo de ganado y estrés calórico ITH.

| Subcategoría | Ruta | Descripción |
|---|---|---|
| **Antenas & Nodos** | `/localizacion/antenas` | Infraestructura de comunicación inalámbrica y estado de baterías de nodos. |
| **Lecturas de Sensores** | `/localizacion/lecturas` | Temperatura ambiente, humedad relativa, lluvia acumulada y radiación. |
| **Detección de Ausentismo** | `/localizacion/ausentismo` | Alertas de escape de animales fuera del perímetro geocercado o robo. |
| **Estrés Calórico (ITH)** | `/localizacion/ith` | Índice de Temperatura-Humedad por potrero y zonas de sombra requeridas. |

### Reportes & Analítica Predictiva
> Generación de informes de gestión zootécnica, auditorías sanitarias y proyecciones basadas en modelos estadísticos.

| Subcategoría | Ruta | Descripción |
|---|---|---|
| **Nuevo Informe** | `/reportes/nuevo` | Consolidación de indicadores de productividad, índices reproductivos y balances. |

---

## 2. Catálogo Oficial de Métricas e Indicadores (73 Métricas)

### Categoría: Producción (Carne & Leche) (16 métricas)

#### Vacas en lactancia (`vacas_lactancia`)
- **Descripción Corta:** Hembras produciendo leche actualmente
- **Definición Técnica:** NÃºmero de hembras activas en lactancia a la fecha de corte del perÃ­odo: hembras del grupo de manejo "lactancia" o con al menos un ordeÃ±o registrado en los 30 dÃ­as anteriores. Se combinan ambos criterios porque las automatizaciones de parto, servicio y palpaciÃ³n cambian el grupo de manejo aunque la vaca siga en ordeÃ±o.
- **Fórmula de Cálculo:** `NÂ° hembras activas con (grupo = lactancia) O (ordeÃ±o en los Ãºltimos 30 dÃ­as)`
- **Unidad de Medida:** `cabezas`
- **Fuente de Datos:** Inventario bovino y registros de producciÃ³n de leche
- **Factores Determinantes:** Ã‰poca del aÃ±o, estado reproductivo, nutriciÃ³n, dÃ­as en lactancia
- **Métricas Relacionadas:** `produccion_leche_total`, `rendimiento_promedio_leche`

#### ProducciÃ³n total de leche (`produccion_leche_total`)
- **Descripción Corta:** Litros totales producidos en el perÃ­odo
- **Definición Técnica:** Volumen total de leche producida en la finca durante el perÃ­odo seleccionado, en la unidad configurada (litros o botellas). Suma de todos los ordeÃ±os (maÃ±ana y tarde) registrados.
- **Fórmula de Cálculo:** `Î£ (cantidad_leche de cada registro del perÃ­odo)`
- **Unidad de Medida:** `L`
- **Fuente de Datos:** Registros del mÃ³dulo de producciÃ³n de leche
- **Factores Determinantes:** NÃºmero de vacas en lactancia, nutriciÃ³n, clima, raza, dÃ­as en lactancia
- **Métricas Relacionadas:** `vacas_lactancia`, `rendimiento_promedio_leche`, `ganancia_diaria_promedio`

#### Animal mÃ¡s productor de leche (`animal_top_leche`)
- **Descripción Corta:** Vaca con mayor volumen de leche
- **Definición Técnica:** IdentificaciÃ³n (nÃºmero de registro) de la hembra que ha producido la mayor cantidad total de leche durante el perÃ­odo seleccionado (suma de todos sus ordeÃ±os).
- **Unidad de Medida:** `registro`
- **Fuente de Datos:** Registros individuales de producciÃ³n de leche
- **Factores Determinantes:** GenÃ©tica, nutriciÃ³n, manejo, dÃ­as en lactancia
- **Métricas Relacionadas:** `produccion_leche_total`, `rendimiento_promedio_leche`

#### Peso promedio del hato (`peso_promedio_ganado`)
- **Descripción Corta:** Peso promedio del hato en kg
- **Definición Técnica:** Promedio del Ãºltimo peso registrado de cada animal pesado en el perÃ­odo. Cada animal cuenta una sola vez aunque se haya pesado varias veces. Si no hubo pesajes en el perÃ­odo, se usa el peso del inventario de animales activos.
- **Fórmula de Cálculo:** `Î£ (Ãºltimo peso de cada animal pesado en el perÃ­odo) Ã· NÂ° de animales pesados`
- **Explicación Metodológica:** Promediar todos los registros de pesaje sobre-pondera a los animales que se pesan con mÃ¡s frecuencia; por eso se toma un Ãºnico peso (el mÃ¡s reciente) por animal.
- **Unidad de Medida:** `kg`
- **Fuente de Datos:** Registros del mÃ³dulo de pesaje e inventario activo
- **Factores Determinantes:** Raza, edad, nutriciÃ³n, estado sanitario, manejo
- **Métricas Relacionadas:** `gdp_promedio_ganado`, `gdp_individual`

#### Rendimiento promedio de leche (`rendimiento_promedio_leche`)
- **Descripción Corta:** Litros por vaca por dÃ­a
- **Definición Técnica:** ProducciÃ³n promedio de leche por vaca y por dÃ­a de ordeÃ±o (suma de los ordeÃ±os de maÃ±ana y tarde). Es el indicador clave de eficiencia lechera individual.
- **Fórmula de Cálculo:** `ProducciÃ³n total de leche Ã· NÂ° de vacas-dÃ­a ordeÃ±adas`
- **Explicación Metodológica:** Una vaca-dÃ­a es cada combinaciÃ³n (vaca, fecha) con al menos un ordeÃ±o. AsÃ­ cada vaca aporta solo los dÃ­as en que realmente fue ordeÃ±ada; multiplicar el NÂ° de vacas por los dÃ­as del perÃ­odo sub-estima el rendimiento cuando no todas se ordeÃ±an todos los dÃ­as.
- **Unidad de Medida:** `L/vaca/dÃ­a`
- **Fuente de Datos:** CÃ¡lculo a partir de datos de producciÃ³n y registro animal
- **Factores Determinantes:** Raza, nutriciÃ³n, dÃ­as en lactancia, clima, manejo de ordeÃ±o
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN â€” promedio nacional (doble propÃ³sito predominante) (2024) | Promedio: 4.5 | Top 10%: 10
- **Rangos Operativos:**
  - **Bajo** (red): < 4 L/vaca/dÃ­a â€” por debajo del promedio de doble propÃ³sito; revisar nutriciÃ³n y sanidad [min: 0, max: 4]
  - **Aceptable** (yellow): 4-10 L/vaca/dÃ­a â€” rango tÃ­pico de doble propÃ³sito en trÃ³pico [min: 4, max: 10]
  - **Excelente** (green): â‰¥ 10 L/vaca/dÃ­a â€” nivel de lecherÃ­a especializada o doble propÃ³sito tecnificado [min: 10, max: 999]
- **Métricas Relacionadas:** `produccion_leche_total`, `vacas_lactancia`, `costo_litro_leche`

#### VariaciÃ³n diaria de leche (`ganancia_diaria_promedio`)
- **Descripción Corta:** VariaciÃ³n diaria de producciÃ³n (Î” L/dÃ­a)
- **Definición Técnica:** Ritmo promedio de cambio de la producciÃ³n diaria de cada vaca respecto a su dÃ­a de ordeÃ±o anterior. Positivo = la producciÃ³n sube; negativo = baja (normal despuÃ©s del pico de lactancia).
- **Fórmula de Cálculo:** `Î£ (total diario de la vaca âˆ’ su total del dÃ­a de ordeÃ±o anterior) Ã· Î£ dÃ­as entre ambos`
- **Explicación Metodológica:** Se compara el TOTAL DIARIO de cada vaca (maÃ±ana + tarde), no ordeÃ±os sueltos: comparar el ordeÃ±o de la tarde con el de la maÃ±ana mostraba caÃ­das falsas.
- **Unidad de Medida:** `L/vaca/dÃ­a`
- **Fuente de Datos:** CÃ¡lculo derivado de registros consecutivos de producciÃ³n
- **Factores Determinantes:** Curva de lactancia, cambios nutricionales, clima, estrÃ©s
- **Métricas Relacionadas:** `produccion_leche_total`, `rendimiento_promedio_leche`

#### GDP individual (`gdp_individual`)
- **Descripción Corta:** Ganancia diaria de peso por animal
- **Definición Técnica:** Ganancia Diaria de Peso (GDP) de un animal: diferencia de peso entre dos pesajes dividida por los dÃ­as transcurridos. En las grÃ¡ficas del dashboard se exige un intervalo mÃ­nimo de 14 dÃ­as entre pesajes y se descartan GDP mayores a Â±2.5 kg/dÃ­a (errores de bÃ¡scula o digitaciÃ³n).
- **Fórmula de Cálculo:** `(Peso actual âˆ’ Peso de referencia) Ã· DÃ­as entre pesajes (â‰¥ 14 dÃ­as)`
- **Explicación Metodológica:** Con pesajes muy seguidos el error de la bÃ¡scula (Â±2-5 kg) domina: +29 kg en 1 dÃ­a darÃ­a 29 kg/dÃ­a. La prÃ¡ctica de campo es pesar cada 28-30 dÃ­as.
- **Unidad de Medida:** `kg/dÃ­a`
- **Fuente de Datos:** Registros del mÃ³dulo de pesaje
- **Factores Determinantes:** Raza, edad, nutriciÃ³n, salud, calidad del pasto
- **Rangos Operativos:**
  - **Bajo / pÃ©rdida** (red): < 0.4 kg/dÃ­a â€” bajo rendimiento o pÃ©rdida de peso [min: -99, max: 0.4]
  - **Aceptable** (yellow): 0.4-0.6 kg/dÃ­a â€” pastoreo tradicional sin suplemento [min: 0.4, max: 0.6]
  - **Excelente** (green): â‰¥ 0.6 kg/dÃ­a â€” pasturas mejoradas o suplementaciÃ³n [min: 0.6, max: 99]
- **Métricas Relacionadas:** `peso_promedio_ganado`, `kg_carne_ha`

#### Leche promedio por lote (`leche_promedio_lote`)
- **Descripción Corta:** Litros por vaca por dÃ­a de cada lote
- **Definición Técnica:** Rendimiento de leche de cada lote expresado en litros por vaca por dÃ­a de ordeÃ±o. Permite comparar lotes de distinto tamaÃ±o (el total de litros favorece siempre al lote mÃ¡s grande).
- **Fórmula de Cálculo:** `Î£ litros del lote Ã· NÂ° de vacas-dÃ­a ordeÃ±adas del lote`
- **Unidad de Medida:** `L/vaca/dÃ­a`
- **Fuente de Datos:** Registros de producciÃ³n agrupados por el lote del registro de ordeÃ±o
- **Factores Determinantes:** ComposiciÃ³n del lote, nutriciÃ³n, manejo, raza
- **Métricas Relacionadas:** `produccion_leche_total`, `rendimiento_promedio_leche`

#### VariaciÃ³n de producciÃ³n individual (`leche_variacion_individual`)
- **Descripción Corta:** Cambio en la producciÃ³n de leche de un animal
- **Definición Técnica:** VariaciÃ³n de la producciÃ³n de leche de un animal individual respecto a su registro anterior (rendimiento) y su ritmo diario de cambio (ganancia diaria en L/dÃ­a).
- **Fórmula de Cálculo:** `Î” vs anterior = ProducciÃ³n actual - ProducciÃ³n anterior; Ganancia diaria = Î” Ã· dÃ­as entre registros`
- **Unidad de Medida:** `L`
- **Fuente de Datos:** Registros individuales de producciÃ³n de leche
- **Factores Determinantes:** DÃ­as en lactancia, nutriciÃ³n, manejo, salud
- **Métricas Relacionadas:** `rendimiento_promedio_leche`, `top_10_vacas_leche`

#### Ganancia de peso por lote (`ganancia_peso_lote`)
- **Descripción Corta:** Ganancia de peso agregada por lote
- **Definición Técnica:** Ganancia de peso de cada lote: GDP del lote, kg ganados y peso promedio. Permite comparar el desempeÃ±o entre lotes. Incluye las pÃ©rdidas de peso (antes se excluÃ­an los pesajes sin ganancia, lo que inflaba la GDP).
- **Fórmula de Cálculo:** `GDP del lote = Î£ Î”peso de sus animales Ã· Î£ dÃ­as (intervalos â‰¥ 14 dÃ­as, |GDP| â‰¤ 2.5 kg/dÃ­a); Peso prom. = promedio del Ãºltimo peso de cada animal`
- **Unidad de Medida:** `kg/dÃ­a`
- **Fuente de Datos:** Registros del mÃ³dulo de pesaje agrupados por lote
- **Factores Determinantes:** ComposiciÃ³n del lote, nutriciÃ³n, manejo, raza, edad
- **Métricas Relacionadas:** `gdp_individual`, `top_gdp`, `peso_promedio_ganado`

#### ProyecciÃ³n de producciÃ³n (`proyeccion_produccion`)
- **Descripción Corta:** EstimaciÃ³n de producciÃ³n futura
- **Definición Técnica:** ProyecciÃ³n a 30 dÃ­as con una regresiÃ³n lineal (mÃ­nimos cuadrados, OLS) sobre la serie diaria de los Ãºltimos 90 dÃ­as: total diario de leche, o peso promedio del hato (Ãºltimo peso conocido de cada animal activo). Incluye una banda de predicciÃ³n del 80%. No es un modelo ARIMA ni considera estacionalidad.
- **Fórmula de Cálculo:** `y = a + bÂ·t (OLS); banda 80% = Â±1.28 Â· Ïƒ Â· âˆš(1 + 1/n + (t âˆ’ tÌ„)Â² / Sxx)`
- **Explicación Metodológica:** ProyecciÃ³n de leche a 30 dÃ­as = suma de los 30 valores diarios pronosticados. ProyecciÃ³n de carne = peso promedio actual del hato + GDP del hato Ã— 30. Requiere al menos 3 dÃ­as con datos.
- **Unidad de Medida:** `variable`
- **Fuente de Datos:** RegresiÃ³n lineal sobre datos histÃ³ricos de la finca
- **Factores Determinantes:** Datos histÃ³ricos, estacionalidad, nÃºmero de vacas, tendencias
- **Métricas Relacionadas:** `produccion_leche_total`, `correlacion_pearson`

#### Top 10 vacas productoras de leche (`top_10_vacas_leche`)
- **Descripción Corta:** Las 10 vacas con mayor producciÃ³n
- **Definición Técnica:** Ranking de las 10 vacas con mayor volumen total de leche producido durante el perÃ­odo seleccionado. Permite identificar animales Ã©lite.
- **Unidad de Medida:** `ranking`
- **Fuente de Datos:** Registros individuales de producciÃ³n de leche
- **Factores Determinantes:** GenÃ©tica, nutriciÃ³n, manejo, dÃ­as en lactancia
- **Métricas Relacionadas:** `produccion_leche_total`, `animal_top_leche`

#### Top animales por GDP (`top_gdp`)
- **Descripción Corta:** Animales con mayor ganancia de peso
- **Definición Técnica:** Ranking de los 10 animales con mayor Ganancia Diaria de Peso en el perÃ­odo: (Ãºltimo peso del perÃ­odo âˆ’ peso de referencia) Ã· dÃ­as, con al menos 14 dÃ­as entre pesajes. Se excluyen GDP mayores a Â±2.5 kg/dÃ­a (errores de pesaje).
- **Fórmula de Cálculo:** `(Peso final âˆ’ Peso de referencia) Ã· DÃ­as (â‰¥ 14)`
- **Unidad de Medida:** `ranking`
- **Fuente de Datos:** Registros del mÃ³dulo de pesaje
- **Factores Determinantes:** GenÃ©tica, nutriciÃ³n, edad, sistema de pastoreo
- **Métricas Relacionadas:** `gdp_individual`, `peso_promedio_ganado`

#### Ganancia Diaria de Peso Promedio del Hato (GDP) (`gdp_promedio_ganado`)
- **Descripción Corta:** Ganancia promedio de peso diario de los bovinos pesados
- **Definición Técnica:** Ganancia diaria de peso del hato en el perÃ­odo: suma de los kilos ganados por cada animal (Ãºltimo pesaje del perÃ­odo menos su pesaje de referencia) dividida por la suma de los dÃ­as transcurridos. Es el indicador central de eficiencia zootÃ©cnica en ceba y levante.
- **Fórmula de Cálculo:** `Î£ (Peso final âˆ’ Peso de referencia) Ã· Î£ (DÃ­as entre ambos pesajes)`
- **Explicación Metodológica:** Referencia = Ãºltimo pesaje en o antes del inicio del perÃ­odo (o el primero del perÃ­odo). Se exige un intervalo mÃ­nimo de 14 dÃ­as y se excluyen animales con GDP mayor a Â±2.5 kg/dÃ­a (errores de bÃ¡scula o digitaciÃ³n); la tarjeta indica cuÃ¡ntos se excluyeron. Promediar las GDP de cada pesaje (mÃ©todo anterior) sobre-ponderaba intervalos de 1 dÃ­a con errores de Â±30 kg/dÃ­a.
- **Unidad de Medida:** `kg/dÃ­a`
- **Fuente de Datos:** Registros del mÃ³dulo de pesajes
- **Factores Determinantes:** Disponibilidad de forraje, calidad de pradera, suplementaciÃ³n, genÃ©tica, carga animal, sanidad
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN / Agrosavia Ceba TrÃ³pico Colombiano (2024) | Promedio: 0.55 | Top 10%: 0.85
- **Rangos Operativos:**
  - **CrÃ­tico / PÃ©rdida** (red): < 0.4 kg/dÃ­a â€” bajo rendimiento o pÃ©rdida de peso; revisar nutriciÃ³n y sanidad [min: -99, max: 0.4]
  - **Aceptable** (yellow): 0.4-0.6 kg/dÃ­a â€” pastoreo tradicional sin suplemento [min: 0.4, max: 0.6]
  - **Excelente** (green): â‰¥ 0.6 kg/dÃ­a â€” pasturas mejoradas o suplementaciÃ³n [min: 0.6, max: 99]
- **Métricas Relacionadas:** `peso_promedio_ganado`, `top_gdp`, `gdp_individual`

#### VariaciÃ³n Interpesaje Individual (Î” kg) (`pesaje_diferencial`)
- **Descripción Corta:** Diferencia neta en kilogramos entre el pesaje actual y el anterior
- **Definición Técnica:** Cambio absoluto de peso vivo registrado en un animal especÃ­fico al compararlo con su pesaje inmediatamente anterior. Permite detectar si el animal subiÃ³ (+), se estancÃ³ (0) o perdiÃ³ peso (-).
- **Fórmula de Cálculo:** `Peso actual (kg) - Peso anterior (kg)`
- **Unidad de Medida:** `kg`
- **Fuente de Datos:** Registros individuales en el mÃ³dulo de pesajes
- **Factores Determinantes:** Consumo voluntario, estado de pastos, parÃ¡sitos gastrointestinales, dÃ­as transcurridos
- **Métricas Relacionadas:** `peso_promedio_ganado`, `gdp_individual`, `top_gdp`

#### ProducciÃ³n de Leche por Potrero (`top_leche_potrero`)
- **Descripción Corta:** Volumen total de leche obtenido de las vacas durante su estancia en cada potrero
- **Definición Técnica:** Litros totales de leche ordeÃ±ados asociados a los dÃ­as en que el lote de producciÃ³n estuvo pastoreando en cada potrero especÃ­fico. Revela el impacto directo de la calidad de pastura en el tanque.
- **Unidad de Medida:** `L`
- **Fuente de Datos:** Cruce de asignaciÃ³n de potrero y ordeÃ±os diarios
- **Factores Determinantes:** Especie forrajera, edad de rebrote, fertilizaciÃ³n, sombra y distancia a la sala de ordeÃ±o
- **Métricas Relacionadas:** `top_potreros`, `produccion_leche_total`

---

### Categoría: Reproducción & Parición (7 métricas)

#### Nacimientos del perÃ­odo (`terneros_mes`)
- **Descripción Corta:** Nacimientos registrados en el rango seleccionado
- **Definición Técnica:** Total de terneros nacidos y registrados dentro del rango de fechas seleccionado en el filtro del dashboard (por defecto, Ãºltimos 30 dÃ­as). Incluye machos y hembras.
- **Fórmula de Cálculo:** `NÂ° de registros de nacimiento con fecha en el perÃ­odo`
- **Unidad de Medida:** `cabezas`
- **Fuente de Datos:** Registros de nacimientos del mÃ³dulo de animales
- **Factores Determinantes:** Tasa de preÃ±ez, mortalidad neonatal, temporada de pariciones
- **Métricas Relacionadas:** `tasa_prenhez`, `partos_mes`

#### Toros activos (`toros_activos`)
- **Descripción Corta:** Machos reproductores en servicio
- **Definición Técnica:** NÃºmero de machos activos en el grupo de manejo "toro". La relaciÃ³n recomendada en monta natural es de 1 toro por cada 25 a 30 hembras en edad reproductiva.
- **Fórmula de Cálculo:** `NÂ° machos activos con grupo de manejo = toro`
- **Unidad de Medida:** `cabezas`
- **Fuente de Datos:** Registros del inventario bovino
- **Factores Determinantes:** RelaciÃ³n vaca:toro, edad del toro, salud reproductiva
- **Métricas Relacionadas:** `tasa_prenhez`, `vacas_lactancia`

#### DÃ­as abiertos (`dias_abiertos`)
- **Descripción Corta:** DÃ­as entre parto y nueva preÃ±ez
- **Definición Técnica:** Promedio de dÃ­as entre el parto y el servicio fecundante (el que produjo la preÃ±ez) de las hembras con preÃ±ez confirmada en los Ãºltimos 12 meses. Un indicador crÃ­tico de eficiencia reproductiva.
- **Fórmula de Cálculo:** `Î£ (fecha servicio fecundante âˆ’ fecha del parto anterior) Ã· NÂ° de hembras preÃ±adas con parto previo registrado`
- **Explicación Metodológica:** Servicio fecundante = Ãºltimo servicio anterior a la palpaciÃ³n con diagnÃ³stico "PreÃ±ada". Se descartan valores fuera de 30-500 dÃ­as (errores de registro). Las vacas aÃºn vacÃ­as no entran al promedio.
- **Unidad de Medida:** `dÃ­as`
- **Fuente de Datos:** Registros reproductivos (servicios, palpaciones, nacimientos)
- **Factores Determinantes:** DetecciÃ³n de celo, fertilidad del toro, nutriciÃ³n, manejo reproductivo
- **Valores de Referencia (Benchmark):** Fuente: ICA / FEDEGAN (2024) | Promedio: 120 | Top 10%: 85
- **Rangos Operativos:**
  - **Ã“ptimo** (green): < 90 dÃ­as â€” excelente eficiencia [min: 0, max: 90]
  - **Aceptable** (yellow): 90-120 dÃ­as â€” rango aceptable [min: 90, max: 121]
  - **CrÃ­tico** (red): > 120 dÃ­as â€” pÃ©rdidas econÃ³micas significativas [min: 121, max: 9999]
- **Métricas Relacionadas:** `intervalo_interpartos`, `tasa_prenhez`, `servicios_concepcion`

#### Intervalo entre partos (IEP) (`intervalo_interpartos`)
- **Descripción Corta:** DÃ­as promedio entre partos consecutivos
- **Definición Técnica:** Promedio de dÃ­as entre dos partos consecutivos de una misma hembra en el hato. La meta zootÃ©cnica ideal es un parto por vaca al aÃ±o (365 a 400 dÃ­as).
- **Fórmula de Cálculo:** `Î£ (dÃ­as entre partos consecutivos por hembra) Ã· NÂ° de intervalos registrados`
- **Explicación Metodológica:** Filtra intervalos biolÃ³gicos vÃ¡lidos (260 a 900 dÃ­as) entre fechas de nacimientos consecutivos registrados para cada madre.
- **Unidad de Medida:** `dÃ­as`
- **Fuente de Datos:** Registros genealÃ³gicos de nacimientos y madres
- **Factores Determinantes:** DÃ­as abiertos, duraciÃ³n de gestaciÃ³n, detecciÃ³n oportuna de celos, condiciÃ³n corporal
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN / ICA Colombia (2024) | Promedio: 420 | Top 10%: 385
- **Rangos Operativos:**
  - **Ã“ptimo** (green): â‰¤ 400 dÃ­as â€” excelente eficiencia reproductiva [min: 0, max: 401]
  - **Aceptable** (yellow): 401-450 dÃ­as â€” aceptable para trÃ³pico bajo [min: 401, max: 451]
  - **Prolongado** (red): > 450 dÃ­as â€” intervalo excesivo y merma econÃ³mica [min: 451, max: 9999]
- **Métricas Relacionadas:** `dias_abiertos`, `tasa_prenhez`, `servicios_concepcion`

#### Tasa de preÃ±ez (`tasa_prenhez`)
- **Descripción Corta:** Porcentaje de hembras preÃ±adas
- **Definición Técnica:** Porcentaje de las hembras servidas en los Ãºltimos 12 meses que tienen preÃ±ez confirmada por palpaciÃ³n (diagnÃ³stico "PreÃ±ada"). Si no hay servicios registrados, se usa como base las hembras palpadas.
- **Fórmula de Cálculo:** `(Hembras servidas con preÃ±ez confirmada Ã· Hembras servidas) Ã— 100`
- **Explicación Metodológica:** PreÃ±ez confirmada = palpaciÃ³n con diagnÃ³stico "PreÃ±ada" (campo diagnÃ³stico), o cuerpo lÃºteo en un ovario en una hembra servida cuando no hay diagnÃ³stico explÃ­cito.
- **Unidad de Medida:** `%`
- **Fuente de Datos:** Registros de servicio y palpaciÃ³n
- **Factores Determinantes:** DetecciÃ³n de celo, fertilidad, nutriciÃ³n, sanidad, toro/IA
- **Valores de Referencia (Benchmark):** Fuente: ICA Colombia (2024) | Promedio: 50 | Top 10%: 70
- **Rangos Operativos:**
  - **CrÃ­tico** (red): < 40% â€” intervenciÃ³n urgente [min: 0, max: 40]
  - **Aceptable** (yellow): 40-60% â€” requiere mejoras [min: 40, max: 60]
  - **Excelente** (green): â‰¥ 60% â€” programa reproductivo eficiente [min: 60, max: 101]
- **Métricas Relacionadas:** `dias_abiertos`, `servicios_concepcion`, `partos_mes`

#### Servicios por concepciÃ³n (`servicios_concepcion`)
- **Descripción Corta:** NÃºmero de servicios para lograr preÃ±ez
- **Definición Técnica:** Promedio de servicios (montas o inseminaciones) que necesitaron las hembras que quedaron preÃ±adas en los Ãºltimos 12 meses. Un valor bajo indica buena fertilidad.
- **Fórmula de Cálculo:** `Î£ (servicios de cada hembra preÃ±ada hasta su palpaciÃ³n positiva) Ã· NÂ° de hembras preÃ±adas`
- **Explicación Metodológica:** Solo se cuentan los servicios de hembras con preÃ±ez confirmada; los servicios de hembras aÃºn vacÃ­as no inflan el indicador.
- **Unidad de Medida:** `servicios`
- **Fuente de Datos:** Registros de servicios reproductivos
- **Factores Determinantes:** Fertilidad del toro/semen, detecciÃ³n de celo, tÃ©cnica de IA
- **Valores de Referencia (Benchmark):** Fuente: Literatura bovina tropical (2024) | Promedio: 2.5 | Top 10%: 1.5
- **Rangos Operativos:**
  - **Excelente** (green): < 1.8 servicios â€” alta fertilidad [min: 0, max: 1.8]
  - **Aceptable** (yellow): 1.8-2.5 servicios [min: 1.8, max: 2.51]
  - **Baja fertilidad** (red): > 2.5 servicios â€” revisar manejo [min: 2.51, max: 99]
- **Métricas Relacionadas:** `tasa_prenhez`, `dias_abiertos`

#### Nacimientos por fecha (`partos_mes`)
- **Descripción Corta:** Nacimientos registrados por dÃ­a en el perÃ­odo
- **Definición Técnica:** NÃºmero de nacimientos registrados en cada fecha del perÃ­odo seleccionado (grÃ¡fico "Nacimientos por Fecha").
- **Unidad de Medida:** `nacimientos`
- **Fuente de Datos:** Registros de nacimientos
- **Factores Determinantes:** Programa reproductivo, Ã©poca de pariciones, tasa de preÃ±ez previa
- **Métricas Relacionadas:** `tasa_prenhez`, `terneros_mes`

---

### Categoría: Salud Animal & Bioseguridad (13 métricas)

#### Salud general del hato (`salud_general`)
- **Descripción Corta:** Estado sanitario global del hato
- **Definición Técnica:** ClasificaciÃ³n del estado sanitario segÃºn el porcentaje de animales activos con al menos un diagnÃ³stico de enfermedad registrado en el perÃ­odo (por defecto, Ãºltimos 30 dÃ­as).
- **Fórmula de Cálculo:** `(Animales distintos con enfermedad en el perÃ­odo Ã· Animales activos) Ã— 100`
- **Unidad de Medida:** `estado`
- **Fuente de Datos:** Registros del mÃ³dulo de salud (enfermedades, tratamientos, vacunaciÃ³n)
- **Factores Determinantes:** Bioseguridad, nutriciÃ³n, clima, densidad animal, programa sanitario
- **Rangos Operativos:**
  - **Buena** (green): < 5% de animales con problemas de salud [min: 0, max: 5]
  - **Regular** (yellow): 5-15% de animales requieren atenciÃ³n [min: 5, max: 15]
  - **Mala** (red): > 15% de animales enfermos â€” intervenciÃ³n urgente [min: 15, max: 100]
- **Métricas Relacionadas:** `enfermos_activos`, `tratamientos_activos`, `vacunas_pendientes`

#### Animales enfermos (`enfermos_activos`)
- **Descripción Corta:** Animales con diagnÃ³stico de enfermedad en el perÃ­odo
- **Definición Técnica:** NÃºmero de animales distintos con al menos un diagnÃ³stico de enfermedad registrado en el perÃ­odo (Ãºltimos 30 dÃ­as en GestiÃ³n Operativa). El sistema no registra la fecha de alta, por lo que no distingue si el animal ya se recuperÃ³.
- **Fórmula de Cálculo:** `NÂ° de animales distintos con registro de enfermedad en el perÃ­odo`
- **Unidad de Medida:** `animales`
- **Fuente de Datos:** Registros del mÃ³dulo de enfermedades
- **Factores Determinantes:** Bioseguridad, clima, densidad, nutriciÃ³n, programa sanitario
- **Métricas Relacionadas:** `salud_general`, `tratamientos_activos`

#### Tratamientos activos (`tratamientos_activos`)
- **Descripción Corta:** Tratamientos en curso hoy
- **Definición Técnica:** NÃºmero de tratamientos veterinarios que siguen en curso a la fecha de hoy: fecha de inicio + dÃ­as de tratamiento â‰¥ hoy (o estado distinto de "finalizado" si el registro tiene estado).
- **Fórmula de Cálculo:** `NÂ° tratamientos con (inicio + dÃ­as de tratamiento) â‰¥ hoy`
- **Unidad de Medida:** `tratamientos`
- **Fuente de Datos:** Registros del mÃ³dulo de tratamientos
- **Factores Determinantes:** Prevalencia de enfermedades, protocolos de tratamiento
- **Métricas Relacionadas:** `enfermos_activos`, `vacunas_pendientes`

#### Vacunas pendientes (`vacunas_pendientes`)
- **Descripción Corta:** Refuerzos de vacuna vencidos o prÃ³ximos
- **Definición Técnica:** Refuerzos de vacunaciÃ³n calculados a partir de la Ãºltima dosis de cada animal y la periodicidad de la vacuna (p.ej. aftosa cada 6 meses). Incluye los refuerzos vencidos (fecha ya pasada) y los prÃ³ximos.
- **Unidad de Medida:** `vacunas`
- **Fuente de Datos:** Registros del mÃ³dulo de vacunaciÃ³n
- **Factores Determinantes:** Programa sanitario, calendario de vacunaciÃ³n, disponibilidad de biolÃ³gicos
- **Métricas Relacionadas:** `cumplimiento_ica`, `tratamientos_activos`

#### Vacunas aplicadas (`vacunas_aplicadas`)
- **Descripción Corta:** Vacunaciones aplicadas en el perÃ­odo
- **Definición Técnica:** NÃºmero de vacunaciones aplicadas durante el perÃ­odo seleccionado. Refleja la cobertura del programa sanitario del hato.
- **Unidad de Medida:** `vacunas`
- **Fuente de Datos:** Registros del mÃ³dulo de vacunaciÃ³n
- **Factores Determinantes:** Programa sanitario, calendario de vacunaciÃ³n, disponibilidad de biolÃ³gicos
- **Métricas Relacionadas:** `vacunas_pendientes`, `cumplimiento_ica`, `salud_general`

#### Total tratamientos (`total_tratamientos`)
- **Descripción Corta:** Tratamientos registrados en el perÃ­odo
- **Definición Técnica:** Total de tratamientos veterinarios registrados durante el perÃ­odo, incluyendo los finalizados y los que siguen en curso.
- **Unidad de Medida:** `tratamientos`
- **Fuente de Datos:** Registros del mÃ³dulo de tratamientos
- **Factores Determinantes:** Prevalencia de enfermedades, protocolos de tratamiento, oportunidad de atenciÃ³n
- **Métricas Relacionadas:** `tratamientos_activos`, `enfermos_activos`

#### Tasa de mortalidad (`mortalidad`)
- **Descripción Corta:** Porcentaje de animales muertos en 12 meses
- **Definición Técnica:** Porcentaje de animales que murieron en los Ãºltimos 365 dÃ­as (salidas con motivo "muerte") sobre la poblaciÃ³n expuesta (animales activos hoy + muertos del perÃ­odo). Incluye todas las causas.
- **Fórmula de Cálculo:** `(Animales distintos muertos en 365 dÃ­as Ã· (Activos + Muertos)) Ã— 100`
- **Explicación Metodológica:** La poblaciÃ³n expuesta aproxima el inventario al inicio del perÃ­odo sin descontar ventas ni nacimientos.
- **Unidad de Medida:** `%`
- **Fuente de Datos:** Movimientos de salida con motivo muerte
- **Factores Determinantes:** Enfermedades, nutriciÃ³n, clima, accidentes, depredadores
- **Rangos Operativos:**
  - **Normal** (green): < 3% â€” mortalidad controlada [min: 0, max: 3]
  - **Alerta** (yellow): 3-5% â€” investigar causas [min: 3, max: 5]
  - **CrÃ­tico** (red): â‰¥ 5% â€” intervenciÃ³n sanitaria urgente [min: 5, max: 101]
- **Métricas Relacionadas:** `salud_general`, `enfermos_activos`

#### DetecciÃ³n de anomalÃ­as (`deteccion_anomalias`)
- **Descripción Corta:** Valores atÃ­picos en datos productivos
- **Definición Técnica:** Alertas automÃ¡ticas de caÃ­da de producciÃ³n. Leche: el total del Ãºltimo dÃ­a de ordeÃ±o de cada vaca se compara con sus 7 dÃ­as de ordeÃ±o anteriores (Ãºltimos 30 dÃ­as). Carne: animales cuyo Ãºltimo pesaje (vs. un pesaje â‰¥ 14 dÃ­as antes) muestra pÃ©rdida de mÃ¡s de 0.3 kg/dÃ­a.
- **Fórmula de Cálculo:** `Leche: alerta si (media 7 dÃ­as âˆ’ Ãºltimo dÃ­a) Ã· Ïƒ â‰¥ 2 o caÃ­da â‰¥ 25%; crÃ­tica si â‰¥ 3Ïƒ o â‰¥ 40%. Carne: alerta si GDP < âˆ’0.3 kg/dÃ­a; crÃ­tica si â‰¤ âˆ’0.8`
- **Unidad de Medida:** `eventos`
- **Fuente de Datos:** Algoritmo de detecciÃ³n sobre datos histÃ³ricos
- **Factores Determinantes:** Calidad de datos, frecuencia de registros, sensibilidad configurada
- **Métricas Relacionadas:** `salud_general`, `proyeccion_produccion`

#### Frecuencia de enfermedades (`frecuencia_enfermedades`)
- **Descripción Corta:** Enfermedades mÃ¡s comunes en el perÃ­odo
- **Definición Técnica:** Ranking de las 5 enfermedades con mÃ¡s registros en el perÃ­odo (nombre normalizado: sin distinguir mayÃºsculas ni espacios). Cuenta registros, no animales distintos.
- **Unidad de Medida:** `casos`
- **Fuente de Datos:** Registros del mÃ³dulo de enfermedades
- **Factores Determinantes:** Clima, bioseguridad, densidad animal, programa preventivo
- **Métricas Relacionadas:** `enfermos_activos`, `mortalidad`

#### Mortalidad Neonatal (`mortalidad_neonatal`)
- **Descripción Corta:** Terneros nacidos vivos que murieron en sus primeros 30 dÃ­as
- **Definición Técnica:** Porcentaje de los terneros nacidos vivos en los Ãºltimos 365 dÃ­as que murieron (salida con motivo muerte) dentro de sus primeros 30 dÃ­as de vida. No incluye mortinatos porque el sistema no los registra como animales.
- **Fórmula de Cálculo:** `(Nacidos vivos en 365 dÃ­as que murieron â‰¤ 30 dÃ­as de edad Ã· Nacidos vivos en 365 dÃ­as) Ã— 100`
- **Unidad de Medida:** `%`
- **Fuente de Datos:** Registros de nacimientos y muertes en mÃ³dulo de animales
- **Factores Determinantes:** Toma de calostro en primeras 6 horas, desinfecciÃ³n de ombligo, diarreas neonatales, distocias
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN / Manual de Crianza de Terneros (2024) | Promedio: 6.5 | Top 10%: 2
- **Rangos Operativos:**
  - **Excelente** (green): < 3% â€” excelente manejo de pariciones, higiene y calostro [min: 0, max: 3]
  - **Aceptable** (yellow): 3-7% â€” rango promedio nacional; supervisar higiene en maternidad [min: 3, max: 7]
  - **CrÃ­tico** (red): â‰¥ 7% â€” auditar protocolo de calostro, diarreas y ombligos [min: 7, max: 101]
- **Métricas Relacionadas:** `mortalidad`, `terneros_mes`, `partos_mes`

#### Cobertura de VacunaciÃ³n (`cobertura_vacunacion`)
- **Descripción Corta:** Porcentaje del hato con vacunas al dÃ­a
- **Definición Técnica:** Salud (Mortalidad y Cobertura): animales activos con al menos una vacuna en los Ãºltimos 12 meses Ã· animales activos. Cumplimiento ICA: promedio de la cobertura obligatoria de fiebre aftosa (dosis en los Ãºltimos 6 meses, todo el hato) y brucelosis (dosis Ãºnica, hembras de 3 meses o mÃ¡s). Los nombres se reconocen aunque estÃ©n escritos de forma libre ("Fiebre Aftosa", "Lote aftosa").
- **Fórmula de Cálculo:** `(Animales activos vacunados en el ciclo vigente Ã· Animales activos sujetos a la vacuna) Ã— 100`
- **Unidad de Medida:** `%`
- **Fuente de Datos:** Registros de vacunaciones y certificados RUV del ICA
- **Factores Determinantes:** Calendario de ciclos oficiales FedegÃ¡n-ICA, disponibilidad de biolÃ³gicos, logÃ­stica de corral
- **Rangos Operativos:**
  - **Riesgo sanitario** (red): < 80% â€” hato susceptible a brotes y sanciones regulatorias [min: 0, max: 80]
  - **Vulnerable** (yellow): 80-89% â€” brechas en el censo vacunal; vacunar remanentes [min: 80, max: 90]
  - **Inmunidad de hato** (green): â‰¥ 90% â€” protecciÃ³n sÃ³lida y cumplimiento normativo [min: 90, max: 101]
- **Métricas Relacionadas:** `vacunas_aplicadas`, `vacunas_pendientes`, `cumplimiento_ica`

#### Alertas de Brote EpidemiolÃ³gico (`alerta_brote`)
- **Descripción Corta:** DetecciÃ³n temprana de conglomerados de enfermedades en el hato
- **Definición Técnica:** Alerta cuando una misma enfermedad (nombre normalizado) afecta a 3 o mÃ¡s animales distintos en los Ãºltimos 30 dÃ­as. Gravedad: 3 animales = leve, 4 = moderada, 5 o mÃ¡s = severa. No compara contra una lÃ­nea base endÃ©mica de la finca.
- **Fórmula de Cálculo:** `NÂ° de animales distintos con la misma enfermedad en 30 dÃ­as â‰¥ 3`
- **Unidad de Medida:** `alertas`
- **Fuente de Datos:** MÃ³dulo de diagnÃ³stico clÃ­nico y eventos de enfermedades
- **Factores Determinantes:** Clima lluvioso, contaminaciÃ³n de potreros, fallas en desinfecciÃ³n de ordeÃ±o, hacinamiento
- **Métricas Relacionadas:** `enfermos_activos`, `frecuencia_enfermedades`, `total_tratamientos`

#### Incidencia Sanitaria por Lote (`top_lotes_incidencia`)
- **Descripción Corta:** Lotes con mayor concentraciÃ³n de casos clÃ­nicos y tratamientos
- **Definición Técnica:** Porcentaje de los animales activos de cada lote que tuvieron al menos un diagnÃ³stico de enfermedad en el perÃ­odo (incidencia acumulada). Se usa el lote actual del animal. Permite identificar problemas de infraestructura (encharcamientos, bebederos) o de nutriciÃ³n focalizados.
- **Fórmula de Cálculo:** `(Animales distintos del lote con enfermedad en el perÃ­odo Ã· Animales activos del lote) Ã— 100`
- **Unidad de Medida:** `casos`
- **Fuente de Datos:** Cruce entre eventos de salud y asignaciÃ³n de lote del animal
- **Factores Determinantes:** Densidad animal en el lote, sanidad de potreros compartidos, estado inmunitario
- **Métricas Relacionadas:** `enfermos_activos`, `frecuencia_enfermedades`

---

### Categoría: Gestión de Potreros & Pastoreo (6 métricas)

#### Ãndice de ocupaciÃ³n de potreros (`indice_ocupacion_potreros`)
- **Descripción Corta:** Porcentaje de potreros ocupados
- **Definición Técnica:** Porcentaje de potreros ocupados por animales a la fecha de hoy respecto al total de potreros. Es un valor actual: no depende del filtro de fechas.
- **Fórmula de Cálculo:** `(Potreros ocupados Ã· Total potreros) Ã— 100`
- **Explicación Metodológica:** En pastoreo rotacional el porcentaje ocupado es naturalmente bajo: con 30 dÃ­as de descanso y 3 dÃ­as de ocupaciÃ³n solo ~10% de los potreros estÃ¡ ocupado a la vez. Un valor alto indica descanso insuficiente.
- **Unidad de Medida:** `%`
- **Fuente de Datos:** Registros de estado de potreros
- **Factores Determinantes:** Capacidad de carga, rotaciÃ³n, Ã©poca del aÃ±o, nÃºmero de animales
- **Métricas Relacionadas:** `tiempo_potrero`, `rotacion_promedio`

#### Tiempo promedio en potrero (`tiempo_potrero`)
- **Descripción Corta:** DÃ­as promedio de estancia por potrero
- **Definición Técnica:** Promedio de dÃ­as que un lote permanece en un potrero (de la entrada a la salida). Solo cuenta estancias cerradas cuya salida ocurre en el perÃ­odo; las ocupaciones aÃºn abiertas se ven en "Riesgo de sobrepastoreo".
- **Fórmula de Cálculo:** `Î£ (fecha salida âˆ’ fecha entrada de cada estancia cerrada) Ã· NÂ° de estancias`
- **Unidad de Medida:** `dÃ­as`
- **Fuente de Datos:** Registros de entradas y salidas de pastoreo
- **Factores Determinantes:** TamaÃ±o del potrero, carga animal, crecimiento del pasto, sistema de rotaciÃ³n
- **Rangos Operativos:**
  - **Muy corto** (yellow): < 1 dÃ­a â€” franjas diarias; verificar registros [min: 0, max: 1]
  - **Ã“ptimo** (green): 1-7 dÃ­as â€” rotaciÃ³n intensiva (el pasto no alcanza a rebrotar durante la ocupaciÃ³n) [min: 1, max: 7]
  - **Aceptable** (yellow): 7-21 dÃ­as â€” rotaciÃ³n moderada; el animal consume el rebrote [min: 7, max: 21]
  - **Prolongado** (red): > 21 dÃ­as â€” riesgo de sobrepastoreo y degradaciÃ³n de la pradera [min: 21, max: 9999]
- **Métricas Relacionadas:** `rotacion_promedio`, `indice_ocupacion_potreros`

#### PerÃ­odo de descanso (rotaciÃ³n) (`rotacion_promedio`)
- **Descripción Corta:** DÃ­as de descanso entre ocupaciones de un potrero
- **Definición Técnica:** DÃ­as promedio que un potrero permanece en descanso entre la salida de un lote y la siguiente entrada de cualquier lote. Determina si el pasto alcanza a recuperarse.
- **Fórmula de Cálculo:** `Î£ (fecha de entrada âˆ’ fecha de la salida anterior en el mismo potrero) Ã· NÂ° de descansos`
- **Explicación Metodológica:** Los eventos de cada potrero se procesan en orden cronolÃ³gico; se cuentan los descansos cuya nueva entrada ocurre en el perÃ­odo.
- **Unidad de Medida:** `dÃ­as`
- **Fuente de Datos:** Registros de entradas y salidas de pastoreo
- **Factores Determinantes:** NÃºmero de potreros, tamaÃ±o, crecimiento del pasto, carga animal
- **Rangos Operativos:**
  - **Insuficiente** (red): < 21 dÃ­as â€” el pasto no alcanza a recuperarse (riesgo de degradaciÃ³n) [min: 0, max: 21]
  - **Ã“ptimo** (green): 21-45 dÃ­as â€” descanso tÃ­pico para gramÃ­neas tropicales (Brachiaria, Guinea) segÃºn Ã©poca [min: 21, max: 45]
  - **Prolongado** (yellow): > 45 dÃ­as â€” pasto sobremaduro, menor calidad nutricional [min: 45, max: 9999]
- **Métricas Relacionadas:** `tiempo_potrero`, `indice_ocupacion_potreros`

#### Top potreros por rendimiento (`top_potreros`)
- **Descripción Corta:** Potreros mÃ¡s productivos
- **Definición Técnica:** Ranking de potreros por litros de leche ordeÃ±ados en el perÃ­odo por hectÃ¡rea de potrero (el Ã¡rea se registra en mÂ² y se convierte a ha). Es un total del perÃ­odo, no un valor anual. Los potreros sin Ã¡rea registrada no se grafican.
- **Fórmula de Cálculo:** `Î£ litros del perÃ­odo asociados al potrero Ã· (Ã¡rea mÂ² Ã· 10.000)`
- **Unidad de Medida:** `ranking`
- **Fuente de Datos:** Datos de producciÃ³n cruzados con potreros
- **Factores Determinantes:** Tipo de pasto, fertilidad del suelo, manejo, carga animal
- **Métricas Relacionadas:** `kg_carne_ha`, `litros_leche_ha`, `rotacion_promedio`

#### Riesgo de Sobrepastoreo en Potreros (`top_sobrepastoreo`)
- **Descripción Corta:** Ranking de potreros con permanencia animal excesiva o descanso insuficiente
- **Definición Técnica:** Potreros ocupados hoy ordenados por dÃ­as continuos de ocupaciÃ³n desde el ingreso del lote actual. MÃ¡s de 30 dÃ­as de ocupaciÃ³n continua indica riesgo de sobrepastoreo y degradaciÃ³n de la pradera. Es un valor actual: no depende del filtro de fechas.
- **Fórmula de Cálculo:** `Hoy âˆ’ fecha de ingreso del lote actual al potrero`
- **Unidad de Medida:** `dÃ­as`
- **Fuente de Datos:** MÃ³dulo de rotaciÃ³n de potreros y registros de pastoreo
- **Factores Determinantes:** TamaÃ±o del lote, oferta forrajera, diseÃ±o de callejones, sistema rotacional Voisin
- **Métricas Relacionadas:** `indice_ocupacion_potreros`, `tiempo_potrero`, `top_potreros`

#### Ausentismo Animal por RFID (`rfid_ausentismo`)
- **Descripción Corta:** Horas transcurridas sin detecciÃ³n de la seÃ±al RFID del animal
- **Definición Técnica:** Tiempo transcurrido desde la Ãºltima lectura RFID de cada animal ACTIVO (los vendidos o muertos no se listan). Niveles: â‰¥ 6 h atenciÃ³n, â‰¥ 24 h alerta, â‰¥ 48 h crÃ­tico; puede indicar extravÃ­o, atrapamiento, hurto o falla de la chapeta/antena.
- **Fórmula de Cálculo:** `Ahora âˆ’ fecha de la Ãºltima lectura RFID del animal`
- **Unidad de Medida:** `horas`
- **Fuente de Datos:** Lecturas de antenas RFID y telemetrÃ­a de potrero
- **Factores Determinantes:** Cobertura de antenas, hÃ¡bitos de pastoreo, estado de la chapeta RFID
- **Métricas Relacionadas:** `salud_general`, `enfermos_activos`

---

### Categoría: Eficiencia Productiva & Densidad (8 métricas)

#### Kg carne/ha/aÃ±o (`kg_carne_ha`)
- **Descripción Corta:** Kilogramos de peso vivo vendidos por hectÃ¡rea en los Ãºltimos 12 meses
- **Definición Técnica:** Peso vivo vendido en los Ãºltimos 365 dÃ­as por hectÃ¡rea de la finca. Es un indicador de extracciÃ³n de carne (no de producciÃ³n): no descuenta el peso de los animales comprados ni suma la ganancia de los animales que siguen en la finca.
- **Fórmula de Cálculo:** `Î£ (peso de los animales vendidos en los Ãºltimos 365 dÃ­as) Ã· Ãrea total (ha)`
- **Explicación Metodológica:** LimitaciÃ³n: el sistema no guarda el peso al momento de la venta; se usa el Ãºltimo peso registrado del animal. La producciÃ³n real de carne serÃ­a (kg vendidos âˆ’ kg comprados + Î” peso del inventario) Ã· ha.
- **Unidad de Medida:** `kg/ha/aÃ±o`
- **Fuente de Datos:** Registros de ventas de animales y Ã¡rea configurada de la finca
- **Factores Determinantes:** Calidad de pastos, carga animal, genÃ©tica, suplementaciÃ³n, tasa de extracciÃ³n
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN / MADR Colombia (2024) | Promedio: 180 | Top 10%: 350
- **Rangos Operativos:**
  - **Bajo** (red): < 150 kg/ha/aÃ±o â€” requiere mejora en manejo [min: 0, max: 150]
  - **Aceptable** (yellow): 150-300 kg/ha/aÃ±o â€” promedio colombiano [min: 150, max: 300]
  - **Excelente** (green): â‰¥ 300 kg/ha/aÃ±o â€” producciÃ³n intensiva eficiente [min: 300, max: 99999]
- **Métricas Relacionadas:** `litros_leche_ha`, `carga_animal`, `carga_animal_ugm`, `tasa_extraccion`

#### Litros leche/ha/aÃ±o (`litros_leche_ha`)
- **Descripción Corta:** Litros de leche producidos por hectÃ¡rea al aÃ±o
- **Definición Técnica:** Leche producida en los Ãºltimos 365 dÃ­as por hectÃ¡rea de la finca. Es el indicador de eficiencia mÃ¡s importante para sistemas lecheros.
- **Fórmula de Cálculo:** `Î£ (litros ordeÃ±ados en los Ãºltimos 365 dÃ­as) Ã· Ãrea total (ha)`
- **Unidad de Medida:** `L/ha/aÃ±o`
- **Fuente de Datos:** CÃ¡lculo derivado de producciÃ³n y datos de la finca
- **Factores Determinantes:** Raza, sistema de pastoreo, suplementaciÃ³n, carga animal
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN / MADR Colombia (2024) | Promedio: 4500 | Top 10%: 9000
- **Rangos Operativos:**
  - **Bajo** (red): < 3,000 L/ha/aÃ±o [min: 0, max: 3000]
  - **Aceptable** (yellow): 3,000-7,000 L/ha/aÃ±o â€” promedio nacional [min: 3000, max: 7000]
  - **Excelente** (green): â‰¥ 7,000 L/ha/aÃ±o [min: 7000, max: 999999]
- **Métricas Relacionadas:** `kg_carne_ha`, `rendimiento_promedio_leche`, `carga_animal`

#### Carga animal (cabezas/ha) (`carga_animal`)
- **Descripción Corta:** Cabezas de ganado por hectÃ¡rea
- **Definición Técnica:** NÃºmero promedio de cabezas de ganado bovino activas por cada hectÃ¡rea en la finca. Mide la densidad poblacional fÃ­sica del hato en relaciÃ³n con el Ã¡rea.
- **Fórmula de Cálculo:** `Total animales activos Ã· Ãrea total (ha)`
- **Unidad de Medida:** `anim/ha`
- **Fuente de Datos:** Inventario bovino activo y Ã¡rea configurada de la finca
- **Factores Determinantes:** Disponibilidad de forraje, rotaciÃ³n de potreros, fertilidad del suelo, suplementaciÃ³n
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN Colombia (2024) | Promedio: 0.9 | Top 10%: 2.5
- **Rangos Operativos:**
  - **SubutilizaciÃ³n** (red): < 0.5 anim/ha â€” Ã¡rea muy subutilizada o Ã¡rea de la finca mal configurada [min: 0, max: 0.5]
  - **Extensiva** (yellow): 0.5-1.0 anim/ha â€” ganaderÃ­a extensiva tradicional (promedio nacional â‰ˆ 0.9) [min: 0.5, max: 1]
  - **Ã“ptima** (green): 1.0-2.5 anim/ha â€” pastoreo rotacional / semi-intensivo [min: 1, max: 2.5]
  - **Alta** (yellow): 2.5-3.5 anim/ha â€” solo sostenible con praderas mejoradas o suplementaciÃ³n [min: 2.5, max: 3.5]
  - **Sobrepastoreo** (red): > 3.5 anim/ha â€” riesgo de degradaciÃ³n del suelo y la pradera [min: 3.5, max: 9999]
- **Métricas Relacionadas:** `carga_animal_ugm`, `kg_carne_ha`, `litros_leche_ha`, `indice_ocupacion_potreros`

#### Tasa de extracciÃ³n (`tasa_extraccion`)
- **Descripción Corta:** Porcentaje del hato vendido en los Ãºltimos 12 meses
- **Definición Técnica:** Porcentaje del inventario promedio que se vendiÃ³ durante los Ãºltimos 365 dÃ­as. Refleja la eficiencia en la renovaciÃ³n y comercializaciÃ³n del hato. Las muertes no son extracciÃ³n.
- **Fórmula de Cálculo:** `Animales distintos vendidos (365 dÃ­as) Ã· Inventario promedio Ã— 100`
- **Explicación Metodológica:** Inventario promedio â‰ˆ (inventario inicial + inventario final) Ã· 2, con inventario inicial â‰ˆ activos actuales + vendidos. Es una aproximaciÃ³n: no descuenta nacimientos, compras ni muertes del perÃ­odo.
- **Unidad de Medida:** `%`
- **Fuente de Datos:** Registros de ventas de animales e inventario activo
- **Factores Determinantes:** Estrategia de ventas, ciclo productivo, precios del mercado
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN Colombia (2024) | Promedio: 18 | Top 10%: 28
- **Rangos Operativos:**
  - **Baja** (red): < 15% â€” lenta renovaciÃ³n del hato [min: 0, max: 15]
  - **Aceptable** (yellow): 15-22% â€” promedio [min: 15, max: 22]
  - **Ã“ptima** (green): â‰¥ 22% â€” alta rotaciÃ³n [min: 22, max: 101]
- **Métricas Relacionadas:** `kg_carne_ha`, `carga_animal`

#### Benchmarking (`benchmarking`)
- **Descripción Corta:** ComparaciÃ³n de tu finca contra valores de referencia
- **Definición Técnica:** ComparaciÃ³n de los indicadores de tu finca (producciÃ³n, reproducciÃ³n, salud, costos) contra valores de referencia orientativos del sector ganadero colombiano. Los valores de referencia son estimaciones orientativas, no cifras oficiales.
- **Unidad de Medida:** `%`
- **Fuente de Datos:** Valores de referencia orientativos (no oficiales)
- **Factores Determinantes:** ProducciÃ³n, sanidad, costos, nutriciÃ³n y manejo general
- **Métricas Relacionadas:** `costo_litro_leche`, `costo_kg_carne`, `tasa_prenhez`, `carga_animal`

#### Eficiencia alimentaria (`eficiencia_alimentaria`)
- **Descripción Corta:** ConversiÃ³n de alimento en producciÃ³n
- **Definición Técnica:** Leche: litros producidos por cada kg de concentrado suministrado en los ordeÃ±os con concentrado registrado (ventana de 90 dÃ­as). Carne: no se mide conversiÃ³n alimenticia (el sistema no registra kg de alimento por animal); la pestaÃ±a Avanzado muestra en su lugar la GDP del hato.
- **Fórmula de Cálculo:** `Leche: Î£ litros Ã· Î£ kg de concentrado (registros con concentrado)`
- **Explicación Metodológica:** No usa materia seca (MS) ni forraje consumido; es una relaciÃ³n leche/concentrado orientativa. Valores tÃ­picos: 2-3 L por kg de concentrado.
- **Unidad de Medida:** `L/kg`
- **Fuente de Datos:** Registros de ordeÃ±o con kilo_concentrado
- **Factores Determinantes:** Calidad del alimento, genÃ©tica, estado fisiolÃ³gico, clima
- **Métricas Relacionadas:** `costo_litro_leche`, `rendimiento_promedio_leche`

#### CorrelaciÃ³n de Pearson (`correlacion_pearson`)
- **Descripción Corta:** RelaciÃ³n estadÃ­stica entre variables
- **Definición Técnica:** Coeficiente de correlaciÃ³n de Pearson que mide la relaciÃ³n lineal entre dos variables productivas (ej: alimentaciÃ³n vs producciÃ³n). VarÃ­a entre -1 y +1.
- **Fórmula de Cálculo:** `r = Î£((xi - xÌ„)(yi - È³)) Ã· âˆš(Î£(xi - xÌ„)Â² Ã— Î£(yi - È³)Â²)`
- **Explicación Metodológica:** Valores cercanos a +1 indican correlaciÃ³n positiva fuerte; cercanos a -1, correlaciÃ³n negativa; cercanos a 0, sin correlaciÃ³n.
- **Unidad de Medida:** `r`
- **Fuente de Datos:** CÃ¡lculo estadÃ­stico sobre datos productivos de la finca
- **Factores Determinantes:** Calidad de los datos, nÃºmero de observaciones, variables analizadas
- **Rangos Operativos:**
  - **DÃ©bil/Sin relaciÃ³n** (red): |r| < 0.3 â€” variables prÃ¡cticamente independientes (o relaciÃ³n negativa) [min: -1, max: 0.3]
  - **Moderada** (yellow): 0.3-0.7 â€” relaciÃ³n parcial entre variables [min: 0.3, max: 0.7]
  - **Fuerte positiva** (green): â‰¥ 0.7 â€” las variables crecen juntas [min: 0.7, max: 1.01]
- **Métricas Relacionadas:** `eficiencia_alimentaria`

#### Carga Animal en UGM/ha (`carga_animal_ugm`)
- **Descripción Corta:** Unidades Gran Ganado (450 kg) por hectÃ¡rea disponible
- **Definición Técnica:** Indicador zootÃ©cnico normalizado que convierte todas las categorÃ­as de animales (terneros, novillos, vacas, toros) a Unidades Gran Ganado (1 UGM = 450 kg de peso vivo) por cada hectÃ¡rea Ãºtil de pastoreo.
- **Fórmula de Cálculo:** `Î£ UGM de los animales activos Ã· Ãrea total (ha); UGM del animal = peso Ã· 450 kg (0.8 UGM si no tiene peso)`
- **Explicación Metodológica:** Normaliza animales de distintos pesos para evaluar la verdadera presiÃ³n de pastoreo sin distorsiÃ³n por edad. Los animales sin peso registrado se cuentan con 0.8 UGM (promedio de un hato mixto) en lugar de 0.
- **Unidad de Medida:** `UGM/ha`
- **Fuente de Datos:** Inventario de animales activos, pesajes y catastro de potreros
- **Factores Determinantes:** Rendimiento de forraje, fertilizaciÃ³n de praderas, divisiÃ³n de potreros, lluvias
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN - Censo Nacional Pecuario (2024) | Promedio: 0.9 | Top 10%: 2.2
- **Rangos Operativos:**
  - **SubutilizaciÃ³n** (red): < 0.5 UGM/ha â€” recurso forrajero subutilizado o Ã¡rea mal configurada [min: 0, max: 0.5]
  - **Extensiva** (yellow): 0.5-1.0 UGM/ha â€” pastoreo tradicional extensivo [min: 0.5, max: 1]
  - **Ã“ptima** (green): 1.0-2.5 UGM/ha â€” buen aprovechamiento en pastoreo rotacional [min: 1, max: 2.5]
  - **Alta** (yellow): 2.5-3.5 UGM/ha â€” exige praderas mejoradas o suplementaciÃ³n [min: 2.5, max: 3.5]
  - **Sobrepastoreo** (red): > 3.5 UGM/ha â€” riesgo de degradaciÃ³n de la pradera [min: 3.5, max: 9999]
- **Métricas Relacionadas:** `carga_animal`, `kg_carne_ha`, `litros_leche_ha`, `indice_ocupacion_potreros`

---

### Categoría: Finanzas & Economía Ganadera (14 métricas)

#### Ingresos (`ingresos`)
- **Descripción Corta:** Total de entradas de dinero en el perÃ­odo
- **Definición Técnica:** Suma de los movimientos de ingreso del perÃ­odo (ventas de leche, animales, inventario y otros). Excluye transferencias entre cuentas propias y prÃ©stamos recibidos (financiaciÃ³n), y resta las devoluciones de ventas.
- **Fórmula de Cálculo:** `Î£ ingresos âˆ’ devoluciones de venta (sin transferencias internas ni prÃ©stamos)`
- **Unidad de Medida:** `COP`
- **Fuente de Datos:** Registros del mÃ³dulo de finanzas (movimientos econÃ³micos)
- **Factores Determinantes:** VolÃºmenes de producciÃ³n, precios de mercado, estrategia comercial
- **Métricas Relacionadas:** `egresos`, `balance`, `rentabilidad`

#### Egresos (`egresos`)
- **Descripción Corta:** Total de salidas de dinero en el perÃ­odo
- **Definición Técnica:** Suma de los movimientos de egreso del perÃ­odo (insumos, alimentaciÃ³n, salud, mano de obra, compras de animales, etc.). Excluye transferencias entre cuentas propias y pagos de prÃ©stamos (financiaciÃ³n), y resta las devoluciones de compras.
- **Fórmula de Cálculo:** `Î£ egresos âˆ’ devoluciones de compra (sin transferencias internas ni pagos de prÃ©stamos)`
- **Unidad de Medida:** `COP`
- **Fuente de Datos:** Registros del mÃ³dulo de finanzas (movimientos econÃ³micos)
- **Factores Determinantes:** Escala de operaciÃ³n, precios de insumos, eficiencia del manejo
- **Métricas Relacionadas:** `ingresos`, `balance`, `costo_litro_leche`

#### Balance (`balance`)
- **Descripción Corta:** Diferencia entre ingresos y egresos
- **Definición Técnica:** Resultado financiero del perÃ­odo: ingresos menos egresos. Un valor positivo indica ganancia; negativo indica pÃ©rdida.
- **Fórmula de Cálculo:** `Total Ingresos - Total Egresos`
- **Explicación Metodológica:** Las tarjetas y el grÃ¡fico "Balance del PerÃ­odo" usan la misma regla: sin transferencias internas ni financiaciÃ³n (prÃ©stamos) y con devoluciones neteadas.
- **Unidad de Medida:** `COP`
- **Fuente de Datos:** CÃ¡lculo a partir de movimientos financieros
- **Factores Determinantes:** Todos los factores de ingresos y costos
- **Métricas Relacionadas:** `ingresos`, `egresos`, `rentabilidad`

#### Valor inventario (`valor_inventario`)
- **Descripción Corta:** Valor total de insumos y suministros
- **Definición Técnica:** Valor monetario actual de todos los artÃ­culos y suministros disponibles en el inventario de la finca (alimentos, medicinas, insumos). Es un valor a la fecha: no depende del filtro de fechas.
- **Fórmula de Cálculo:** `Î£ (cantidad Ã— costo por unidad de cada artÃ­culo)`
- **Unidad de Medida:** `COP`
- **Fuente de Datos:** Registros del mÃ³dulo de inventario
- **Factores Determinantes:** Compras, consumos, precios de mercado de insumos
- **Métricas Relacionadas:** `ingresos`, `egresos`

#### Valor hato (`valor_hato`)
- **Descripción Corta:** Valor comercial estimado del ganado
- **Definición Técnica:** Valor comercial estimado de los animales activos ubicados en la finca, a la fecha. Los animales sin precio propio se valoran con el precio de referencia configurado (por defecto $8.000/kg) y los animales sin peso valen $0; la tarjeta indica cuÃ¡ntos animales estÃ¡n en cada caso.
- **Fórmula de Cálculo:** `Î£ (peso del animal Ã— valor_kilo del animal, o precio de referencia si no tiene)`
- **Unidad de Medida:** `COP`
- **Fuente de Datos:** Inventario animal (peso y valor por kg) y configuraciÃ³n de la finca
- **Factores Determinantes:** NÃºmero de animales, peso, precios del mercado ganadero, raza, categorÃ­a
- **Métricas Relacionadas:** `peso_promedio_ganado`, `tasa_extraccion`

#### Costo por litro de leche (`costo_litro_leche`)
- **Descripción Corta:** Costo operativo asignado a la producciÃ³n de un litro de leche
- **Definición Técnica:** Costo de producciÃ³n por litro: egresos de los Ãºltimos 12 meses asignados a la actividad lechera dividido entre los litros producidos en el mismo perÃ­odo.
- **Fórmula de Cálculo:** `(Egresos 12 meses Ã— participaciÃ³n de leche) Ã· Litros producidos 12 meses`
- **Explicación Metodológica:** En lecherÃ­a especializada se asigna el 100% de los egresos. En doble propÃ³sito o mixtas, la participaciÃ³n de carne = ingresos por venta de animales Ã· ingresos totales (acotada entre 15% y 85%); el resto se asigna a leche.
- **Unidad de Medida:** `COP/L`
- **Fuente de Datos:** CÃ¡lculo a partir de movimientos financieros y producciÃ³n de leche
- **Factores Determinantes:** AlimentaciÃ³n, mano de obra, sanidad, insumos, infraestructura, escala
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN / Observatorio Lechero (2024) | Promedio: 900 | Top 10%: 650
- **Rangos Operativos:**
  - **Excelente** (green): < $700 COP/L â€” alta eficiencia [min: 0, max: 700]
  - **Aceptable** (yellow): $700-$1,100 COP/L â€” promedio colombiano [min: 700, max: 1100]
  - **Alto** (red): â‰¥ $1,100 COP/L â€” requiere optimizaciÃ³n [min: 1100, max: 99999999]
- **Métricas Relacionadas:** `costo_kg_carne`, `rentabilidad`, `rendimiento_promedio_leche`, `produccion_leche_total`

#### Costo por kilo de carne (`costo_kg_carne`)
- **Descripción Corta:** Costo operativo asignado por kilo de carne extraÃ­do
- **Definición Técnica:** Costo por kilogramo de peso vivo vendido: egresos de los Ãºltimos 12 meses asignados a carne dividido entre los kg vendidos en el mismo perÃ­odo.
- **Fórmula de Cálculo:** `(Egresos 12 meses Ã— participaciÃ³n de carne) Ã· kg vendidos 12 meses`
- **Explicación Metodológica:** En fincas de ceba se asigna el 100% de los egresos. En fincas mixtas, la participaciÃ³n de carne = ingresos por venta de animales Ã· ingresos totales (acotada entre 15% y 85%). Los kg vendidos usan el Ãºltimo peso registrado del animal (el sistema no guarda el peso de venta).
- **Unidad de Medida:** `COP/kg`
- **Fuente de Datos:** CÃ¡lculo a partir de registros financieros y ventas de ganado
- **Factores Determinantes:** Costos de compra de animales, alimentaciÃ³n, sanidad, manejo de pasturas
- **Valores de Referencia (Benchmark):** Fuente: FEDEGAN Colombia (2024) | Promedio: 5800 | Top 10%: 4200
- **Rangos Operativos:**
  - **Excelente** (green): < $4,500 COP/kg â€” excelente costo de producciÃ³n [min: 0, max: 4500]
  - **Aceptable** (yellow): $4,500-$6,500 COP/kg â€” promedio nacional [min: 4500, max: 6500]
  - **Alto** (red): â‰¥ $6,500 COP/kg â€” requiere revisiÃ³n de egresos [min: 6500, max: 99999999]
- **Métricas Relacionadas:** `costo_litro_leche`, `rentabilidad`, `kg_carne_ha`, `peso_promedio_ganado`

#### Margen por cabeza (`margen_cabeza`)
- **Descripción Corta:** Ganancia o pÃ©rdida por animal
- **Definición Técnica:** Margen de los Ãºltimos 12 meses (ingresos âˆ’ egresos) dividido por el nÃºmero de animales activos. Indica cuÃ¡nto aporta cada animal al resultado financiero.
- **Fórmula de Cálculo:** `(Ingresos 12 meses âˆ’ Egresos 12 meses) Ã· NÂ° de animales activos`
- **Unidad de Medida:** `COP/cabeza`
- **Fuente de Datos:** CÃ¡lculo derivado de finanzas e inventario
- **Factores Determinantes:** Todos los factores de productividad y costos
- **Métricas Relacionadas:** `rentabilidad`, `balance`, `carga_animal`

#### Rentabilidad (Margen Neto) (`rentabilidad`)
- **Descripción Corta:** Margen neto porcentual sobre los ingresos
- **Definición Técnica:** Margen neto de los Ãºltimos 12 meses: porcentaje de los ingresos que queda despuÃ©s de cubrir los egresos. No es un retorno sobre la inversiÃ³n (ROI).
- **Fórmula de Cálculo:** `((Ingresos âˆ’ Egresos) Ã· Ingresos) Ã— 100`
- **Explicación Metodológica:** Si no hubo ingresos y sÃ­ egresos, el margen no es calculable: se muestra "â€”" con la nota "sin ingresos".
- **Unidad de Medida:** `%`
- **Fuente de Datos:** CÃ¡lculo derivado de movimientos financieros (ingresos y egresos)
- **Factores Determinantes:** Precios de venta, eficiencia operativa, estructura de costos e insumos
- **Rangos Operativos:**
  - **PÃ©rdida** (red): < 0% â€” egresos superan los ingresos [min: -99999, max: 0]
  - **Marginal** (yellow): 0-20% â€” margen operativo ajustado [min: 0, max: 20]
  - **Rentable** (green): â‰¥ 20% â€” operaciÃ³n altamente rentable [min: 20, max: 101]
- **Métricas Relacionadas:** `balance`, `costo_litro_leche`, `costo_kg_carne`, `ingresos`, `egresos`

#### CategorÃ­as de gasto (`categorias_gasto`)
- **Descripción Corta:** DistribuciÃ³n de gastos por categorÃ­a
- **Definición Técnica:** Egresos del perÃ­odo agrupados por categorÃ­a (alimentaciÃ³n, mano de obra, insumos, compra de animales, etc.). Excluye las transferencias entre cuentas propias y los pagos de prÃ©stamos, y resta las devoluciones de compras.
- **Unidad de Medida:** `COP`
- **Fuente de Datos:** Registros de compras y gastos del mÃ³dulo financiero
- **Factores Determinantes:** Estructura de costos de la finca, escala, tipo de producciÃ³n
- **Métricas Relacionadas:** `egresos`, `costo_litro_leche`

#### Margen Bruto por HectÃ¡rea (`margen_hectarea`)
- **Descripción Corta:** Utilidad operativa neta generada por cada hectÃ¡rea de la finca
- **Definición Técnica:** Resultado econÃ³mico generado por cada hectÃ¡rea de tierra productiva. Permite evaluar la rentabilidad del suelo frente a otros usos agropecuarios o alternativas de arrendamiento.
- **Fórmula de Cálculo:** `(Total ingresos anuales - Total egresos anuales) / Ãrea total en hectÃ¡reas`
- **Explicación Metodológica:** Resta todos los costos operativos de los ingresos y divide el balance neto entre la superficie de la finca.
- **Unidad de Medida:** `COP/ha`
- **Fuente de Datos:** Registros econÃ³micos de ventas, compras y catastro de potreros
- **Factores Determinantes:** Carga animal, productividad forrajera, costos de insumos, precio de venta de leche y carne
- **Métricas Relacionadas:** `margen_cabeza`, `rentabilidad`, `ingresos`, `egresos`

#### Ratio Alimento / Ingreso (`alimento_ingreso_ratio`)
- **Descripción Corta:** Porcentaje de los ingresos por leche destinado a alimentaciÃ³n comprada
- **Definición Técnica:** ProporciÃ³n de los ingresos generados por la venta de leche que se gasta en concentrados, sales mineralizadas y suplementos alimenticios. Es vital para no sobrealimentar a pÃ©rdida.
- **Fórmula de Cálculo:** `(Costo total de suplementos y concentrados / Ingresos brutos por leche) Ã— 100`
- **Explicación Metodológica:** Calcula el peso porcentual del costo de alimentaciÃ³n externa sobre la facturaciÃ³n lechera.
- **Unidad de Medida:** `%`
- **Fuente de Datos:** MÃ³dulo financiero (compras de balanceados) y facturaciÃ³n de leche
- **Factores Determinantes:** Precio del concentrado, calidad de praderas, litros por vaca, precio pagado por litro de leche
- **Rangos Operativos:**
  - **Eficiente** (green): < 25% â€” alta base forrajera con suplementaciÃ³n controlada [min: 0, max: 25]
  - **Moderado** (yellow): 25-40% â€” nivel habitual en lecherÃ­a especializada; monitorear mÃ¡rgenes [min: 25, max: 40]
  - **Alerta financiera** (red): â‰¥ 40% â€” el alimento comprado consume el margen [min: 40, max: 99999]
- **Métricas Relacionadas:** `costo_litro_leche`, `rentabilidad`, `eficiencia_alimentaria`

#### Flujo de Caja Mensual (`flujo_caja_operativo`)
- **Descripción Corta:** Diferencia mensual entre entradas y salidas monetarias
- **Definición Técnica:** Saldo de cada mes calendario (ingresos âˆ’ egresos registrados en el mÃ³dulo financiero) de los Ãºltimos 6, 12 o 24 meses. Los meses sin movimientos aparecen en cero. Excluye las transferencias entre cuentas propias y netea las devoluciones de compras y ventas. SÃ­ incluye los prÃ©stamos recibidos y pagados, porque son dinero que entra y sale.
- **Fórmula de Cálculo:** `Î£ ingresos del mes âˆ’ Î£ egresos del mes (sin transferencias internas)`
- **Unidad de Medida:** `COP`
- **Fuente de Datos:** TesorerÃ­a y movimientos econÃ³micos de caja/banco
- **Factores Determinantes:** Estacionalidad de partos y ventas, plazos de pago a proveedores, regularidad del pago lechero
- **Métricas Relacionadas:** `ingresos`, `egresos`, `balance`

#### Valor Comercial Individual del Bovino (`top_animales_valor`)
- **Descripción Corta:** Valor monetario estimado de cada animal en pie en el mercado actual
- **Definición Técnica:** Valor estimado de cada animal activo: peso registrado en la ficha del animal Ã— valor por kilo registrado para ese animal. Los animales sin valor por kilo o sin peso no aparecen en el ranking.
- **Fórmula de Cálculo:** `Peso del animal (kg) Ã— Valor por kg del animal`
- **Unidad de Medida:** `COP`
- **Fuente de Datos:** MÃ³dulo de inventario animal, pesajes y precios configurados
- **Factores Determinantes:** Peso vivo, condiciÃ³n corporal, raza, precio nacional del ganado en pie
- **Métricas Relacionadas:** `valor_hato`, `peso_promedio_ganado`

---

### Categoría: Clima & Estrés Calórico (ITH) (6 métricas)

#### Ãndice de Temperatura-Humedad (ITH) (`ith`)
- **Descripción Corta:** EstrÃ©s calÃ³rico segÃºn temperatura y humedad
- **Definición Técnica:** Ãndice que combina temperatura y humedad relativa para estimar el estrÃ©s calÃ³rico de los bovinos. Se calcula con cada lectura de los sensores de la antena de cada potrero.
- **Fórmula de Cálculo:** `ITH = 0.8 Ã— T + (HR Ã· 100) Ã— (T âˆ’ 14.4) + 46.4`
- **Explicación Metodológica:** T = temperatura en Â°C, HR = humedad relativa en % (NRC, 1971). ClasificaciÃ³n de Armstrong (1994): < 72 confort, 72-78 leve, 79-88 moderado, 89-98 severo, â‰¥ 99 muy severo.
- **Unidad de Medida:** `ITH`
- **Fuente de Datos:** Lecturas de sensores climÃ¡ticos (antenas)
- **Factores Determinantes:** Temperatura, humedad relativa, sombra, ventilaciÃ³n
- **Rangos Operativos:**
  - **Confort** (green): < 72 â€” sin estrÃ©s calÃ³rico [min: 0, max: 72]
  - **Leve** (yellow): 72-78 â€” aumenta la frecuencia respiratoria; la producciÃ³n empieza a caer [min: 72, max: 79]
  - **Moderado** (red): 79-88 â€” caÃ­da significativa de leche y fertilidad; aplicar enfriamiento [min: 79, max: 89]
  - **Severo** (red): 89-98 â€” riesgo de golpe de calor; intervenciÃ³n inmediata [min: 89, max: 99]
  - **Muy severo** (red): â‰¥ 99 â€” riesgo de muerte [min: 99, max: 200]
- **Métricas Relacionadas:** `ith_confort`, `ith_leve`, `ith_moderado`, `ith_severo`

#### ITH Confort (`ith_confort`)
- **Descripción Corta:** Potreros con sensor en confort tÃ©rmico (ITH < 72)
- **Definición Técnica:** NÃºmero de potreros cuya lectura mÃ¡s reciente de ITH es menor a 72 (sin estrÃ©s calÃ³rico).
- **Fórmula de Cálculo:** `ITH = 0.8 Ã— T + (HR Ã· 100) Ã— (T âˆ’ 14.4) + 46.4`
- **Explicación Metodológica:** T = temperatura Â°C, HR = humedad relativa %. ITH < 72 = confort (Armstrong, 1994).
- **Unidad de Medida:** `potreros`
- **Fuente de Datos:** Ãšltima lectura de cada sensor climÃ¡tico por potrero
- **Factores Determinantes:** Temperatura, humedad relativa, sombra, ventilaciÃ³n
- **Métricas Relacionadas:** `ith`, `ith_leve`, `ith_moderado`, `ith_severo`

#### ITH Leve (`ith_leve`)
- **Descripción Corta:** EstrÃ©s calÃ³rico leve (ITH 72-78)
- **Definición Técnica:** Potreros cuya Ãºltima lectura de ITH estÃ¡ entre 72 y 78. Aumenta la frecuencia respiratoria y se reduce ligeramente el consumo de alimento.
- **Unidad de Medida:** `potreros`
- **Fuente de Datos:** Ãšltima lectura de cada sensor climÃ¡tico por potrero
- **Factores Determinantes:** Temperatura, humedad, sombra disponible
- **Métricas Relacionadas:** `ith`, `ith_confort`, `ith_moderado`

#### ITH Moderado (`ith_moderado`)
- **Descripción Corta:** EstrÃ©s calÃ³rico moderado (ITH 79-88)
- **Definición Técnica:** Potreros cuya Ãºltima lectura de ITH estÃ¡ entre 79 y 88. ReducciÃ³n significativa en producciÃ³n de leche y fertilidad; requiere medidas de enfriamiento.
- **Unidad de Medida:** `potreros`
- **Fuente de Datos:** Ãšltima lectura de cada sensor climÃ¡tico por potrero
- **Factores Determinantes:** Temperatura alta + alta humedad, falta de sombra
- **Métricas Relacionadas:** `ith`, `ith_leve`, `ith_severo`

#### ITH Severo (`ith_severo`)
- **Descripción Corta:** EstrÃ©s calÃ³rico severo (ITH 89-98) o muy severo (â‰¥ 99)
- **Definición Técnica:** Potreros cuya Ãºltima lectura de ITH es 89 o mÃ¡s. Riesgo de golpe de calor, caÃ­da drÃ¡stica de producciÃ³n y muerte; intervenciÃ³n inmediata.
- **Unidad de Medida:** `potreros`
- **Fuente de Datos:** Ãšltima lectura de cada sensor climÃ¡tico por potrero
- **Factores Determinantes:** Condiciones extremas de temperatura y humedad
- **Métricas Relacionadas:** `ith`, `ith_moderado`, `salud_general`

#### PÃ©rdida LÃ¡ctea por EstrÃ©s TÃ©rmico (ITH) (`ith_produccion_impacto`)
- **Descripción Corta:** Litros diarios de leche no producidos debido a exceso de calor y humedad
- **Definición Técnica:** ComparaciÃ³n empÃ­rica (90 dÃ­as) de la producciÃ³n por vaca-dÃ­a en los dÃ­as de estrÃ©s calÃ³rico contra los dÃ­as de confort, segÃºn el nivel de ITH mÃ¡s severo registrado ese dÃ­a en la finca. Referencia de literatura: se pierden ~0.2-0.5 L/vaca por cada punto de ITH sobre 72.
- **Fórmula de Cálculo:** `PÃ©rdida % = (L/vaca/dÃ­a en confort âˆ’ L/vaca/dÃ­a en dÃ­as con estrÃ©s) Ã· L/vaca/dÃ­a en confort Ã— 100`
- **Explicación Metodológica:** Requiere dÃ­as con y sin estrÃ©s y registros de ordeÃ±o esos mismos dÃ­as. Es una asociaciÃ³n: otros factores (Ã©poca, dÃ­as en lactancia) tambiÃ©n influyen.
- **Unidad de Medida:** `L/vaca/dÃ­a`
- **Fuente de Datos:** Cruza lecturas de sensores IoT / clima con registros de producciÃ³n de leche
- **Factores Determinantes:** ArborizaciÃ³n en potreros, sombrÃ­o artificial, ventilaciÃ³n en sala de espera, agua fresca disponible
- **Métricas Relacionadas:** `ith_confort`, `ith_moderado`, `ith_severo`, `produccion_leche_total`

---

### Categoría: Regulatorio & Entidades Sanitarias (3 métricas)

#### Cumplimiento ICA (`cumplimiento_ica`)
- **Descripción Corta:** Porcentaje de cumplimiento sanitario
- **Definición Técnica:** Ãndice interno de cumplimiento sanitario (no es una calificaciÃ³n oficial del ICA) que pondera tres componentes: trazabilidad (identificaciÃ³n electrÃ³nica), cobertura de vacunaciÃ³n obligatoria (aftosa y brucelosis) y guÃ­as de movilizaciÃ³n.
- **Fórmula de Cálculo:** `0.4 Ã— Trazabilidad + 0.4 Ã— Cobertura vacunaciÃ³n obligatoria + 0.2 Ã— GuÃ­as de movilizaciÃ³n`
- **Explicación Metodológica:** Si no hay movimientos que requieran guÃ­a, ese componente no aporta y los pesos se renormalizan (50% / 50%).
- **Unidad de Medida:** `%`
- **Fuente de Datos:** Inventario animal, vacunaciones y movimientos
- **Factores Determinantes:** Programa sanitario, registros actualizados, vacunaciÃ³n al dÃ­a
- **Rangos Operativos:**
  - **Incumple** (red): < 70% â€” riesgo de sanciÃ³n [min: 0, max: 70]
  - **Parcial** (yellow): 70-89% â€” pendientes por resolver [min: 70, max: 90]
  - **Cumple** (green): â‰¥ 90% â€” finca en regla [min: 90, max: 101]
- **Métricas Relacionadas:** `vacunas_pendientes`, `mortalidad`

#### Trazabilidad Sanitaria ICA (IdentificaciÃ³n) (`trazabilidad_ica`)
- **Descripción Corta:** Porcentaje de bovinos activos con identificaciÃ³n electrÃ³nica
- **Definición Técnica:** Porcentaje de los animales activos que tienen un microchip/identificador electrÃ³nico registrado. Es el componente de trazabilidad del Ã­ndice de cumplimiento; no verifica el registro oficial DIN/SINIGAN ante el ICA.
- **Fórmula de Cálculo:** `(Animales activos con microchip registrado Ã· Animales activos) Ã— 100`
- **Unidad de Medida:** `%`
- **Fuente de Datos:** Censo del mÃ³dulo de animales vs registros de chapeteo
- **Factores Determinantes:** Registro oportuno de nacimientos, colocaciÃ³n de chapetas, compras de animales con RUV
- **Rangos Operativos:**
  - **No conforme** (red): < 80% â€” incumplimiento de trazabilidad pecuaria [min: 0, max: 80]
  - **Regular** (yellow): 80-94% â€” animales pendientes por identificar [min: 80, max: 95]
  - **Conforme** (green): â‰¥ 95% â€” trazabilidad requerida para Buenas PrÃ¡cticas Ganaderas [min: 95, max: 101]
- **Métricas Relacionadas:** `cumplimiento_ica`, `guias_transporte_ica`

#### GuÃ­as Sanitarias de MovilizaciÃ³n (GSMI) (`guias_transporte_ica`)
- **Descripción Corta:** Porcentaje de movimientos de ganado amparados con GSMI oficial
- **Definición Técnica:** ProporciÃ³n de traslados, compras y ventas de bovinos que cuentan con su respectiva GuÃ­a Sanitaria de MovilizaciÃ³n Interna expedida a travÃ©s del sistema SIGMA del ICA.
- **Fórmula de Cálculo:** `(Ventas y traslados de los Ãºltimos 12 meses con guÃ­a registrada Ã· Ventas y traslados de los Ãºltimos 12 meses) Ã— 100`
- **Unidad de Medida:** `%`
- **Fuente de Datos:** MÃ³dulo de movimientos bovinos y compras/ventas de ganado
- **Factores Determinantes:** TrÃ¡mites en SIGMA-ICA, estado sanitario del predio (predio libre de brucelosis/tuberculosis)
- **Métricas Relacionadas:** `cumplimiento_ica`, `trazabilidad_ica`

---

