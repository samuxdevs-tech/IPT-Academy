require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Course, Metric } = require('./models');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🌱 Conectado a MongoDB Atlas para Seeding...');

    // 1. Cargar las 73 métricas desde metrics_data.json
    const metricsRawPath = path.resolve(__dirname, '../metrics_data.json');
    if (fs.existsSync(metricsRawPath)) {
      const data = JSON.parse(fs.readFileSync(metricsRawPath, 'utf8'));
      const metricsList = Object.values(data.metrics);
      console.log(`Insertando ${metricsList.length} métricas oficiales...`);
      for (const m of metricsList) {
        await Metric.findOneAndUpdate({ id: m.id }, m, { upsert: true });
      }
      console.log('✅ 73 Métricas sincronizadas con éxito en MongoDB!');
    }

    // 2. Crear el Curso Maestro "Datagan Course: Certificación Profesional"
    const masterCourse = {
      slug: "datagan-master-pro",
      title: "Datagan 360: Gestión Ganadera Inteligente, Zootecnia & Finanzas",
      subtitle: "De la recolección de datos en corral a la analítica predictiva de alta rentabilidad.",
      description: "Programa integral para ganaderos, veterinarios y administradores agropecuarios. Aprende a controlar hatos, curvas de lactancia, GDP, IATF, costos por kilo/litro, y mitigación de estrés calórico (ITH) con telemetría en tiempo real.",
      category: "Gestión Agropecuaria & Tecnología",
      level: "Todos los niveles",
      rating: 4.9,
      ratingsCount: 148,
      thumbnail: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=800&q=80",
      instructor: {
        name: "Iván Pérez",
        role: "Fundador IPT & Zootecnista de Datos",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
      },
      modules: [
        {
          id: "mod-1",
          title: "Módulo 1: Arquitectura Predial, Roles & Gobernanza Administrativa",
          description: "Configuración perimetral, división catastral y control de acceso para trabajadores.",
          order: 1,
          lessons: [
            {
              id: "les-1-1",
              title: "1.1 Delimitación Territorial y Mapas Perimetrales SIG",
              description: "Trazado de linderos, curvas de nivel y cálculo de hectáreas útiles para pastoreo.",
              order: 1,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
              duration: "18 min",
              metrics: ["indice_ocupacion_potreros"]
            },
            {
              id: "les-1-2",
              title: "1.2 Gestión de Roles: Permisos para Vaqueros y Administradores",
              description: "Control de acceso seguro en campo con sincronización offline.",
              order: 2,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              duration: "12 min",
              metrics: []
            }
          ]
        },
        {
          id: "mod-2",
          title: "Módulo 2: Manejo de Praderas, Capacidad de Carga & Sistemas Silvopastoriles",
          description: "Leyes universales de Voisin, aforo de pastos y cálculo riguroso de UGM.",
          order: 2,
          lessons: [
            {
              id: "les-2-1",
              title: "2.1 Leyes de Voisin y Periodo de Descanso de la Pradera",
              description: "Evitar el sobrepastoreo mediante tiempos de descanso de 21 a 45 días.",
              order: 1,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
              duration: "24 min",
              metrics: ["tiempo_potrero", "rotacion_promedio"]
            },
            {
              id: "les-2-2",
              title: "2.2 Cálculo de Capacidad de Carga y Presión de Pastoreo (UGM)",
              description: "Midiendo cabezas por hectárea y ajustando oferta forrajera en materia seca.",
              order: 2,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
              duration: "20 min",
              metrics: ["carga_animal", "carga_animal_ugm"]
            }
          ]
        },
        {
          id: "mod-3",
          title: "Módulo 3: Fisiología de la Producción de Leche & Curvas de Lactancia",
          description: "Neuroendocrinología del ordeño, cálculo de vacas-día y benchmarks FEDEGAN.",
          order: 3,
          lessons: [
            {
              id: "les-3-1",
              title: "3.1 Fisiología del Ordeño y Rutina de Bajada de Leche",
              description: "Rol de la oxitocina vs estrés por adrenalina en el corral.",
              order: 1,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0",
              duration: "22 min",
              metrics: ["produccion_leche_total", "vacas_lactancia"]
            },
            {
              id: "les-3-2",
              title: "3.2 Métricas de Eficiencia: Litros por Vaca/Día y Curvas de Lactancia",
              description: "Análisis de persistencia tras el pico de lactancia y cálculo por lote.",
              order: 2,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
              duration: "28 min",
              metrics: ["rendimiento_promedio_leche", "ganancia_diaria_promedio", "litros_leche_ha"]
            }
          ]
        },
        {
          id: "mod-4",
          title: "Módulo 4: Evaluación Ponderal, Ganancia Diaria de Peso (GDP) & Ceba",
          description: "Dinámica de pesajes, filtros zootécnicos y conversión alimenticia.",
          order: 4,
          lessons: [
            {
              id: "les-4-1",
              title: "4.1 Protocolo de Pesaje y Descarte de Errores de Báscula",
              description: "Intervalos mínimos de 14 días y filtro de valores atípicos.",
              order: 1,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=2Vv-BfVoq4g",
              duration: "19 min",
              metrics: ["gdp_individual", "peso_promedio_ganado"]
            },
            {
              id: "les-4-2",
              title: "4.2 Tasa de Extracción y Productividad de Carne por Hectárea",
              description: "Cómo alcanzar el percentil top de 350 kg carne/ha/año.",
              order: 2,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=L_LUpnjgPso",
              duration: "25 min",
              metrics: ["kg_carne_ha", "tasa_extraccion"]
            }
          ]
        },
        {
          id: "mod-5",
          title: "Módulo 5: Reproducción Animal, Días Abiertos & Protocolos IATF",
          description: "Monitoreo del ciclo estral, servicios por concepción e impacto en flujo de caja.",
          order: 5,
          lessons: [
            {
              id: "les-5-1",
              title: "5.1 El Costo Financiero de los Días Abiertos",
              description: "Cada día abierto cuesta hasta $20.000 COP en manutención improductiva.",
              order: 1,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=OPf0YbXqDm0",
              duration: "21 min",
              metrics: ["dias_abiertos", "intervalo_interpartos"]
            },
            {
              id: "les-5-2",
              title: "5.2 Sincronización IATF y Tasa de Preñez",
              description: "Logrando tasas de concepción superiores al 60% en trópico bajo.",
              order: 2,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=JGwWNGJdvx8",
              duration: "26 min",
              metrics: ["tasa_prenhez", "servicios_concepcion"]
            }
          ]
        },
        {
          id: "mod-6",
          title: "Módulo 6: Telemetría IoT, Estrés Calórico (ITH) & Bienestar Animal",
          description: "Redes LoRaWAN en campo, fórmula oficial NRC de ITH y mitigación térmica.",
          order: 6,
          lessons: [
            {
              id: "les-6-1",
              title: "6.1 Fórmula del Índice de Temperatura-Humedad (ITH)",
              description: "Cálculo en tiempo real y clasificación según la escala de Armstrong.",
              order: 1,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=CevxZvSJLk8",
              duration: "23 min",
              metrics: ["ith", "ith_confort", "ith_severo"]
            }
          ]
        },
        {
          id: "mod-7",
          title: "Módulo 7: Economía Ganadera y Costo Unitario de Producción",
          description: "Costo por litro de leche y kilo de carne producido, margen y flujo de caja.",
          order: 7,
          lessons: [
            {
              id: "les-7-1",
              title: "7.1 Estructura de Costos Conjuntos: Leche vs Carne",
              description: "Metodología de reparto acotada entre el 15% y 85% de participación.",
              order: 1,
              videoType: "youtube",
              videoUrl: "https://www.youtube.com/watch?v=RgKAFK5djSk",
              duration: "27 min",
              metrics: ["costo_litro_leche", "costo_kg_carne", "balance", "rentabilidad"]
            }
          ]
        }
      ]
    };

    await Course.findOneAndUpdate({ slug: masterCourse.slug }, masterCourse, { upsert: true });
    console.log('✅ Curso Maestro inicializado en MongoDB Atlas!');

    await mongoose.disconnect();
    console.log('🎉 Seeding finalizado con éxito.');
  } catch (err) {
    console.error('Error durante seeding:', err);
    process.exit(1);
  }
}

seedDatabase();
