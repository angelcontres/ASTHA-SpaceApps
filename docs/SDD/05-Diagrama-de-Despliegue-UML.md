# 🚀 SDD-05: Diagrama de Despliegue UML
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | UML 2.5

---

## 1. Topología Física y de Red en Espacio Profundo

El diagrama de despliegue modela la distribución de nodos físicos entre los biosensores vestibles de la tripulación, la infraestructura informática de la nave espacial (*Deep Space Transport DST-1*), el enlace de telecomunicación DSN y el centro de control en Tierra (*NASA JSC / Houston*).

```mermaid
flowchart TB
    subgraph Crew_Wearable ["Nodo Vestible Tripulación (Crew Wearable Node)"]
        Astroskin["Astroskin / Bio-Monitor Smart Shirt<br>• ECG 3-Derivaciones (250 Hz)<br>• Pletismografía Inductiva Torácica (25 Hz)<br>• Acelerómetro Triaxial & Temp Cutánea"]
        SmartWrist["Wrist Telemetry Display<br>• Alertas Hápticas & BLE 5.0 Link"]
        Astroskin -->|Bluetooth Low Energy| SmartWrist
    end

    subgraph Habitat_ECLSS ["Nodo de Sensores de Hábitat (Cabin ECLSS Bus)"]
        AtmSensors["Sensores Atmosféricos de Cabina<br>• Presión Total (CDRA/OGS)<br>• PCO2 & PO2 Estequiométrica<br>• Dosímetro de Radiación de Neutrones (CANS)"]
    end

    subgraph Deep_Space_Transport ["Vehículo Espacial de Espacio Profundo (DST-1 Mars Transit Node)"]
        subgraph Edge_Medical_Server ["Servidor Médico de Bordo Redundante (Dual-Fault Tolerant)"]
            ASTHA_Core["ASTHA Core Telemetry & CDSS Engine<br>• NodeJS / Edge Runtime<br>• SQLite / IndexedDB Local Storage<br>• Offline NASA OSDR Enriched Database"]
            DTN_Daemon["DTN Bundle Protocol v7 Agent<br>• RFC 9171 Store-and-Forward Buffer"]
        end

        subgraph Crew_Terminal ["Terminal Médico de Cabina (Crew Workstation)"]
            Browser["Avionics Web Cockpit (PWA / WebGL)<br>• Three.js 3D Digital Twin Mannequin<br>• Chart.js Flight Telemetry Dashboard<br>• Master Caution & Warning System"]
        end
    end

    subgraph Ground_Segment ["Segmento Terrestre (NASA Johnson Space Center / Houston)"]
        DSN["Deep Space Network (DSN 70m Antennas Goldstone/Madrid/Canberra)"]
        FlightSurgeonConsole["Flight Surgeon Telemetry Console (BMed / Houston)<br>• Asynchronous DTN Bundle Reassembly<br>• Longitudinal Mission Telemetry Archive"]
    end

    SmartWrist -->|WiFi 6 Mesh IEEE 802.11ax| ASTHA_Core
    AtmSensors -->|MIL-STD-1553 / CAN Bus Controller| ASTHA_Core
    ASTHA_Core <-->|WebSocket / Local IPC| Browser
    ASTHA_Core --> DTN_Daemon

    DTN_Daemon <==|Enlace Óptico / Ka-Band (22 min de latencia one-way)|==> DSN
    DSN --> FlightSurgeonConsole
```

---

## 2. Especificación de Nodos de Hardware

### 2.1 Nodo Vestible de la Tripulación (*Crew Wearable Node*)
* **Hardware:** Prenda inteligente textil biocompatible (*Bio-Monitor Astroskin / CSA*).
* **Protocolo de Enlace:** Bluetooth Low Energy (BLE 5.0) encriptado con AES-128 CCM.
* **Potencia:** Consumo ultra-bajo ($\le 0.4	ext{ W}$) con batería recargable de 48 horas de autonomía en microgravedad.

### 2.2 Servidor Médico de Bordo (*Edge Medical Server*)
* **Hardware:** Arquitectura redundante tolerante a fallos (*Dual-Lockstep SBC* con protección contra eventos de radiación ionizante *Single Event Upsets - SEU*).
* **Entorno de Ejecución:** Runtime de borde determinista local (*NodeJS / WebAssembly*).
* **Persistencia:** Almacenamiento de estado sólido NVMe industrial de alta durabilidad sin depender de conectividad externa.

### 2.3 Terminal Médico de Cabina (*Crew Medical Terminal*)
* **Hardware:** Pantalla táctil industrial reforzada para cabina espacial (apta para uso con guantes $\ge 48	ext{px}$ y alto contraste visual según estándar **NASA-STD-3001 Vol 2**).
* **Software:** Interfaz de usuario PWA ejecutada en navegador Chromium embebido con aceleración WebGL por hardware para 60 FPS estables.

### 2.4 Enlace Espacio-Tierra (*Space-to-Ground Deep Space Link*)
* **Infraestructura:** Antenas de 70 metros de la **Deep Space Network (DSN)** situadas en Goldstone (EE.UU.), Madrid (España) y Canberra (Australia).
* **Banda de Frecuencia:** Transmisor de alta ganancia en Banda Ka (32 GHz) y transceptor láser óptico espacial.
* **Protocolo de Capa de Transporte:** **CCSDS 734.2-B-1 / RFC 9171 (DTN Bundle Protocol v7)** con custodia garantizada.
