# 🚨 Paquete 3: Contramedidas y Emergencias de Vuelo
**Módulo:** Gestión de Crisis y Guía Procedimental | **Estándar:** NASA Flight Procedures / NASA SPELs

---

## 📋 Caso de Uso: CU-07
### Nombre: Ejecución de Checklists Médicos Asistidos Paso a Paso

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-07` |
| **Actor Primario** | Astronauta en Misión (No Médico) |
| **Actores Secundarios** | Oficial Médico (CMO) |
| **Nivel** | Nivel de Usuario / Tarea de Intervención |
| **Requisitos SRS** | `RF-GUI-01..04`, `RNF-USA-01`, `RNF-USA-04` |
| **Historias Trazadas** | `HU-09`, `HU-12` |

### 1. Descripción Breve:
Cuando se dispara cualquier evento médico o ambiental, AstroVital transforma la complejidad clínica en un checklist secuencial interactivo de un máximo de 4 pasos accionables. El tripulante marca cada casilla conforme completa la tarea, registrando el avance en tiempo real en la memoria de la nave.

### 2. Precondiciones:
1. Una regla de decisión clínica ha pasado a estado Precaución o Crítico, o el usuario ha seleccionado manualmente un protocolo de contramedida.
2. La pantalla muestra el contenedor de checklist en el panel lateral derecho.

### 3. Disparador (Trigger):
Aparición de una alerta médica en pantalla o selección de una guía por el usuario.

### 4. Flujo Principal de Eventos:
1. El sistema despliega el título del protocolo con el nivel de severidad en un badge distintivo (ej. "ALERTA SANS - ALTA PRIORIDAD").
2. El sistema muestra la justificación en 2 líneas de texto plano ("Qué ocurre").
3. El sistema lista los pasos operativos con casillas interactivas desmarcadas:
   * `[ ] Paso 1: Colocar y presurizar pantalones LBNP a -35 mmHg por 60 min.`
   * `[ ] Paso 2: Realizar examen de agudeza visual en pantalla táctil (Rejilla de Amsler).`
   * `[ ] Paso 3: Restringir ingesta de sodio a menos de 2.0 g/día en ración nutricional.`
4. El astronauta completa físicamente el primer paso en el módulo médico y toca la casilla del Paso 1.
5. El sistema cambia el texto del paso a tachado suave con color verde (#10b981) y almacena la marca de tiempo MET del cumplimiento.
6. El astronauta completa y marca el Paso 2 y el Paso 3.
7. Al marcarse la totalidad de los pasos del checklist, el sistema emite una confirmación: "Protocolo Completado Exitosamente".
8. El sistema agenda una reevaluación hemodinámica automática a los 30 minutos para confirmar la efectividad del tratamiento.

### 5. Flujos Alternativos:
* **FA-01: Incapacidad de completar un paso por falta de insumos:**
  1. Si un recurso físico no está operativo (ej. falla en la bomba de vacío del LBNP), el astronauta mantiene presionado el paso y selecciona "Recurso No Disponible".
  2. El motor CDSS recalcula de inmediato un procedimiento alternativo de respaldo (ej. "Elevar tronco a 30° respecto al eje cefálico y aplicar bandas de compresión venosa elásticas").

### 6. Flujos de Excepción:
* **FE-01: Omisión accidental o cierre de la aplicación durante el checklist:**
  1. Si la tableta se apaga o se cierra la aplicación mientras se ejecuta un checklist activo, el estado de las casillas ya completadas permanece guardado en la base de datos flash SQLite. Al reiniciar, la aplicación restaura la pantalla exactamente en el paso pendiente.

### 7. Postcondiciones:
* **Éxito:** La contramedida médica se ejecuta de forma rigurosa y verificable, minimizando los errores por distracción o estrés.

---

## 📋 Caso de Uso: CU-08
### Nombre: Activación y Gestión de Emergencia de Tormenta Solar (SPE)

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-08` |
| **Actor Primario** | Dosímetro CANS de la CSA (Hardware) / Comandante de Misión |
| **Actores Secundarios** | Toda la Tripulación de Vuelo |
| **Nivel** | Nivel de Supervivencia de Misión (Código Rojo) |
| **Requisitos SRS** | `RF-EVA-04`, `RF-GUI-03`, `RNF-USA-04` |
| **Historias Trazadas** | `HU-10` |

### 1. Descripción Breve:
Ante la detección de un flujo masivo de protones y neutrones secundarios que supera los límites permisibles de la NASA ($> 100\ \mu\text{Sv/h}$), el sistema activa la alarma de cabina de Máxima Prioridad, coordina la evacuación hacia el módulo central blindado (*Storm Shelter*), gestiona el consumo de fármacos radioprotectores y computa la dosis biológica acumulada.

### 2. Precondiciones:
1. El espectrómetro de neutrones CANS está en operación en el exterior e interior del casco de la nave.
2. La nave se encuentra en espacio interplanetario fuera de la magnetosfera terrestre.

### 3. Disparador (Trigger):
La tasa de dosis de radiación ionizante detectada por el CANS supera los $100\ \mu\text{Sv/h}$ ($\text{Tasa} > 100\ \mu\text{Sv/h}$).

### 4. Flujo Principal de Eventos:
1. El dosímetro CANS detecta un flujo repentino de partículas solares alcanzando $184.2\ \mu\text{Sv/h}$.
2. El sistema AstroVital evalúa la tasa de incremento ($dD/dt$) y clasifica el evento como **"Emergencia SPE: Tormenta Solar de Partículas de Alta Energía"**.
3. El sistema activa una alarma acústica táctica distintiva de tono alto intermitente.
4. Todas las pantallas de la nave se transforman en modo de evacuación de alto contraste: fondo oscuro con bordes rojos pulsantes.
5. El sistema despliega el procedimiento inmediato de 3 acciones prioritarias:
   * **Acción 1:** "Evacuar tripulación al módulo central blindado (Storm Shelter) en menos de 5 minutos".
   * **Acción 2:** "Administrar cóctel radioprotector antioxidante oral (Botiquín Bravo)".
   * **Acción 3:** "Fijar dosímetros pasivos CANS personales en el mamparo interior".
6. Los astronautas ingresan al refugio blindado y el Comandante confirma el repliegue en la pantalla principal.
7. El sistema inicia la integración temporal de la dosis absorbida en tiempo real ($\int \dot{D} \, dt$) por cada tripulante.

### 5. Flujos Alternativos:
* **FA-01: Tormenta solar de baja intensidad ($35 - 100\ \mu\text{Sv/h}$):**
  1. Si la tasa se eleva pero no cruza los $100\ \mu\text{Sv/h}$, el sistema emite una "Alerta Amarilla de Monitoreo", recomendando cancelar actividades en módulos exteriores (ej. cúpula de observación) sin ordenar el confinamiento en el refugio.

### 6. Flujos de Excepción:
* **FE-01: Astronauta aislado en módulo durante la tormenta:**
  1. Si un sensor de mamparo indica presencia de un tripulante fuera del refugio tras 5 minutos de alarma, el sistema emite un aviso sonoro focalizado en ese compartimento: "Alerta de Radiación: Traslado inmediato a mamparo central".

### 7. Postcondiciones:
* **Éxito:** La tripulación se protege en el área con mayor densidad de blindaje (tanques de agua y raciones) y se reduce la dosis biológica total recibida en más del $70\%$.

---

## 📋 Caso de Uso: CU-09
### Nombre: Presurización Guiada de Pantalones LBNP ante Hipertensión Cefálica

| Atributo | Detalle |
| :--- | :--- |
| **Identificador** | `CU-09` |
| **Actor Primario** | Oficial Médico (CMO) |
| **Actores Secundarios** | Astronauta en Tratamiento (Paciente) |
| **Nivel** | Nivel Clínico / Procedimiento Terapéutico |
| **Requisitos SRS** | `RF-GUI-01`, `RF-GUI-02`, `RF-ANA-02` |
| **Historias Trazadas** | `HU-11` |

### 1. Descripción Breve:
Guía al Oficial Médico y al astronauta en la colocación, sellado neumático, encendido de la bomba de succión y ajuste gradual de la presión negativa en piernas (LBNP a $-35\text{ mmHg}$), supervisando simultáneamente el electrocardiograma y la presión arterial para evitar colapso hemodinámico o síncope.

### 2. Precondiciones:
1. El dispositivo LBNP está desplegado en el módulo médico y conectado a la línea de vacío de la nave.
2. El paciente tiene colocado el manguito de presión continua y los electrodos cardíacos.

### 3. Disparador (Trigger):
Activación del protocolo SANS o indicación terapéutica por parte del Oficial Médico.

### 4. Flujo Principal de Eventos:
1. El CMO abre el asistente interactivo "Protocolo LBNP" en AstroVital.
2. El sistema guía la colocación del sello de neopreno en la cintura del paciente con verificación visual de ajuste hermético.
3. El sistema inicia un temporizador de cuenta regresiva de 60 minutos calibrado a $-35\text{ mmHg}$.
4. El CMO activa la bomba de succión manual/automática hasta que el manómetro digital marca $-35\text{ mmHg}$.
5. Durante los 60 minutos de sesión, AstroVital muestrea la presión arterial y la frecuencia cardíaca cada 30 segundos.
6. A los 30 minutos, el sistema emite una señal suave solicitando al paciente confirmar: "¿Siente mareo, visión de túnel o náuseas?". El paciente pulsa "No, Nominal".
7. Al cumplirse los 60 minutos, el sistema indica: "Finalizando sesión: Despresurizar gradualmente durante 2 minutos hasta $0\text{ mmHg}$".
8. El sistema solicita realizar el examen visual post-contramedida con la Rejilla de Amsler en pantalla.
9. El paciente mira la cuadrícula central y pulsa "Líneas rectas / Sin distorsión".
10. El sistema registra la sesión como exitosa y archiva la curva hemodinámica en el expediente clínico del tripulante.

### 5. Flujos Alternativos:
* **FA-01: Caída de presión arterial durante la sesión (Riesgo de Síncope):**
  1. Si la Presión Sistólica cae a $< 90\text{ mmHg}$ o la Frecuencia Cardíaca sube bruscamente $> 115\text{ bpm}$ (respuesta simpática refleja), el sistema interrumpe el temporizador y activa una alarma sonora: **"Alerta Hemodinámica: Detener succión LBNP y despresurizar inmediatamente"**.

### 6. Flujos de Excepción:
* **FE-01: Fuga en el sello neumático del LBNP:**
  1. Si la bomba no logra sostener la presión negativa por debajo de $-20\text{ mmHg}$, el sistema notifica: "Fuga de presión detectada; verificar cremallera de cierre en cintura".

### 7. Postcondiciones:
* **Éxito:** Se logra la descongestión venosa intracraneal de forma segura sin provocar hipotensión ortostática en el paciente.
