# TecnoGan Academy — Frontend Web

Módulo cliente y panel administrativo de TecnoGan Academy, construido sobre **Next.js 16**, **React 19**, **Tailwind CSS** y **Firebase Realtime Database**.

---

## Scripts Disponibles

En el directorio `frontend/`:

- `npm run dev`: Inicia el servidor de desarrollo en `http://localhost:3000`.
- `npm run build`: Ejecuta el chequeo estricto de tipos de TypeScript y compila el bundle estático para producción en la carpeta `out/`.
- `npm run start`: Inicia el servidor de producción local tras un build previo.
- `npm run lint`: Ejecuta el linter ESLint para comprobar estándares de código.

---

## Arquitectura de Rutas (App Router)

- `/`: Portal público con catálogo de cursos, barras de progreso y accesos a Fases 1, 2, 3 y Certificado.
- `/course`: Aula virtual de reproducción de video interactivo, bloqueo secuencial, notas con timecode, Q&A y recursos descargables / pop quizes.
- `/scenarios`: Fase 2 - Reflejo Operativo con simulación visual de casos zootécnicos.
- `/sandbox`: Fase 3 - Práctica operativa en la finca ficticia DataGan 360.
- `/certificate`: Emisión y visualización de acreditaciones oficiales verificadas.
- `/admin`: Studio de control curricular, reordenamiento de temarios por arrastre, subida de portadas a R2 y control de visibilidad de fases.
- `/admin/analytics`: Monitoreo de telemetría de estudiantes y reconstrucción de certificados.
- `/admin/metrics`: Diccionario técnico de las 73 métricas ganaderas de precisión.
- `/admin/missions`: Administrador de misiones prácticas para el Sandbox.
- `/admin/scenarios`: Creador de escenarios visuales clínicos.
