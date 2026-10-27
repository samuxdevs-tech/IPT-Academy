import json
import os

course_data = {
    "slug": "datagan-360-certificacion-maestra",
    "title": "DataGan 360: Programa Integral de Formación en Ganadería de Precisión",
    "subtitle": "De la Telemetría y Zootecnia Cuantitativa al Control Financiero y Trazabilidad Total",
    "description": "Programa técnico oficial estructurado para administradores, médicos veterinarios, zootécnicos y productores. Domina de punta a punta la plataforma DataGan 360 aprendiendo a calcular la capacidad de carga en UGM/ha, ganancia diaria de peso (GDP), eficiencia lechera, protocolos de IATF, costeo del hato y trazabilidad oficial.",
    "thumbnail": "https://pub-ac305c99ed4042c9976f0abc2d0123b3.r2.dev/images/datagan-course-cover-v2.jpeg?v=2",
    "instructor": {
        "name": "Iván Samuel Pérez Torrenegra & Equipo Técnico TecnoGan",
        "role": "Líder de Arquitectura Zootécnica y Fundador de IPT",
        "avatar": "/images/logo.webp"
    },
    "category": "Ganadería de Precisión y AgTech",
    "level": "Profesional / Aplicado",
    "rating": 4.96,
    "ratingsCount": 384,
    "published": True,
    "approxHours": "32 horas académicas",
    "progressionMode": "lesson_strict",
    "phase2Visible": True,
    "phase3Visible": True,
    "phase3Mode": "in_course",
    "whatYouWillLearn": [
        "Configurar y administrar integralmente la estructura física, potreros y lotes en DataGan 360.",
        "Calcular e interpretar métricas zootécnicas clave: UGM/ha, GDP, litros/vaca/día y tasa de extracción.",
        "Diseñar rotaciones de pastoreo intensivo basadas en aforos forrajeros y las leyes de André Voisin.",
        "Controlar la producción lechera AM/PM correlacionándola obligatoriamente con el potrero activo.",
        "Gestionar programas de biotecnología reproductiva (IATF, celos, ecografías y partos) con árbol genealógico.",
        "Auditar el flujo de caja ganadero, depreciación biológica, costeo de mano de obra y valor del hato.",
        "Monitorear la sanidad animal, respetando periodos de retiro farmacológico y pruebas CMT de mastitis.",
        "Generar informes ejecutivos y hojas de vida oficiales para movilización y entidades crediticias."
    ],
    "modules": [
        # =====================================================================
        # MÓDULO 1: INTRODUCCIÓN Y CONFIGURACIÓN MAESTRA
        # =====================================================================
        {
            "id": "modulo-1-introduccion",
            "title": "Módulo 1: Introducción y Configuración Maestra del Sistema",
            "description": "Establece los cimientos operativos de tu cuenta: perfil con indicativo telefónico, importación masiva en dos pasos, parametrización de unidades y copias de seguridad.",
            "order": 1,
            "lessons": [
                {
                    "id": "les-1-1-perfil",
                    "title": "1.1 Perfil de Usuario, Credenciales y Notificaciones de Campo",
                    "description": "Configura tus datos de contacto, credenciales de acceso y número telefónico con indicativo internacional para recibir alertas sanitarias y de inventario.",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "08:30",
                    "durationSeconds": 510,
                    "metrics": ["indice_consanguinidad"],
                    "resources": [
                        {
                            "id": "res-1-1-guia",
                            "title": "Guía de Parámetros de Usuario y Seguridad",
                            "url": "/resources/Guia_Zootecnica_Metricas_DataGan_360.docx",
                            "type": "document",
                            "description": "Especificaciones de seguridad, contraseñas seguras y protocolos de sesión móvil.",
                            "fileSize": "1.1 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-1-1-1",
                            "prompt": "¿Por qué es obligatorio registrar el número de teléfono con indicativo de país en el perfil de DataGan 360?",
                            "options": [
                                "Para cobrar cargos adicionales en la factura telefónica",
                                "Para validar la cuenta y habilitar notificaciones push y alertas zootécnicas críticas de campo",
                                "Para publicar el número en un directorio abierto de ganaderos",
                                "No es obligatorio, se puede dejar en blanco sin consecuencias"
                            ],
                            "correctIndex": 1,
                            "explanation": "El sistema requiere un formato telefónico internacional válido para habilitar las alertas automatizadas de partos, celos y sincronización de campo."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-1-1-1",
                            "timestampSeconds": 180,
                            "prompt": "¿En qué apartado puedes actualizar la contraseña de tu cuenta?",
                            "options": [
                                "En Configuración > Mi Perfil",
                                "En la pestaña de Facturación",
                                "Únicamente llamando a soporte técnico",
                                "En la sección de Potreros"
                            ],
                            "correctIndex": 0,
                            "explanation": "La gestión de credenciales y seguridad se realiza directamente en Mi Perfil."
                        }
                    ]
                },
                {
                    "id": "les-1-2-carga-masiva",
                    "title": "1.2 Carga Masiva Inteligente en Dos Pasos (Estructura de Predio e Inventario Bovino)",
                    "description": "Aprende el flujo estricto de dos pasos para inyectar datos masivos desde Excel: Paso 1 define la ubicación física (Fincas, Potreros, Lotes) y Paso 2 asigna los animales a esas ubicaciones.",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "14:15",
                    "durationSeconds": 855,
                    "metrics": ["carga_animal_ugm"],
                    "resources": [
                        {
                            "id": "res-1-2-p1",
                            "title": "Plantilla Paso 1: Infraestructura y Estructura de Predio (.xlsx)",
                            "url": "/resources/Plantilla_Paso1_Infraestructura_DataGan.xlsx",
                            "type": "document",
                            "description": "Archivo oficial de Excel para cargar Fincas, Potreros, Lotes y Terceros Propietarios.",
                            "fileSize": "14 KB",
                            "extension": "xlsx"
                        },
                        {
                            "id": "res-1-2-p2",
                            "title": "Plantilla Paso 2: Inventario Individual de Bovinos (.xlsx)",
                            "url": "/resources/Plantilla_Paso2_Inventario_Bovinos.xlsx",
                            "type": "document",
                            "description": "Archivo oficial para registrar chapetas, RFID, razas, pesos y relaciones de parentesco.",
                            "fileSize": "16 KB",
                            "extension": "xlsx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-1-2-1",
                            "prompt": "¿Por qué es estrictamente indispensable cargar primero la plantilla de Paso 1 antes de la plantilla de Paso 2?",
                            "options": [
                                "Porque la plantilla de Paso 1 es más ligera de procesar",
                                "Porque la plantilla de Paso 1 crea los potreros y lotes donde se ubicarán los animales del Paso 2; de lo contrario habrá error de clave foránea",
                                "Porque la plantilla de Paso 2 solo contiene fotos",
                                "Es indiferente, el orden no altera la consistencia de la base de datos"
                            ],
                            "correctIndex": 1,
                            "explanation": "El sistema exige integridad referencial: un bovino no puede existir en el sistema si el Lote y Potrero donde pasta no han sido creados previamente."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-1-2-1",
                            "timestampSeconds": 300,
                            "prompt": "¿Qué sucede si subes un animal con un ID de Lote que no existe en el sistema?",
                            "options": [
                                "El sistema lo asigna al primer lote que encuentre",
                                "El motor de validación rechaza la fila y genera una alerta de inconsistencia",
                                "Crea un lote nuevo con nombre aleatorio",
                                "Borra la finca entera"
                            ],
                            "correctIndex": 1,
                            "explanation": "DataGan 360 valida rigurosamente cada fila para evitar registros huérfanos."
                        }
                    ]
                },
                {
                    "id": "les-1-3-unidades-precios",
                    "title": "1.3 Unidades de Medida, Precios de Referencia y Valorización del Hato",
                    "description": "Personaliza las unidades de área (Hectáreas vs. Metros cuadrados), pesaje (Kilos vs. Libras), leche (Litros vs. Botellas) y fija el precio de referencia para el cálculo patrimonial automático.",
                    "order": 3,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "10:20",
                    "durationSeconds": 620,
                    "metrics": ["costo_litro_leche"],
                    "resources": [
                        {
                            "id": "res-1-3-doc",
                            "title": "Tabla de Conversión de Unidades Zootécnicas",
                            "url": "/resources/Guia_Zootecnica_Metricas_DataGan_360.docx",
                            "type": "document",
                            "description": "Factores de equivalencia zootécnica para peso vivo, volumen de leche y superficie.",
                            "fileSize": "1.1 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-1-3-1",
                            "prompt": "¿Cuál es la función del 'Precio de Referencia Bovina' configurado en Unidades de Medida?",
                            "options": [
                                "Fijar el precio obligatorio al que se debe vender la carne en supermercados",
                                "Calcular automáticamente el valor patrimonial del hato y operaciones comerciales cuando no se especifica precio individual",
                                "Calcular el impuesto predial de la finca",
                                "Determinar el costo de la suscripción mensual de DataGan 360"
                            ],
                            "correctIndex": 1,
                            "explanation": "El precio de referencia permite valorizar el inventario animal en tiempo real en las tarjetas del Dashboard financiero."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-1-3-1",
                            "timestampSeconds": 240,
                            "prompt": "Si cambias de Kilos a Libras en la configuración, ¿qué ocurre con los registros existentes?",
                            "options": [
                                "Se borran los datos anteriores",
                                "El sistema efectúa la conversión matemática automática para mantener la coherencia métrica",
                                "Se congelan las básculas electrónicas",
                                "Se debe volver a pesar todo el ganado"
                            ],
                            "correctIndex": 1,
                            "explanation": "DataGan realiza conversión dinámica entre unidades métricas e imperiales."
                        }
                    ]
                },
                {
                    "id": "les-1-4-seguridad-respaldo",
                    "title": "1.4 Seguridad de Datos, Respaldos Excel y Protocolo de Baja Irreversible",
                    "description": "Descarga copias de seguridad completas de tu base de datos en formato Excel mediante 'Mis Datos' y comprende el protocolo de eliminación permanente de cuenta.",
                    "order": 4,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "07:50",
                    "durationSeconds": 470,
                    "metrics": [],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-1-4-1",
                            "prompt": "¿Qué advertencia crítica se debe considerar antes de presionar el botón 'Eliminar cuenta'?",
                            "options": [
                                "Que la cuenta se suspende por 30 días y luego se recupera sola",
                                "Que todos los datos zootécnicos, pesajes e historiales se eliminan de manera permanente e irreversible del servidor sin copia de respaldo",
                                "Que se enviará un técnico de soporte a la finca a verificar",
                                "Que solo se borra el nombre del propietario pero los animales permanecen"
                            ],
                            "correctIndex": 1,
                            "explanation": "La eliminación es permanente. Por eso el protocolo exige descargar previamente la copia de seguridad desde 'Mis datos'."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        },
        # =====================================================================
        # MÓDULO 2: ANALÍTICA Y MÉTRICAS ZOOTÉCNICAS AVANZADAS
        # =====================================================================
        {
            "id": "modulo-2-analitica",
            "title": "Módulo 2: Analítica y Métricas Zootécnicas Avanzadas",
            "description": "Descifra el Centro de Control de DataGan 360: georreferenciación satelital, eficiencia productiva por hectárea, Unidad Gran Ganado (UGM), tasa de extracción y valoración en tiempo real.",
            "order": 2,
            "lessons": [
                {
                    "id": "les-2-1-tour-dashboard",
                    "title": "2.1 El Tour de Analítica y la Filosofía del Centro de Control",
                    "description": "Conoce la navegación del Dashboard, el asistente interactivo integrado y los botones contextuales de ayuda zootécnica.",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "09:40",
                    "durationSeconds": 580,
                    "metrics": ["carga_animal_ugm"],
                    "resources": [
                        {
                            "id": "res-2-1-manual",
                            "title": "Manual Zootécnico de Métricas DataGan 360 (.docx)",
                            "url": "/resources/Guia_Zootecnica_Metricas_DataGan_360.docx",
                            "type": "document",
                            "description": "Compendio completo de fórmulas, benchmarks nacionales y rangos de interpretación.",
                            "fileSize": "1.1 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-2-1-1",
                            "prompt": "¿Qué herramienta ofrece el Dashboard para repasar la definición de los indicadores en cualquier momento?",
                            "options": [
                                "Un manual impreso por correo postal",
                                "El tour guiado interactivo accesible desde la esquina superior derecha y botones de ayuda contextual",
                                "Un video grabado en VHS",
                                "Es necesario reiniciar la aplicación"
                            ],
                            "correctIndex": 1,
                            "explanation": "El sistema integra un tour interactivo paso a paso y tooltips con el significado zootécnico de cada indicador."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-2-1-1",
                            "timestampSeconds": 210,
                            "prompt": "¿Qué indican las tarjetas con porcentajes verdes o rojos en el Dashboard?",
                            "options": [
                                "El nivel de batería del computador",
                                "La comparación cuantitativa del rendimiento respecto al periodo anterior",
                                "La temperatura ambiente de la finca",
                                "La cantidad de lluvia caída en milímetros"
                            ],
                            "correctIndex": 1,
                            "explanation": "Los indicadores verde/rojo permiten evaluar de inmediato si el hato está mejorando o decayendo respecto al mes anterior."
                        }
                    ]
                },
                {
                    "id": "les-2-2-mapa-geofencing",
                    "title": "2.2 Geofencing y Mapa Satelital de Praderas",
                    "description": "Aprende a interpretar el mapa satelital interactivo: visualización perimetral de potreros, identificación visual del lote en pastoreo y días de descanso acumulados.",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "12:10",
                    "durationSeconds": 730,
                    "metrics": ["indice_ocupacion_potreros"],
                    "resources": [
                        {
                            "id": "res-2-2-calc",
                            "title": "Calculadora de Aforo Forrajero y Capacidad de Carga (.xlsx)",
                            "url": "/resources/Calculadora_Aforo_y_Capacidad_UGM.xlsx",
                            "type": "document",
                            "description": "Hoja de cálculo formulada para determinar el forraje verde por m² y planificar el pastoreo Voisin.",
                            "fileSize": "18 KB",
                            "extension": "xlsx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-2-2-1",
                            "prompt": "¿Qué información clave se despliega al seleccionar un potrero en el mapa satelital?",
                            "options": [
                                "El valor catastral fiscal del predio",
                                "El estado de ocupación, días de descanso vegetativo y el lote de ganado que está pastando",
                                "El pronóstico del clima a 6 meses",
                                "El listado de deudas bancarias"
                            ],
                            "correctIndex": 1,
                            "explanation": "El mapa combina telemetría y geofencing para mostrar la dinámica real de rotación en cada potrero."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-2-3-eficiencia-ha",
                    "title": "2.3 Eficiencia por Hectárea (UGM, Carga Animal y Tasa de Extracción)",
                    "description": "Estudia a fondo las métricas de oro de la zootecnia: kg producidos por hectárea, litros/ha, capacidad de carga UGM (Unidad Gran Ganado = 450 kg) y tasa de extracción anual.",
                    "order": 3,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "16:45",
                    "durationSeconds": 1005,
                    "metrics": ["carga_animal_ugm", "tasa_extraccion"],
                    "resources": [
                        {
                            "id": "res-2-3-manual",
                            "title": "Capítulo Zootécnico: UGM y Carga Óptima (.docx)",
                            "url": "/resources/Guia_Zootecnica_Metricas_DataGan_360.docx",
                            "type": "document",
                            "description": "Detalle técnico de equivalencias UGM por edad, sexo y etapa fisiológica.",
                            "fileSize": "1.1 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-2-3-1",
                            "prompt": "¿A cuántos kilogramos de peso vivo bovino equivale exactamente 1 UGM (Unidad Gran Ganado)?",
                            "options": [
                                "250 kg",
                                "450 kg",
                                "750 kg",
                                "1000 kg"
                            ],
                            "correctIndex": 1,
                            "explanation": "El estándar zootécnico internacional y de FEDEGAN fija 1 UGM en 450 kg de peso vivo bovino adulto."
                        },
                        {
                            "id": "q-2-3-2",
                            "prompt": "¿Qué representa una Tasa de Extracción Zootécnica del 24%?",
                            "options": [
                                "Que el 24% del forraje fue pisoteado y desperdiciado",
                                "Que el 24% del inventario promedio anual de animales fue comercializado o sacrificado de forma sostenible",
                                "Que el 24% de los animales murieron por enfermedades",
                                "Que el 24% de la leche se destinó al consumo de terneros"
                            ],
                            "correctIndex": 1,
                            "explanation": "La tasa de extracción mide la velocidad con la que el hato genera producto vendible sin mermar su capacidad reproductiva."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-2-3-1",
                            "timestampSeconds": 420,
                            "prompt": "¿Qué factor agronómico se deteriora si la carga animal supera la oferta forrajera de la pradera?",
                            "options": [
                                "Aumenta la fertilidad del suelo indefinidamente",
                                "Se produce sobrepastoreo, compactación y degradación de las especies nutritivas",
                                "El pasto crece más rápido por estímulo mecánico",
                                "No ocurre nada, el ganado compensa con agua"
                            ],
                            "correctIndex": 1,
                            "explanation": "El sobrepastoreo destruye el punto óptimo de reposo y favorece la invasión de malezas."
                        }
                    ]
                },
                {
                    "id": "les-2-4-resumen-produccion",
                    "title": "2.4 Resumen de Producción, Curvas Lácteas y Disponibilidad Forrajera",
                    "description": "Analiza las gráficas de producción láctea diaria, disponibilidad relativa de potreros para los próximos 30 días y proyección cronológica de partos.",
                    "order": 4,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "11:50",
                    "durationSeconds": 710,
                    "metrics": ["litros_vaca_dia"],
                    "resources": [
                        {
                            "id": "res-2-4-leche",
                            "title": "Planilla de Control Lechero y Curvas de Lactancia (.xlsx)",
                            "url": "/resources/Formato_Control_Lechero_y_Curva_Lactancia.xlsx",
                            "type": "document",
                            "description": "Formato para registrar ordeños AM/PM y proyectar persistencia láctea.",
                            "fileSize": "15 KB",
                            "extension": "xlsx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-2-4-1",
                            "prompt": "¿Por qué es crucial contrastar la curva de producción de leche con la fecha de entrada al potrero?",
                            "options": [
                                "Para saber a qué hora sale el camión lechero",
                                "Para evaluar la calidad bromatológica y el aporte nutricional de cada potrero en el volumen de leche producido",
                                "Para medir la temperatura de la sala de ordeño",
                                "No existe correlación entre el forraje consumido y la producción láctea"
                            ],
                            "correctIndex": 1,
                            "explanation": "La respuesta de la ubre refleja directamente la calidad y digestibilidad del pasto donde las vacas comieron las 24 horas previas."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-2-5-resumen-financiero",
                    "title": "2.5 Resumen Financiero, Valor de Hato y Filtros Multisede",
                    "description": "Audita el valor comercial del inventario en pie, ingresos operativos por ventas y cómo filtrar las estadísticas por predio en empresas ganaderas multisede.",
                    "order": 5,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "13:30",
                    "durationSeconds": 810,
                    "metrics": ["costo_litro_leche"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-2-5-1",
                            "prompt": "¿Cómo se calcula la 'Valoración del Hato' que muestra el Dashboard de DataGan?",
                            "options": [
                                "Es un valor fijo asignado por el banco",
                                "Multiplicando los kilogramos registrados en los pesajes de cada categoría por el precio de mercado de referencia",
                                "Sumando el valor catastral del terreno y las construcciones",
                                "Contando el número de vacas y multiplicando por $100.000"
                            ],
                            "correctIndex": 1,
                            "explanation": "DataGan multiplica la masa biológica registrada en las básculas por el precio zootécnico establecido en la configuración."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        },
        # =====================================================================
        # MÓDULO 3: GOBERNANZA ADMINISTRATIVA Y TERCEROS
        # =====================================================================
        {
            "id": "modulo-3-administracion",
            "title": "Módulo 3: Gobernanza Administrativa, Usuarios y Terceros",
            "description": "Estructura la seguridad operativa: asignación granular de roles por módulo, vinculación de vaqueros, gestión multisede y la regla obligatoria de propietarios para lotes.",
            "order": 3,
            "lessons": [
                {
                    "id": "les-3-1-roles-permisos",
                    "title": "3.1 Matriz de Roles y Seguridad Operativa (11 Módulos y 4 Permisos)",
                    "description": "Configura perfiles de acceso (Crear, Leer, Actualizar, Eliminar) en Administración, Bovinos, Producción, Trazabilidad, Salud Animal y Finanzas.",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "11:00",
                    "durationSeconds": 660,
                    "metrics": [],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-3-1-1",
                            "prompt": "¿Cuál es la principal razón para restringir el permiso de eliminación a los vaqueros en campo?",
                            "options": [
                                "Para que no puedan ver la cantidad de animales en la finca",
                                "Para preservar la integridad histórica de la trazabilidad y evitar que borren pesajes o bajas por descuido",
                                "Para que utilicen únicamente cuadernos de notas físicas",
                                "Porque el plan básico solo permite 1 usuario con permisos"
                            ],
                            "correctIndex": 1,
                            "explanation": "El principio de privilegio mínimo garantiza que los colaboradores capturen eventos sin riesgo de alterar registros históricos."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-3-2-trabajadores",
                    "title": "3.2 Vinculación y Gestión de Trabajadores en Campo",
                    "description": "Crea cuentas de acceso para el personal de manga, mayordomos y médicos veterinarios para habilitar el registro desde smartphones y tablets.",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "08:45",
                    "durationSeconds": 525,
                    "metrics": [],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-3-2-1",
                            "prompt": "¿Qué credencial requiere un colaborador para autenticarse por primera vez en la aplicación?",
                            "options": [
                                "Su número de tarjeta militar",
                                "El correo electrónico registrado por el administrador y la contraseña provisional asignada",
                                "Una llamada telefónica al soporte técnico",
                                "El microchip de una vaca"
                            ],
                            "correctIndex": 1,
                            "explanation": "El administrador da de alta al colaborador con su correo y rol asignado."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-3-3-fincas-sedes",
                    "title": "3.3 Gestión Multisede y Fincas del Ecosistema",
                    "description": "Administra múltiples predios o sedes ganaderas bajo una misma cuenta matriz, asignando áreas útiles y propósitos zootécnicos independientes.",
                    "order": 3,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "10:15",
                    "durationSeconds": 615,
                    "metrics": [],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-3-3-1",
                            "prompt": "¿Puede una misma cuenta de DataGan 360 gestionar simultáneamente una finca de ceba en el llano y una lechería en el trópico alto?",
                            "options": [
                                "No, se debe contratar un servidor diferente para cada predio",
                                "Sí, mediante la arquitectura multisede de Fincas, alternando en el selector superior de la interfaz",
                                "Solo si ambas fincas están en el mismo municipio",
                                "Solo si todos los animales son de la misma raza"
                            ],
                            "correctIndex": 1,
                            "explanation": "DataGan 360 permite consolidar múltiples empresas agropecuarias con aislamiento total de métricas y potreros."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-3-4-terceros-regla-lotes",
                    "title": "3.4 Terceros, Clientes y la Regla Obligatoria de Propietarios para Lotes",
                    "description": "Aprende a registrar clientes, proveedores y propietarios. Conoce por qué el sistema exige crear un Propietario en Terceros antes de habilitar la creación de Lotes.",
                    "order": 4,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "12:50",
                    "durationSeconds": 770,
                    "metrics": [],
                    "resources": [
                        {
                            "id": "res-3-4-p1",
                            "title": "Plantilla Paso 1: Pestaña Terceros y Propietarios (.xlsx)",
                            "url": "/resources/Plantilla_Paso1_Infraestructura_DataGan.xlsx",
                            "type": "document",
                            "description": "Estructura requerida para vincular propietarios y socios del negocio.",
                            "fileSize": "14 KB",
                            "extension": "xlsx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-3-4-1",
                            "prompt": "¿Qué error ocurre al intentar crear un Lote de ganado si no se ha registrado ningún Propietario en el módulo de Terceros?",
                            "options": [
                                "El sistema se cierra inesperadamente",
                                "El formulario de Lote bloquea la creación porque el campo 'Propietario' es obligatorio y queda vacío",
                                "El lote se crea automáticamente a nombre del gobierno",
                                "Se descuenta dinero de la tarjeta de crédito"
                            ],
                            "correctIndex": 1,
                            "explanation": "Cada lote debe estar asociado jurídicamente a un dueño registrado en Terceros para respaldar la propiedad del hato."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-3-5-facturacion-planes",
                    "title": "3.5 Planes, Suscripción y Facturación Electrónica",
                    "description": "Conoce los límites de animales según tu plan activo, adquisición de cupos adicionales y descarga de soportes fiscales.",
                    "order": 5,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "07:30",
                    "durationSeconds": 450,
                    "metrics": [],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-3-5-1",
                            "prompt": "¿Dónde se consultan las facturas y el cupo total de cabezas de ganado contratadas?",
                            "options": [
                                "En la sección de Potreros",
                                "En Administración > Facturación y Suscripción",
                                "En el visor de genealogía",
                                "En el mapa satelital"
                            ],
                            "correctIndex": 1,
                            "explanation": "El módulo de Facturación centraliza la membresía, cupos disponibles y comprobantes de pago."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        },
        # =====================================================================
        # MÓDULO 4: INFRAESTRUCTURA Y GESTIÓN DE BOVINOS
        # =====================================================================
        {
            "id": "modulo-4-bovinos-infraestructura",
            "title": "Módulo 4: Infraestructura y Gestión de Bovinos (Potreros, Aforos y Lotes)",
            "description": "Estructura la base productiva: catastro de potreros con especies forrajeras, aforos de pasto, conformación de lotes homogéneos, registro individual con RFID y rotación Voisin.",
            "order": 4,
            "lessons": [
                {
                    "id": "les-4-1-potreros-aforos",
                    "title": "4.1 Catastro de Potreros, Especies Forrajeras y Aforos de Pradera",
                    "description": "Registra cada potrero con su área en hectáreas, especie de pasto (Brachiaria, Mombaza, Estrella, etc.), topografía y ejecuta aforos por el método del metro cuadrado.",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "15:20",
                    "durationSeconds": 920,
                    "metrics": ["indice_ocupacion_potreros"],
                    "resources": [
                        {
                            "id": "res-4-1-calc",
                            "title": "Calculadora de Aforo de Praderas y UGM (.xlsx)",
                            "url": "/resources/Calculadora_Aforo_y_Capacidad_UGM.xlsx",
                            "type": "document",
                            "description": "Calcula el forraje verde aprovechable descontando pisoteo y calcula días de ocupación.",
                            "fileSize": "18 KB",
                            "extension": "xlsx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-4-1-1",
                            "prompt": "¿Por qué se descuenta entre un 20% y 30% en el cálculo de forraje verde aprovechable durante un aforo?",
                            "options": [
                                "Por impuestos gubernamentales sobre el pasto",
                                "Por pérdidas zootécnicas inevitables causadas por pisoteo, bosteo, orina y rechazo de material leñoso",
                                "Porque los terneros comen el doble que los adultos",
                                "No se debe descontar nada, el ganado consume el 100% del material verde"
                            ],
                            "correctIndex": 1,
                            "explanation": "El factor de merma por pisoteo y deyecciones es fundamental para no sobreestimar la oferta forrajera real."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-4-1-1",
                            "timestampSeconds": 360,
                            "prompt": "¿Cuál es el tamaño estándar del marco de muestreo para aforar praderas?",
                            "options": [
                                "10 metros por 10 metros",
                                "1 metro por 1 metro (1 m²)",
                                "50 centímetros por 50 centímetros",
                                "El tamaño de la cerca perimetral"
                            ],
                            "correctIndex": 1,
                            "explanation": "El marco de 1 m² es la metodología estandarizada para extrapolar a kg/ha (multiplicando por 10.000)."
                        }
                    ]
                },
                {
                    "id": "les-4-2-lotes-ganado",
                    "title": "4.2 Creación de Lotes Homogéneos y Asignación de Propietarios",
                    "description": "Aprende a agrupar a los bovinos según requerimientos nutricionales y fisiológicos (Vacas de Ordeño, Novillas de Vientre, Terneros de Levante, Toros Reproductores).",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "11:40",
                    "durationSeconds": 700,
                    "metrics": ["carga_animal_ugm"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-4-2-1",
                            "prompt": "¿Cuál es la principal ventaja zootécnica de conformar lotes homogéneos en una finca?",
                            "options": [
                                "Que todos los animales tengan la misma foto en el sistema",
                                "Evitar la competencia desigual por alimento entre animales dominantes y jóvenes, optimizando la ración según la etapa productiva",
                                "Ahorrar alambre de cerca eléctrica",
                                "Obligar a todos los animales a parir el mismo día"
                            ],
                            "correctIndex": 1,
                            "explanation": "La homogeneidad de lotes maximiza la conversión alimenticia y reduce el estrés social en el comedero y pradera."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-4-3-registro-animales",
                    "title": "4.3 Registro Individual de Bovinos, Chapeta Visual y Microchip RFID",
                    "description": "Registra cada animal con doble identificación (chapeta de oreja y chip electrónico RFID), raza, sexo, peso base y vinculación de progenitores.",
                    "order": 3,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "17:15",
                    "durationSeconds": 1035,
                    "metrics": ["condicion_corporal_cc", "gdp_ceba"],
                    "resources": [
                        {
                            "id": "res-4-3-p2",
                            "title": "Plantilla Paso 2: Inventario Animal Completo (.xlsx)",
                            "url": "/resources/Plantilla_Paso2_Inventario_Bovinos.xlsx",
                            "type": "document",
                            "description": "Formato para ingresar el hato completo con códigos de microchip y chapeta.",
                            "fileSize": "16 KB",
                            "extension": "xlsx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-4-3-1",
                            "prompt": "¿Por qué se recomienda asignar el código de Microchip RFID durante el registro individual del bovino?",
                            "options": [
                                "Para rastrear al animal con satélite militar",
                                "Para habilitar la lectura automática e instantánea en básculas y mangas sin error humano de digitación",
                                "Para que el animal no sienta dolor en los pesajes",
                                "Es un requisito exclusivo de perros y gatos"
                            ],
                            "correctIndex": 1,
                            "explanation": "El microchip RFID automatiza la captura de pesajes y movimientos al pasar por las antenas del predio."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-4-3-1",
                            "timestampSeconds": 480,
                            "prompt": "¿Cómo se vincula el padre y la madre en la ficha del animal?",
                            "options": [
                                "Seleccionándolos desde el listado desplegable de reproductores activos registrados en la finca",
                                "Escribiendo cualquier texto en un campo de observaciones",
                                "No se puede vincular padre en DataGan",
                                "Subiendo el certificado de bautismo"
                            ],
                            "correctIndex": 0,
                            "explanation": "Al seleccionar los progenitores de la base de datos, DataGan construye automáticamente el árbol genealógico."
                        }
                    ]
                },
                {
                    "id": "les-4-4-rotacion-transferencia",
                    "title": "4.4 Rotación de Pastoreo, Leyes de Voisin y Transferencias de Lote",
                    "description": "Domina la regla de oro: cómo registrar la 'Entrada' y 'Salida' de un lote en un potrero. Comprende por qué esta acción es obligatoria para poder registrar leche.",
                    "order": 4,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "14:50",
                    "durationSeconds": 890,
                    "metrics": ["indice_ocupacion_potreros", "carga_animal_ugm"],
                    "resources": [
                        {
                            "id": "res-4-4-calc",
                            "title": "Calculadora de Rotación y Descanso Voisin (.xlsx)",
                            "url": "/resources/Calculadora_Aforo_y_Capacidad_UGM.xlsx",
                            "type": "document",
                            "description": "Planificador de días de ocupación (1 a 3 días) y descanso óptimo (30 a 45 días).",
                            "fileSize": "18 KB",
                            "extension": "xlsx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-4-4-1",
                            "prompt": "De acuerdo con las Leyes de Pastoreo Racional Voisin (PRV), ¿cuál es el tiempo de ocupación máximo recomendado por potrero?",
                            "options": [
                                "Entre 15 y 20 días",
                                "Máximo 1 a 3 días, para evitar que el animal consuma el rebrote con sus reservas radiculares agotadas",
                                "30 días exactos",
                                "Pastoreo continuo sin rotación"
                            ],
                            "correctIndex": 1,
                            "explanation": "Si los animales permanecen más de 3 días en el potrero, consumirán el rebrote fresco, debilitando la raíz y arruinando la pradera."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-4-5-silvopastoril",
                    "title": "4.5 Manejo Silvopastoril, Bienestar Animal y Ganadería Regenerativa",
                    "description": "Registra las condiciones silvopastoriles (árboles dispersos, cercas vivas, sombrío y fuentes de agua) para mejorar el confort térmico y la fertilidad del suelo.",
                    "order": 5,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "10:30",
                    "durationSeconds": 630,
                    "metrics": ["ith_estres_calorico"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-4-5-1",
                            "prompt": "¿Qué beneficio zootécnico directo aporta el sombrío arbóreo en un sistema silvopastoril?",
                            "options": [
                                "Disminuye el estrés calórico, reduce la tasa respiratoria y evita caídas de hasta un 25% en la producción de leche",
                                "Hace que las vacas duerman todo el día sin comer",
                                "Aumenta el consumo de sal mineralizada",
                                "Elimina la necesidad de aplicar vacunas"
                            ],
                            "correctIndex": 0,
                            "explanation": "El confort térmico reduce la carga calórica, manteniendo estable el consumo voluntario de forraje y la rumia."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        },
        # =====================================================================
        # MÓDULO 5: PRODUCCIÓN BOVINA (PESAJES Y LECHE)
        # =====================================================================
        {
            "id": "modulo-5-produccion",
            "title": "Módulo 5: Producción Bovina (Pesajes, GDP y Control Lechero)",
            "description": "Mide el rendimiento zootécnico en báscula y tanque: cálculo de Ganancia Diaria de Peso (GDP), control lechero diario AM/PM con la regla de potrero activo y liquidación comercial.",
            "order": 5,
            "lessons": [
                {
                    "id": "les-5-1-pesajes-gdp",
                    "title": "5.1 Pesajes Periódicos y Cálculo Automático de Ganancia Diaria de Peso (GDP)",
                    "description": "Registra pesajes individuales y masivos. Domina la fórmula de GDP en gramos/día para seleccionar los animales más eficientes en conversión forrajera.",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "14:10",
                    "durationSeconds": 850,
                    "metrics": ["gdp_ceba"],
                    "resources": [
                        {
                            "id": "res-5-1-manual",
                            "title": "Guía de Interpretación de GDP en Ceba y Levante (.docx)",
                            "url": "/resources/Guia_Zootecnica_Metricas_DataGan_360.docx",
                            "type": "document",
                            "description": "Tablas de ganancia esperada según raza, suplementación y oferta de biomasa.",
                            "fileSize": "1.1 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-5-1-1",
                            "prompt": "Un novillo pesó 320 kg el 1 de septiembre y 356 kg el 1 de octubre (30 días después). ¿Cuál fue su GDP exacta?",
                            "options": [
                                "600 g/día",
                                "1.200 g/día",
                                "800 g/día",
                                "450 g/día"
                            ],
                            "correctIndex": 1,
                            "explanation": "GDP = ((356 - 320) * 1000) / 30 = 36.000 / 30 = 1.200 g/día (excelente rendimiento en ceba)."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-5-1-1",
                            "timestampSeconds": 300,
                            "prompt": "¿Qué indica una GDP negativa o cero en un lote de levante?",
                            "options": [
                                "Que los animales están convirtiendo grasa en músculo",
                                "Déficit nutricional severo, alta carga parasitaria o estrés hídrico; requiere intervención veterinaria inmediata",
                                "Que la báscula está configurada en libras",
                                "Es el comportamiento normal de la raza"
                            ],
                            "correctIndex": 1,
                            "explanation": "Una GDP negativa representa pérdida de peso corporal y descapitalización biológica directa."
                        }
                    ]
                },
                {
                    "id": "les-5-2-control-lechero",
                    "title": "5.2 Control Lechero Diario (Ordeño AM/PM) y la Regla de Potrero Activo",
                    "description": "Registra los litros producidos por vaca o por lote. Comprende la restricción de seguridad: no se puede ingresar leche a un lote que no tenga un potrero asignado.",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "16:00",
                    "durationSeconds": 960,
                    "metrics": ["litros_vaca_dia"],
                    "resources": [
                        {
                            "id": "res-5-2-leche",
                            "title": "Planilla Oficial de Control Lechero DataGan 360 (.xlsx)",
                            "url": "/resources/Formato_Control_Lechero_y_Curva_Lactancia.xlsx",
                            "type": "document",
                            "description": "Plantilla con fórmulas automáticas para calcular promedio individual, DEL y producción de tanque.",
                            "fileSize": "15 KB",
                            "extension": "xlsx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-5-2-1",
                            "prompt": "¿Por qué DataGan 360 bloquea el registro de leche si el lote de vacas no tiene un potrero con 'Entrada' activa?",
                            "options": [
                                "Es un error del sistema que debe omitirse",
                                "Por consistencia zootécnica: para producir leche las vacas deben estar consumiendo forraje en algún potrero físico medible",
                                "Para obligar al ganadero a comprar el plan premium",
                                "Para evitar que se ordeñe de noche"
                            ],
                            "correctIndex": 1,
                            "explanation": "El motor zootécnico de DataGan correlaciona la leche producida con la hectárea que la sustentó; sin potrero activo no hay trazabilidad de suelo."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-5-2-1",
                            "timestampSeconds": 360,
                            "prompt": "¿Cómo se resuelve el bloqueo de registro de leche?",
                            "options": [
                                "Reiniciando el computador",
                                "Yendo a Bovinos > Potreros > Detalle de Potrero y registrando la 'Entrada' del lote de ordeño",
                                "Borrando a las vacas y volviéndolas a crear",
                                "Cambiando la contraseña"
                            ],
                            "correctIndex": 1,
                            "explanation": "Basta con registrar la rotación de entrada del lote al potrero correspondiente."
                        }
                    ]
                },
                {
                    "id": "les-5-3-venta-leche",
                    "title": "5.3 Venta de Leche, Liquidación y Bonificaciones por Calidad",
                    "description": "Registra la remisión diaria al camión recolector, precio base por litro, bonificaciones por frío, porcentaje de grasa/proteína y liquidaciones quincenales.",
                    "order": 3,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "10:45",
                    "durationSeconds": 645,
                    "metrics": ["costo_litro_leche"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-5-3-1",
                            "prompt": "¿Cómo impacta la bonificación por porcentaje de grasa y proteína en el ingreso lechero?",
                            "options": [
                                "Disminuye el precio pagado al productor",
                                "Aumenta el valor por litro hasta un 15-20% adicional sobre el precio base estipulado por la industria",
                                "Solo aplica si la leche se vende a vecinos",
                                "No tiene ningún efecto contable"
                            ],
                            "correctIndex": 1,
                            "explanation": "Las plantas acopiadoras premian los sólidos totales (grasa + proteína), incentivando la nutrición equilibrada."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        },
        # =====================================================================
        # MÓDULO 6: TRAZABILIDAD INTEGRAL E HISTORIAL
        # =====================================================================
        {
            "id": "modulo-6-trazabilidad",
            "title": "Módulo 6: Trazabilidad Integral e Historial Zootécnico",
            "description": "Cumple los requerimientos sanitarios oficiales: registro de movimientos, guías de movilización interna, expedición de certificados y hoja de vida individual de cada ejemplar.",
            "order": 6,
            "lessons": [
                {
                    "id": "les-6-1-movimientos-guias",
                    "title": "6.1 Registro de Movimientos, Guías Sanitarias y Salidas de Predio",
                    "description": "Documenta traslados entre predios, salidas a ferias de exposición, subastas ganaderas o venta a frigorífico, manteniendo la auditoría exigida por entidades sanitarias (ICA).",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "11:20",
                    "durationSeconds": 680,
                    "metrics": [],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-6-1-1",
                            "prompt": "¿Por qué es mandatorio registrar las salidas de animales del predio en el módulo de Trazabilidad?",
                            "options": [
                                "Para dar de baja al animal del inventario activo y conservar su historial zootécnico para auditorías sanitarias y de movilización",
                                "Para que el animal no pueda volver a registrarse nunca en ningún país",
                                "Para borrar automáticamente todas sus crías",
                                "No es mandatorio, los animales vendidos se dejan en el hato"
                            ],
                            "correctIndex": 0,
                            "explanation": "La trazabilidad oficial exige el registro cronológico del destino final o traslado de cada individuo."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-6-2-historial-hoja-vida",
                    "title": "6.2 Historial Individual y Expediente Digital del Bovino",
                    "description": "Consulta el expediente digital de un bovino: línea de tiempo unificada con todos sus pesajes, vacunas, tratamientos, partos, ecografías y rotaciones desde su nacimiento.",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "13:00",
                    "durationSeconds": 780,
                    "metrics": ["indice_consanguinidad"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-6-2-1",
                            "prompt": "¿Qué valor diferencial aporta la Hoja de Vida digital al momento de vender un reproductor o una novilla de registro?",
                            "options": [
                                "Ninguno, el comprador solo mira el color del pelaje",
                                "Demuestra con datos certificados la curva de crecimiento, sanidad, fertilidad de la madre y mérito genético del ejemplar",
                                "Permite cobrar el doble sin mostrar pruebas",
                                "Reemplaza la inspección física del veterinario"
                            ],
                            "correctIndex": 1,
                            "explanation": "La información transparente y trazable genera confianza técnica y eleva el valor comercial de la genética de la finca."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        },
        # =====================================================================
        # MÓDULO 7: SALUD ANIMAL, REPRODUCCIÓN Y GENEALOGÍA
        # =====================================================================
        {
            "id": "modulo-7-salud-reproduccion",
            "title": "Módulo 7: Salud Animal, Biotecnología Reproductiva y Genealogía",
            "description": "El corazón de la eficiencia biológica: detección de celos, protocolos de IATF, diagnóstico de preñez, partos asistidos, prueba de mastitis CMT, días de retiro y árbol genealógico en 3 generaciones.",
            "order": 7,
            "lessons": [
                {
                    "id": "les-7-1-deteccion-celos",
                    "title": "7.1 Detección y Registro Sistemático de Celos",
                    "description": "Identifica los signos primarios y secundarios del estro bovino y regístralos con hora exacta para programar la inseminación bajo la regla AM-PM.",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "12:15",
                    "durationSeconds": 735,
                    "metrics": ["dias_abiertos"],
                    "resources": [
                        {
                            "id": "res-7-1-iatf",
                            "title": "Protocolo Técnico de IATF y Sanidad de Ubre (.docx)",
                            "url": "/resources/Protocolo_Sanitario_y_Manejo_IATF.docx",
                            "type": "document",
                            "description": "Cronograma de sincronización hormonal hora a hora y tabla de diagnóstico CMT.",
                            "fileSize": "1.0 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-7-1-1",
                            "prompt": "De acuerdo con la regla tradicional AM-PM, si una vaca es detectada en celo franco a las 07:00 AM, ¿cuándo debe inseminarse?",
                            "options": [
                                "Inmediatamente a las 07:05 AM",
                                "Esa misma tarde (entre las 5:00 PM y 7:00 PM, 12 horas después)",
                                "A los 3 días",
                                "Cuando vuelva a mostrar signos de celo"
                            ],
                            "correctIndex": 1,
                            "explanation": "La regla AM-PM sincroniza el momento de la ovulación (que ocurre ~30 horas después del inicio del celo) con la viabilidad del espermatozoide."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-7-2-servicios-iatf",
                    "title": "7.2 Servicios de Monta Natural e Inseminación Artificial a Tiempo Fijo (IATF)",
                    "description": "Aprende a registrar servicios por monta dirigida o con pajillas de catálogo en IATF, especificando toro, lote de semen, técnico responsable y fecha de servicio.",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "18:30",
                    "durationSeconds": 1110,
                    "metrics": ["protocolo_iatf_bovino"],
                    "resources": [
                        {
                            "id": "res-7-2-iatf",
                            "title": "Protocolo Técnico de IATF y Sanidad (.docx)",
                            "url": "/resources/Protocolo_Sanitario_y_Manejo_IATF.docx",
                            "type": "document",
                            "description": "Esquema farmacológico con P4, Benzoato de Estradiol, Cloprostenol y eCG.",
                            "fileSize": "1.0 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-7-2-1",
                            "prompt": "¿Cuál es la principal ventaja zootécnica de implementar un protocolo IATF frente a la inseminación con detección visual de celo?",
                            "options": [
                                "Que el semen cuesta menos dinero",
                                "Permite inseminar al 100% de los animales en un día y hora fija sin necesidad de detectar celo, acortando los días abiertos y concentrando los partos",
                                "Garantiza una tasa de preñez del 100% en todas las vacas",
                                "Elimina la necesidad de alimentar a las novillas"
                            ],
                            "correctIndex": 1,
                            "explanation": "La IATF supera el problema de los celos silentes o nocturnos, logrando preñar lotes masivos de manera programada."
                        }
                    ],
                    "inVideoCheckpoints": [
                        {
                            "id": "iv-7-2-1",
                            "timestampSeconds": 480,
                            "prompt": "¿A qué temperatura y por cuánto tiempo se debe descongelar la pajilla de semen bovino?",
                            "options": [
                                "A 20°C por 5 minutos",
                                "A 35°C - 37°C por 30 a 40 segundos en baño termorregulado",
                                "Con el calor de las manos por 1 minuto",
                                "En agua hirviendo a 100°C"
                            ],
                            "correctIndex": 1,
                            "explanation": "El protocolo térmico estricto a 37°C preserva la integridad de la membrana acrosomal y la motilidad progresiva del espermatozoide."
                        }
                    ]
                },
                {
                    "id": "les-7-3-palpaciones-preñez",
                    "title": "7.3 Diagnóstico Ginecológico, Palpaciones y Días Abiertos",
                    "description": "Registra chequeos reproductivos por tacto rectal o ultrasonografía ecográfica: confirmación de preñez, diagnóstico de vacía, presencia de cuerpo lúteo o quistes ováricos.",
                    "order": 3,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "14:00",
                    "durationSeconds": 840,
                    "metrics": ["dias_abiertos", "intervalo_entre_partos"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-7-3-1",
                            "prompt": "¿A cuántos días pos-servicio se puede realizar un diagnóstico de preñez temprano confiable mediante ecografía veterinaria?",
                            "options": [
                                "A los 5 días",
                                "A partir de los 28 a 30 días",
                                "Únicamente después del quinto mes",
                                "El día del parto"
                            ],
                            "correctIndex": 1,
                            "explanation": "El ultrasonido transrectal permite visualizar la vesícula embrionaria y el latido cardíaco desde el día 28-30."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-7-4-partos-crias",
                    "title": "7.4 Partos, Registro de Crías y Vínculo Automático Parental",
                    "description": "Registra el nacimiento de una cría. Aprende cómo el sistema asocia automáticamente al padre y a la madre, calcula el intervalo entre partos y abre la nueva lactancia de la vaca.",
                    "order": 4,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "13:45",
                    "durationSeconds": 825,
                    "metrics": ["intervalo_entre_partos"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-7-4-1",
                            "prompt": "¿Qué cálculo zootécnico clave actualiza DataGan 360 en la ficha de la madre al registrarle un nuevo parto?",
                            "options": [
                                "El color de sus ojos",
                                "El Intervalo Entre Partos (IEP) real en días y el inicio de su nueva curva de lactancia",
                                "La fecha de muerte de la vaca",
                                "El costo del alambre de cerca"
                            ],
                            "correctIndex": 1,
                            "explanation": "El parto cierra los días abiertos de la gestación previa y calcula el IEP, el indicador rey de la fertilidad en hembras bovinas."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-7-5-sanidad-retiro",
                    "title": "7.5 Sanidad Preventiva, Tratamientos Veterinarios y Días de Retiro",
                    "description": "Gestiona planes vacunales oficiales (Fiebre Aftosa, Brucelosis, Rabia) y tratamientos curativos. Domina la alerta de Días de Retiro en leche y carne.",
                    "order": 5,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "16:20",
                    "durationSeconds": 980,
                    "metrics": ["matriz_decision_mastitis"],
                    "resources": [
                        {
                            "id": "res-7-5-sanidad",
                            "title": "Protocolo de Sanidad y Tiempos de Retiro (.docx)",
                            "url": "/resources/Protocolo_Sanitario_y_Manejo_IATF.docx",
                            "type": "document",
                            "description": "Tiempos de carencia de antibióticos comunes y desvío de leche con mastitis.",
                            "fileSize": "1.0 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-7-5-1",
                            "prompt": "¿Por qué es una falta sanitaria grave enviar al tanque comercial la leche de una vaca en periodo de retiro por antibióticos?",
                            "options": [
                                "Porque la leche sabe más dulce",
                                "Porque los residuos antimicrobianos causan resistencia bacteriana en humanos e inhiben la fermentación en la industria láctea",
                                "Porque el camión recolector no arranca",
                                "No tiene ninguna importancia si la leche se hierve"
                            ],
                            "correctIndex": 1,
                            "explanation": "Los residuos farmacológicos en alimentos de origen animal están penalizados internacionalmente por razones de salud pública."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-7-6-genealogia-consanguinidad",
                    "title": "7.6 Árbol Genealógico Interactivo en 3 Generaciones y Control de Consanguinidad",
                    "description": "Visualiza el árbol genealógico familiar (Padres, Abuelos y Bisabuelos) renderizado en DataGan 360 y aprende a prevenir cruzamientos consanguíneos indeseados.",
                    "order": 6,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "15:00",
                    "durationSeconds": 900,
                    "metrics": ["indice_consanguinidad"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-7-6-1",
                            "prompt": "¿Qué consecuencia zootécnica negativa genera un alto coeficiente de consanguinidad en un hato bovino?",
                            "options": [
                                "Aumenta la velocidad de ganancia de peso indefinidamente",
                                "Depresión endogámica: reducción de fertilidad, menor peso al nacer, menor viabilidad embrionaria y defectos congénitos",
                                "Los animales nacen inmunes a las garrapatas",
                                "Ninguna, la consanguinidad siempre es favorable"
                            ],
                            "correctIndex": 1,
                            "explanation": "El cruzamiento entre parientes cercanos fija alelos deletéreos y disminuye el vigor híbrido del hato."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        },
        # =====================================================================
        # MÓDULO 8: FINANZAS GANADERAS Y COSTEO OPERATIVO
        # =====================================================================
        {
            "id": "modulo-8-finanzas",
            "title": "Módulo 8: Finanzas Ganaderas, Costeo Operativo y Flujo de Caja",
            "description": "Convierte la zootecnia en rentabilidad empresarial: gestión de inventario de insumos en bodega, costeo de mano de obra y jornales, compras, ventas y balance de liquidez.",
            "order": 8,
            "lessons": [
                {
                    "id": "les-8-1-inventario-bodega",
                    "title": "8.1 Inventario de Insumos, Bodega y Kardex Automático",
                    "description": "Administra sal mineralizada, concentrados, fertilizantes y pajillas de semen. Aprende cómo el stock se descarga automáticamente al aplicar tratamientos en campo.",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "12:40",
                    "durationSeconds": 760,
                    "metrics": ["costo_litro_leche"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-8-1-1",
                            "prompt": "¿Qué beneficio aporta el Kardex automático integrado en DataGan 360?",
                            "options": [
                                "Elimina la necesidad de comprar medicamentos",
                                "Descarga automáticamente del inventario las dosis aplicadas en tratamientos veterinarios o fertilizantes usados en potreros, calculando el costo real por animal",
                                "Duplica el stock existente en bodega",
                                "Es un catálogo de fotos de vacas"
                            ],
                            "correctIndex": 1,
                            "explanation": "El Kardex vincula el evento médico o agronómico con el centro de costos sin necesidad de doble digitación contable."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-8-2-actividades-jornales",
                    "title": "8.2 Costeo de Mano de Obra, Jornales y Labores de Finca",
                    "description": "Registra jornales pagados para limpieza de potreros, arreglo de cercas eléctricas, vacunaciones masivas o mantenimiento de corral, imputando el costo al potrero o lote.",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "11:15",
                    "durationSeconds": 675,
                    "metrics": ["costo_litro_leche"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-8-2-1",
                            "prompt": "¿Por qué es indispensable imputar los jornales de guadaña o fumigación directamente al centro de costos del Potrero correspondiente?",
                            "options": [
                                "Para que el trabajador reciba una medalla",
                                "Para calcular el costo real de mantenimiento por hectárea y compararlo con los kilogramos de carne o litros de leche que ese potrero generó",
                                "Para pagar menos salario al operario",
                                "No se debe asociar a ningún potrero"
                            ],
                            "correctIndex": 1,
                            "explanation": "El costeo por hectárea revela qué potreros son financieramente rentables y cuáles tienen costos de mantenimiento insostenibles."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-8-3-compras-ventas",
                    "title": "8.3 Compras Operativas, Ventas Comerciales y Utilidad Bruta",
                    "description": "Registra la compra de insumos o semovientes y la venta de ganado en pie, carne o novillos cebados, generando la factura comercial y dando de baja el inventario.",
                    "order": 3,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "14:20",
                    "durationSeconds": 860,
                    "metrics": ["tasa_extraccion"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-8-3-1",
                            "prompt": "¿Qué ocurre automáticamente en el sistema cuando registras la venta comercial de un lote de novillos cebados?",
                            "options": [
                                "Los novillos siguen apareciendo en el inventario activo",
                                "Los animales pasan a estado 'Vendido', se registra el ingreso financiero en caja y se actualiza la tasa de extracción zootécnica de la finca",
                                "Se borra la historia de pesajes previa de los animales",
                                "Se descuentan hectáreas del potrero"
                            ],
                            "correctIndex": 1,
                            "explanation": "DataGan 360 mantiene la trazabilidad histórica mientras actualiza en tiempo real el flujo de caja y la carga animal."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-8-4-cuentas-creditos",
                    "title": "8.4 Cuentas por Cobrar, Pasivos y Flujo de Caja del Predio",
                    "description": "Audita la liquidez global: cartera pendiente por liquidaciones de leche, créditos con proveedores agropecuarios y balance financiero proyectado del hato.",
                    "order": 4,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "13:10",
                    "durationSeconds": 790,
                    "metrics": ["costo_litro_leche"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-8-4-1",
                            "prompt": "¿Cuál es la principal causa de iliquidez en explotaciones lecheras según los análisis de flujo de caja?",
                            "options": [
                                "Comprar sal mineralizada de buena calidad",
                                "Desfase entre el pago quincenal/mensual de las acopiadoras y los gastos diarios de concentrado y nómina semanal",
                                "Pesar a los animales con frecuencia",
                                "Tener cercas eléctricas en buen estado"
                            ],
                            "correctIndex": 1,
                            "explanation": "El módulo de Cuentas permite anticipar estos valles de liquidez para coordinar compras a crédito y créditos rotativos."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        },
        # =====================================================================
        # MÓDULO 9: LOCALIZACIÓN INTELIGENTE IOT Y CLIMA
        # =====================================================================
        {
            "id": "modulo-9-localizacion-iot",
            "title": "Módulo 9: Localización Inteligente IoT y Monitoreo Bioclimático",
            "description": "El futuro de la ganadería digital: arquitectura de antenas RFID fijas y móviles, telemetría automática, detección temprana de ausentismo y cálculo del Índice ITH de estrés calórico.",
            "order": 9,
            "lessons": [
                {
                    "id": "les-9-1-antenas-lecturas",
                    "title": "9.1 Arquitectura RFID: Antenas, Lectores y Bolos Ruminales",
                    "description": "Aprende a configurar antenas concentradoras en mangas de trabajo, comederos y salas de ordeño para registrar el paso animal sin intervención manual.",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "13:50",
                    "durationSeconds": 830,
                    "metrics": [],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-9-1-1",
                            "prompt": "¿En qué lugares estratégicos de la finca se recomienda instalar antenas fijas de telemetría RFID?",
                            "options": [
                                "En la copa de los árboles más altos",
                                "En mangas de paso estrecho, puertas de retorno del ordeño y básculas automáticas",
                                "En el techo de la casa principal",
                                "Dentro de los bebederos sumergidas"
                            ],
                            "correctIndex": 1,
                            "explanation": "Las mangas de paso forzado garantizan que el animal transite a velocidad moderada dentro del campo electromagnético del lector."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-9-2-ausentismo-alertas",
                    "title": "9.2 Detección Temprana de Ausentismo y Alertas de Seguridad",
                    "description": "Configura el motor analítico que identifica animales con más de 24 o 48 horas sin lecturas de antena, alertando posibles abigeatos, animales atrapados en cañadas o problemas de salud.",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "11:30",
                    "durationSeconds": 690,
                    "metrics": [],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-9-2-1",
                            "prompt": "¿Qué alerta genera el algoritmo de ausentismo de DataGan 360?",
                            "options": [
                                "Que el operario no fue a trabajar",
                                "Una notificación prioritaria sobre animales cuyo microchip no ha sido detectado en el tiempo umbral establecido (ej. 36 horas)",
                                "Que la cerca eléctrica se quedó sin batería",
                                "Que el precio del dólar subió"
                            ],
                            "correctIndex": 1,
                            "explanation": "El ausentismo automatizado permite encontrar animales postrados, lastimados o víctimas de hurto antes de que sea demasiado tarde."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-9-3-ith-estres-calorico",
                    "title": "9.3 Estrés Calórico y Monitoreo del Índice ITH en Praderas",
                    "description": "Calcula e interpreta el Índice de Temperatura y Humedad (ITH). Conoce los umbrales críticos de estrés calórico y su impacto en la caída de producción y fertilidad.",
                    "order": 3,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "15:40",
                    "durationSeconds": 940,
                    "metrics": ["ith_estres_calorico"],
                    "resources": [
                        {
                            "id": "res-9-3-doc",
                            "title": "Capítulo ITH y Bienestar Bioclimático (.docx)",
                            "url": "/resources/Guia_Zootecnica_Metricas_DataGan_360.docx",
                            "type": "document",
                            "description": "Rangos de confort (ITH < 68), alerta (68 - 74) y estrés severo (75 - 84).",
                            "fileSize": "1.1 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-9-3-1",
                            "prompt": "¿A partir de qué valor de ITH (Índice de Temperatura y Humedad) las vacas lecheras de alta producción entran en estrés calórico moderado?",
                            "options": [
                                "ITH > 50",
                                "ITH > 68 - 72",
                                "ITH > 95",
                                "El ganado bovino nunca sufre estrés calórico"
                            ],
                            "correctIndex": 1,
                            "explanation": "A partir de un ITH de 72 se observa jadeo, salivación excesiva, caída drástica del consumo voluntario de materia seca y abortos embrionarios tempranos."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        },
        # =====================================================================
        # MÓDULO 10: REPORTES OFICIALES Y EXPEDIENTES ZOOTÉCNICOS
        # =====================================================================
        {
            "id": "modulo-10-reportes",
            "title": "Módulo 10: Generación de Reportes Oficiales y Hojas de Vida",
            "description": "Exporta la inteligencia de tu finca: creación de informes personalizados con filtros por potrero o lote, y expedición de hojas de vida oficiales zootécnicas en PDF y Excel.",
            "order": 10,
            "lessons": [
                {
                    "id": "les-10-1-generador-informes",
                    "title": "10.1 Constructor de Informes Personalizados y Filtros Avanzados",
                    "description": "Aprende a parametrizar informes específicos: listados de palpación para el veterinario, inventarios de existencias para entidades bancarias o balance mensual de ganancia de peso.",
                    "order": 1,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "12:50",
                    "durationSeconds": 770,
                    "metrics": ["tasa_extraccion", "carga_animal_ugm"],
                    "resources": [],
                    "checkpointQuiz": [
                        {
                            "id": "q-10-1-1",
                            "prompt": "¿Qué formatos de exportación soporta el generador de reportes de DataGan 360 para compartir con asesores y entidades?",
                            "options": [
                                "Únicamente capturas de pantalla de baja calidad",
                                "Formatos estructurados oficiales PDF de alta resolución y hojas de cálculo Excel (.xlsx)",
                                "Archivos de texto plano .txt sin formato",
                                "Disquetes magnéticos de 3.5 pulgadas"
                            ],
                            "correctIndex": 1,
                            "explanation": "El sistema genera documentos PDF formales para trámites crediticios y sanitarios, y Excel para modelación financiera avanzada."
                        }
                    ],
                    "inVideoCheckpoints": []
                },
                {
                    "id": "les-10-2-hojas-vida-oficiales",
                    "title": "10.2 Emisión de Hojas de Vida Oficiales y Dossier Sanitario para Movilización",
                    "description": "Genera el dossier técnico individual de cualquier bovino con un solo clic, listo para imprimir, compartir por WhatsApp o radicar ante el ICA.",
                    "order": 2,
                    "videoType": "youtube",
                    "videoUrl": "https://www.youtube.com/watch?v=ScMzIvxBSi4",
                    "duration": "10:15",
                    "durationSeconds": 615,
                    "metrics": ["indice_consanguinidad"],
                    "resources": [
                        {
                            "id": "res-10-2-dossier",
                            "title": "Modelo Oficial de Expediente Zootécnico Individual (.docx)",
                            "url": "/resources/Guia_Zootecnica_Metricas_DataGan_360.docx",
                            "type": "document",
                            "description": "Estructura formal con árbol genealógico, historial ponderal y cuadro de vacunación.",
                            "fileSize": "1.1 MB",
                            "extension": "docx"
                        }
                    ],
                    "checkpointQuiz": [
                        {
                            "id": "q-10-2-1",
                            "prompt": "¿Qué elementos componen la Hoja de Vida oficial emitida por DataGan 360?",
                            "options": [
                                "Solo el nombre del animal",
                                "Identificación visual y RFID, árbol genealógico de 3 generaciones, cronología de pesajes con GDP, eventos reproductivos y registro vacunal",
                                "El pronóstico astrológico del animal",
                                "El recibo de la luz de la finca"
                            ],
                            "correctIndex": 1,
                            "explanation": "La Hoja de Vida consolida la historia biológica y sanitaria completa del individuo como prueba legal y zootécnica de origen."
                        }
                    ],
                    "inVideoCheckpoints": []
                }
            ]
        }
    ]
}

# Guardar en localizaciones clave
paths = [
    r"D:\My Apps\Datagan Course\datagan_course_complete.json",
    r"D:\My Apps\Datagan Course\frontend\public\datagan_course_complete.json",
    r"C:\Users\Pc\.gemini\antigravity\brain\02941f86-6919-4bbc-911f-11dbcb714f2a\datagan_course_complete.json"
]

for p in paths:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(course_data, f, ensure_ascii=False, indent=2)
    print(f"Guardado exitosamente: {p}")

total_modulos = len(course_data["modules"])
total_lecciones = sum(len(m["lessons"]) for m in course_data["modules"])
total_quizzes = sum(sum(len(l.get("checkpointQuiz", [])) for l in m["lessons"]) for m in course_data["modules"])
total_invideo = sum(sum(len(l.get("inVideoCheckpoints", [])) for l in m["lessons"]) for m in course_data["modules"])
total_recursos = sum(sum(len(l.get("resources", [])) for l in m["lessons"]) for m in course_data["modules"])

print(f"\nResumen Estadístico del Curso Generado:")
print(f"- Total Módulos: {total_modulos}")
print(f"- Total Lecciones: {total_lecciones}")
print(f"- Total Preguntas Checkpoint Quiz: {total_quizzes}")
print(f"- Total In-Video Checkpoints: {total_invideo}")
print(f"- Total Recursos Vinculados: {total_recursos}")
