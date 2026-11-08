La opción 2 puede convertirse en una aventura educativa en 2D donde el jugador se hace diminuto, entra en aparatos cotidianos y los repara desde adentro. La clave sería que cada reparación represente cómo el dispositivo recibe información, ejecuta instrucciones y produce una respuesta.

Te la desarrollo como un **documento** de diseño: concepto, historia, personajes, niveles, mecánicas, interfaz, aprendizaje y alcance de desarrollo.

# Dentro del dispositivo: misión embebida

## 1. Ficha general del videojuego

| Elemento             | Propuesta                                                                   |
| -------------------- | --------------------------------------------------------------------------- |
| Nombre               | Dentro del dispositivo: misión embebida                                     |
| Género               | Aventura educativa 2D con exploración y acertijos                           |
| Modalidad            | Un jugador                                                                  |
| Público propuesto    | Estudiantes de secundaria, preparatoria o primeros semestres de universidad |
| Plataforma inicial   | Computadora                                                                 |
| Estilo visual        | Laboratorio y circuitos electrónicos caricaturizados                        |
| Perspectiva          | Vista superior, con movimiento en cuatro direcciones                        |
| Duración objetivo    | Entre 20 y 30 minutos para la versión completa propuesta                    |
| Estructura           | Tutorial, tres dispositivos y desafío final                                 |
| Objetivo del jugador | Reparar aparatos entrando a sus sistemas de control                         |
| Objetivo educativo   | Explicar qué es un sistema embebido, cómo funciona y dónde se utiliza       |

La duración y cantidad de niveles son metas de diseño, no requisitos obligatorios. Puedes reducirlas según el tiempo disponible.

## 2. Idea central

El jugador entra en representaciones imaginarias del interior electrónico de distintos aparatos.

Dentro de cada uno encuentra un pequeño mundo dividido en tres zonas:

```text
ENTRADA → PROCESAMIENTO → SALIDA
   ↑                         |
   └──── Nueva lectura ──────┘
```

La aventura convierte esas funciones en acciones:

- En la entrada, recuperas o interpretas un dato.
- En el procesamiento, completas las instrucciones del controlador.
- En la salida, conectas el componente que ejecutará la acción.
- En la prueba, observas si el dispositivo responde correctamente.

Como base técnica, un microcontrolador integra procesamiento, memoria y periféricos de entrada y salida, y puede ejecutar tareas de control dentro de un sistema embebido. El juego representaría esas funciones como espacios que el personaje puede recorrer. [ibm](https://www.ibm.com/think/topics/microcontroller)

La miniaturización y los escenarios internos son ficción visual: no pretenden representar a escala el interior real de los aparatos.

## 3. Historia

### Introducción

En un laboratorio escolar, un equipo de estudiantes prepara una exposición sobre tecnología cotidiana.

Sin embargo, los prototipos que utilizarán en la exposición dejaron de funcionar correctamente:

- Un sistema de refrigeración no responde a la temperatura.
- Una lavadora de demostración no sigue su secuencia.
- Un robot móvil no detecta obstáculos.

El personaje principal prueba un dispositivo experimental llamado Microportal, capaz de introducir un avatar diminuto en una representación digital del interior de cada aparato.

Allí conoce a BIT, un asistente que lo guía para recuperar las conexiones y corregir los programas.

### Conflicto

Los dispositivos presentan tres tipos de fallas:

1. Datos de entrada que no llegan al controlador.
2. Instrucciones incompletas o incorrectas.
3. Salidas desconectadas o mal seleccionadas.

No todos los problemas se resuelven recogiendo piezas: el jugador debe entender qué información necesita cada dispositivo y qué debería hacer con ella.

### Final

Después de reparar los tres aparatos, el jugador reconstruye un último sistema sin instrucciones paso a paso.

La exposición vuelve a funcionar. Una escena muestra los objetos reparados y el recorrido de sus señales, conectando lo aprendido con su uso cotidiano.

## 4. Personajes

### El protagonista

Puede ser un estudiante personalizable mediante nombre y color de traje.

Su herramienta principal es el Guante de diagnóstico, que permite:

- Inspeccionar componentes.
- Leer valores.
- Transportar paquetes de datos.
- Reconectar rutas.
- Abrir paneles de programación.
- Ejecutar simulaciones.

No necesita armas ni combate: su progreso depende de observar, experimentar y corregir.

### BIT, el asistente

BIT es una pequeña figura flotante con apariencia de chip.

Funciones:

- Explicar los controles.
- Presentar la misión.
- Dar pistas opcionales.
- Interpretar los errores de las pruebas.
- Resumir el aprendizaje al terminar.

Ejemplos de diálogo:

> “Tenemos una lectura de temperatura, pero todavía no sabemos qué hacer con ella.”

> “El motor está conectado. Ahora revisemos qué condición lo activa.”

> “No basta con que funcione una vez: probemos qué pasa cuando cambia la entrada.”

### Personajes-componentes opcionales

Los componentes pueden tener pequeñas animaciones, sin convertirlos necesariamente en personajes con diálogos largos:

| Componente         | Representación                               |
| ------------------ | -------------------------------------------- |
| Sensor             | Estación de observación                      |
| Microcontrolador   | Centro de control                            |
| Memoria            | Archivo de instrucciones                     |
| Motor              | Máquina que mueve una plataforma o mecanismo |
| Indicador luminoso | Torre de luz que muestra un estado           |

El centro de control debe mostrarse como una parte del sistema, no como si por sí solo fuera todo el sistema embebido.

## 5. Objetivos educativos

Al terminar, el jugador debería poder:

1. Reconocer un sistema embebido como un sistema de cómputo integrado en un producto para realizar funciones específicas. [github](https://github.com/donymorph/From-Embedded-Systems-to-Autonomous-Robotics-roadmap)
2. Identificar la función del microcontrolador como ejecutor de instrucciones y coordinador de entradas y salidas. [ibm](https://www.ibm.com/think/topics/microcontroller)
3. Distinguir entre un sensor, que detecta condiciones, y un actuador, que produce una acción física. [ibm](https://www.ibm.com/think/topics/internet-of-things)
4. Reconstruir el recorrido de una señal: entrada, procesamiento y salida.
5. Explicar la función del programa mediante condiciones y secuencias.
6. Relacionar el modelo del juego con aplicaciones cotidianas de control.

Los tres últimos puntos son metas que se comprobarían mediante los retos del juego, no únicamente con textos informativos.

## 6. Mecánicas principales

### A. Exploración

El jugador recorre un escenario pequeño, busca componentes y observa conexiones.

Para mantener el alcance controlado:

- Cada dispositivo tendría un mapa compacto.
- Las zonas importantes quedarían conectadas por pasillos.
- No habría saltos ni físicas de plataformas.
- La dificultad principal estaría en los acertijos.

### B. Inspección

Al acercarse a un componente y pulsar una tecla, aparece una ficha corta:

```text
SENSOR DE TEMPERATURA

Lectura actual: 9 °C
Función en esta misión: proporcionar la temperatura.

[Tomar lectura]    [Cerrar]
```

La explicación debe ser breve; la acción posterior es la que demuestra su utilidad.

### C. Transporte de datos

El jugador recoge un “paquete de información” y lo lleva al centro de control.

Ejemplos:

```text
Temperatura: 9 °C
Puerta: cerrada
Distancia: 12 cm
```

Es una metáfora visual del envío de información, no una simulación literal del transporte de señales eléctricas.

### D. Reconexión de rutas

Se selecciona un origen y un destino para restaurar una conexión.

Ejemplo:

```text
Sensor de distancia → Entrada del controlador
Controlador → Control de motores
```

Para la primera versión, bastaría con hacer clic en dos puntos compatibles. Dibujar cables libres y simular electrónica real quedaría fuera del alcance.

### E. Programación con bloques

El jugador completa condiciones o secuencias usando opciones prediseñadas:

```text
SI [distancia] [es menor que] [20 cm]
ENTONCES [detener motores]
SI NO [avanzar]
```

No tendría que escribir código ni aprender sintaxis.

### F. Prueba del dispositivo

Una vez armado el sistema, el jugador pulsa “Probar”.

La pantalla muestra:

1. El dato de entrada.
2. La instrucción que se ejecutó.
3. La salida resultante.
4. El efecto sobre el dispositivo.

Si falla, puede corregir y repetir sin perder todo el avance.

## 7. Estructura general

```text
Menú principal
      ↓
Introducción
      ↓
Tutorial: módulo de prueba
      ↓
Laboratorio central
      ├── Dispositivo 1: refrigeración
      ├── Dispositivo 2: lavadora
      └── Dispositivo 3: robot móvil
      ↓
Desafío final
      ↓
Resultados y cierre
```

El laboratorio central funcionaría como selector de niveles. Cada aparato aparece apagado o averiado y cambia de aspecto al repararlo.

## 8. Tutorial: el módulo de prueba

### Propósito

Enseñar los controles y presentar la estructura básica sin saturar al jugador.

### Escenario

Una placa de entrenamiento con:

- Un botón.
- Un controlador.
- Un indicador luminoso.

### Misión

> “Haz que el indicador se encienda cuando se presione el botón.”

### Pasos

1. Caminar hasta el botón.
2. Inspeccionarlo.
3. Llevar su señal al controlador.
4. Completar la instrucción.
5. Conectar la salida.
6. Ejecutar una prueba con el botón presionado y otra sin presionar.

```text
SI botón = presionado
    encender indicador
SI NO
    apagar indicador
```

### Cierre

BIT señala las tres partes:

> “El botón proporciona una entrada, el programa establece la respuesta y el indicador muestra la salida.”

Este nivel también permite mostrar que una entrada no tiene que ser siempre un sensor ambiental.

## 9. Nivel 1: el corazón del frío

### Dispositivo

Un modelo educativo de refrigeración con control electrónico.

### Problema

La temperatura aumenta, pero el enfriamiento no se activa.

### Objetivo

Reconectar la lectura de temperatura y completar el control de encendido y apagado.

### Escenario visual

- Zona de entrada: torre con termómetro.
- Zona de procesamiento: sala del controlador.
- Zona de salida: maquinaria de enfriamiento.
- Vista exterior pequeña: compartimento con una barra de temperatura.

### Desarrollo de la misión

#### Reto 1: recuperar el dato

El jugador encuentra tres tarjetas:

- Temperatura.
- Distancia.
- Movimiento.

Debe seleccionar la variable relevante para esta misión.

Si elige otra, BIT explica el problema en lugar de limitarse a decir “incorrecto”:

> “La distancia no nos indica qué tan frío está el compartimento.”

#### Reto 2: completar el programa

Para este modelo del juego se proponen dos límites:

```text
SI temperatura >= 6 °C
    activar enfriamiento

SI temperatura <= 3 °C
    desactivar enfriamiento

SI está entre ambos límites
    conservar el estado anterior
```

Estos valores son parámetros ficticios del reto, no una recomendación para configurar un electrodoméstico real.

#### Reto 3: conectar la salida

Se presentan tres destinos:

- Control de enfriamiento.
- Alarma sonora.
- Indicador decorativo.

Debe conectar la salida que resuelve la misión.

#### Reto 4: probar cambios

La simulación muestra cómo baja la temperatura con el enfriamiento activo y cómo el programa responde al alcanzar el límite inferior.

### Condición de victoria

El sistema supera pruebas con temperatura alta, baja e intermedia.

### Aprendizaje

El jugador descubre que leer un dato no basta: debe existir un programa que determine la respuesta.

### Simplificación declarada

El juego no simula el circuito eléctrico de potencia, el ciclo físico de refrigeración ni todas las protecciones de un equipo real.

## 10. Nivel 2: operación lavado

### Dispositivo

Una lavadora de demostración.

### Problema

Las acciones están desordenadas y el motor intenta funcionar sin cumplir las condiciones de inicio.

### Objetivo

Reconstruir una secuencia y agregar una condición de seguridad dentro de la simulación.

### Escenario visual

Una fábrica pequeña dividida en estaciones:

```text
Revisión → Llenado → Lavado → Desagüe → Centrifugado
```

### Desarrollo de la misión

#### Reto 1: comprobar la puerta

El jugador recibe un dato:

```text
Puerta: abierta
```

Debe elegir qué debería hacer el programa:

- Iniciar el giro.
- Mantener detenido el motor y mostrar aviso.
- Ignorar el dato.

La respuesta buscada es mantener detenido el motor.

#### Reto 2: ordenar las acciones

El jugador arrastra tarjetas:

1. Verificar puerta cerrada.
2. Llenar hasta el nivel definido.
3. Lavar.
4. Desaguar.
5. Centrifugar.
6. Mostrar fin.

Se trata de un ciclo didáctico simplificado, no de una reproducción completa de todos los programas de una lavadora.

#### Reto 3: comprobar la condición de llenado

El jugador debe decidir cuándo terminar el llenado:

```text
MIENTRAS nivel_agua < objetivo
    continuar llenado

AL alcanzar objetivo
    detener llenado
    pasar a lavado
```

#### Reto 4: prueba con una falla

Durante la simulación aparece una condición de puerta no cerrada.

El programa debe pasar a un estado de pausa segura del modelo:

```text
SI puerta != cerrada
    detener motor
    mostrar aviso
```

### Condición de victoria

Completar la secuencia y superar las pruebas de puerta y nivel de agua.

### Aprendizaje

Este nivel añade una idea nueva: un programa no solo toma decisiones aisladas; también sigue etapas y espera condiciones antes de avanzar.

## 11. Nivel 3: ruta sin choques

### Dispositivo

Un robot móvil de demostración.

### Problema

El robot avanza sin responder a los obstáculos.

### Objetivo

Relacionar una lectura de distancia con el control de los motores.

### Escenario visual

El jugador explora el interior del robot, mientras una ventana muestra una pista exterior con obstáculos.

### Desarrollo de la misión

#### Reto 1: seleccionar la entrada

Componentes disponibles:

- Sensor de distancia.
- Sensor de temperatura.
- Botón de inicio.

Debe elegir el sensor que ayude a detectar cercanía con un obstáculo.

#### Reto 2: recuperar las lecturas

El jugador encuentra paquetes con valores:

```text
60 cm
35 cm
12 cm
```

Debe identificar cuál representa un objeto más cercano.

#### Reto 3: completar la regla

```text
SI distancia < 20 cm
    detener motores
SI NO
    avanzar
```

El límite de 20 cm es una regla elegida para el escenario del juego.

#### Reto 4: ejecutar la pista

El robot comienza a moverse. La interfaz resalta simultáneamente:

- Lectura de distancia.
- Condición evaluada.
- Orden enviada a los motores.

Si el programa es incorrecto, la simulación pausa antes del choque y muestra el recorrido que produjo el error.

### Condición de victoria

Responder correctamente a varias posiciones del obstáculo, no solo a una prueba fija.

### Aprendizaje

El jugador observa un ciclo continuo: leer, decidir, actuar y volver a leer. La conexión entre sensores, microcontroladores y control de motores es una aplicación habitual de estos componentes. [ibm](https://www.ibm.com/think/topics/microcontroller)

## 12. Desafío final: construye el recorrido

El último reto utiliza un dispositivo nuevo y pequeño: un ventilador automático de demostración.

### Consigna

> “Haz que el ventilador responda a la temperatura. Identifica la entrada, configura el programa y conecta la salida.”

### Componentes disponibles

- Sensor de temperatura.
- Sensor de distancia.
- Microcontrolador.
- Motor de ventilador.
- Indicador luminoso.
- Bloques de condiciones.

### Tareas

1. Elegir la entrada adecuada.
2. Conectarla al controlador.
3. Seleccionar el motor como salida.
4. Completar una regla.
5. Superar dos pruebas con valores distintos.
6. Explicar el recorrido ordenando tres tarjetas.

### Propósito

Comprobar si el jugador puede aplicar lo aprendido a un caso que no repite exactamente los niveles anteriores.

No sería un examen largo: el reto se resuelve dentro del mismo lenguaje visual del juego.

## 13. Sistema de errores y retroalimentación

No incluiría vidas ni reinicios completos. El error sería parte de la investigación.

| Error del jugador                              | Respuesta del juego                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Elegir una entrada que no sirve para la misión | Explicar qué dato proporciona y por qué no responde a la necesidad.      |
| Invertir una condición                         | Mostrar un caso concreto donde la respuesta resulta incorrecta.          |
| No conectar una salida                         | Mostrar que el controlador ejecutó la regla, pero no produjo una acción. |
| Desordenar una secuencia                       | Señalar la primera etapa que no puede ejecutarse.                        |
| Resolver solo un caso                          | Presentar una segunda prueba con otra entrada.                           |

Ejemplo:

> “Con 12 cm ordenaste avanzar. La misión pide detenerse cuando el obstáculo esté a menos de 20 cm. Revisa la comparación.”

La retroalimentación debe ayudar a encontrar la causa, no entregar inmediatamente toda la solución.

## 14. Pistas y dificultad

Cada acertijo tendría tres pistas opcionales:

1. Pista conceptual: “¿Qué dato necesitas conocer?”
2. Pista aplicada: “Busca el componente que mide distancia.”
3. Pista guiada: resaltar el componente o espacio relevante.

La progresión sería:

| Etapa    | Ayuda disponible                       |
| -------- | -------------------------------------- |
| Tutorial | Instrucciones completas                |
| Nivel 1  | Ejemplo y espacios por completar       |
| Nivel 2  | Menos indicaciones y más pasos         |
| Nivel 3  | Selección de componentes y condición   |
| Final    | Consigna general con pistas opcionales |

No usaría un límite de tiempo obligatorio: la meta principal es comprender y probar.

## 15. Recompensas y evaluación

### Recompensas

Al reparar cada aparato, el jugador obtiene una insignia:

- Explorador de entradas.
- Organizador de instrucciones.
- Controlador de salidas.

Las insignias desbloquean fichas en una enciclopedia interna.

### Puntuación propuesta por nivel

| Criterio                       | Puntos |
| ------------------------------ | -----: |
| Identificar la entrada         |     20 |
| Completar el programa          |     30 |
| Conectar la salida             |     20 |
| Superar las pruebas            |     20 |
| Reconstruir el recorrido final |     10 |
| Total                          |    100 |

No restaría puntos por experimentar. Podrías registrar los intentos como información, pero permitir que el jugador corrija y obtenga el puntaje completo al demostrar que entendió.

### Pantalla de resultados

```text
DISPOSITIVO REPARADO

Entrada identificada: completado
Programa configurado: completado
Salida conectada: completado
Pruebas superadas: 3 de 3

Ahora puedes explicar:
Temperatura → Programa de control → Enfriamiento
```

## 16. Interfaz y controles

### Controles propuestos

| Acción                          | Control        |
| ------------------------------- | -------------- |
| Moverse                         | WASD o flechas |
| Interactuar                     | E              |
| Seleccionar y arrastrar bloques | Ratón          |
| Abrir fichas                    | Tab            |
| Pausar                          | Escape         |

### Distribución de pantalla

```text
┌──────────────────────────────────────────────────┐
│ Dispositivo actual        Objetivo de la misión   │
├──────────────────────────────────────────────────┤
│                                                  │
│                ESCENARIO JUGABLE                  │
│                                                  │
│       Entrada → Centro de control → Salida        │
│                                                  │
├──────────────────────┬───────────────────────────┤
│ Paquete de datos     │ Diálogo / pistas de BIT    │
└──────────────────────┴───────────────────────────┘
```

### Elementos permanentes

- Objetivo actual en una frase.
- Componente seleccionado.
- Botón de pista.
- Botón para abrir el diagrama.
- Indicador de progreso de la misión.

Las conexiones deben distinguirse con etiquetas y símbolos, además de colores.

## 17. Estilo visual y sonido

### Dirección artística

Propongo un estilo de circuitos caricaturizados:

- Placas como suelo.
- Pistas electrónicas como caminos.
- Chips como edificios.
- Paquetes de datos como cápsulas luminosas.
- Puertos como puertas de conexión.

Para evitar trabajo excesivo, los tres niveles pueden reutilizar la misma estructura y cambiar:

- Paleta.
- Componentes principales.
- Decoraciones.
- Panel exterior del aparato.
- Acertijos.

### Sonidos

- Interacción.
- Recogida de datos.
- Conexión.
- Prueba correcta.
- Aviso de revisión.
- Reparación completada.

Los avisos importantes también deben aparecer como texto; no dependerían únicamente del audio.

## 18. Contenido educativo dentro del juego

La enciclopedia podría incluir cinco fichas breves.

### Ficha: sistema embebido

> “Es un sistema de cómputo integrado en un producto para realizar funciones específicas. En esta aventura reparas el sistema que controla cada dispositivo.” [github](https://github.com/donymorph/From-Embedded-Systems-to-Autonomous-Robotics-roadmap)

### Ficha: microcontrolador

> “Es un pequeño computador integrado en un chip. Incluye procesamiento, memoria y recursos para comunicarse con entradas y salidas.” [ibm](https://www.ibm.com/think/topics/microcontroller)

### Ficha: sensor

> “Detecta una condición, como temperatura o distancia, y proporciona información que el sistema puede utilizar.” [ibm](https://www.ibm.com/think/topics/internet-of-things)

### Ficha: actuador

> “Produce una acción física al recibir una orden, como mover un mecanismo mediante un motor.” [ibm](https://www.ibm.com/think/topics/internet-of-things)

### Ficha: programa

> “Contiene las instrucciones que ejecuta el controlador para realizar su tarea.” [ibm](https://www.ibm.com/think/topics/microcontroller)

Después de cada ficha conviene mostrar el ejemplo que el jugador acaba de resolver. Así no queda como información desconectada de la experiencia.

## 19. Organización técnica del proyecto

Independientemente de la herramienta que utilices, puedes dividirlo en estos módulos:

| Módulo           | Responsabilidad                           |
| ---------------- | ----------------------------------------- |
| Jugador          | Movimiento e interacción                  |
| Componentes      | Datos y función de cada elemento          |
| Diálogos         | Conversaciones y pistas                   |
| Panel de bloques | Configuración de condiciones y secuencias |
| Simulador        | Ejecutar las reglas del reto              |
| Misiones         | Registrar objetivos completados           |
| Interfaz         | Mostrar lecturas, mensajes y progreso     |
| Guardado         | Conservar niveles e insignias             |

### Estados de una misión

```text
SIN INICIAR
     ↓
EXPLORANDO
     ↓
ENTRADA IDENTIFICADA
     ↓
PROGRAMA CONFIGURADO
     ↓
SALIDA CONECTADA
     ↓
EN PRUEBA
   ┌─┴─────────────┐
   ↓               ↓
CORREGIR       COMPLETADA
   └── Volver a configurar
```

### Ejemplo de datos de un nivel

```text
Nivel: robot móvil

Entrada:
    distancia

Salida:
    motores

Regla esperada:
    detener si distancia < 20

Casos de prueba:
    60 cm → avanzar
    35 cm → avanzar
    12 cm → detener
```

Lo importante es que el simulador evalúe lo que construyó el jugador. No debería mostrar “correcto” solamente porque presionó ciertos botones en cierto orden.

## 20. Alcance mínimo y versión completa

### Versión mínima funcional

Si necesitas entregar algo acotado:

- Menú.
- Introducción breve.
- Personaje con movimiento.
- BIT con diálogos.
- Un dispositivo completo: el robot móvil.
- Selección de entrada.
- Configuración de una condición.
- Conexión de salida.
- Tres casos de prueba.
- Pantalla de resultados.
- Fichas educativas.

Esta versión conservaría el núcleo del concepto: explorar, entender, configurar y comprobar.

### Versión completa propuesta

Agrega:

- Tutorial.
- Los tres dispositivos.
- Laboratorio central.
- Desafío final.
- Insignias.
- Guardado de progreso.
- Enciclopedia.
- Animaciones y sonido.

### Elementos que dejaría fuera inicialmente

- Mundo abierto.
- Multijugador.
- Combate.
- Simulación electrónica real.
- Editor de código libre.
- Conexión con Arduino físico.
- Escenarios en 3D.
- Generación aleatoria de niveles.

Podrían convertirse en ampliaciones, pero no son necesarios para demostrar la idea.

## 21. Plan de trabajo por entregables

| Etapa               | Entregable verificable                                           |
| ------------------- | ---------------------------------------------------------------- |
| 1. Diseño           | Historia corta, diagrama de pantallas y reglas del primer nivel. |
| 2. Prototipo        | Personaje que se mueve e interactúa con tres componentes.        |
| 3. Núcleo educativo | Panel que permite configurar una condición y probarla.           |
| 4. Primer nivel     | Robot móvil reparable de principio a fin.                        |
| 5. Expansión        | Refrigeración y lavadora usando el mismo sistema base.           |
| 6. Cierre           | Tutorial, resultados, fichas y desafío final.                    |
| 7. Revisión         | Pruebas de errores, claridad de instrucciones y funcionamiento.  |

El punto de control principal sería terminar un nivel completo antes de producir los demás escenarios.

## 22. Pruebas de aceptación

Antes de entregarlo, estas serían las comprobaciones esenciales:

- El jugador puede comenzar y terminar una partida.
- Los controles se explican dentro del juego.
- Cada componente tiene una función comprensible.
- Una configuración equivocada produce un resultado distinto de la correcta.
- Los mensajes explican por qué falló la prueba.
- El jugador puede corregir sin quedar bloqueado.
- Las reglas funcionan con más de una entrada.
- Al finalizar se muestra qué se reparó y cómo funciona.
- Los textos distinguen la ficción visual del modelo técnico.
- El juego responde a las tres preguntas de la tarea: qué es, cómo funciona y dónde se aplica.

## 23. Texto listo para presentar la propuesta

### Descripción del proyecto

> “Dentro del dispositivo: misión embebida” es un videojuego educativo de aventura en 2D en el que el jugador explora representaciones virtuales del interior de aparatos cotidianos. Mediante acertijos de identificación de entradas, configuración de instrucciones y conexión de salidas, debe reparar distintos dispositivos.
>
> El juego propone un aprendizaje basado en la experimentación: el jugador configura una solución, observa su funcionamiento y corrige los errores. Cada nivel presenta un contexto diferente y permite reconocer el papel de los componentes y del programa en el comportamiento del dispositivo.
>
> La propuesta combina narrativa, exploración y simulaciones simplificadas para explicar los sistemas embebidos de manera interactiva.

### Objetivo general

> Diseñar y desarrollar un videojuego educativo en 2D que permita comprender qué es un sistema embebido, cómo funciona y cuáles son sus aplicaciones cotidianas mediante la exploración y reparación virtual de dispositivos.

### Objetivos específicos

- Representar de manera visual las funciones de entrada, procesamiento y salida.
- Integrar retos que requieran interpretar datos y configurar instrucciones.
- Permitir la experimentación mediante pruebas y correcciones.
- Presentar diferentes aplicaciones mediante escenarios cotidianos.
- Comprobar el aprendizaje con un desafío final de aplicación.

### Justificación

> El proyecto busca que el aprendizaje no dependa únicamente de leer definiciones. Su mecánica principal transforma los conceptos en decisiones: el jugador debe identificar qué información necesita un dispositivo, qué instrucciones permiten responder a ella y qué salida ejecuta la acción. La narrativa de exploración conecta esos retos y da una finalidad concreta a cada actividad.

La identidad del juego estaría en esto: no recorres un aparato solo para contestar preguntas; lo reparas demostrando que entiendes la relación entre sus datos, su programa y sus acciones.
