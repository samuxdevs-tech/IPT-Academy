import { UserPersona } from '../types/index.js';

const FIRST_NAMES = [
  'Carlos', 'María', 'Alejandro', 'Valentina', 'Mateo', 'Sofía', 'Santiago', 'Camila',
  'Daniel', 'Lucía', 'Sebastián', 'Mariana', 'Diego', 'Isabella', 'Nicolás', 'Paula',
  'Andrés', 'Gabriela', 'Felipe', 'Catalina', 'Julián', 'Daniela', 'Esteban', 'Valeria',
  'Leonardo', 'Natalia', 'Javier', 'Sara', 'Gabriel', 'Elena', 'Tomás', 'Victoria',
  'Samuel', 'Laura', 'Fernando', 'Andrea', 'Manuel', 'Carolina', 'Martín', 'Adriana',
  'David', 'Juliana', 'Rodrigo', 'Diana', 'Emilio', 'Fernanda', 'Gonzalo', 'Patricia',
  'Ricardo', 'Ximena'
];

const LAST_NAMES = [
  'Pérez', 'Torrenegra', 'González', 'Rodríguez', 'López', 'Martínez', 'Gómez', 'Hernández',
  'García', 'Silva', 'Romero', 'Suárez', 'Díaz', 'Morales', 'Vargas', 'Castro',
  'Ramos', 'Mendoza', 'Flores', 'Álvarez', 'Ortiz', 'Gutiérrez', 'Chávez', 'Reyes',
  'Torres', 'Ramírez', 'Navarro', 'Serrano', 'Medina', 'Castillo', 'Guerrero', 'Paredes',
  'Ríos', 'Salazar', 'Cruz', 'Delgado', 'Vega', 'Peña', 'Miranda', 'Campos'
];

export function generatePersonas(count: number = 100): UserPersona[] {
  const personas: UserPersona[] = [];

  for (let i = 1; i <= count; i++) {
    const fIdx = (i * 7 + 3) % FIRST_NAMES.length;
    const lIdx = (i * 13 + 5) % LAST_NAMES.length;
    const firstName = FIRST_NAMES[fIdx];
    const lastName = LAST_NAMES[lIdx];

    const pad = String(i).padStart(3, '0');
    const email = `test_stress_user_${pad}@iptapps.com`;
    const password = `IptStress2026!_${pad}`;

    const archetypeChoice = i % 3;
    let archetype: UserPersona['profileArchetype'] = 'METHODICAL';
    let jitter = 1500;
    let wpm = 220;

    if (archetypeChoice === 0) {
      archetype = 'FAST_READER';
      jitter = 800;
      wpm = 320;
    } else if (archetypeChoice === 1) {
      archetype = 'CASUAL';
      jitter = 2500;
      wpm = 180;
    }

    personas.push({
      id: `usr_${pad}`,
      index: i,
      firstName,
      lastName,
      email,
      password,
      readingSpeedWpm: wpm,
      jitterFactorMs: jitter,
      profileArchetype: archetype,
    });
  }

  return personas;
}
