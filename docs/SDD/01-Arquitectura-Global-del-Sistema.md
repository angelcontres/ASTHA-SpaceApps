# 🏛️ SDD-01: Arquitectura Global del Sistema
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | NASA-STD-3001 Vol 1 & 2

---

## 1. Estilo Arquitectónico: Hexagonal + Reactive Edge Core

ASTHA implementa una arquitectura **Hexagonal (Ports & Adapters)** combinada con un flujo unidireccional de datos reactivos (*Unidirectional Reactive Data Flow*). Esta estructura aísla completamente las reglas clínicas y algoritmos matemáticos del hardware sensorial y del framework de visualización.

```
+------------------------------------------------------------------------------------+
|                                    UI & AVIONICS COCKPIT LAYER                     |
|   Tactical HUD  |  Three.js 3D Viewport  |  Chart.js Telemetry  |  Audio Alarms    |
+------------------------------------------------------------------------------------+
                                       │ ▲ (Events & Reactive State)
                                       ▼ │
+------------------------------------------------------------------------------------+
|                         APPLICATION & CDSS CORE (DOMAIN SERVICES)                  |
|   Rule Engine (NASA-STD-3001)  |  Modified Z-Score (MAD)  |  Countermeasure Engine |
+------------------------------------------------------------------------------------+
                                       │ ▲ (Clean Interfaces / Ports)
                                       ▼ │
+------------------------------------------------------------------------------------+
|                          INFRASTRUCTURE & ADAPTERS (EDGE & HARDWARE)               |
|   Astroskin BLE Adapter  |  ECLSS 1553 Driver  |  IndexedDB Store  |  DTN RFC 9171 |
+------------------------------------------------------------------------------------+
```

---

## 2. Principios de Diseño Aeroespacial

### 2.1 Autonomía Edge-First (Cero Dependencia de la Nube)
En una misión a Marte (*Deep Space Transport DST-1*), la distancia a la Tierra alcanza hasta **400 millones de kilómetros**, lo que impone una latencia electromagnética de hasta **22 minutos por sentido** (44 minutos de ida y vuelta). Por tanto:
* El 100% de la lógica de evaluación diagnóstica, inferencia clínica y triaje se ejecuta en el procesador local de la nave.
* El software no emite ninguna petición HTTP bloqueante hacia servidores terrestres durante su operación crítica.

### 2.2 Determinismo Fisiológico mediante Modified Z-Score
Los algoritmos clásicos de detección de umbral fijo producen **falsos positivos** cuando el astronauta realiza ejercicio o experimenta variabilidad individual. ASTHA emplea la **Desviación Absoluta de la Mediana ($MAD$)**:

$$MAD = 	ext{median}(|x_i - 	ilde{x}|)$$

$$M_i = rac{0.6745 \cdot (x_i - 	ilde{x})}{MAD}$$

Donde $	ilde{x}$ es la mediana móvil de la ventana basal del astronauta. Un valor $|M_i| > 3.5$ clasifica una desviación fisiológica real con resistencia estadística a valores atípicos (*outliers*).

### 2.3 Resiliencia Store-and-Forward (DTN RFC 9171)
Para la bitácora médica compartida con el cirujano de vuelo en Houston (*BMed Flight Surgeon Desk*), el sistema utiliza el protocolo de paquetes tolerantes a demoras y disrupciones (**Delay/Disruption Tolerant Networking - DTN Bundle Protocol v7**). Si la nave entra en una fase de ocultamiento solar (*Solar Conjunction Blackout*), los registros médicos se almacenan de forma persistente e ilimitada en el almacenamiento local de a bordo sin pérdida de información.

---

## 3. Desacoplamiento de Capas

| Capa Arquitectónica | Responsabilidad Principal | Tecnologías & Protocolos |
| :--- | :--- | :--- |
| **Capa de Presentación** | Cockpit táctico, gemelo digital 3D, gráficos de evolución temporal y sintetizador de audio de alarma. | Three.js (WebGL), Chart.js, Web Audio API, Tailwind CSS |
| **Capa CDSS & Dominio** | Algoritmos de soporte a la decisión, correlación ambiental ECLSS y protocolos médicos guiados. | JavaScript determinista / TypeScript puro (sin dependencias UI) |
| **Capa de Infraestructura** | Conexión con biosensores corporales, sensores de hábitat y persistencia de borde. | BLE 5.0, MIL-STD-1553 emulador, IndexedDB, DTN Bundle Protocol RFC 9171 |
