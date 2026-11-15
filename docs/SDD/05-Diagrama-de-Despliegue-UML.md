# 🚀 SDD-05: Diagrama de Despliegue UML
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | UML 2.5 | Modelo C4-L4 | **ADRs:** 002, 007, 008, 010, 012, 014, 020

---

## 1. Topología Física y de Red en Hábitat / Vehículo Espacial

De acuerdo con **[ADR-002](08-Architecture-decisions.md#adr-002)**, **[ADR-007](08-Architecture-decisions.md#adr-007)** y **[ADR-008](08-Architecture-decisions.md#adr-008)**, ASTHA se despliega íntegramente dentro de una **LAN cerrada e isolada en la nave espacial** (Cero pasarelas hacia Internet / Zero-WAN).

```mermaid
flowchart TB
    subgraph PreFlight ["Aprovisionamiento Pre-Vuelo en Tierra (ADR-020)"]
        EngGround["Ingeniería NASA (Tierra)<br>• Instala Raíz CA Interna<br>• Pre-instala PWA Offline<br>• Inscribe Claves Ed25519 y PINs"]
    end

    subgraph Spacecraft_LAN ["Red LAN Cerrada de la Nave (Zero-WAN / mDNS astha.local - ADR-002/007)"]
        
        subgraph Crew_Tablets ["Tabletas de Tripulación (x4 Nodos Autónomos)"]
            CrewPWA["Crew PWA (Svelte 5 + 2 Workers)<br>• IndexedDB AES-GCM 256 (ADR-006)<br>• Clave envuelta con PIN Personal (ADR-012)<br>• Autonomía Clínica 100% si cae el Hub"]
        end

        subgraph CMO_Console ["Estación Médica del CMO"]
            CmoPWA["CMO Console PWA<br>• Claves envueltas con PIN CMO (ADR-012)<br>• Descifra todos los tripulantes<br>• Recibe escalada de alarmas a los 2m (ADR-013)<br>• Genera JSON Firmado Ed25519 (ADR-010)"]
        end

        subgraph Cabin_Screens ["Pantallas Públicas de Mamparo / Cabina (ADR-014)"]
            CabinDisplay["Bulkhead Status Display<br>• Solo Telemetría Hábitat ECLSS/CANS<br>• Semáforo Global por Tripulante<br>• PROHIBIDO mostrar valores clínicos<br>• Aviso escalado a los 5m (ADR-013)"]
        end

        subgraph Optional_Sync_Node ["Nodo Central Opcional: Sync Hub (ADR-008)"]
            RustHub["ASTHA Sync Hub (Binario Rust)<br>• TLS 1.3 con Cert CA Interna (ADR-007)<br>• mDNS astha.local (< 3s RNF-NET-03)<br>• Op-Log Append-Only Zero-Knowledge"]
        end

        CA_Internal["Autoridad Certificadora (CA) Interna de la Nave"]
    end

    subgraph External_Comms ["Frontera Externa de Comunicaciones (Fuera de ASTHA - ADR-010)"]
        ShipRouter["Router / Transpondedor DTN de la Nave"]
        DSN["NASA Deep Space Network (DSN)<br>Goldstone / Madrid / Canberra"]
        Houston["Flight Surgeon Console (JSC Houston)"]
    end

    EngGround -.->|Pre-lanzamiento| Crew_Tablets
    EngGround -.->|Pre-lanzamiento| CMO_Console
    CA_Internal -->|Certificado astha.local| Optional_Sync_Node

    CrewPWA <==|WSS TLS 1.3 (Deltas CRDT Cifrados)|==> RustHub
    CmoPWA <==|WSS TLS 1.3 (Deltas CRDT Cifrados)|==> RustHub
    RustHub ==>|WSS Solo Estado Global Hábitat| CabinDisplay

    CmoPWA -.->|Entrega Manual de Archivo<br>astha_export_signed.json (ADR-010)| ShipRouter
    ShipRouter ==|Enlace Ka-Band / Óptico (3-22 min latencia)|==> DSN --> Houston
```

---

## 2. Especificación de Nodos y Fronteras de Seguridad

### 2.1 Aprovisionamiento Pre-Vuelo (`ADR-020`)
Para evitar que la tripulación gestione certificados o infraestructura criptográfica en espacio profundo:
* Ingeniería instala antes del lanzamiento la raíz de la **CA interna de la nave** en todos los dispositivos (`ADR-007`), lo que habilita el contexto seguro (`https://astha.local`) exigido por la API nativa `window.crypto.subtle` y los *Service Workers*.
* Se pre-carga la PWA y el dataset sintético de 180 días en el Cache Storage ($\le 5.0\text{ MB}$).
* Cada tableta recibe su par de claves de dispositivo `Ed25519` y las claves simétricas de tripulación envueltas con PBKDF2.

### 2.2 Autonomía de las Tabletas y Consola del CMO (`ADR-008`, `ADR-012`)
* Cada tableta y la consola del CMO ejecutan localmente el bundle completo de ASTHA (`Crew PWA` + `Clinical Engine Worker` + `Data & Sync Worker`).
* **Sin Punto Único de Fallo Clínico (`ADR-008`):** El `Sync Hub` en Rust opera en estrella únicamente para facilitar la convergencia automática de deltas CRDT en la LAN. Si el Hub o la red Wi-Fi fallan, **todos los dispositivos mantienen su triage clínico, alertas y registro al 100%**, convergiendo automáticamente mediante `HLC` y `VersionVector` (`ADR-009`) en cuanto se restablece el enlace.
* **Privacy Act y HIPAA (`ADR-012`):** El `Sync Hub` almacena y retransmite sobres cifrados con `AES-GCM-256`; no posee las llaves de los tripulantes y es arquitectónicamente incapaz de leer datos médicos en claro (*Zero-Knowledge*).

### 2.3 Pantallas Públicas de Cabina (`ADR-014`)
* Montadas en áreas comunes del hábitat. Al ser visibles por toda la tripulación, no poseen llaves privadas de los tripulantes.
* Renderizan exclusivamente:
  1. Telemetría ambiental del hábitat ($pp\text{CO}_2$, presión, $\% O_2$, radiación $\mu\text{Sv/h}$).
  2. Semáforo global (Nominal / Precaución / Crítico) por tripulante, cifrado en un registro separado con la clave de hábitat.
  3. **Restricción estricta:** Nunca muestran valores biomédicos individuales, diagnósticos, órganos afectados ni permiten reconocer alarmas.

### 2.4 Frontera hacia Tierra / DSN (`ADR-010`)
* Conforme a **[ADR-010](08-Architecture-decisions.md#adr-010)** y `RNF-NET-04`, ASTHA no establece sockets hacia el exterior ni implementa el protocolo de red DTN dentro del navegador (respetando estrictamente `RNF-NET-01`).
* El CMO genera un archivo estandarizado **JSON firmado con Ed25519** (anonimizado si corresponde según `ADR-012`) y lo entrega al sistema/transpondedor DTN externo de la nave, el cual gestiona las colas de espera y la transmisión por la DSN hacia Houston.
