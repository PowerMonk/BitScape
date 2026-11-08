/** Bilingual copy for the whole UI. Both languages are required for every key. */

export type Lang = 'es' | 'en';
export type Bi = { es: string; en: string };

export const DICT = {
  'app.subtitle': { es: 'Repara aparatos por dentro', en: 'Fix devices from the inside' },
  'app.tagline': {
    es: 'Entra en los aparatos, entiende sus señales y repáralos desde adentro.',
    en: 'Step inside the devices, read their signals and fix them from within.',
  },

  'menu.play': { es: 'Jugar', en: 'Play' },
  'menu.continue': { es: 'Continuar', en: 'Continue' },
  'menu.newGame': { es: 'Nueva partida', en: 'New game' },
  'menu.selectLevel': { es: 'Elegir dispositivo', en: 'Pick a device' },
  'menu.encyclopedia': { es: 'Enciclopedia', en: 'Encyclopedia' },
  'menu.howTo': { es: 'Cómo jugar', en: 'How to play' },
  'menu.settings': { es: 'Ajustes', en: 'Settings' },
  'menu.language': { es: 'Idioma', en: 'Language' },
  'menu.erase': { es: 'Borrar progreso', en: 'Erase progress' },
  'menu.eraseConfirm': {
    es: 'Se borrará todo el progreso. ¿Seguro?',
    en: 'All progress will be erased. Are you sure?',
  },
  'menu.eraseYes': { es: 'Sí, borrar', en: 'Yes, erase' },
  'menu.name': { es: 'Nombre', en: 'Name' },
  'menu.suit': { es: 'Color de traje', en: 'Suit colour' },
  'menu.enterName': { es: 'Escribe tu nombre', en: 'Type your name' },

  'common.close': { es: 'Cerrar', en: 'Close' },
  'common.next': { es: 'Siguiente', en: 'Next' },
  'common.back': { es: 'Volver', en: 'Back' },
  'common.retry': { es: 'Reintentar', en: 'Try again' },
  'common.continue': { es: 'Continuar', en: 'Continue' },
  'common.pause': { es: 'Pausa', en: 'Pause' },
  'common.resume': { es: 'Reanudar', en: 'Resume' },
  'menu.main': { es: 'Menú principal', en: 'Main menu' },
  'common.hint': { es: 'Pista', en: 'Hint' },
  'common.inspect': { es: 'Inspeccionar', en: 'Inspect' },
  'common.hintShort': { es: 'P', en: 'H' },
  'common.skip': { es: 'Saltar', en: 'Skip' },
  'common.of': { es: 'de', en: 'of' },
  'common.done': { es: 'Hecho', en: 'Done' },
  'common.locked': { es: 'Bloqueado', en: 'Locked' },
  'common.completed': { es: 'Completado', en: 'Completed' },
  'common.repaired': { es: 'Reparado', en: 'Repaired' },
  'common.broken': { es: 'Averiado', en: 'Broken' },

  'hud.objective': { es: 'Objetivo', en: 'Objective' },
  'hud.stage.entry': { es: 'Entrada', en: 'Input' },
  'hud.stage.wiring': { es: 'Rutas', en: 'Routes' },
  'hud.stage.program': { es: 'Programa', en: 'Program' },
  'hud.stage.test': { es: 'Pruebas', en: 'Tests' },
  'hud.stage.path': { es: 'Recorrido', en: 'Path' },
  'hud.stage.inspect': { es: 'Explorar', en: 'Explore' },
  'hud.progress': { es: 'Progreso', en: 'Progress' },
  'hud.device': { es: 'Dispositivo', en: 'Device' },
  'hud.hub': { es: 'Laboratorio central', en: 'Central lab' },
  'hud.enter': { es: 'Entrar', en: 'Enter' },
  'hud.labProgress': { es: 'Dispositivos reparados: {a} de {b}', en: 'Devices repaired: {a} of {b}' },

  'title.start': { es: 'Entrar al laboratorio', en: 'Enter the lab' },
  'title.newConfirm': {
    es: 'Empezarás desde el principio. ¿Continuar?',
    en: 'You will start from the beginning. Continue?',
  },

  'intro.line1': {
    es: 'Exposición escolar. Mañana. Tres prototipos muertos.',
    en: 'School expo. Tomorrow. Three dead prototypes.',
  },
  'intro.line2': {
    es: 'El Microportal te encoge y te introduce en su representación digital.',
    en: 'The Microportal shrinks you into their digital representation.',
  },
  'intro.line3': {
    es: 'BIT, tu asistente, te espera dentro: entrada, procesamiento, salida.',
    en: 'BIT, your assistant, waits inside: input, processing, output.',
  },

  'puzzle.chooseInput': { es: 'Elige la entrada correcta', en: 'Choose the right input' },
  'puzzle.chooseInputSub': {
    es: '¿Qué dato necesita este aparato para funcionar?',
    en: 'Which datum does this device need to work?',
  },
  'puzzle.wiring.title': { es: 'Reconecta las rutas', en: 'Reconnect the routes' },
  'puzzle.wiring.sub': {
    es: 'Pulsa un origen y después un destino.',
    en: 'Click a source, then a destination.',
  },
  'puzzle.wiring.done': { es: 'Rutas restauradas', en: 'Routes restored' },
  'puzzle.wiring.invalid': {
    es: 'Esa conexión no corresponde a este aparato.',
    en: 'That connection does not belong to this device.',
  },
  'puzzle.wiring.needSource': { es: 'Elige primero un origen.', en: 'Pick a source first.' },
  'puzzle.wiring.same': { es: 'Origen y destino iguales.', en: 'Source and destination are the same.' },
  'puzzle.wiring.ok': { es: 'Conexión correcta.', en: 'Correct connection.' },

  'puzzle.program.title': { es: 'Configura el programa', en: 'Configure the program' },
  'puzzle.program.sub': {
    es: 'El controlador solo hace lo que el programa le ordena.',
    en: 'The controller only does what the program orders.',
  },
  'puzzle.program.addRule': { es: 'Añadir regla', en: 'Add rule' },
  'puzzle.program.remove': { es: 'Quitar', en: 'Remove' },
  'puzzle.program.if': { es: 'SI', en: 'IF' },
  'puzzle.program.then': { es: 'ENTONCES', en: 'THEN' },
  'puzzle.program.other': { es: 'En cualquier otro caso', en: 'In any other case' },
  'puzzle.program.keep': { es: 'conservar el estado anterior', en: 'keep the previous state' },
  'puzzle.program.while': { es: 'MIENTRAS', en: 'WHILE' },
  'puzzle.program.check': { es: 'Guardar programa', en: 'Save program' },
  'puzzle.program.run': { es: 'Probar sistema', en: 'Run the system' },
  'puzzle.program.empty': { es: 'Completa todos los espacios.', en: 'Fill in every slot.' },
  'puzzle.program.needRule': {
    es: 'Necesitas al menos una regla completa.',
    en: 'You need at least one complete rule.',
  },
  'puzzle.program.saved': { es: 'Programa guardado.', en: 'Program saved.' },
  'puzzle.program.palette': { es: 'Bloques', en: 'Blocks' },
  'puzzle.program.slots': { es: 'Espacios', en: 'Slots' },
  'puzzle.program.safety': { es: 'Condición de seguridad', en: 'Safety condition' },
  'puzzle.program.fill': { es: 'Condición de llenado', en: 'Fill condition' },
  'puzzle.program.slotFill': { es: 'espacio vacío', en: 'empty slot' },
  'puzzle.program.wrongBlock': {
    es: 'Ese bloque no va en este espacio.',
    en: 'That block does not fit this slot.',
  },

  'puzzle.order.title': { es: 'Ordena el ciclo', en: 'Order the cycle' },
  'puzzle.order.sub': {
    es: 'Pulsa las tarjetas en el orden correcto.',
    en: 'Tap the cards in the correct order.',
  },
  'puzzle.order.check': { es: 'Comprobar orden', en: 'Check order' },
  'puzzle.order.correct': { es: 'Orden correcto.', en: 'Correct order.' },
  'puzzle.order.firstWrong': {
    es: 'La primera etapa que no puede ejecutarse es: {step}.',
    en: 'The first stage that cannot run is: {step}.',
  },

  'puzzle.path.title': { es: 'Reconstruye el recorrido', en: 'Rebuild the signal path' },
  'puzzle.path.sub': {
    es: '¿En qué orden viaja la información hasta la acción?',
    en: 'In what order does information travel to the action?',
  },
  'puzzle.path.check': { es: 'Comprobar recorrido', en: 'Check path' },
  'puzzle.path.correct': { es: 'Recorrido correcto.', en: 'Correct path.' },
  'puzzle.path.wrong': {
    es: 'Ese no es el recorrido: la información empieza en el dato y termina en la acción.',
    en: 'That is not the path: information starts at the datum and ends at the action.',
  },

  'puzzle.test.title': { es: 'Prueba del dispositivo', en: 'Device test' },
  'puzzle.test.sub': {
    es: 'Observa qué lee, qué decide y qué hace.',
    en: 'Watch what it reads, decides and does.',
  },
  'puzzle.test.run': { es: 'Ejecutar prueba', en: 'Run test' },
  'puzzle.test.step1': { es: 'Lectura', en: 'Reading' },
  'puzzle.test.step2': { es: 'Decisión', en: 'Decision' },
  'puzzle.test.step3': { es: 'Salida', en: 'Output' },
  'puzzle.test.pass': { es: 'Prueba superada', en: 'Test passed' },
  'puzzle.test.fail': { es: 'Prueba fallida', en: 'Test failed' },
  'puzzle.test.allPass': { es: '¡Todas las pruebas superadas!', en: 'All tests passed!' },
  'puzzle.test.progress': { es: 'Prueba {a} de {b}', en: 'Test {a} of {b}' },
  'puzzle.test.effect': { es: 'Efecto', en: 'Effect' },

  'fb.testMismatch': {
    es: 'Con {input} esperabas {expected}, pero tu programa produjo {actual}.',
    en: 'With {input} you expected {expected}, but your program produced {actual}.',
  },
  'fb.testInput': { es: 'Entrada: {input}', en: 'Input: {input}' },
  'fb.testRule': { es: 'Regla evaluada: {rule}', en: 'Rule evaluated: {rule}' },
  'fb.testNoRule': {
    es: 'Ninguna regla se cumplió y no había acción predeterminada.',
    en: 'No rule matched and there was no default action.',
  },
  'fb.testAction': { es: 'Acción enviada: {action}', en: 'Action sent: {action}' },
  'fb.testEffectOk': { es: 'Efecto correcto: {effect}', en: 'Correct effect: {effect}' },
  'fb.testEffectBad': { es: 'Efecto incorrecto: {effect}', en: 'Wrong effect: {effect}' },
  'fb.missingOutput': {
    es: 'El controlador ejecutó la regla, pero no había salida conectada.',
    en: 'The controller ran the rule, but no output was connected.',
  },
  'fb.wiringFirst': {
    es: 'Primero restaura las rutas del sistema.',
    en: 'Restore the system routes first.',
  },
  'fb.programFirst': {
    es: 'Primero configura el programa del controlador.',
    en: 'Configure the controller program first.',
  },
  'fb.entryFirst': {
    es: 'Primero identifica la entrada correcta.',
    en: 'Identify the correct input first.',
  },
  'fb.blocked': {
    es: 'Ese componente aún no te necesita.',
    en: 'That component does not need you yet.',
  },
  'inspect.monitor': {
    es: 'Desde aquí ves cómo responde el aparato real a las señales de su interior.',
    en: 'From here you see how the real device responds to the signals inside it.',
  },
  'inspect.reading': { es: 'Lectura actual: {v}', en: 'Current reading: {v}' },

  'hint.concept': { es: 'Pista: {text}', en: 'Hint: {text}' },
  'hint.next': { es: 'Siguiente pista', en: 'Next hint' },
  'hint.none': { es: 'No quedan pistas.', en: 'No hints left.' },

  'results.title': { es: 'DISPOSITIVO REPARADO', en: 'DEVICE REPAIRED' },
  'results.entry': { es: 'Entrada identificada', en: 'Input identified' },
  'results.program': { es: 'Programa configurado', en: 'Program configured' },
  'results.output': { es: 'Salida conectada', en: 'Output connected' },
  'results.tests': { es: 'Pruebas superadas', en: 'Tests passed' },
  'results.path': { es: 'Recorrido reconstruido', en: 'Path rebuilt' },
  'results.score': { es: 'Puntuación', en: 'Score' },
  'results.badge': { es: 'Insignia desbloqueada', en: 'Badge unlocked' },
  'results.explain': { es: 'Ahora puedes explicar:', en: 'Now you can explain:' },
  'results.next': { es: 'Siguiente dispositivo', en: 'Next device' },
  'results.hub': { es: 'Volver al laboratorio', en: 'Back to the lab' },
  'results.tryAgain': { es: 'Repetir dispositivo', en: 'Repeat device' },

  'enc.title': { es: 'Enciclopedia', en: 'Encyclopedia' },
  'enc.sub': {
    es: 'Fichas desbloqueadas al reparar aparatos.',
    en: 'Entries unlocked by repairing devices.',
  },
  'enc.locked': { es: 'Repara un aparato para desbloquearla.', en: 'Repair a device to unlock it.' },
  'enc.embedded.title': { es: 'Sistema embebido', en: 'Embedded system' },
  'enc.embedded.text': {
    es: 'Es un sistema de cómputo integrado en un producto para realizar funciones específicas. En esta aventura reparas el sistema que controla cada dispositivo.',
    en: 'A computing system built into a product to perform specific functions. In this adventure you repair the system that controls each device.',
  },
  'enc.mcu.title': { es: 'Microcontrolador', en: 'Microcontroller' },
  'enc.mcu.text': {
    es: 'Es un pequeño computador integrado en un chip. Incluye procesamiento, memoria y recursos para comunicarse con entradas y salidas.',
    en: 'A small computer on a single chip. It includes processing, memory and resources to talk to inputs and outputs.',
  },
  'enc.sensor.title': { es: 'Sensor', en: 'Sensor' },
  'enc.sensor.text': {
    es: 'Detecta una condición, como temperatura o distancia, y proporciona información que el sistema puede utilizar.',
    en: 'Detects a condition such as temperature or distance and provides information the system can use.',
  },
  'enc.actuator.title': { es: 'Actuador', en: 'Actuator' },
  'enc.actuator.text': {
    es: 'Produce una acción física al recibir una orden, como mover un mecanismo mediante un motor.',
    en: 'Produces a physical action when it receives an order, like moving a mechanism with a motor.',
  },
  'enc.program.title': { es: 'Programa', en: 'Program' },
  'enc.program.text': {
    es: 'Contiene las instrucciones que ejecuta el controlador para realizar su tarea.',
    en: 'Contains the instructions the controller runs to do its job.',
  },

  'howto.title': { es: 'Cómo jugar', en: 'How to play' },
  'howto.goal': {
    es: 'Repara aparatos entrando en su interior: identifica la entrada, restaura las rutas, configura el programa, conecta la salida y pásalo todo a prueba.',
    en: 'Repair devices by going inside them: identify the input, restore the routes, configure the program, connect the output and put it all to the test.',
  },
  'howto.controls': { es: 'Controles', en: 'Controls' },
  'howto.move': { es: 'Moverte: WASD o flechas (o toca el suelo)', en: 'Move: WASD or arrows (or tap the floor)' },
  'howto.act': { es: 'Interactuar: E o clic en el componente', en: 'Interact: E or click the component' },
  'howto.hints': { es: 'Pistas: botón P (tres niveles, opcionales)', en: 'Hints: H key (three optional levels)' },
  'howto.pause': { es: 'Pausa: Escape', en: 'Pause: Escape' },
  'howto.flow': { es: 'El flujo de cada aparato', en: 'The flow of each device' },
  'howto.flowBody': {
    es: 'ENTRADA (qué dato llega) → PROCESAMIENTO (qué decide el programa) → SALIDA (qué acción ejecuta) → PRUEBA (si responde bien).',
    en: 'INPUT (what data arrives) → PROCESSING (what the program decides) → OUTPUT (what action runs) → TEST (whether it responds well).',
  },
  'howto.noPenalty': {
    es: 'No hay vidas ni castigos: equivocarte es parte de investigar.',
    en: 'No lives or penalties: being wrong is part of investigating.',
  },

  'pause.title': { es: 'Pausa', en: 'Pause' },
  'pause.howTo': { es: 'Cómo jugar', en: 'How to play' },
  'pause.settings': { es: 'Ajustes', en: 'Settings' },
  'pause.enc': { es: 'Enciclopedia', en: 'Encyclopedia' },
  'pause.toTitle': { es: 'Salir al título', en: 'Back to title' },

  'settings.reducedMotion': { es: 'Movimiento reducido', en: 'Reduced motion' },
  'settings.touchHint': {
    es: 'En pantallas táctiles aparecen botones en pantalla.',
    en: 'On touch screens on-screen buttons appear.',
  },

  'level.locked': {
    es: 'Repara antes el aparato anterior.',
    en: 'Repair the previous device first.',
  },
  'level.done': { es: 'Reparado · {score} pts', en: 'Repaired · {score} pts' },

  'badge.earned': { es: 'Insignia: {name}', en: 'Badge: {name}' },
  'badge.entry': { es: 'Explorador de entradas', en: 'Input explorer' },
  'badge.program': { es: 'Organizador de instrucciones', en: 'Instruction organizer' },
  'badge.output': { es: 'Controlador de salidas', en: 'Output controller' },
  'badge.final': { es: 'Arquitecto embebido', en: 'Embedded architect' },

  'save.corrupt': {
    es: 'No se pudo leer el progreso guardado; se creó uno nuevo.',
    en: 'Saved progress could not be read; a new one was created.',
  },
} as const;

export type DictKey = keyof typeof DICT;

export function translate(key: DictKey, lang: Lang): string {
  return DICT[key][lang];
}

/** Replace {placeholders} in a translated string. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
