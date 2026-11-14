# SRS – Software de Monitoreo de Salud para Astronautas

Nov 14, 2026 · @angel

## 1. Introducción

Este documento especifica los requisitos de **AstroVital**, un sistema autónomo de monitoreo biomédico y soporte a decisiones clínicas para tripulaciones en misiones más allá de la órbita baja, donde la latencia con la Tierra (3 a 22 minutos por sentido) impide la consulta en tiempo real. Sigue la estructura de ISO/IEC/IEEE 29148.

**Propósito.** Dar a un tripulante no especialista una herramienta que detecte deriva fisiológica, clasifique su gravedad y le indique contramedidas ejecutables con los recursos a bordo, sin ninguna conexión externa.

**Alcance.** Aplicación web offline (PWA de un solo nodo) con ingesta de datos, motor de evaluación, detección de tendencias, modelo anatómico interactivo, guía de contramedidas, gamificación y simulador de crisis. Queda fuera: diagnóstico médico definitivo, integración con hardware real de vuelo y sustitución del juicio del Flight Surgeon.

**Definiciones.**

| Término | Significado |
| --- | --- |
| CMO | Oficial Médico de Tripulación (tripulante con entrenamiento médico básico) |
| SANS | Spaceflight Associated Neuro-ocular Syndrome |
| SPE | Evento de Partículas Solares |
| ARED / LBNP | Dispositivo de ejercicio resistivo avanzado / pantalones de presión negativa |
| HRV (rMSSD) | Variabilidad de la frecuencia cardíaca |
| Deriva | Cambio gradual de una serie temporal que aún no cruza un umbral |
| Edge / Offline | Todo el procesamiento y conocimiento residen en el nodo local |

**Referencias.** NASA-STD-3001 (Vol. 1 y 2), NASA HRP (Hazards y Risks), CSA (Astroskin, CANS), ISO/IEC/IEEE 29148, y los documentos DOMINIO\_Y\_PROBLEMATICA\_ESPACIAL y HEALTH\_MONITORING\_SOFTWARE\_SPEC aportados.

## 2. Descripción general

AstroVital es un nodo local que correlaciona telemetría fisiológica (estilo Astroskin) con telemetría ambiental y de radiación (estilo ECLSS y CANS) para producir un estado de salud tripartito (Nominal, Precaución, Crítico) por tripulante y por sistema de órganos.

### 2.1 Actores

| Actor | Uso del sistema | Necesidad crítica |
| --- | --- | --- |
| Astronauta | Registra datos, ve su estado, ejecuta contramedidas diarias | Interpretación inmediata sin jerga ni falsas alarmas |
| CMO | Atiende alertas, sigue protocolos paso a paso | Soporte a decisiones clínicas secuencial y verificable |
| Flight Surgeon (Tierra) | Recibe resúmenes asíncronos | Tendencias y eventos consolidados para validar tratamientos |
| Jurado / evaluador | Activa el simulador de crisis | Demostración clara de la autonomía |

### 2.2 Restricciones de dominio (no negociables)

1. **Cero dependencia externa:** sin nube, sin APIs remotas; datos, reglas y conocimiento médico residen en el nodo.
2. **Usuario no especialista:** cada alerta explica qué ocurre, severidad y tiempo estimado, y acciones exactas y verificables.
3. **Recursos médicos limitados:** solo se sugieren intervenciones con ARED, cicloergómetro o cinta, LBNP, botiquín de exploración y refugio de tormentas.
4. **Baja carga cognitiva:** código de colores inequívoco, pocos toques, uso con guantes.

### 2.3 Supuestos y dependencias

- Los umbrales provienen de NASA-STD-3001 tal como los fija el documento de dominio; los valores de contramedida son orientativos y deben validarse con personal médico antes de uso real.
- La telemetría es **simulada** (dataset sintético de 180 días); la integración con sensores reales queda como interfaz documentada.
- El sistema apoya la decisión; no reemplaza al CMO ni al Flight Surgeon.

## 3. Requisitos funcionales

Prioridad según MoSCoW: **M** (debe), **S** (debería), **C** (podría). Cada requisito es verificable (ver sección 8).

### 3.1 Ingesta de datos (ING)

| ID | Requisito | Prior. | AC |
| --- | --- | --- | --- |
| RF-ING-01 | El sistema debe permitir registrar frecuencia cardiaca, HRV, presión sistólica y diastólica, SpO2, glucosa, temperatura, horas de sueño y ánimo (1-10) con controles grandes aptos para guantes. | M | AC-01 |
| RF-ING-02 | Debe aceptar telemetría ambiental: ppCO2, presión de cabina, % O2 y tasa de dosis de radiación (µSv/h). | M | AC-05 |
| RF-ING-03 | Debe simular telemetría continua tipo bio-monitor (Astroskin) y reproducir un dataset sintético de 180 días por tripulante. | M | AC-02 |
| RF-ING-04 | Debe permitir reportar síntomas subjetivos (visión borrosa, cefalea, náuseas, dolor lumbar, mareo al ponerse de pie) con un toque por síntoma. | M | AC-03 |
| RF-ING-05 | Debe validar rangos fisiológicamente posibles y marcar los datos dudosos sin descartarlos. | S | AC-01 |
| RF-ING-06 | Debe importar y exportar el historial en JSON. | S | AC-01 |
| RF-ING-07 | Podría ofrecer prueba de reflejo pupilar o escaneo cutáneo por cámara. | C | AC-03 |

### 3.2 Evaluación y triage (EVA)

| ID | Requisito | Prior. | AC |
| --- | --- | --- | --- |
| RF-EVA-01 | Debe clasificar cada indicador como Nominal, Precaución o Crítico con los umbrales de la sección 6. | M | AC-01 |
| RF-EVA-02 | El estado global de un tripulante debe ser el peor estado entre sus indicadores y reglas activas. | M | AC-01 |
| RF-EVA-03 | Debe asignar cada hallazgo a un sistema de órganos: neuro-ocular, cardiovascular, musculoesquelético, renal, cognitivo, radiación, respiratorio/ambiental. | M | AC-03 |
| RF-EVA-04 | Debe aplicar reglas de correlación ambiental-fisiológica (sección 6.2). | M | AC-05 |
| RF-EVA-05 | Debe manejar condiciones sostenidas (HRV < 20 ms sostenido; sueño < 5,5 h durante 2 días o más). | M | AC-01 |
| RF-EVA-06 | Cada alerta debe indicar la regla disparada, los valores que la causaron y el umbral (explicabilidad). | M | AC-03 |
| RF-EVA-07 | La evaluación debe funcionar sin ningún paquete de red enviado o recibido. | M | AC-01 |

### 3.3 Detección de deriva (DER)

| ID | Requisito | Prior. | AC |
| --- | --- | --- | --- |
| RF-DER-01 | Debe calcular la tendencia de cada indicador por regresión lineal sobre una ventana móvil de 7 días. | M | AC-02 |
| RF-DER-02 | Debe emitir alerta precoz si la proyección cruza el umbral de precaución en 7 días o menos y el valor actual aún es nominal. | M | AC-02 |
| RF-DER-03 | Debe comparar con la línea base personal (media y desviación de los primeros 14 días) y marcar valores con z mayor o igual a 2,5. | S | AC-02 |
| RF-DER-04 | Debe detectar patrones combinados (sueño decreciente junto con presión diastólica creciente). | M | AC-02 |

### 3.4 Guía de contramedidas (GUI)

| ID | Requisito | Prior. | AC |
| --- | --- | --- | --- |
| RF-GUI-01 | Cada alerta debe mostrar tres bloques: qué ocurre anatómicamente, severidad con tiempo estimado de impacto, y acciones. | M | AC-04 |
| RF-GUI-02 | Las acciones deben ser pasos secuenciales y verificables (casilla por paso). | M | AC-04 |
| RF-GUI-03 | Solo debe sugerir recursos disponibles a bordo (ARED, LBNP, botiquín, refugio, filtros LiOH/CDRA). | M | AC-04 |
| RF-GUI-04 | Debe usar lenguaje no médico y definir cualquier término técnico inevitable. | M | AC-04 |
| RF-GUI-05 | En alertas rojas debe indicar qué enviar al Flight Surgeon como mensaje asíncrono, sin depender de su respuesta. | S | AC-01 |

### 3.5 Modelo anatómico (ANA)

| ID | Requisito | Prior. | AC |
| --- | --- | --- | --- |
| RF-ANA-01 | Debe mostrar un cuerpo humano interactivo con vista frontal y posterior. | M | AC-03 |
| RF-ANA-02 | Debe tener regiones clicables: ojos/cabeza, toráx/corazón, zona lumbar/riñones, piernas/fémur, sistema general/sangre. | M | AC-03 |
| RF-ANA-03 | Cada región debe colorearse en verde, amarillo o rojo según su estado y añadir un símbolo o patrón (no solo color). | M | AC-03 |
| RF-ANA-04 | Al seleccionar una región debe mostrar sus indicadores, tendencia y contramedidas activas. | M | AC-03 |

### 3.6 Panel y visualización (DSH)

| ID | Requisito | Prior. | AC |
| --- | --- | --- | --- |
| RF-DSH-01 | Debe mostrar tarjetas por indicador con valor, unidad, semáforo y flecha de tendencia. | M | AC-01 |
| RF-DSH-02 | Debe graficar series históricas con las bandas de umbral. | M | AC-02 |
| RF-DSH-03 | Debe permitir cambiar entre tripulantes y ver un resumen de toda la tripulación. | S | AC-01 |
| RF-DSH-04 | Debe mostrar la telemetría ambiental del hábitat (CO2, presión, O2, radiación) con su semáforo. | M | AC-05 |

### 3.7 Gamificación (GAM)

| ID | Requisito | Prior. | AC |
| --- | --- | --- | --- |
| RF-GAM-01 | Debe otorgar XP y medallas por 150 min diarios de ejercicio, informe matutino a tiempo e hidratación óptima. | S | AC-04 |
| RF-GAM-02 | Debe llevar rachas diarias y nivel del tripulante. | S | AC-04 |
| RF-GAM-03 | La gamificación nunca debe ocultar ni retrasar una alerta clínica. | M | AC-01 |

### 3.8 Simulador de crisis (SIM)

| ID | Requisito | Prior. | AC |
| --- | --- | --- | --- |
| RF-SIM-01 | Debe inyectar el escenario A: tormenta solar (SPE) con guía hacia el refugio. | M | AC-05 |
| RF-SIM-02 | Debe inyectar el escenario B: SANS agudo con prueba visual y LBNP. | M | AC-05 |
| RF-SIM-03 | Debe inyectar el escenario C: microfuga de CO2 con verificación de filtros. | M | AC-05 |
| RF-SIM-04 | Debe inyectar el escenario D: hipercalciuria con riesgo de cálculo renal. | S | AC-05 |
| RF-SIM-05 | Debe poder restablecer el estado nominal en un toque y avanzar el tiempo simulado. | M | AC-05 |

### 3.9 Registro y configuración (REG)

| ID | Requisito | Prior. | AC |
| --- | --- | --- | --- |
| RF-REG-01 | Debe llevar una bitácora local de alertas, acciones completadas y reconocimientos. | M | AC-03 |
| RF-REG-02 | Debe generar un resumen asíncrono exportable para el Flight Surgeon. | S | AC-01 |
| RF-REG-03 | Debe permitir modo de alto contraste y texto grande. | S | AC-03 |

## 4. Requisitos no funcionales

| ID | Categoría | Requisito | Medida de verificación |
| --- | --- | --- | --- |
| RNF-01 | Disponibilidad offline | La aplicación debe cargar y operar completa sin red, tras la primera carga. | Cero solicitudes de red en el panel de red del navegador con el cable desconectado |
| RNF-02 | Rendimiento | Evaluar un tripulante y actualizar la interfaz en menos de 100 ms; abrir la app en menos de 2 s en hardware modesto. | Medición con performance.now() sobre 180 días de datos |
| RNF-03 | Usabilidad | Registrar una toma de signos vitales en 3 toques o menos desde el panel; objetivos táctiles de 48 px o más. | Prueba con usuario, con y sin guantes |
| RNF-04 | Accesibilidad | Contraste AA (4,5:1); estado nunca indicado solo por color; navegación por teclado. | Revisión con simulador de daltonismo |
| RNF-05 | Fiabilidad clínica | Ningún valor en rango crítico puede clasificarse como nominal (cero falsos negativos en rojos). | Pruebas automáticas de frontera sobre cada umbral |
| RNF-06 | Explicabilidad | Toda alerta debe poder rastrearse a una regla y a valores concretos. | Inspección de la bitácora |
| RNF-07 | Privacidad | Los datos médicos permanecen en el dispositivo; no hay analítica ni telemetría saliente. | Análisis de tráfico y de código |
| RNF-08 | Persistencia | El estado y la bitácora sobreviven a recargas y cierres; datos corruptos se detectan y se restauran el valor por defecto. | Prueba de recarga y de almacenamiento dañado |
| RNF-09 | Mantenibilidad | Umbrales, reglas y contramedidas deben estar definidos como datos, separados de la interfaz. | Cambiar un umbral sin tocar la lógica de vista |
| RNF-10 | Portabilidad | Debe funcionar en navegadores modernos de escritorio y tabletas, y empaquetarse como un solo archivo. | Prueba en Chrome, Firefox y Safari |
| RNF-11 | Carga cognitiva | La pantalla de alerta debe mostrar una acción principal clara; máximo 7 pasos por protocolo. | Revisión de protocolos |
| RNF-12 | Idioma | Interfaz en español, con textos separados para poder agregar inglés. | Revisión de cadenas |

## 5. Requisitos de datos e interfaces

### 5.1 Modelo de datos

| Entidad | Campos principales | Notas |
| --- | --- | --- |
| Tripulante | id, nombre, rol, nivel, XP, racha | 4 tripulantes sintéticos |
| Medición diaria | día de misión, HR, HRV, PAS, PAD, SpO2, glucosa, temperatura, horas de sueño, ánimo | 1 registro por día, 180 días |
| Telemetría de hábitat | día, ppCO2, presión, % O2, radiación µSv/h | Compartida por la tripulación |
| Síntoma | tripulante, día, tipo | Catálogo cerrado de 6 síntomas |
| Alerta | regla, sistema de órganos, estado, urgencia, valores, hora, reconocida | Generada por el motor |
| Bitácora | hora, tipo de evento, detalle | Solo agregar, nunca editar |
| Contramedida | alerta, pasos, pasos completados | Catálogo definido como datos |

### 5.2 Interfaces

| Interfaz | Descripción |
| --- | --- |
| Usuario | Interfaz táctil oscura de alto contraste, con panel, cuerpo, guía, hábitat, hábitos y simulador |
| Almacenamiento | localStorage / IndexedDB del navegador; sin servidor |
| Sensores (futura) | Contrato JSON de una medición con los mismos campos del modelo; adaptador reemplazable |
| Exportación | Archivo JSON de historial y resumen para el Flight Surgeon |

## 6. Reglas de negocio

Los dos documentos de entrada difieren levemente en algunos rangos (por ejemplo, frecuencia cardiaca nominal 55-85 frente a 55-95). Se adopta como autoridad el **documento de dominio** (NASA-STD-3001). Los umbrales marcados con \* no figuran en él y son supuestos razonables, editables como datos (RNF-09).

### 6.1 Umbrales por indicador

| Indicador | Nominal | Precaución | Crítico |
| --- | --- | --- | --- |
| Frecuencia cardiaca en reposo (bpm) | 55 a 85 | 86 a 105, o 45 a 54\* | menor que 45 o mayor que 110 |
| HRV rMSSD (ms) | 35 a 70 | 20 a 34 | menor que 20, sostenido 2 días o más |
| Presión sistólica (mmHg) | 105 a 125 | 126 a 139 | 140 o más |
| Presión diastólica (mmHg)\* | 65 a 84 | 85 a 89 | 90 o más |
| SpO2 (%) | 96 a 100 | 93 a 95 | menor que 93 |
| ppCO2 de cabina (mmHg) | menor que 2,0 | 2,0 a 3,0 | mayor que 3,0 |
| Radiación (µSv/h) | 15 a 35 | 36 a 80 | mayor que 100 |
| Sueño diario (h) | 7,0 a 8,5 | 5,5 a 6,9 | menor que 5,5 durante 2 días o más |
| Glucemia en ayunas (mg/dL) | 75 a 105 | 106 a 125, o 65 a 74\* | menor que 65 o mayor que 140 |
| Temperatura (°C)\* | 36,2 a 37,3 | 37,4 a 37,9 | 38,0 o más |
| Ánimo (1-10)\* | 7 a 10 | 4 a 6 | 1 a 3 |
| Calcio urinario (mg/día)\* | menor que 250 | 250 a 300 | mayor que 300 |

Un valor que cae entre dos bandas se clasifica en la más grave. Por ejemplo, la radiación de 81 a 100 µSv/h, que el documento de dominio no asigna, se trata como precaución.

### 6.2 Reglas de correlación

| ID | Condición | Sistema | Resultado |
| --- | --- | --- | --- |
| R-ENV-01 | ppCO2 mayor que 3,0 y SpO2 menor que 94 | Respiratorio/ambiental | Crítico: fuga o ventilación deficiente |
| R-ENV-02 | ppCO2 mayor que 3,0 y cefalea reportada | Neuro-ocular | Crítico: hipertensión craneal por CO2 |
| R-SANS-01 | Sistólica mayor que 135 y visión borrosa | Neuro-ocular | Crítico: alerta precoz SANS |
| R-SANS-02 | Sistólica mayor que 135 y sueño menor que 6 | Neuro-ocular | Precaución alta: deriva hipertensiva cefálica |
| R-RAD-01 | Radiación mayor que 100 | Radiación | Crítico: sospecha de SPE, ir al refugio |
| R-RAD-02 | Radiación mayor que 100 y náuseas | Radiación | Crítico con urgencia de emergencia: protocolo de refugio solar |
| R-COG-01 | Sueño menor que 5,5 y HRV menor que 25 | Cognitivo | Precaución: fatiga y desincronización circadiana |
| R-REN-01 | Calcio urinario mayor que 300 y dolor lumbar | Renal | Crítico: sospecha de cálculo renal |
| R-REN-02 | Calcio urinario entre 250 y 300 | Renal | Precaución: hipercalciuria por pérdida ósea |
| R-CARD-01 | Mareo al ponerse de pie y frecuencia cardiaca mayor que 100 | Cardiovascular | Precaución alta: intolerancia ortostática |

### 6.3 Reglas de deriva

- **D-01:** pendiente de la ventana de 7 días proyectada 7 días hacia adelante cruza el umbral de precaución mientras el valor actual es nominal.
- **D-02:** valor con z de 2,5 o más respecto a la línea base personal de los primeros 14 días.
- **D-03:** sueño con pendiente negativa y presión diastólica con pendiente positiva en la misma ventana.

## 7. Escenarios y casos de uso

| ID | Caso de uso | Actor | Flujo principal | Resultado esperado |
| --- | --- | --- | --- | --- |
| CU-01 | Registro matutino | Astronauta | Abre el panel, ingresa signos, sueño y ánimo, confirma | Semáforo actualizado y XP otorgado |
| CU-02 | Revisar estado anatómico | Astronauta | Toca una región del cuerpo | Ve indicadores, tendencia y acciones de esa región |
| CU-03 | Atender alerta roja | CMO | Abre la alerta, lee qué ocurre, marca cada paso | Protocolo completado y registrado en bitácora |
| CU-04 | Alerta precoz de deriva | Astronauta | Recibe aviso amarillo por tendencia | Corrige hábitos antes de un síntoma incapacitante |
| CU-05 | Tormenta solar (SPE) | Tripulación | Radiación supera 100 µSv/h | Guía hacia el refugio y seguimiento de síntomas |
| CU-06 | SANS agudo | CMO | Reporta visión borrosa con presión elevada | Prueba visual y sesión LBNP guiadas |
| CU-07 | Microfuga de CO2 | Tripulación | ppCO2 sube y SpO2 baja | Revisión de filtros LiOH/CDRA y ventilación |
| CU-08 | Informe a Tierra | CMO | Exporta el resumen asíncrono | Archivo con tendencias y eventos para el Flight Surgeon |
| CU-09 | Demostración ante jurado | Jurado | Activa un escenario del simulador | La interfaz cambia de estado y guía la respuesta |

## 8. Trazabilidad y verificación

| Criterio de aceptación | Requisitos que lo cubren | Verificación |
| --- | --- | --- |
| AC-01 Autonomía diagnóstica local | RF-ING-01, RF-EVA-01, RF-EVA-02, RF-EVA-05, RF-EVA-07, RF-DSH-01, RNF-01, RNF-05 | Sin red, cada tripulante recibe Nominal, Precaución o Crítico; pruebas de frontera en cada umbral |
| AC-02 Detección de deriva precoz | RF-ING-03, RF-DER-01 a RF-DER-04, RF-DSH-02 | En el dataset de 180 días, la alerta precoz se emite antes de que el indicador cruce el umbral |
| AC-03 Trazabilidad anatómica | RF-EVA-03, RF-EVA-06, RF-ANA-01 a RF-ANA-04, RF-ING-04, RF-REG-01 | Cada alerta muestra su sistema de órganos y región del cuerpo |
| AC-04 Guía de contramedidas | RF-GUI-01 a RF-GUI-04, RF-GAM-01, RF-GAM-02 | Cada desviación tiene tres bloques y pasos verificables con recursos a bordo |
| AC-05 Resiliencia ante eventos extremos | RF-ING-02, RF-EVA-04, RF-DSH-04, RF-SIM-01 a RF-SIM-05 | Los escenarios A a D cambian el estado y activan el protocolo en menos de 1 s |

**Plan de pruebas.** (1) Pruebas unitarias de cada umbral en el valor exacto, uno por debajo y uno por encima. (2) Pruebas de las reglas R-ENV, R-SANS, R-RAD, R-COG, R-REN y R-CARD. (3) Reproducción del dataset de 180 días verificando D-01 a D-03. (4) Ejecución de los cuatro escenarios del simulador. (5) Prueba sin red y recarga con persistencia.
