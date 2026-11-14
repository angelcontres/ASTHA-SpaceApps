# 🧠 ÉPICA 2: Triage Clínico y Visualización Anatómica Interactiva
**Módulo:** Motor de Reglas CDSS y Modelo Humano | **Estándar:** NASA-STD-3001 Vol 1 / NASA HRP Risks

---

## 📌 HU-05: Triage Rápido mediante Mapa Anatómico Interactivo (Hotspots Corporales)

* **ID:** `HU-05`
* **Épica:** Épica 2 - Triage Clínico y Visualización Anatómica
* **Prioridad MoSCoW:** **Must Have** (Ergonomía de Crisis)
* **Puntos de Historia (Story Points):** 8 SP
* **Requisitos SRS Trazados:** `RF-ANA-01..04`, `RNF-USA-02`, `RNF-USA-03`
* **Fuentes Oficiales:** ISO 9241-11 / NASA CDSS Ergonomics Guide

### 📖 Narrativa de Usuario:
> **Como** Astronauta no médico en situación de estrés o fatiga,  
> **Quiero** ver un mapa anatómico interactivo del cuerpo humano con los órganos coloreados según su estado de salud (Verde, Amarillo o Rojo con símbolos distintivos),  
> **Para** identificar en menos de 3 segundos qué sistema fisiológico se encuentra comprometido simplemente tocando la región afectada.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Triage de órgano afectado al hacer clic
* **Dado que** el tripulante o el Oficial Médico visualiza el mapa anatómico táctico en la pantalla principal,
* **Cuando** hace clic o toca sobre la región de los **Ojos y Cabeza** (Sistema Neuro-Ocular),
* **Entonces** el sistema debe desplegar una tarjeta flotante contextual detallando:
  * Nombre del sistema ("Sistema Neuro-Ocular"),
  * Estado clínico actual ("ALERTA SANS - Hipertensión Cefálica"),
  * Fisiopatología explicada en lenguaje simple ("Desplazamiento cefálico de fluidos en microgravedad con sobrepresión en papila óptica").

#### Escenario 2: Accesibilidad para daltonismo y guantes espaciales
* **Dado que** los astronautas pueden sufrir alteraciones visuales temporales o vestir guantes de actividad intravehicular,
* **Cuando** un órgano pasa a estado Crítico (Rojo),
* **Entonces** la región anatómica no solo debe cambiar de color (#ef4444), sino que debe mostrar una animación de pulso lento (1.5s) y un icono o reborde blanco de alto contraste,
* **Y** el área de toque del hotspot debe ser de al menos $48 \times 48\text{ px}$.

---

## 📌 HU-06: Detección Precoz y Estratificación del Síndrome Neuro-Ocular (SANS)

* **ID:** `HU-06`
* **Épica:** Épica 2 - Triage Clínico y Visualización Anatómica
* **Prioridad MoSCoW:** **Must Have** (Riesgo Crítico de Vuelo Humano)
* **Puntos de Historia (Story Points):** 8 SP
* **Requisitos SRS Trazados:** `RF-EVA-01`, `RF-EVA-03`, `RF-GUI-01`
* **Fuentes Oficiales:** NASA HRP SANS Risk / NASA OSDR OSD-715 (Retina Proteomics)

### 📖 Narrativa de Usuario:
> **Como** Oficial Médico de la Tripulación (CMO),  
> **Quiero** que el sistema evalúe continuamente la presión arterial sistólica, la agudeza visual y la sintomatología craneal de los astronautas durante la fase de microgravedad,  
> **Para** detectar de forma temprana el síndrome SANS antes de que se produzca un edema de papila irreversible o daño estructural en el nervio óptico.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Disparo de alerta SANS por sobrepresión sistólica en órbita
* **Dado que** el astronauta se encuentra en fase de vuelo orbital o espacio profundo (FD-01 a FD-03),
* **Cuando** su Presión Arterial Sistólica alcanza o supera los $140\text{ mmHg}$ ($\text{PAS} \ge 140\text{ mmHg}$),
* **Entonces** la tarjeta de Presión Arterial debe entrar en estado de **Alerta Roja Pulsante** con la etiqueta "SANS CRITICAL",
* **Y** el hotspot ocular del mapa corporal debe cambiar a color rojo,
* **Y** debe activarse en el panel de acciones el protocolo médico de contramedida correspondiente (Pantalones LBNP y Rejilla de Amsler).

#### Escenario 2: Normalización y vuelta a estado nominal
* **Dado que** un tripulante presentó un evento SANS y se le aplicó la contramedida de presión negativa LBNP,
* **Cuando** su presión arterial sistólica desciende por debajo de $125\text{ mmHg}$ de forma estable durante 30 minutos,
* **Entonces** el estado del sistema neuro-ocular debe retornar a nivel **Nominal (Verde)**,
* **Y** registrar en el historial clínico la efectividad de la contramedida aplicada.

---

## 📌 HU-07: Detección Algorítmica de Deriva Fisiológica (Z-Score Modificado)

* **ID:** `HU-07`
* **Épica:** Épica 2 - Triage Clínico y Visualización Anatómica
* **Prioridad MoSCoW:** **Must Have** (Matemática Biomédica Robusta)
* **Puntos de Historia (Story Points):** 8 SP
* **Requisitos SRS Trazados:** `RF-DER-01..03`, `RNF-USA-05`
* **Fuentes Oficiales:** Hoaglin & Iglewicz (1993) / NASA Flight Surgeon Guidelines

### 📖 Narrativa de Usuario:
> **Como** Oficial Médico (CMO) o Cirujano de Vuelo,  
> **Quiero** que el sistema calcule el Z-Score Modificado basado en la mediana y la desviación absoluta respecto a la mediana (MAD) sobre una ventana móvil de 7 días,  
> **Para** detectar desviaciones sutiles de la línea base del astronauta sin que los valores atípicos (outliers) provoquen falsos positivos en el espacio.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Cálculo robusto del Z-score modificado
* **Dado que** el astronauta tiene un historial de 7 días de frecuencia cardíaca en reposo,
* **Cuando** el algoritmo evalúa la nueva medición $x_i$,
* **Entonces** debe aplicar la fórmula exacta:
  $$M_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{\text{MAD}}$$
  donde $\tilde{x}$ es la mediana y $\text{MAD} = \text{mediana}(|x_i - \tilde{x}|)$,
* **Y** si $|M_i| \ge 2.5$, debe clasificar la medición como **Deriva Estadística Significativa**.

#### Escenario 2: Alerta predictiva antes del cruce de umbral absoluto
* **Dado que** la presión arterial de un tripulante se encuentra actualmente en rango nominal ($122\text{ mmHg}$),
* **Cuando** la proyección por regresión lineal a 7 días indica que superará los $135\text{ mmHg}$ si continúa la tendencia observada,
* **Entonces** AstroVital debe emitir una **Alerta Precoz de Deriva**,
* **Y** mostrar la justificación matemática: "Tendencia ascendente sostenida (+1.8 mmHg/día) cruzará el umbral de precaución en 4 días".

---

## 📌 HU-08: Tablero Agregado de Toda la Tripulación para el Oficial Médico (CMO)

* **ID:** `HU-08`
* **Épica:** Épica 2 - Triage Clínico y Visualización Anatómica
* **Prioridad MoSCoW:** **Should Have** (Conciencia Situacional de Misión)
* **Puntos de Historia (Story Points):** 5 SP
* **Requisitos SRS Trazados:** `RF-DSH-03`, `RNF-USA-03`
* **Fuentes Oficiales:** NASA Medical Operations / Inspiration4 (Crew C001..C004)

### 📖 Narrativa de Usuario:
> **Como** Oficial Médico de la Tripulación (Dra. Hayley Arceneaux) o Comandante de Misión,  
> **Quiero** cambiar rápidamente entre los 4 astronautas de la misión (C001, C002, C003, C004) o ver una vista consolidada de toda la tripulación,  
> **Para** conocer el estado de salud de todo el equipo en un solo panel y priorizar la atención en el tripulante con mayor riesgo clínico.

### 🧪 Criterios de Aceptación (Gherkin BDD):

#### Escenario 1: Cambio inmediato entre tripulantes
* **Dado que** el usuario se encuentra visualizando al Comandante Jared Isaacman (C001),
* **Cuando** presiona el botón del tripulante "Dra. Sian Proctor (C003)",
* **Entonces** en menos de 200 ms la interfaz debe actualizar la tarjeta de bioseñales, el mapa anatómico, las curvas de Chart.js y el plan de acción correspondiente a C003,
* **Y** destacar visualmente el botón del astronauta activo con un borde cian brillante.

#### Escenario 2: Regla del peor estado de salud global
* **Dado que** 3 astronautas se encuentran en estado Nominal (Verde) y 1 astronauta (C003) se encuentra en estado Crítico (Rojo por SANS),
* **Cuando** el CMO consulta el resumen general de la nave,
* **Entonces** el semáforo global de la misión debe marcar **Crítico (Rojo)**,
* **Y** señalar directamente al astronauta C003 como el tripulante causante de la alerta para evitar complacencia o desatención.
