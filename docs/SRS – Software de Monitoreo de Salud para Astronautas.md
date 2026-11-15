# SRS – Software de Monitoreo de Salud para Astronautas

Nov 14, 2026 · @angel

## 1. Introducción

Este documento especifica los requisitos de **ASTHA**, un sistema autónomo de monitoreo biomédico y soporte a decisiones clínicas para tripulaciones en misiones más allá de la órbita baja, donde la latencia con la Tierra (3 a 22 minutos por sentido) impide la consulta en tiempo real. Sigue la estructura de ISO/IEC/IEEE 29148.

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

ASTHA es un nodo local que correlaciona telemetría fisiológica (estilo Astroskin) con telemetría ambiental y de radiación (estilo ECLSS y CANS) para producir un estado de salud tripartito (Nominal, Precaución, Crítico) por tripulante y por sistema de órganos.

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

## 4. Requisitos no funcionales (RNF)

Esta sección define las restricciones de calidad, rendimiento, eficiencia energética, ergonomía espacial, seguridad criptográfica y comunicación multi-nodo que gobiernan a ASTHA bajo el estándar ISO/IEC/IEEE 29148 y NASA-STD-3001.

### 4.1 Eficiencia energética, rendimiento y huella de recursos (Ultra-Low Power & Resource Footprint)

En hábitats espaciales y vehículos en tránsito planetario, la potencia eléctrica es un recurso escaso y crítico suministrado por paneles solares o celdas de combustible. El software debe operar bajo un régimen de ultra-bajo consumo energético:

| ID | Requisito de Rendimiento y Energía | Especificación Técnica Medible | Medida de Verificación |
| --- | --- | --- | --- |
| **RNF-POW-01** | **Perfil de ultra-bajo consumo en CPU** | La aplicación no debe ejecutar bucles activos de sondeo (*polling*) en primer ni segundo plano. Debe utilizar observadores de eventos reactivos (`requestIdleCallback`, Web Workers para cómputos de regresión de tendencias). El uso sostenido de CPU en estado de monitoreo pasivo no debe exceder el **3.0%**. | Perfilado de CPU con Chrome DevTools Performance Profiler en modo throttling x4. |
| **RNF-POW-02** | **Extensión de autonomía de batería** | En tabletas y consolas portátiles de tripulación, el consumo energético de la aplicación debe permitir una operación continua mínima de **16 horas** con una sola carga de batería ($< 350\text{ mW}$ atribuibles al proceso del software). | Medición de drenaje de batería en dispositivo táctil de prueba durante 8 horas continuas. |
| **RNF-POW-03** | **Huella de memoria RAM ultraligera** | El consumo de memoria de trabajo (RAM) no debe superar los **150 MB**, incluso tras cargar y procesar los 180 días de telemetría de toda la tripulación, previniendo reinicios forzados por el gestor de memoria del sistema operativo (*OOM killer*). | Inspección de memoria Heap mediante Memory Snapshot en el navegador. |
| **RNF-POW-04** | **Peso de paquete ultracompacto (Bundle Size)** | El tamaño total de la aplicación empaquetada (código, lógica clínica, estilos y activos visuales) no debe exceder los **5.0 MB** transferibles y cacheados mediante Service Workers (PWA). | Medición del peso total de los archivos generados en compilación de producción (`npm run build`). |
| **RNF-PER-01** | **Latencia de evaluación clínica instantánea** | El ciclo completo de ingesta, cálculo de Z-score modificado, correlación cruzada ambiental y actualización visual del modelo anatómico debe completarse en menos de **50 ms**. | Registro con `performance.now()` en la ejecución de la función de triage clínico. |
| **RNF-PER-02** | **Arranque en frío (Cold Start)** | El tiempo de arranque de la aplicación desde el almacenamiento local hasta el despliegue del panel principal debe ser inferior a **1.5 segundos** en hardware de gama media. | Métrica First Contentful Paint (FCP) y Time to Interactive (TTI) con Lighthouse en modo offline. |

### 4.2 Usabilidad espacial, accesibilidad y factores humanos (Astronaut-Grade UX & Ergonomics)

El diseño de interacción debe adaptarse a tripulantes sometidos a fatiga extrema, microgravedad, estrés agudo y uso con indumentaria de vuelo:

| ID | Requisito de Usabilidad y Ergonomía | Especificación Técnica Medible | Medida de Verificación |
| --- | --- | --- | --- |
| **RNF-USA-01** | **Operabilidad táctil con guantes de vuelo** | Todos los elementos interactivos primarios (botones, casillas de verificación, selectores de síntomas) deben poseer un área de pulsación mínima de **$48 \times 48\text{ px}$** con una separación mínima de **$12\text{ px}$**, evitando pulsaciones erróneas por temblor muscular o guantes presurizados IVA/EVA. | Inspección de layout en CSS y prueba de pulsación con guante térmico. |
| **RNF-USA-02** | **Regla de oro de los 3 toques** | Cualquier acción crítica de emergencia (reportar un síntoma incapacitante, consultar un procedimiento de contramedida o activar el protocolo de refugio solar) debe alcanzarse en un máximo de **3 toques de pantalla** desde cualquier vista. | Auditoría de árbol de navegación y conteo de interacciones por caso de uso. |
| **RNF-USA-03** | **Ergonomía visual y preservación circadiana** | Cumplimiento del nivel **WCAG 2.1 AAA** en relaciones de contraste ($\ge 7:1$). Debe implementar dos modos cromáticos: (1) Modo Táctico Oscuro (para trabajo diurno en cabina), y (2) Modo Espectral Rojo ($\approx 630\text{ nm}$ monocrómico) para guardias nocturnas, evitando la supresión de melatonina y preservando la visión nocturna de la tripulación. | Validación de contraste mediante analizador de accesibilidad y selector de modo nocturno. |
| **RNF-USA-04** | **Mitigación de fatiga por alarmas (Alarm Fatigue)** | Los estados de alerta deben diferenciarse por canales sensoriales redundantes: (1) Nivel Precaución (Amarillo): visual estático sin sonido intrusivo; (2) Nivel Crítico (Rojo): visual intermitente de alta prioridad con tono acústico en banda $800 - 1200\text{ Hz}$ según norma **ISO 9703-2** (Alarmas médicas aeroespaciales). | Inspección de espectro de audio y patrones de renderizado CSS. |
| **RNF-USA-05** | **Diseño adaptado para no médicos** | Toda pantalla de contramedida debe estructurarse estrictamente en: (1) Qué ocurre anatómicamente, (2) Severidad y tiempo estimado de impacto, y (3) Lista de tareas secuenciales con casillas de verificación ejecutables, con un máximo de **7 pasos por procedimiento**. | Revisión de legibilidad contra escala Flesch-Kincaid en español/inglés. |

### 4.3 Seguridad biomédica, integridad criptográfica y resiliencia a radiación (Space-Grade Security & Integrity)

| ID | Requisito de Seguridad y Resiliencia | Especificación Técnica Medible | Medida de Verificación |
| --- | --- | --- | --- |
| **RNF-SEC-01** | **Cifrado en reposo local (Zero-Knowledge)** | Todos los expedientes médicos, bitácoras y registros biomédicos persistidos localmente en el dispositivo deben estar cifrados mediante el estándar **AES-GCM de 256 bits** a través de la API nativa `window.crypto.subtle`, garantizando cumplimiento con HIPAA y la NASA Privacy Act. | Intento de lectura en crudo de la base de datos IndexedDB/localStorage sin llave criptográfica derivada. |
| **RNF-SEC-02** | **Control de acceso local basado en roles (Local RBAC)** | El sistema debe implementar segregación estricta de privilegios locales: (1) Rol *Astronauta*: acceso a su propia telemetría y ejecución de contramedidas personales; (2) Rol *Crew Medical Officer (CMO)*: visión agregada de la tripulación, anulación de falsos positivos y desbloqueo de protocolos farmacológicos del botiquín. | Pruebas de autorización y escalamiento de privilegios por usuario. |
| **RNF-SEC-03** | **Resiliencia ante inversión de bits por radiación (SEU / Bit-Flip Protection)** | Debido a que los rayos cósmicos galácticos (GCR) inducen *Single Event Upsets* (SEUs) que voltean bits en memoria y almacenamiento en espacio profundo, cada registro de telemetría debe almacenarse con una suma de verificación criptográfica (**SHA-256**). Si se detecta un hash inválido al leer un registro, el sistema lo aísla y restaura el último estado consistente sin colapsar la aplicación. | Inyección de fallas por corrupción de bytes en el almacenamiento local y verificación de auto-recuperación. |
| **RNF-SEC-04** | **Inmutabilidad de la bitácora clínica (Append-Only Audit Trail)** | La bitácora de eventos médicos, alarmas disparadas y medicamentos suministrados debe operar bajo un esquema criptográfico encadenado de solo inserción (*Append-Only Ledger*). No existirá ninguna operación de eliminación o edición de eventos pasados. | Pruebas de intentos de mutación sobre registros históricos de la bitácora. |

### 4.4 Interoperabilidad y sincronización en malla local (Offline LAN & Peer-to-Peer Mesh Sync)

En el vehículo o hábitat espacial, existen múltiples dispositivos (tabletas individuales de los astronautas, consola médica del CMO en el módulo central y pantallas de telemetría de cabina):

| ID | Requisito de Red y Comunicación Multi-Dispositivo | Especificación Técnica Medible | Medida de Verificación |
| --- | --- | --- | --- |
| **RNF-NET-01** | **Sincronización multi-dispositivo sin Internet** | Los nodos de la nave deben ser capaces de comunicarse y sincronizar su estado a través de la red de área local cerrada de la nave (Wi-Fi de a bordo o red Ethernet local aislada) mediante WebSockets locales o canales de datos P2P, con **cero paquetes dirigidos a pasarelas de Internet externas**. | Análisis de captura de paquetes (Wireshark) en la interfaz de red local comprobando ausencia de tráfico WAN. |
| **RNF-NET-02** | **Tolerancia a particiones y convergencia (CRDTs)** | Si un tripulante registra datos o completa contramedidas en un módulo aislado o esclusa sin cobertura Wi-Fi local (*modo desconectado temporal*), al restablecer la conexión local con los otros nodos, el sistema debe fusionar automáticamente los registros utilizando Tipos de Datos Replicados Libres de Conflicto (**CRDTs / Last-Write-Wins con marcas de tiempo vectoriales**), garantizando **cero pérdida de datos y cero sobrescrituras destructivas**. | Desconexión intencional de un nodo, registro de datos concurrentes y prueba de fusión automática al reconectar. |
| **RNF-NET-03** | **Descubrimiento autónomo de nodos (Zero-Configuration)** | Los dispositivos clientes deben descubrir automáticamente el nodo de sincronización de la nave en la LAN mediante protocolos de descubrimiento local (mDNS / Bonjour o broadcast local de baliza en puerto configurado), sin requerir que los astronautas configuren direcciones IP manuales. | Conexión de un nuevo dispositivo a la red local y verificación de enlace automático en $< 3\text{ segundos}$. |
| **RNF-NET-04** | **Formato interoperable de exportación médica** | El sistema debe permitir la exportación consolidada de la bitácora y tendencias en un archivo estandarizado JSON firmado criptográficamente, listo para ser transmitido por el enlace de radio de espacio profundo (*Deep Space Network - DSN*) hacia el Flight Surgeon en Tierra durante las ventanas de comunicación disponibles. | Validación del esquema JSON exportado contra la especificación formal del modelo de datos de la Sección 5.1. |

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
| AC-01 Autonomía diagnóstica local | RF-ING-01, RF-EVA-01, RF-EVA-02, RF-EVA-05, RF-EVA-07, RF-DSH-01, RNF-POW-01, RNF-POW-04, RNF-PER-01, RNF-SEC-01 | Sin red externa, cada tripulante recibe estado Nominal, Precaución o Crítico en menos de 50 ms; pruebas de frontera en cada umbral; datos cifrados localmente. |
| AC-02 Detección de deriva precoz | RF-ING-03, RF-DER-01 a RF-DER-04, RF-DSH-02, RNF-PER-01 | En el dataset de 180 días, la alerta precoz por Z-score modificado o regresión se emite antes de que el indicador cruce el umbral crítico. |
| AC-03 Trazabilidad anatómica y usabilidad | RF-EVA-03, RF-EVA-06, RF-ANA-01 a RF-ANA-04, RF-ING-04, RF-REG-01, RNF-USA-01 a RNF-USA-05 | Cada alerta mapea a su sistema de órganos y región táctil ($\ge 48\text{ px}$); modo espectral nocturno validado; bitácora inmutable con SHA-256. |
| AC-04 Guía de contramedidas | RF-GUI-01 a RF-GUI-04, RF-GAM-01, RF-GAM-02, RNF-USA-02, RNF-USA-05 | Cada desviación ofrece contramedidas en 3 toques o menos con recursos a bordo; máximo 7 pasos secuenciales verificables. |
| AC-05 Resiliencia ante eventos extremos y sync | RF-ING-02, RF-EVA-04, RF-DSH-04, RF-SIM-01 a RF-SIM-05, RNF-SEC-03, RNF-NET-01 a RNF-NET-03 | Los escenarios A a D activan el protocolo en $< 50\text{ ms}$; auto-recuperación ante bit-flips; sincronización P2P multi-dispositivo sin Internet en LAN de la nave. |

**Plan de pruebas.** (1) Pruebas unitarias de cada umbral en el valor exacto, uno por debajo y uno por encima. (2) Pruebas de las reglas R-ENV, R-SANS, R-RAD, R-COG, R-REN y R-CARD. (3) Reproducción del dataset de 180 días verificando D-01 a D-03. (4) Ejecución de los cuatro escenarios del simulador. (5) Prueba sin red y recarga con persistencia.
