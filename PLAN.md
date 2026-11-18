# PLAN JurisPlanner
Hacer UNA fase por sesión. Al terminar: npm run build y resumir cambios. No tocar lo de otras fases.

## Fase A: datos y estilo
- Usar los archivos correctos en src/data (plan-estudios.json con ciclos[].cursos[], canciones.json, carta.txt, mensaje.txt). Adapta los lectores al formato de estos archivos, no al revés. Cursos debe mostrar los cursos del ciclo elegido tal como están en plan-estudios.json.
- Crear tokens de diseño (colores, radios, sombras, fuentes) a partir de design-demo/ y usarlos en TODOS los componentes. Tema claro por defecto (crema, lavanda, durazno) y oscuro opcional (azul noche con dorado suave).
- Reemplazar los emojis de navegación por iconos de línea (lucide-react). Esquinas de 20 a 28px, sombras suaves, mucho aire, degradados sutiles. Evitar el aspecto de plantilla genérica.

## Fase B: libro de canciones con tocadiscos
- Vista con un tocadiscos ilustrado en SVG/CSS (base clara, plato, brazo con aguja) y discos circulares por canción.
- "Poner disco": el disco pasa al plato, el brazo se posiciona y el disco gira (CSS); "Pausar" detiene la animación. Tarjeta de papel con la nota personal y botón "Escuchar" (abre la url; si es Spotify, ofrece embed oficial).
- Filtros por momento (Estudiar, Relajarse, Bailar, Ánimo), favoritas, canción del día y agregar/editar/borrar canciones (localStorage).
- Sin audio propio ni letras. Diseño propio, sin copiar sitios existentes. Respetar prefers-reduced-motion.

## Fase C: enfoque (pomodoro)
- Pestaña "Enfoque": reloj tipo flip suave (esquinas muy redondeadas, tipografía redonda, pasteles), modos enfoque/descanso corto/descanso largo (25/5/15 editables).
- Responsive con clamp(); modo pantalla completa (Fullscreen API) en tamaño grande; controles grandes; contador de sesiones de hoy; sonido suave opcional; vincular a una tarea.
- Si existe referencia-lovable/, reutiliza su lógica adaptándola (sin Supabase).

## Fase D: horario semanal
- Cuadrícula días x horas con bloques redondeados en pasteles (rosa, lavanda, durazno, menta, celeste). Empieza VACÍO. Agregar clase: curso (de Cursos), día, inicio, fin, aula y tipo (Teoría/Práctica/Laboratorio). Horas visibles configurables.
- En móvil, vista por día. Icono dulce opcional por curso (lucide: Cake, CakeSlice, Candy, Cookie, Donut, IceCream, Cherry).
- NO usar datos de otro horario.

## Fase E: notas y ponderador
- Por curso: evaluaciones (nombre, tipo, semana del ciclo 1 a 16, peso %, nota, fecha).
- Vista por curso (promedio ponderado actual, peso evaluado y barra de progreso) y vista por semana.
- Ponderador: escala 0 a 20 y nota aprobatoria 11, ambas editables. Promedio = suma(nota x peso)/100. Nota mínima necesaria en lo que falta = (aprobatoria - suma(nota x peso)/100) / (pesoRestante/100). Validar que los pesos sumen 100.
- Promedio general del ciclo ponderado por créditos (usar creditos de plan-estudios.json).

## Fase F: cierre
- PWA instalable, 390/768/1440px, tema claro y oscuro, noindex, despliegue.