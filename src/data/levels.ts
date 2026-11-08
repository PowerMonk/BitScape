import type { Bi } from '../i18n/dict';
import type {
  LevelDef,
  LevelId,
  ActionDef,
  SensorDef,
  ValueOpt,
  Cmp,
} from '../game/types';

const b = (es: string, en: string): Bi => ({ es, en });

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

const NUM_OPS: Cmp[] = ['<', '<=', '>', '>=', '=', '!='];
const BOOL_OPS: Cmp[] = ['=', '!='];

const val = (v: number, es: string, en: string): ValueOpt => ({ v, label: b(es, en) });
const bval = (v: boolean, es: string, en: string): ValueOpt => ({ v, label: b(es, en) });

/* ------------------------------------------------------------------ */
/* Tutorial: training board (button -> indicator)                      */
/* ------------------------------------------------------------------ */

const buttonSensor: SensorDef = {
  id: 'button',
  label: b('Botón', 'Button'),
  icon: 'button',
  type: 'boolean',
};

const ledOn: ActionDef = {
  id: 'led_on',
  label: b('encender indicador', 'turn indicator on'),
  icon: 'led',
  effect: { led: 'on' },
};
const ledOff: ActionDef = {
  id: 'led_off',
  label: b('apagar indicador', 'turn indicator off'),
  icon: 'led',
  effect: { led: 'off' },
};

const tutorial: LevelDef = {
  id: 'tutorial',
  name: b('Módulo de prueba', 'Training module'),
  device: b('Placa de entrenamiento', 'Training board'),
  objective: b(
    'Haz que el indicador se encienda cuando se presione el botón.',
    'Make the indicator turn on when the button is pressed.',
  ),
  flow: b('Botón → programa de control → indicador', 'Button → control program → indicator'),
  palette: 'tutorial',
  windowKind: 'board',
  badges: [],
  encyclopedia: ['embedded'],
  stages: ['entry', 'wiring', 'program', 'test', 'path'],
  hotspot: {
    sensor: b('Botón de prueba', 'Test button'),
    mcu: b('Centro de control', 'Control centre'),
    actuator: b('Indicador luminoso', 'Indicator light'),
    monitor: b('Vista exterior', 'Outside view'),
  },
  stageObjectives: {
    entry: b('Identifica qué dato entrega el botón.', 'Identify what datum the button delivers.'),
    wiring: b('Lleva la señal al controlador y conecta el indicador.', 'Carry the signal to the controller and connect the indicator.'),
    program: b('Indica qué hacer según el estado del botón.', 'Say what to do depending on the button state.'),
    test: b('Prueba con el botón presionado y sin presionar.', 'Test with the button pressed and not pressed.'),
    path: b('Reconstruye el recorrido de la señal.', 'Rebuild the signal path.'),
  },
  intro: b(
    'Esta placa es el banco de pruebas. Si la entiendes, entiendes cualquier aparato.',
    'This board is the test bench. Understand it and you understand any device.',
  ),
  entry: {
    rounds: [
      {
        prompt: b('¿Qué dato entrega este aparato al sistema?', 'What datum does this device give the system?'),
        correctId: 'button',
        options: [
          {
            id: 'button',
            label: b('Estado del botón', 'Button state'),
            detail: b('presionado o sin presionar', 'pressed or not pressed'),
            correct: true,
          },
          {
            id: 'temp',
            label: b('Temperatura ambiente', 'Room temperature'),
            detail: b('grados Celsius', 'degrees Celsius'),
            correct: false,
            wrong: b(
              'Esta placa no mide el calor: solo sabe si alguien presionó o no el botón.',
              'This board does not measure heat: it only knows whether someone pressed the button or not.',
            ),
          },
          {
            id: 'dist',
            label: b('Distancia a un objeto', 'Distance to an object'),
            detail: b('centímetros', 'centimetres'),
            correct: false,
            wrong: b(
              'Aquí no hay nada que medir a distancia: el dato nace en el botón.',
              'There is nothing to measure at a distance here: the datum is born at the button.',
            ),
          },
        ],
      },
    ],
  },
  wiring: {
    nodes: [
      { id: 'button', kind: 'source', label: b('Botón', 'Button'), icon: 'button' },
      { id: 'mcuIn', kind: 'mcuIn', label: b('Entrada del controlador', 'Controller input'), icon: 'chip' },
      { id: 'mcuOut', kind: 'mcuOut', label: b('Salida del controlador', 'Controller output'), icon: 'chip' },
      { id: 'led', kind: 'sink', label: b('Indicador luminoso', 'Indicator light'), icon: 'led' },
    ],
    required: [
      ['button', 'mcuIn'],
      ['mcuOut', 'led'],
    ],
    reject: {
      'button>led': b(
        'La señal tiene que pasar por el controlador: él decide cuándo encender el indicador.',
        'The signal must pass through the controller: it decides when to turn the indicator on.',
      ),
      'mcuIn>led': b(
        'Esa es la entrada del controlador; la salida es el otro puerto.',
        "That is the controller's input; the output is the other port.",
      ),
    },
  },
  program: {
    kind: 'rule',
    slots: {
      sensors: [buttonSensor],
      ops: BOOL_OPS,
      values: [bval(true, 'presionado', 'pressed'), bval(false, 'sin presionar', 'not pressed')],
      actions: [ledOn, ledOff],
      count: 1,
      allowKeep: false,
      allowElse: true,
    },
  },
  tests: [
    {
      id: 't1',
      name: b('Botón presionado', 'Button pressed'),
      kind: 'rule',
      input: { button: true },
      prior: { led: 'off' },
      expected: { led: 'on' },
      feedback: b(
        'Con el botón presionado el indicador debe encenderse.',
        'With the button pressed the indicator must turn on.',
      ),
    },
    {
      id: 't2',
      name: b('Botón sin presionar', 'Button not pressed'),
      kind: 'rule',
      input: { button: false },
      prior: { led: 'on' },
      expected: { led: 'off' },
      feedback: b(
        'Sin presionar, el indicador debe apagarse: prueba con dos casos, no con uno.',
        'Not pressed, the indicator must turn off: test with two cases, not one.',
      ),
    },
  ],
  hints: {
    entry: [
      b('Piensa en qué cambia dentro de la placa.', 'Think about what changes inside the board.'),
      b('Necesitas saber si alguien presionó o no.', 'You need to know whether someone pressed it or not.'),
      b('Es la primera tarjeta de la izquierda.', "It's the first card on the left."),
    ],
    wiring: [
      b('El dato debe llegar primero a quien decide.', 'The datum must first reach whoever decides.'),
      b('El controlador tiene una entrada y una salida.', 'The controller has one input and one output.'),
      b('Conecta Botón → Entrada y Salida → Indicador.', 'Connect Button → Input and Output → Indicator.'),
    ],
    program: [
      b('El programa necesita una condición y una acción.', 'The program needs a condition and an action.'),
      b('Cuando el botón está presionado, ¿qué debe pasar?', 'When the button is pressed, what should happen?'),
      b('SI botón = presionado ENTONCES encender; en otro caso, apagar.', 'IF button = pressed THEN turn on; otherwise turn off.'),
    ],
    test: [
      b('Una sola prueba no basta.', 'One test is not enough.'),
      b('Prueba ambos estados del botón.', 'Test both states of the button.'),
      b('Si falla la segunda, revisa la rama "otro caso".', 'If the second one fails, check the "other case" branch.'),
    ],
    path: [
      b('Empieza por donde nace el dato.', 'Start where the datum is born.'),
      b('Después viene quien decide.', 'Then comes whoever decides.'),
      b('Orden: botón → programa → indicador.', 'Order: button → program → indicator.'),
    ],
  },
  path: {
    options: [
      { id: 'in', label: b('El botón (entrada)', 'The button (input)') },
      { id: 'proc', label: b('El programa (procesamiento)', 'The program (processing)') },
      { id: 'out', label: b('El indicador (salida)', 'The indicator (output)') },
    ],
    correctOrder: ['in', 'proc', 'out'],
  },
};

/* ------------------------------------------------------------------ */
/* Level 1: refrigerator                                               */
/* ------------------------------------------------------------------ */

const tempSensor: SensorDef = {
  id: 'temp',
  label: b('Sensor de temperatura', 'Temperature sensor'),
  unit: '°C',
  icon: 'thermo',
  type: 'number',
};

const coolOn: ActionDef = {
  id: 'cool_on',
  label: b('activar enfriamiento', 'activate cooling'),
  icon: 'motor',
  effect: { cooling: 'on' },
};
const coolOff: ActionDef = {
  id: 'cool_off',
  label: b('desactivar enfriamiento', 'deactivate cooling'),
  icon: 'motor',
  effect: { cooling: 'off' },
};
const alarm: ActionDef = {
  id: 'alarm',
  label: b('encender alarma sonora', 'sound the alarm'),
  icon: 'led',
  effect: { alarm: 'on' },
};
const decoLight: ActionDef = {
  id: 'light',
  label: b('encender indicador decorativo', 'light decorative indicator'),
  icon: 'led',
  effect: { light: 'on' },
};

const fridge: LevelDef = {
  id: 'fridge',
  name: b('El corazón del frío', 'The heart of the cold'),
  device: b('Refrigerador', 'Refrigerator'),
  objective: b(
    'La temperatura sube pero el enfriamiento no arranca: reconecta la lectura y completa el control.',
    'The temperature rises but cooling never starts: reconnect the reading and complete the control.',
  ),
  flow: b('Temperatura → programa de control → enfriamiento', 'Temperature → control program → cooling'),
  palette: 'fridge',
  windowKind: 'fridge',
  badges: ['entry'],
  encyclopedia: ['sensor'],
  stages: ['entry', 'wiring', 'program', 'test', 'path'],
  hotspot: {
    sensor: b('Sensor de temperatura', 'Temperature sensor'),
    mcu: b('Centro de control', 'Control centre'),
    actuator: b('Control de enfriamiento', 'Cooling control'),
    monitor: b('Vista exterior', 'Outside view'),
  },
  stageObjectives: {
    entry: b('Elige el dato que sí habla del frío.', 'Pick the datum that actually talks about the cold.'),
    wiring: b('Conecta el sensor al controlador y el control al enfriamiento.', 'Connect the sensor to the controller and the control to the cooling.'),
    program: b('Define a qué temperatura encender y apagar el enfriamiento.', 'Define at which temperature to switch cooling on and off.'),
    test: b('Supera las pruebas con temperatura alta, baja e intermedia.', 'Pass the tests with high, low and mid temperature.'),
    path: b('Reconstruye el recorrido de la señal.', 'Rebuild the signal path.'),
  },
  intro: b(
    'El compartimento se calienta y la máquina no reacciona. Alguien perdió la lectura.',
    'The compartment is warming up and the machine does not react. Someone lost the reading.',
  ),
  entry: {
    rounds: [
      {
        prompt: b('¿Qué variable necesita este refrigerador?', 'Which variable does this refrigerator need?'),
        correctId: 'temp',
        options: [
          {
            id: 'temp',
            label: b('Temperatura', 'Temperature'),
            detail: b('9 °C y subiendo', '9 °C and rising'),
            correct: true,
          },
          {
            id: 'dist',
            label: b('Distancia', 'Distance'),
            detail: b('12 cm', '12 cm'),
            correct: false,
            wrong: b(
              'La distancia no nos indica qué tan frío está el compartimento.',
              'Distance does not tell us how cold the compartment is.',
            ),
          },
          {
            id: 'motion',
            label: b('Movimiento', 'Motion'),
            detail: b('sin cambios', 'no change'),
            correct: false,
            wrong: b(
              'El movimiento no cambia nada: el frío se decide con la temperatura.',
              'Motion changes nothing: the cold is decided by the temperature.',
            ),
          },
        ],
      },
    ],
  },
  wiring: {
    nodes: [
      { id: 'temp', kind: 'source', label: b('Sensor de temperatura', 'Temperature sensor'), icon: 'thermo' },
      { id: 'mcuIn', kind: 'mcuIn', label: b('Entrada del controlador', 'Controller input'), icon: 'chip' },
      { id: 'mcuOut', kind: 'mcuOut', label: b('Salida del controlador', 'Controller output'), icon: 'chip' },
      { id: 'cooling', kind: 'sink', label: b('Control de enfriamiento', 'Cooling control'), icon: 'motor' },
      { id: 'alarm', kind: 'sink', label: b('Alarma sonora', 'Sound alarm'), icon: 'led' },
      { id: 'light', kind: 'sink', label: b('Indicador decorativo', 'Decorative indicator'), icon: 'led' },
    ],
    required: [
      ['temp', 'mcuIn'],
      ['mcuOut', 'cooling'],
    ],
    reject: {
      'mcuOut>alarm': b(
        'La alarma avisa, pero no baja la temperatura: no resuelve la misión.',
        'The alarm warns, but it does not lower the temperature: it does not solve the mission.',
      ),
      'mcuOut>light': b(
        'El indicador decorativo no enfria nada. Necesitas el control de enfriamiento.',
        'The decorative indicator cools nothing. You need the cooling control.',
      ),
      'temp>cooling': b(
        'El sensor no puede mandar directo a la máquina: el controlador interpreta la lectura.',
        'The sensor cannot command the machine directly: the controller interprets the reading.',
      ),
      'temp>alarm': b(
        'El controlador debe interpretar la lectura antes de avisar.',
        'The controller must interpret the reading before warning.',
      ),
      'temp>light': b(
        'El controlador debe interpretar la lectura antes de avisar.',
        'The controller must interpret the reading before warning.',
      ),
    },
  },
  program: {
    kind: 'rule',
    slots: {
      sensors: [tempSensor],
      ops: NUM_OPS,
      values: [val(6, '6 °C', '6 °C'), val(3, '3 °C', '3 °C'), val(8, '8 °C', '8 °C')],
      actions: [coolOn, coolOff, alarm, decoLight],
      count: 2,
      allowKeep: true,
      allowElse: true,
    },
  },
  tests: [
    {
      id: 'hot',
      name: b('Compartimento caliente (9 °C)', 'Hot compartment (9 °C)'),
      kind: 'rule',
      input: { temp: 9 },
      prior: { cooling: 'off' },
      expected: { cooling: 'on' },
      feedback: b(
        'A 9 °C el enfriamiento debe estar activo. Revisa el límite alto.',
        'At 9 °C cooling must be active. Check the upper limit.',
      ),
    },
    {
      id: 'cold',
      name: b('Compartimento frío (2 °C)', 'Cold compartment (2 °C)'),
      kind: 'rule',
      input: { temp: 2 },
      prior: { cooling: 'on' },
      expected: { cooling: 'off' },
      feedback: b(
        'A 2 °C hay que detener el enfriamiento: si sigue activo, el aparato pasa de frío.',
        'At 2 °C the cooling must stop: if it stays on, the device goes too cold.',
      ),
    },
    {
      id: 'mid',
      name: b('Zona intermedia (4 °C)', 'Middle zone (4 °C)'),
      kind: 'rule',
      input: { temp: 4 },
      prior: { cooling: 'on' },
      expected: { cooling: 'on' },
      feedback: b(
        'Entre 3 y 6 °C no hay orden nueva: se conserva el estado anterior.',
        'Between 3 and 6 °C there is no new order: the previous state is kept.',
      ),
    },
    {
      id: 'edge',
      name: b('Límite alto (7 °C)', 'Upper limit (7 °C)'),
      kind: 'rule',
      input: { temp: 7 },
      prior: { cooling: 'off' },
      expected: { cooling: 'on' },
      feedback: b(
        '7 °C ya debería enfriar: tu límite alto está mal colocado.',
        'At 7 °C it should already cool: your upper limit is in the wrong place.',
      ),
    },
  ],
  hints: {
    entry: [
      b('¿Qué dato cambia cuando el aparato se calienta?', 'What datum changes when the device warms up?'),
      b('Busca el componente que mide el calor.', 'Find the component that measures the heat.'),
      b('Es la tarjeta con el termómetro.', "It's the card with the thermometer."),
    ],
    wiring: [
      b('Primero quién mide, luego quién decide.', 'First who measures, then who decides.'),
      b('El controlador tiene una entrada y una salida.', 'The controller has one input and one output.'),
      b('Conecta Temperatura → Entrada y Salida → Control de enfriamiento.', 'Connect Temperature → Input and Output → Cooling control.'),
    ],
    program: [
      b('Necesitas dos límites: uno para encender y otro para apagar.', 'You need two limits: one to switch on, one to switch off.'),
      b('Si la temperatura es alta, ¿qué acción corresponde?', 'If the temperature is high, which action fits?'),
      b('Regla 1: SI temp >= 6 ENTONCES enfriar. Regla 2: SI temp <= 3 ENTONCES no enfriar. Otro caso: conservar.', 'Rule 1: IF temp >= 6 THEN cool. Rule 2: IF temp <= 3 THEN do not cool. Other case: keep.'),
    ],
    test: [
      b('Las pruebas usan temperaturas distintas.', 'The tests use different temperatures.'),
      b('Si una falla, el mensaje dice qué esperaba.', 'If one fails, the message says what was expected.'),
      b('Revisa la rama "otro caso": debe conservar el estado.', 'Check the "other case" branch: it must keep the state.'),
    ],
    path: [
      b('Empieza por donde nace el dato.', 'Start where the datum is born.'),
      b('Después viene quien decide.', 'Then comes whoever decides.'),
      b('Orden: temperatura → programa → enfriamiento.', 'Order: temperature → program → cooling.'),
    ],
  },
  path: {
    options: [
      { id: 'in', label: b('Lectura de temperatura', 'Temperature reading') },
      { id: 'proc', label: b('Programa de control', 'Control program') },
      { id: 'out', label: b('Enfriamiento', 'Cooling') },
    ],
    correctOrder: ['in', 'proc', 'out'],
  },
};

/* ------------------------------------------------------------------ */
/* Level 2: washing machine                                             */
/* ------------------------------------------------------------------ */

const doorSensor: SensorDef = {
  id: 'door',
  label: b('Sensor de puerta', 'Door sensor'),
  icon: 'button',
  type: 'boolean',
};
const waterSensor: SensorDef = {
  id: 'water',
  label: b('Nivel de agua', 'Water level'),
  unit: '%',
  icon: 'thermo',
  type: 'number',
};

const stepDefs: ActionDef[] = [
  { id: 'check_door', label: b('Verificar puerta cerrada', 'Verify door is closed'), effect: { checked: true } },
  { id: 'fill', label: b('Llenar hasta el nivel definido', 'Fill to the set level'), effect: { water: 100 } },
  { id: 'wash', label: b('Lavar', 'Wash'), effect: { washed: true } },
  { id: 'drain', label: b('Desaguar', 'Drain'), effect: { water: 0 } },
  { id: 'spin', label: b('Centrifugar', 'Spin'), effect: { spun: true } },
  { id: 'done', label: b('Mostrar fin', 'Show end'), effect: { cycle: 'done' } },
];

const safetyStop: ActionDef = {
  id: 'safety_stop',
  label: b('detener motor y mostrar aviso', 'stop motor and show warning'),
  icon: 'motor',
  effect: { motor: false, warn: true },
};
const motorRun: ActionDef = {
  id: 'motor_run',
  label: b('mantener el motor en marcha', 'keep the motor running'),
  icon: 'motor',
  effect: { motor: true },
};

const washer: LevelDef = {
  id: 'washer',
  name: b('Operación lavado', 'Wash operation'),
  device: b('Lavadora', 'Washing machine'),
  objective: b(
    'Las acciones están desordenadas y el motor gira sin comprobar la puerta: reconstruye el ciclo.',
    'The actions are out of order and the motor spins without checking the door: rebuild the cycle.',
  ),
  flow: b('Dato de la puerta → secuencia del programa → motor', 'Door data → program sequence → motor'),
  palette: 'washer',
  windowKind: 'washer',
  badges: ['program'],
  encyclopedia: ['program'],
  stages: ['entry', 'wiring', 'program', 'test', 'path'],
  hotspot: {
    sensor: b('Sensor de puerta', 'Door sensor'),
    mcu: b('Centro de control', 'Control centre'),
    actuator: b('Motor de lavado', 'Wash motor'),
    monitor: b('Vista exterior', 'Outside view'),
  },
  stageObjectives: {
    entry: b('Decide qué debe hacer el programa con la puerta abierta.', 'Decide what the program must do with the door open.'),
    wiring: b('Conecta el sensor de puerta y el motor.', 'Connect the door sensor and the motor.'),
    program: b('Ordena el ciclo, define el llenado y agrega la condición de seguridad.', 'Order the cycle, define the fill and add the safety condition.'),
    test: b('Supera las pruebas de ciclo, llenado y puerta.', 'Pass the cycle, fill and door tests.'),
    path: b('Reconstruye el recorrido de la señal.', 'Rebuild the signal path.'),
  },
  intro: b(
    'La lavadora salta de etapa en etapa. Sin orden, el ciclo no es un ciclo.',
    'The washing machine jumps between stages. Without order, a cycle is not a cycle.',
  ),
  entry: {
    rounds: [
      {
        prompt: b(
          'Dato recibido: "Puerta: abierta". ¿Qué debe decidir el programa?',
          'Data received: "Door: open". What must the program decide?',
        ),
        correctId: 'stop',
        options: [
          {
            id: 'spin',
            label: b('Iniciar el giro', 'Start spinning'),
            detail: b('el motor arranca', 'the motor starts'),
            correct: false,
            wrong: b(
              'Con la puerta abierta el giro es peligroso: la ropa saldría disparada.',
              'Spinning with the door open is dangerous: the clothes would fly out.',
            ),
          },
          {
            id: 'stop',
            label: b('Motor detenido y aviso', 'Motor stopped and warning'),
            detail: b('estado seguro', 'safe state'),
            correct: true,
          },
          {
            id: 'ignore',
            label: b('Ignorar el dato', 'Ignore the datum'),
            detail: b('sigue como si nada', 'carry on as usual'),
            correct: false,
            wrong: b(
              'Ignorar una condición de seguridad es dejar el aparato sin control.',
              'Ignoring a safety condition leaves the device without control.',
            ),
          },
        ],
      },
    ],
  },
  wiring: {
    nodes: [
      { id: 'door', kind: 'source', label: b('Sensor de puerta', 'Door sensor'), icon: 'button' },
      { id: 'mcuIn', kind: 'mcuIn', label: b('Entrada del controlador', 'Controller input'), icon: 'chip' },
      { id: 'mcuOut', kind: 'mcuOut', label: b('Salida del controlador', 'Controller output'), icon: 'chip' },
      { id: 'motor', kind: 'sink', label: b('Motor de lavado', 'Wash motor'), icon: 'motor' },
    ],
    required: [
      ['door', 'mcuIn'],
      ['mcuOut', 'motor'],
    ],
    reject: {
      'door>motor': b(
        'El sensor no maneja el motor directamente: el programa decide cuándo girar.',
        'The sensor does not drive the motor directly: the program decides when to spin.',
      ),
    },
  },
  program: {
    kind: 'sequence',
    slots: {
      steps: stepDefs.map((s) => ({ id: s.id, label: s.label, effect: s.effect })),
      safety: {
        sensors: [doorSensor],
        ops: BOOL_OPS,
        values: [bval(true, 'cerrada', 'closed'), bval(false, 'abierta', 'open')],
        actions: [safetyStop, motorRun],
      },
      fill: {
        sensors: [waterSensor],
        ops: ['<', '<=', '>', '>='],
        values: [
          val(100, 'objetivo (100 %)', 'target (100 %)'),
          val(60, '60 %', '60 %'),
          val(40, '40 %', '40 %'),
        ],
      },
    },
  },
  tests: [
    {
      id: 'order',
      name: b('Orden del ciclo', 'Cycle order'),
      kind: 'sequence',
      canonical: ['check_door', 'fill', 'wash', 'drain', 'spin', 'done'],
      prior: {},
      expected: {},
      feedback: b(
        'El ciclo debe empezar verificando la puerta antes de cualquier movimiento.',
        'The cycle must start by checking the door before any movement.',
      ),
    },
    {
      id: 'fill_mid',
      name: b('Llenado a mitad (40 %)', 'Filling halfway (40%)'),
      kind: 'fill',
      input: { water: 40 },
      expectedBool: true,
      prior: {},
      expected: {},
      feedback: b(
        'Con el nivel todavía bajo, el llenado debe continuar.',
        'With the level still low, filling must continue.',
      ),
    },
    {
      id: 'fill_high',
      name: b('Llenado avanzado (60 %)', 'Filling advanced (60%)'),
      kind: 'fill',
      input: { water: 60 },
      expectedBool: true,
      prior: {},
      expected: {},
      feedback: b(
        '60 % todavía no es el objetivo: el llenado no puede detenerse tan pronto.',
        '60% is not the target yet: filling cannot stop so early.',
      ),
    },
    {
      id: 'fill_done',
      name: b('Nivel alcanzado (100 %)', 'Level reached (100%)'),
      kind: 'fill',
      input: { water: 100 },
      expectedBool: false,
      prior: {},
      expected: {},
      feedback: b(
        'Al alcanzar el objetivo el llenado debe detenerse y pasar a lavado.',
        'When the target is reached, filling must stop and move to washing.',
      ),
    },
    {
      id: 'door_open',
      name: b('Falla: puerta abierta', 'Fault: door open'),
      kind: 'safety',
      input: { door: false },
      prior: { motor: true },
      expected: { motor: false, warn: true },
      expectedBool: true,
      feedback: b(
        'Con la puerta abierta el motor debe detenerse y mostrar el aviso.',
        'With the door open the motor must stop and show the warning.',
      ),
    },
    {
      id: 'door_closed',
      name: b('Puerta cerrada (sin alarma)', 'Door closed (no alarm)'),
      kind: 'safety',
      input: { door: true },
      prior: { motor: true },
      expected: { motor: true },
      expectedBool: false,
      feedback: b(
        'Con la puerta cerrada la seguridad no debe interferir.',
        'With the door closed the safety rule must not interfere.',
      ),
    },
  ],
  hints: {
    entry: [
      b('Piensa en qué condición no puede faltar antes de girar.', 'Think about which condition cannot be missing before spinning.'),
      b('La puerta es una condición de seguridad.', 'The door is a safety condition.'),
      b('Respuesta: mantener el motor detenido y avisar.', 'Answer: keep the motor stopped and warn.'),
    ],
    wiring: [
      b('Quién detecta, quién decide, quién mueve.', 'Who detects, who decides, who moves.'),
      b('El motor es la salida del sistema.', 'The motor is the system output.'),
      b('Conecta Puerta → Entrada y Salida → Motor.', 'Connect Door → Input and Output → Motor.'),
    ],
    program: [
      b('Un ciclo tiene etapas que no se pueden saltar.', 'A cycle has stages that cannot be skipped.'),
      b('¿Qué pasa si el nivel de agua aún no llega?', 'What happens if the water level has not arrived yet?'),
      b('Orden: verificar, llenar, lavar, desaguar, centrifugar, fin. Y agrega: SI puerta != cerrada, detener.', 'Order: check, fill, wash, drain, spin, end. And add: IF door != closed, stop.'),
    ],
    test: [
      b('Hay pruebas de orden, de llenado y de seguridad.', 'There are tests for order, fill and safety.'),
      b('Si "Llenado avanzado" falla, tu condición es muy estrecha.', 'If "Filling advanced" fails, your condition is too narrow.'),
      b('Si la puerta abierta falla, revisa la comparación de la seguridad.', 'If the open door fails, check the safety comparison.'),
    ],
    path: [
      b('Empieza por donde nace el dato.', 'Start where the datum is born.'),
      b('Después viene quien decide.', 'Then comes whoever decides.'),
      b('Orden: puerta → programa → motor.', 'Order: door → program → motor.'),
    ],
  },
  path: {
    options: [
      { id: 'in', label: b('Dato de la puerta', 'Door datum') },
      { id: 'proc', label: b('Secuencia del programa', 'Program sequence') },
      { id: 'out', label: b('Acción del motor', 'Motor action') },
    ],
    correctOrder: ['in', 'proc', 'out'],
  },
};

/* ------------------------------------------------------------------ */
/* Level 3: mobile robot                                               */
/* ------------------------------------------------------------------ */

const distSensor: SensorDef = {
  id: 'dist',
  label: b('Sensor de distancia', 'Distance sensor'),
  unit: 'cm',
  icon: 'distance',
  type: 'number',
};

const motorsStop: ActionDef = {
  id: 'motors_stop',
  label: b('detener motores', 'stop motors'),
  icon: 'motor',
  effect: { motors: 'stop' },
};
const motorsRun: ActionDef = {
  id: 'motors_run',
  label: b('avanzar', 'move forward'),
  icon: 'motor',
  effect: { motors: 'run' },
};

const robot: LevelDef = {
  id: 'robot',
  name: b('Ruta sin choques', 'Crash-free route'),
  device: b('Robot móvil', 'Mobile robot'),
  objective: b(
    'El robot avanza sin mirar hacia dónde va: relaciona la distancia con el control de los motores.',
    'The robot drives without looking where it is going: relate distance to motor control.',
  ),
  flow: b('Lectura de distancia → condición del programa → motores', 'Distance reading → program condition → motors'),
  palette: 'robot',
  windowKind: 'robot',
  badges: ['output'],
  encyclopedia: ['actuator'],
  stages: ['entry', 'wiring', 'program', 'test', 'path'],
  hotspot: {
    sensor: b('Sensor de distancia', 'Distance sensor'),
    mcu: b('Centro de control', 'Control centre'),
    actuator: b('Control de motores', 'Motor control'),
    monitor: b('Vista exterior', 'Outside view'),
  },
  stageObjectives: {
    entry: b('Elige el sensor y lee bien las distancias.', 'Pick the sensor and read the distances well.'),
    wiring: b('Conecta el sensor de distancia y los motores.', 'Connect the distance sensor and the motors.'),
    program: b('Define a qué distancia el robot debe detenerse.', 'Define at what distance the robot must stop.'),
    test: b('Supera las pruebas en varias posiciones del obstáculo.', 'Pass the tests at several obstacle positions.'),
    path: b('Reconstruye el recorrido de la señal.', 'Rebuild the signal path.'),
  },
  intro: b(
    'La pista está ahí fuera, con obstáculos. Dentro, el robot solo escucha a su programa.',
    'The track is out there, with obstacles. Inside, the robot only listens to its program.',
  ),
  entry: {
    rounds: [
      {
        prompt: b('¿Qué componente detecta un obstáculo cercano?', 'Which component detects a nearby obstacle?'),
        correctId: 'dist',
        options: [
          {
            id: 'dist',
            label: b('Sensor de distancia', 'Distance sensor'),
            detail: b('mide en centímetros', 'measures in centimetres'),
            correct: true,
          },
          {
            id: 'temp',
            label: b('Sensor de temperatura', 'Temperature sensor'),
            detail: b('mide en grados', 'measures in degrees'),
            correct: false,
            wrong: b(
              'La temperatura no cambia cuando algo se acerca: necesitas saber qué tan lejos está.',
              'Temperature does not change when something gets closer: you need to know how far it is.',
            ),
          },
          {
            id: 'button',
            label: b('Botón de inicio', 'Start button'),
            detail: b('solo enciende', 'only turns on'),
            correct: false,
            wrong: b(
              'El botón solo da la orden de arrancar; no mira hacia dónde va el robot.',
              'The button only gives the start order; it does not look where the robot is going.',
            ),
          },
        ],
      },
      {
        prompt: b('Paquetes leídos: 60 cm, 35 cm, 12 cm. ¿Cuál representa el objeto más cercano?', 'Read packets: 60 cm, 35 cm, 12 cm. Which one is the closest object?'),
        correctId: 'p12',
        options: [
          { id: 'p60', label: b('60 cm', '60 cm'), correct: false, wrong: b('60 cm está lejos: el robot todavía tiene espacio.', '60 cm is far: the robot still has room.') },
          { id: 'p35', label: b('35 cm', '35 cm'), correct: false, wrong: b('35 cm está a mitad de camino, pero no es lo más cercano.', '35 cm is halfway, but it is not the closest.') },
          { id: 'p12', label: b('12 cm', '12 cm'), correct: true },
        ],
      },
    ],
  },
  wiring: {
    nodes: [
      { id: 'dist', kind: 'source', label: b('Sensor de distancia', 'Distance sensor'), icon: 'distance' },
      { id: 'mcuIn', kind: 'mcuIn', label: b('Entrada del controlador', 'Controller input'), icon: 'chip' },
      { id: 'mcuOut', kind: 'mcuOut', label: b('Salida del controlador', 'Controller output'), icon: 'chip' },
      { id: 'motors', kind: 'sink', label: b('Control de motores', 'Motor control'), icon: 'motor' },
    ],
    required: [
      ['dist', 'mcuIn'],
      ['mcuOut', 'motors'],
    ],
    reject: {
      'dist>motors': b(
        'El sensor no maneja los motores: el programa traduce la distancia en una orden.',
        'The sensor does not drive the motors: the program turns distance into an order.',
      ),
    },
  },
  program: {
    kind: 'rule',
    slots: {
      sensors: [distSensor],
      ops: NUM_OPS,
      values: [val(20, '20 cm', '20 cm'), val(35, '35 cm', '35 cm'), val(12, '12 cm', '12 cm')],
      actions: [motorsStop, motorsRun],
      count: 1,
      allowKeep: false,
      allowElse: true,
    },
  },
  tests: [
    {
      id: 'far',
      name: b('Obstáculo lejano (60 cm)', 'Far obstacle (60 cm)'),
      kind: 'rule',
      input: { dist: 60 },
      prior: { motors: 'stop' },
      expected: { motors: 'run' },
      feedback: b(
        'Con 60 cm el robot debe avanzar: hay espacio de sobra.',
        'At 60 cm the robot must move forward: there is plenty of room.',
      ),
    },
    {
      id: 'mid',
      name: b('Obstáculo medio (35 cm)', 'Middle obstacle (35 cm)'),
      kind: 'rule',
      input: { dist: 35 },
      prior: { motors: 'stop' },
      expected: { motors: 'run' },
      feedback: b(
        '35 cm todavía permite avanzar: el límite no puede estar tan alto.',
        '35 cm still allows moving forward: the limit cannot be that high.',
      ),
    },
    {
      id: 'close',
      name: b('Obstáculo cercano (12 cm)', 'Close obstacle (12 cm)'),
      kind: 'rule',
      input: { dist: 12 },
      prior: { motors: 'run' },
      expected: { motors: 'stop' },
      feedback: b(
        'Con 12 cm el robot debe detenerse. La misión pide parar por debajo de 20 cm: revisa la comparación.',
        'At 12 cm the robot must stop. The mission asks to stop below 20 cm: check the comparison.',
      ),
    },
    {
      id: 'limit',
      name: b('Justo en el límite (20 cm)', 'Exactly at the limit (20 cm)'),
      kind: 'rule',
      input: { dist: 20 },
      prior: { motors: 'stop' },
      expected: { motors: 'run' },
      feedback: b(
        'A 20 cm el obstáculo todavía no es peligroso: la orden es detener por debajo de 20.',
        'At 20 cm the obstacle is not dangerous yet: the order is to stop below 20.',
      ),
    },
  ],
  hints: {
    entry: [
      b('Necesitas saber qué tan lejos está algo.', 'You need to know how far something is.'),
      b('Busca el componente que mide distancia.', 'Find the component that measures distance.'),
      b('Y entre las lecturas, gana la más pequeña.', 'And among the readings, the smallest one wins.'),
    ],
    wiring: [
      b('Quién mide → quién decide → quién mueve.', 'Who measures → who decides → who moves.'),
      b('Los motores son la salida.', 'The motors are the output.'),
      b('Conecta Distancia → Entrada y Salida → Motores.', 'Connect Distance → Input and Output → Motors.'),
    ],
    program: [
      b('Necesitas un umbral: menos de cierta distancia, parar.', 'You need a threshold: below a certain distance, stop.'),
      b('¿Qué valor eliges para que 12 cm pare y 35 cm no?', 'Which value makes 12 cm stop and 35 cm not?'),
      b('SI distancia < 20 ENTONCES detener; SI NO avanzar.', 'IF distance < 20 THEN stop; ELSE move forward.'),
    ],
    test: [
      b('Las pruebas usan varias posiciones.', 'The tests use several positions.'),
      b('Si "Justo en el límite" falla, usaste <= en lugar de <.', 'If "Exactly at the limit" fails, you used <= instead of <.'),
      b('Si "Obstáculo cercano" falla, tu umbral es demasiado bajo.', 'If "Close obstacle" fails, your threshold is too low.'),
    ],
    path: [
      b('Empieza por donde nace el dato.', 'Start where the datum is born.'),
      b('Después viene quien decide.', 'Then comes whoever decides.'),
      b('Orden: distancia → condición → motores.', 'Order: distance → condition → motors.'),
    ],
  },
  path: {
    options: [
      { id: 'in', label: b('Lectura de distancia', 'Distance reading') },
      { id: 'proc', label: b('Condición del programa', 'Program condition') },
      { id: 'out', label: b('Orden a los motores', 'Order to the motors') },
    ],
    correctOrder: ['in', 'proc', 'out'],
  },
};

/* ------------------------------------------------------------------ */
/* Final challenge: automatic fan                                      */
/* ------------------------------------------------------------------ */

const fanOn: ActionDef = {
  id: 'fan_on',
  label: b('encender ventilador', 'turn fan on'),
  icon: 'motor',
  effect: { fan: 'on', speed: 1 },
};
const fanOff: ActionDef = {
  id: 'fan_off',
  label: b('apagar ventilador', 'turn fan off'),
  icon: 'motor',
  effect: { fan: 'off', speed: 0 },
};
const fanLedOn: ActionDef = { id: 'led_on', label: b('encender indicador', 'turn indicator on'), icon: 'led', effect: { led: 'on' } };
const fanLedOff: ActionDef = { id: 'led_off', label: b('apagar indicador', 'turn indicator off'), icon: 'led', effect: { led: 'off' } };

const fan: LevelDef = {
  id: 'fan',
  name: b('Construye el recorrido', 'Build the path'),
  device: b('Ventilador automático', 'Automatic fan'),
  objective: b(
    'Sin instrucciones paso a paso: haz que el ventilador responda a la temperatura.',
    'No step-by-step instructions: make the fan respond to the temperature.',
  ),
  flow: b('Lectura de temperatura → condición → ventilador', 'Temperature reading → condition → fan'),
  palette: 'fan',
  windowKind: 'fan',
  badges: ['final'],
  encyclopedia: ['mcu'],
  stages: ['wiring', 'program', 'test', 'path'],
  hotspot: {
    sensor: b('Sensores disponibles', 'Available sensors'),
    mcu: b('Centro de control', 'Control centre'),
    actuator: b('Ventilador', 'Fan'),
    monitor: b('Vista exterior', 'Outside view'),
  },
  stageObjectives: {
    wiring: b('Elige la entrada, conecta el controlador y selecciona el ventilador.', 'Pick the input, connect the controller and select the fan.'),
    program: b('Completa la regla que decide cuándo encender.', 'Complete the rule that decides when to switch on.'),
    test: b('Superá dos pruebas con valores distintos.', 'Pass two tests with different values.'),
    path: b('Explica el recorrido ordenando tres tarjetas.', 'Explain the path by ordering three cards.'),
  },
  intro: b(
    'No hay pistas esta vez: solo el aparato, sus componentes y lo que aprendiste.',
    'No hints this time: just the device, its components and what you learned.',
  ),
  wiring: {
    nodes: [
      { id: 'temp', kind: 'source', label: b('Sensor de temperatura', 'Temperature sensor'), icon: 'thermo' },
      { id: 'dist', kind: 'source', label: b('Sensor de distancia', 'Distance sensor'), icon: 'distance' },
      { id: 'mcuIn', kind: 'mcuIn', label: b('Entrada del controlador', 'Controller input'), icon: 'chip' },
      { id: 'mcuOut', kind: 'mcuOut', label: b('Salida del controlador', 'Controller output'), icon: 'chip' },
      { id: 'fan', kind: 'sink', label: b('Motor del ventilador', 'Fan motor'), icon: 'motor' },
      { id: 'led', kind: 'sink', label: b('Indicador luminoso', 'Indicator light'), icon: 'led' },
    ],
    required: [
      ['temp', 'mcuIn'],
      ['mcuOut', 'fan'],
    ],
    reject: {
      'dist>mcuIn': b(
        'La distancia no te dice qué tan caluroso está el cuarto: para eso está el sensor de temperatura.',
        'Distance does not tell you how hot the room is: that is what the temperature sensor is for.',
      ),
      'mcuOut>led': b(
        'El indicador avisa, pero la misión es que el ventilador responda al calor.',
        'The indicator warns, but the mission is for the fan to respond to the heat.',
      ),
      'temp>fan': b(
        'El dato necesita pasar por el controlador: él ejecuta las instrucciones.',
        'The datum must pass through the controller: it executes the instructions.',
      ),
      'dist>fan': b(
        'El dato necesita pasar por el controlador: él ejecuta las instrucciones.',
        'The datum must pass through the controller: it executes the instructions.',
      ),
      'temp>led': b(
        'El dato necesita pasar por el controlador: él ejecuta las instrucciones.',
        'The datum must pass through the controller: it executes the instructions.',
      ),
      'dist>led': b(
        'El dato necesita pasar por el controlador: él ejecuta las instrucciones.',
        'The datum must pass through the controller: it executes the instructions.',
      ),
    },
  },
  program: {
    kind: 'rule',
    slots: {
      sensors: [tempSensor],
      ops: NUM_OPS,
      values: [val(30, '30 °C', '30 °C'), val(45, '45 °C', '45 °C'), val(10, '10 °C', '10 °C')],
      actions: [fanOn, fanOff, fanLedOn, fanLedOff],
      count: 1,
      allowKeep: true,
      allowElse: true,
    },
  },
  tests: [
    {
      id: 'hot',
      name: b('Cuarto caluroso (45 °C)', 'Hot room (45 °C)'),
      kind: 'rule',
      input: { temp: 45 },
      prior: { fan: 'off', speed: 0 },
      expected: { fan: 'on', speed: 1 },
      feedback: b(
        'Con 45 °C el ventilador debe encenderse.',
        'At 45 °C the fan must turn on.',
      ),
    },
    {
      id: 'cool',
      name: b('Cuarto fresco (18 °C)', 'Cool room (18 °C)'),
      kind: 'rule',
      input: { temp: 18 },
      prior: { fan: 'on', speed: 1 },
      expected: { fan: 'off', speed: 0 },
      feedback: b(
        'Con 18 °C no hace falta ventilador: debe apagarse.',
        'At 18 °C no fan is needed: it must turn off.',
      ),
    },
  ],
  hints: {
    wiring: [
      b('¿Qué dato habla del calor?', 'Which datum talks about the heat?'),
      b('El ventilador es quien ejecuta la acción.', 'The fan is the one that performs the action.'),
      b('Conecta Temperatura → Entrada y Salida → Ventilador.', 'Connect Temperature → Input and Output → Fan.'),
    ],
    program: [
      b('Necesitas un límite y una acción para cada caso.', 'You need a limit and an action for each case.'),
      b('¿A partir de qué temperatura conviene enfriar?', 'From which temperature is it worth cooling down?'),
      b('SI temperatura >= 30 ENTONCES encender; en otro caso, apagar.', 'IF temperature >= 30 THEN turn on; otherwise turn off.'),
    ],
    test: [
      b('Dos pruebas con valores muy distintos.', 'Two tests with very different values.'),
      b('Si la fresca falla, revisa la rama "otro caso".', 'If the cool one fails, check the "other case" branch.'),
      b('El simulador te dice qué esperaba y qué obtuvo.', 'The simulator tells you what it expected and what it got.'),
    ],
    path: [
      b('Tres tarjetas, un solo orden.', 'Three cards, one order.'),
      b('Dato → decisión → acción.', 'Datum → decision → action.'),
      b('Orden: temperatura → condición → ventilador.', 'Order: temperature → condition → fan.'),
    ],
  },
  path: {
    options: [
      { id: 'in', label: b('Lectura de temperatura', 'Temperature reading') },
      { id: 'proc', label: b('Condición del programa', 'Program condition') },
      { id: 'out', label: b('Acción del ventilador', 'Fan action') },
    ],
    correctOrder: ['in', 'proc', 'out'],
  },
};

/* ------------------------------------------------------------------ */

export const LEVELS: Record<LevelId, LevelDef> = {
  tutorial,
  fridge,
  washer,
  robot,
  fan,
};

export const LEVEL_ORDER: LevelId[] = ['tutorial', 'fridge', 'washer', 'robot', 'fan'];

export function getLevel(id: LevelId): LevelDef {
  return LEVELS[id];
}

export function nextLevel(id: LevelId): LevelId | null {
  const i = LEVEL_ORDER.indexOf(id);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
}

/** Score weights from the design document (100 points per device). */
export const SCORE = {
  entry: 20,
  program: 30,
  output: 20,
  tests: 20,
  path: 10,
} as const;
