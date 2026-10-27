require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const { Course, QuestionPost } = require('./models');

async function seedInteractive() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🌱 Actualizando curso con Checkpoints de Aprendizaje (Quizzes) y Preguntas Q&A...');

    // 1. Añadir preguntas de validación (Checkpoints) a las lecciones
    const course = await Course.findOne({ slug: "datagan-master-pro" });
    if (course) {
      // Lección 1.1: Delimitación Territorial
      if (course.modules[0]?.lessons[0]) {
        course.modules[0].lessons[0].checkpointQuiz = [
          {
            id: "chk-1-1-1",
            prompt: "¿Cuál es el principal riesgo agronómico de extender la ocupación de un potrero por más de 7 días continuos en pastoreo rotacional?",
            options: [
              "Aumento excesivo de la materia seca disponible para el siguiente ciclo.",
              "El ganado consume el rebrote tierno de la planta, agotando las reservas de la raíz y degradando la pradera.",
              "Incremento descontrolado en la concentración de nitrógeno en el suelo.",
              "Se reduce la compactación por pezuña debido al acostumbramiento del hato."
            ],
            correctIndex: 1,
            explanation: "Según las Leyes Universales de Voisin, la ocupación prolongada (>7 días) permite que el bovino vuelva a pastar sobre el rebrote tierno recién nacido, lo cual destruye las reservas energéticas que la raíz necesita para recuperarse."
          },
          {
            id: "chk-1-1-2",
            prompt: "En el cálculo del Índice de Ocupación de Potreros de DataGan 360, ¿qué significa un valor del 10% en un esquema intensivo?",
            options: [
              "Falta grave de ganado; el 90% del predio está improductivo y descuidado.",
              "Error en los registros catastrales del módulo de fincas.",
              "Comportamiento completamente normal y deseable en pastoreo rotacional con 30 días de descanso y 3 de ocupación.",
              "El hato está en estado crítico de desnutrición."
            ],
            correctIndex: 2,
            explanation: "En un sistema rotacional eficiente, la mayor parte del área debe estar en periodo de reposo biológico. Con 30 días de descanso y 3 días de ocupación, naturalmente solo ~10% de los potreros se encuentra ocupado simultáneamente."
          }
        ];

        // Preguntas de control intercaladas en timestamps del video
        course.modules[0].lessons[0].inVideoCheckpoints = [
          {
            id: "iv-cp-1-1",
            timestampSeconds: 30, // Se activa a los 30 segundos de video
            prompt: "Control de Atención (0:30): Al planificar la división de potreros, ¿qué factor crítico determina el éxito del pastoreo rotacional?",
            options: [
              "El color del alambre de cerca eléctrica.",
              "La ubicación estratégica de los bebederos y sombríos para evitar traslados extenuantes.",
              "El uso de fertilizantes químicos en el 100% de los lotes.",
              "Pastorear sin subdividir para que el ganado elija libremente."
            ],
            correctIndex: 1,
            explanation: "Sin agua y sombra accesible en cada submódulo, los animales gastan su energía caminando bajo el sol en lugar de convertir pasto en carne o leche."
          },
          {
            id: "iv-cp-1-2",
            timestampSeconds: 75, // Se activa a los 75 segundos de video
            prompt: "Control de Atención (1:15): Si el ganado consume el remanente por debajo del punto óptimo de corte, ¿qué ocurre con el rebrote?",
            options: [
              "El rebrote se acelera porque entra más luz al suelo.",
              "La planta consume las reservas de su raíz y el tiempo de recuperación se duplica o triplica.",
              "El suelo produce nitrógeno espontáneamente.",
              "La pastura se vuelve inmune a las plagas."
            ],
            correctIndex: 1,
            explanation: "Cortar o pastorear por debajo del punto de crecimiento elimina el área foliar fotosintética, obligando a la planta a quemar sus reservas radiculares para rebrotar."
          }
        ];
      }

      // Lección 2.1: Leyes de Voisin
      if (course.modules[1]?.lessons[0]) {
        course.modules[1].lessons[0].checkpointQuiz = [
          {
            id: "chk-2-1-1",
            prompt: "¿Cuál es el periodo de descanso (rotación) óptimo recomendado para pasturas tropicales como Brachiaria o Guinea?",
            options: [
              "Menos de 14 días para forzar el crecimiento acelerado.",
              "Entre 21 y 45 días, dependiendo de la época climática (lluvias vs. sequía).",
              "Más de 90 días en todos los casos para asegurar máxima fibra leñosa.",
              "Cero días; el pastoreo continuo libre es el más productivo."
            ],
            correctIndex: 1,
            explanation: "El rango óptimo para gramíneas tropicales oscila entre 21 y 45 días. Menos de 21 días provoca sobrepastoreo; más de 45 días genera pasto sobremaduro con baja digestibilidad y menor valor nutritivo."
          }
        ];
      }

      // Lección 3.1: Fisiología de la Bajada de Leche
      if (course.modules[2]?.lessons[0]) {
        course.modules[2].lessons[0].checkpointQuiz = [
          {
            id: "chk-3-1-1",
            prompt: "¿Por qué el estrés, los gritos o el maltrato animal en la sala de ordeño bloquean la salida de leche?",
            options: [
              "Porque la oxitocina se destruye por la temperatura corporal.",
              "La adrenalina liberada actúa como antagonista directo de la oxitocina, contrayendo los capilares y cerrando los esfínteres mamarios.",
              "El ganado pierde el reflejo de micción y acumula toxinas.",
              "Disminuye la presión atmosférica dentro del tanque receptor."
            ],
            correctIndex: 1,
            explanation: "La adrenalina liberada en situaciones de dolor, miedo o estrés causa vasoconstricción periférica y bloquea de inmediato la acción de la oxitocina sobre las células mioepiteliales de la ubre."
          }
        ];
      }

      // Lección 5.1: Días Abiertos
      if (course.modules[4]?.lessons[0]) {
        course.modules[4].lessons[0].checkpointQuiz = [
          {
            id: "chk-5-1-1",
            prompt: "¿Cuánto se estima el costo de mantenimiento diario de una vaca vacía que supera el límite óptimo de días abiertos en Colombia?",
            options: [
              "Entre $1.000 y $2.000 COP/día.",
              "Entre $15.000 y $20.000 COP por día improductivo.",
              "No genera ningún costo porque el pasto es gratuito.",
              "Más de $250.000 COP diarios por cabeza."
            ],
            correctIndex: 1,
            explanation: "Cada día que una vaca permanece vacía por encima del rango óptimo (90-110 días) genera una pérdida estimada entre $15.000 y $20.000 COP en mano de obra, pasturas, suplementación y costo de oportunidad financiero."
          }
        ];
      }

      await course.save();
      console.log('✅ Cuestionarios de verificación de aprendizaje inyectados en las lecciones!');
    }

    // 2. Sembrar preguntas reales para el foro de Q&A
    const qCount = await QuestionPost.countDocuments();
    if (qCount === 0) {
      await QuestionPost.create([
        {
          id: "q-1",
          courseSlug: "datagan-master-pro",
          lessonId: "les-1-1",
          author: { name: "Carlos Rodríguez", initials: "CR" },
          title: "¿Cómo afecta el aforo por doble muestreo en época de sequía?",
          body: "En mi finca en Lorica durante los meses de verano la biomasa verde aprovechable cae más del 40%. ¿Recomiendan aumentar los días de descanso o suplementar con silo de maíz inmediatamente?",
          votes: 18,
          answers: [
            {
              id: "ans-1",
              authorName: "Iván Pérez",
              authorRole: "Instructor IPT",
              body: "En verano la velocidad de rebrote se reduce significativamente. Debes extender el periodo de descanso a 45-50 días y ajustar la carga animal mediante suplementación estratégica para no sobreexplotar el forraje disponible.",
              createdAt: new Date()
            }
          ]
        },
        {
          id: "q-2",
          courseSlug: "datagan-master-pro",
          lessonId: "les-5-1",
          author: { name: "María González", initials: "MG" },
          title: "Duda con el descarte de días abiertos fuera de 30-500 días",
          body: "En el glosario vi que el sistema descarta registros fuera de 30 a 500 días. ¿Por qué se establece ese umbral biológico?",
          votes: 12,
          answers: [
            {
              id: "ans-2",
              authorName: "Iván Pérez",
              authorRole: "Instructor IPT",
              body: "Un intervalo menor a 30 días es biológicamente imposible debido al periodo de involución uterina. Valores mayores a 500 días suelen corresponder a animales de descarte o vacas que abortaron sin registro previo.",
              createdAt: new Date()
            }
          ]
        }
      ]);
      console.log('✅ Preguntas de muestra para el foro Q&A creadas con éxito!');
    }

    await mongoose.disconnect();
    console.log('🎉 Actualización interactiva completa.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seedInteractive();
