# 📋 Historias de Usuario del Sistema ASTHA (User Stories)
### NASA Space Apps Challenge | Create Health Monitoring Software for Astronauts on Space Missions
**Marco Normativo:** ISO/IEC/IEEE 29148 | NASA-STD-3001 Vol 1 & 2 | Human-Rating Requirements (NPR 8705.2C)

---

## 🎯 1. Propósito y Visión General

Este documento y sus módulos asociados detallan las **Historias de Usuario (HU)** de **ASTHA**, el sistema autónomo de soporte a la decisión clínica (CDSS) para misiones tripuladas de espacio profundo (Tránsito Tierra-Marte).

Debido a que una misión a Marte enfrenta una latencia electromagnética de hasta **22 minutos por sentido (44 min ida y vuelta)** y no existe posibilidad de evacuación médica (*No MEDEVAC*), el software debe satisfacer las necesidades operacionales tanto de la tripulación en tránsito como del equipo de soporte en Tierra (Mission Control Center en Houston).

---

## 👥 2. Arquetipos de Usuario (User Personas)

| Arquetipo / Rol | Representante en Escenario | Perfil Operacional y Necesidades Clínicas |
| :--- | :--- | :--- |
| **Astronauta en Misión (No Médico)** | Dra. Sian Proctor / Chris Sembroski | Científico/Ingeniero de vuelo. Alto estrés cognitivo en microgravedad. Requiere interfaz sin ambigüedades, visualización gráfica inmediata y checklists paso a paso sin jerga médica compleja. |
| **Oficial Médico de la Tripulación (CMO)** | Dra. Hayley Arceneaux | Tripulante con entrenamiento de soporte vital avanzado. Requiere visión panorámica de toda la tripulación, diagnósticos diferenciales sugeridos por IA, y control de adherencia a contramedidas (ARED, LBNP). |
| **Comandante de Misión** | Jared Isaacman | Responsable de la seguridad operacional. Necesita conocer de inmediato si un tripulante entra en estado crítico o incapacitante que comprometa las maniobras de la nave. |
| **Cirujano de Vuelo en Tierra (Flight Surgeon)** | Director Médico en Houston (JSC) | Médico especialista en medicina espacial. Opera en modo 100% asíncrono. Necesita recibir paquetes agregados de telemetría, auditoría de eventos y justificación de contramedidas aplicadas. |
| **Ingeniero de Sistemas de Hábitat (ECLSS)** | Operador de Soporte Vital | Monitorea la correlación entre variables ambientales de la cabina (bolsas de CO₂, despresurización, flujo de neutrones por tormentas solares SPE) y la fisiología humana. |
| **Ingeniero de Software Embebido / Ciberseguridad** | Desarrollador de Hardware de Vuelo | Supervisa el rendimiento en computación de borde (Edge), consumo de energía (< 5W en reposo), sincronización en malla P2P y tolerancia a fallos por radiación (SEU). |

---

## ✅ 3. Definición de "Hecho" (Definition of Done - DoD Aeroespacial)

Para que una Historia de Usuario se considere **DONE (Terminada)** en ASTHA, debe satisfacer los siguientes 6 criterios rigurosos:

1. **Cumplimiento de NASA-STD-3001:** Los umbrales de alerta médica y rangos nominales/críticos deben coincidir exactamente con los límites fisiológicos del estándar de la NASA.
2. **Autonomía 100% Edge:** La funcionalidad debe ejecutarse localmente sin depender de ninguna llamada de red externa ni conexión a la nube.
3. **Criterios de Aceptación (Gherkin):** Todos los escenarios `Dado / Cuando / Entonces` deben estar verificados mediante pruebas unitarias o de integración.
4. **Ergonomía de Crisis (RNF-USA):** La interfaz no debe depender exclusivamente del color (debe usar iconos, patrones o texto auxiliar para daltonismo) y permitir interacción táctil con guantes de vuelo.
5. **Trazabilidad Bidireccional:** La HU debe mapear directamente a un Requisito Funcional (RF) o No Funcional (RNF) del documento SRS.
6. **Integridad ante Radiación:** Los datos persistidos deben contar con checksums (SHA-256 / CRC32) para validar que no sufrieron corrupción por partículas de alta energía (SEU).

---

## 🗺️ 4. Mapa de Épicas y Catálogo de Historias de Usuario

Las historias están modularizadas en 5 documentos temáticos dentro de esta carpeta:

| Épica | Archivo | Descripción | Historias Incluidas |
| :--- | :--- | :--- | :--- |
| **ÉPICA 1: Monitoreo Continuo y Telemetría** | [`HU-01-Monitoreo-Telemetria-Vital.md`](HU-01-Monitoreo-Telemetria-Vital.md) | Ingesta continua desde SmartShirt Astroskin/Bio-Monitor, ambientales y reporte rápido. | HU-01, HU-02, HU-03, HU-04 |
| **ÉPICA 2: Triage Clínico y Visualización Anatómica** | [`HU-02-Triage-Clinico-Modelo-Anatomico.md`](HU-02-Triage-Clinico-Modelo-Anatomico.md) | Modelo corporal interactivo, detección SANS, Z-Score modificado y vista CMO de tripulación. | HU-05, HU-06, HU-07, HU-08 |
| **ÉPICA 3: Protocolos de Contramedidas y Manejo de Crisis** | [`HU-03-Protocolos-Contramedidas-Emergencia.md`](HU-03-Protocolos-Contramedidas-Emergencia.md) | Guías paso a paso para no médicos, evacuación ante Tormentas Solares (SPE), LBNP y ARED. | HU-09, HU-10, HU-11, HU-12 |
| **ÉPICA 4: Resiliencia Edge, Red Malla y Enlace Houston** | [`HU-04-Arquitectura-Edge-Red-Malla.md`](HU-04-Arquitectura-Edge-Red-Malla.md) | Sincronización descentralizada P2P, paquetes asíncronos DTN (44m RTT) e integridad SEU. | HU-13, HU-14, HU-15, HU-16 |
| **ÉPICA 5: Evidencia Científica y Explorador NASA OSDR** | [`HU-05-Explorador-NASA-OSDR.md`](HU-05-Explorador-NASA-OSDR.md) | Vinculación con los 116 estudios de la API NASA OSDR, dataset Inspiration4 y simulador. | HU-17, HU-18, HU-19, HU-20 |

---

## 📊 5. Matriz de Trazabilidad Rápida (HU vs SRS vs NASA-STD-3001)

| ID Historia | Título Resumido | Rol Principal | Prioridad MoSCoW | Requisito SRS | Estándar NASA / CSA |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HU-01** | Visualización de Bioseñales en Vivo (1 Hz) | Astronauta | **Must Have** | RF-ING-01, RF-DSH-01 | NASA-STD-3001 Vol 1 / Astroskin |
| **HU-02** | Detección de Desincronización Circadiana | CMO | **Must Have** | RF-EVA-05, RF-DER-04 | NASA HRP Fatigue Risk / PVT |
| **HU-03** | Correlación Fisiológica con $CO_2$ y Radiación | ECLSS Eng. | **Must Have** | RF-EVA-04, RF-DSH-04 | NASA-STD-3001 Vol 2 / CSA CANS |
| **HU-04** | Registro Fricción-Cero de Síntomas | Astronauta | **Should Have** | RF-ING-03, RNF-USA-01 | Ergonomía NASA-STD-3001 |
| **HU-05** | Triage Anatómico con Hotspots Clicables | Astronauta | **Must Have** | RF-ANA-01..04 | ISO 9241-11 / NASA CDSS |
| **HU-06** | Detección Precoz de Síndrome SANS | CMO | **Must Have** | RF-EVA-01, RF-GUI-01 | NASA HRP SANS Risk / OSD-715 |
| **HU-07** | Detección de Deriva con Z-Score Modificado | CMO | **Must Have** | RF-DER-01..03 | Hoaglin & Iglewicz (1993) |
| **HU-08** | Tablero Agregado de Toda la Tripulación | CMO / Cmdte | **Should Have** | RF-DSH-03 | Medical Operations NASA |
| **HU-09** | Checklists Verificables para No Médicos | Astronauta | **Must Have** | RF-GUI-01..04 | NASA Flight Procedures Handbook |
| **HU-10** | Protocolo Automático de Tormenta Solar (SPE) | Tripulación | **Must Have** | RF-EVA-04, RF-GUI-03 | NASA SPELs / CSA CANS |
| **HU-11** | Manejo de Hipertensión Cefálica con LBNP | CMO / Paciente | **Must Have** | RF-GUI-01, RF-ANA-02 | Protocolo NASA LBNP |
| **HU-12** | Prevención de Litiasis Renal y Pérdida Ósea | Astronauta | **Should Have** | RF-EVA-03, RF-GUI-03 | NASA Renal Stone Risk Countermeasure |
| **HU-13** | Operación Autónoma 100% Offline (Edge) | Todos | **Must Have** | RF-OFF-01..04, RNF-NET-01 | Deep Space Mars Constraints |
| **HU-14** | Empaquetado Asíncrono DTN para Houston | Flight Surgeon | **Must Have** | RF-GUI-05, RNF-NET-03 | Delay-Tolerant Networking (CCSDS) |
| **HU-15** | Sincronización Malla P2P sin Servidor Central | Software Eng. | **Should Have** | RNF-NET-02, RNF-NET-04 | Distributed Edge Systems |
| **HU-16** | Blindaje contra Errores de Radiación (SEU) | Software Eng. | **Must Have** | RNF-SEC-04 | NASA SEL/SEU Avionics Standard |
| **HU-17** | Explorador Oficial de la API NASA OSDR | Investigador | **Could Have** | RF-OFF-03 | NASA OSDR API v2 |
| **HU-18** | Calibración con Misión Inspiration4 (OSD-574) | CMO | **Must Have** | RF-ING-04 | NASA OSDR OSD-574 Dataset |
| **HU-19** | Inyección de Escenarios de Crisis (Simulador) | Tripulación | **Should Have** | RF-DSH-02 | NASA Astronaut Simulation Training |
| **HU-20** | Perfil Energético Ultra-Bajo (< 5W) | Software Eng. | **Must Have** | RNF-POW-01..04 | Spacecraft Power Budget Rules |

---

*Desarrollado para la documentación oficial del desafío de software de salud de NASA Space Apps Challenge.*
