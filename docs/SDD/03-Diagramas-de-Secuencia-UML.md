# ⏱️ SDD-03: Diagramas de Secuencia UML
### ASTHA — Software Design Description | NASA Space Apps Challenge 2026
**Normas de Referencia:** NASA-STD-8739.8 | IEEE Std 1016-2009 | UML 2.5 | **ADRs:** 004, 005, 006, 008, 009, 010, 011, 013, 014, 017

---

## 1. Escenario A: Pipeline Clínico en Web Worker (< 50 ms) y Escalada de Alarmas (`ADR-005`, `ADR-011`, `ADR-013`)

Modela el flujo reactivo dirigido por eventos (sin *polling*) desde el registro o inyección de crisis hasta la evaluación clínica y el protocolo temporal de escalada de alarmas críticas no reconocidas.

```mermaid
sequenceDiagram
    autonumber
    actor Crew as Astronauta / Simulador
    participant UI as Crew PWA (Svelte 5 Main Thread)
    participant Engine as Clinical Engine Worker (ADR-005)
    participant Audio as WebAudio & Visual Layer
    participant DataW as Data & Sync Worker
    participant Hub as Sync Hub (astha.local - ADR-008)
    participant CMO as Consola CMO / Cabina (ADR-014)

    Crew->>UI: Ingresa Registro Diario o Inyecta Crisis (RF-SIM-01..04)
    UI->>Engine: postMessage(DailyMeasurement, HabitatTelemetry, Symptoms)
    
    Note over Engine: Presupuesto RNF-PER-01: Ciclo completo < 50 ms
    Engine->>Engine: 1. Validar rangos y marcar dudosos sin descartar (RF-ING-05)
    Engine->>Engine: 2. Calcular Modified Z-Score MAD (ADR-011) y Regresión 7d (D-01..D-03)
    Engine->>Engine: 3. Evaluar Reglas Correlación R-ENV..R-CARD (RF-EVA-04)
    Engine->>Engine: 4. Resolver Contramedida <= 4 pasos (ADR-017)

    Engine-->>UI: postMessage(TriageResult, ClinicalAlert, Protocol)
    UI->>DataW: MessageChannel: Persistir sobre cifrado AES-GCM + SHA-256 (ADR-006)

    alt Alerta Severidad == CRITICAL (ADR-013 Escalada)
        UI->>Audio: t=0s: Emitir tono 800-1200 Hz (10 seg) + Pulso #ef4444 / Texto #fca5a5 (ADR-018)
        
        opt Si acknowledged == false tras 2 minutos
            UI->>Audio: t=120s: Repetir tono 800-1200 Hz (10 seg)
            UI->>DataW: Replicar alerta crítica vía delta CRDT
            DataW->>Hub: WSS Push Delta Cifrado (ADR-008)
            Hub-->>CMO: Notificar alerta en Consola del CMO
        end

        opt Si acknowledged == false tras 5 minutos
            UI->>DataW: Publicar estado global (sin valores clínicos - ADR-014)
            DataW->>Hub: WSS Push Estado Global Hábitat
            Hub-->>CMO: Aviso en Pantallas Públicas de Cabina
        end
    else Alerta == CAUTION o NOMINAL
        UI->>UI: Actualizar tarjeta y semáforo sin tono sonoro (RNF-USA-04)
    end
```

---

## 2. Escenario B: Triaje Anatómico 3D Bajo Demanda (`ADR-004`), Checklist $\le 4$ Pasos (`ADR-017`) y Gamificación

Modela la interacción ergonómica táctil ($\ge 48\text{ px}$), la regla de **cero fotogramas en reposo** del renderizador 3D Three.js para cumplir `RNF-POW-01` (CPU $\le 3\%$), y la ejecución verificable de contramedidas.

```mermaid
sequenceDiagram
    autonumber
    actor Astro as Astronauta (Guantes >= 48px)
    participant UI as Anatomy Viewer (Svelte 5)
    participant WebGL as Three.js On-Demand Renderer (ADR-004)
    participant DataW as Data & Sync Worker
    participant IDB as IndexedDB (AES-GCM 256)

    Note over WebGL: En monitoreo pasivo: 0 FPS, sin requestAnimationFrame en bucle
    Astro->>UI: Toca región anatómica (Ojos/Cabeza, Tórax, Riñones, Piernas)
    UI->>WebGL: Solicitar Raycast + 1 Frame de Renderizado (onInteraction)
    
    alt WebGL Contexto Activo
        WebGL-->>UI: Dibuja exactamente 1 frame resaltando órgano + vuelve a reposo
    else Contexto Perdido o Modo Supervivencia (ADR-019)
        UI->>UI: Fallback instantáneo a Mapa Anatómico SVG interactivo
    end

    UI->>UI: Renderiza 3 Bloques (RF-GUI-01): Impacto, Severidad/Tiempo y Pasos (<= 4 ADR-017)
    
    loop Por cada paso verificado (Máximo 4 pasos - ADR-017)
        Astro->>UI: Marca checkbox táctil de paso completado (RF-GUI-02)
        UI->>DataW: postMessage(LogActionStep, IncrementXP)
        DataW->>DataW: Actualizar PN-Counter XP (ADR-009) & Encadenar Bitácora SHA-256 (RNF-SEC-04)
        DataW->>IDB: Guardar EncryptedEnvelope (iv, ct, sha256, firma Ed25519)
    end
    
    DataW-->>UI: Confirmación de protocolo completado y racha diaria (RF-GAM-02)
```

---

## 3. Escenario C: Sincronización LAN con Sync Hub (`ADR-008`) y Exportación JSON Firmada (`ADR-010`)

Modela la tolerancia a particiones sin Internet (`RNF-NET-01`), la convergencia libre de conflictos mediante CRDT (`ADR-009`), y la generación del archivo firmado fuera de red para su entrega al sistema de comunicaciones DTN de la nave (`ADR-010`).

```mermaid
sequenceDiagram
    autonumber
    actor CMO as Oficial Médico (CMO)
    participant ClientA as Dispositivo A (Data & Sync Worker)
    participant Hub as Sync Hub en Rust (astha.local - ADR-008)
    participant ClientB as Consola CMO (Data & Sync Worker)
    participant Transponder as Router DTN de la Nave (Externo - ADR-010)

    Note over ClientA,Hub: Red LAN aislada de la nave (mDNS < 3s - RNF-NET-03, WSS TLS 1.3)
    
    alt Sync Hub Disponible en LAN
        ClientA->>Hub: Conecta WSS + Envía VersionVector local (ADR-009)
        Hub-->>ClientA: Envía deltas cifrados faltantes (G-Set / LWW-Map / PN-Counter)
        ClientA->>Hub: Envía nuevos EncryptedEnvelope cifrados (Zero-Knowledge en Hub)
        Hub->>Hub: Verifica firma Ed25519 y anexa al Op-Log en disco
        Hub-->>ClientB: Retransmite deltas cifrados por WSS
        ClientB->>ClientB: Merge idempotente por HLC y descifra con clave del CMO (ADR-012)
    else Sync Hub Caído o Módulo Aislado
        ClientA->>ClientA: Sigue 100% autónomo; acumula sobres locales para convergencia futura
    end

    Note over CMO,Transponder: Ventana de Enlace DSN a Houston (ADR-010)
    CMO->>ClientB: Solicita Exportación Asíncrona para Flight Surgeon (RF-REG-02, RNF-NET-04)
    ClientB->>ClientB: Consolida tendencias y eventos + Anonimiza si es uso no médico (ADR-012)
    ClientB->>ClientB: Firma paquete JSON con clave privada Ed25519 del dispositivo
    ClientB-->>CMO: Descarga archivo astha_export_signed.json
    CMO->>Transponder: Entrega física/local del JSON al subsistema DTN externo de la nave
```
