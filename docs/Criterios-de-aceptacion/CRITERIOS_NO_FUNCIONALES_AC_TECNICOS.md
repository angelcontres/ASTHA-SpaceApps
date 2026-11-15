# 🛡️ Technical and Non-Functional Acceptance Criteria (AC-TECH)
### ASTHA — NASA Space Apps Challenge 2026
**Mandatory Standard:** NASA Software Safety Standard (NASA-STD-8719.13C) | CCSDS DTN | NPR 7150.2

---

## 📌 AC-TECH-01: Edge Interface Performance, Refresh Rate, and Latency

| Identifier | `AC-TECH-01` |
| :--- | :--- |
| **SRS Requirements** | `RNF-POW-03`, `RNF-USA-02`, `RNF-USA-03` |
| **User Stories** | `HU-01`, `HU-05`, `HU-08` |
| **Use Cases** | `CU-01`, `CU-04` |
| **Verification Method** | **Automated Test (T)** |

### Criterion Statement:
The user interface and local detection algorithms **must** respond in real time, guaranteeing immediate interaction without perceptible lag for operators in emergency situations.

### Specific Acceptance Criteria:
1. **Touch Input Response Latency:**
   * When tapping any organ on the anatomical map or switching crew members (`C001` - `C004`), the response time between the `pointerdown` event and screen repaint must be strictly less than **$100\text{ ms}$** ($t_{\text{render}} < 100\text{ ms}$).
2. **Rendering Smoothness in Nominal Mode:**
   * The tactical interface must sustain a refresh rate of **$60\text{ frames per second (fps)}$** on reference avionics hardware (ARM Cortex-A72 or low-power x86 processor).
3. **Cold Boot Time:**
   * Elapsed time from executable process launch to full dashboard operability with live on-screen biosignals must not exceed **$3.0\text{ seconds}$**.

---

## 📌 AC-TECH-02: Electrical Power Budget and Passive Thermal Management

| Identifier | `AC-TECH-02` |
| :--- | :--- |
| **SRS Requirements** | `RNF-POW-01`, `RNF-POW-02`, `RNF-POW-04` |
| **User Stories** | `HU-20` |
| **Use Cases** | `CU-12` |
| **Verification Method** | **Power Bench Test (T)** |

### Criterion Statement:
The software **must** operate within the strict electrical power envelope allocated to cabin medical avionics, preventing overheating in microgravity environments lacking natural air convection.

### Specific Acceptance Criteria:
1. **Maximum Idle Power Consumption:**
   * Power consumption of the client device running ASTHA in nominal surveillance mode must not exceed **$5.0\text{ Watts}$** measured on the DC power bus.
2. **Sustained CPU Load:**
   * Steady-state CPU usage (processing 4 continuous 1 Hz streams, rule evaluation, and curve rendering) must not exceed **$15.0\%$ of a single processing core**.
3. **Emergency Battery Contingency Mode:**
   * Upon receiving the critical battery signal, the system must automatically throttle repaint rate to **$0.2\text{ fps}$** (1 update every 5 seconds), dim display brightness to $20\%$, and keep $100\%$ of life-detection algorithms active.

---

## 📌 AC-TECH-03: 100% Offline Resilience and Autonomy (Zero-Ping Deep Space)

| Identifier | `AC-TECH-03` |
| :--- | :--- |
| **SRS Requirements** | `RF-OFF-01..04`, `RNF-NET-01` |
| **User Stories** | `HU-13` |
| **Use Cases** | `CU-01`, `CU-05`, `CU-07` |
| **Verification Method** | **Network Isolation Test (T)** |

### Criterion Statement:
The software **must** execute all diagnostic, visual, mathematical, and procedural functions locally without requiring Internet access, cloud servers, or real-time telemetry with Earth.

### Specific Acceptance Criteria:
1. **Network Short-Circuit Test:**
   * With all external network adapters physically disabled (complete WAN port block), the application must launch, process biosignals, fire alerts, and guide checklists with **zero network exceptions** (`0 Network Exceptions`).
2. **Static Asset Self-Sufficiency:**
   * The system must not attempt to fetch fonts, JS scripts, CSS stylesheets, or images from external CDN servers at runtime. All code and assets must reside in local flash storage.
3. **Mars Radio-Delay Tolerance:**
   * No system timer or execution thread may block the user interface while awaiting an acknowledgment (ACK) from Earth ground control.

---

## 📌 AC-TECH-04: P2P Mesh Network Synchronization and CRDT Reconciliation

| Identifier | `AC-TECH-04` |
| :--- | :--- |
| **SRS Requirements** | `RNF-NET-02`, `RNF-NET-04` |
| **User Stories** | `HU-15` |
| **Use Cases** | `CU-10` |
| **Verification Method** | **Distributed Network Test (T)** |

### Criterion Statement:
Spacecraft tablets and bulkhead displays **must** synchronize clinical data in a decentralized manner over an ad-hoc mesh network without a central server that would constitute a single point of failure (*No Single Point of Failure*).

### Specific Acceptance Criteria:
1. **Maximum Mesh Reconciliation Time:**
   * Every health-record update or checklist completion on a cabin node must propagate to all nodes within radio range in under **$3.0\text{ seconds}$** ($t_{\text{sync}} \le 3.0\text{ s}$).
2. **Causally Consistent Conflict Resolution:**
   * Conflict-Free Replicated Data Types (**CRDTs**) must be used. If two crew members simultaneously modify different fields of the same astronaut during a module disconnection, subsequent recombination must merge both changes automatically without human intervention or data loss.

---

## 📌 AC-TECH-05: DTN Protocol for Asynchronous Communications with Houston

| Identifier | `AC-TECH-05` |
| :--- | :--- |
| **SRS Requirements** | `RF-GUI-05`, `RNF-NET-03`, `RNF-SEC-01` |
| **User Stories** | `HU-14` |
| **Use Cases** | `CU-11` |
| **Verification Method** | **Transport Protocol Test (T)** |

### Criterion Statement:
The Earth-link subsystem **must** format medical reports and historical telemetry under the Delay-Tolerant Networking standard (*Delay-Tolerant Networking - DTN / CCSDS Bundle Protocol*), adapting to intermittent visibility windows and the 44-minute round-trip light time.

### Specific Acceptance Criteria:
1. **Bundle Protocol Compliance (RFC 5050 / CCSDS 734.2-B-1):**
   * Consolidated medical reports must be packaged into autonomous DTN bundles with their own metadata block, expiration time, and cryptographic signature.
2. **Compression Efficiency:**
   * Local compression (Brotli or Zstandard) must reduce medical telemetry payload size by more than **$70.0\%$** compared to the original raw JSON.
3. **Persistent Queue Retention:**
   * During loss of Deep Space Network (DSN) visibility or solar conjunction, bundles must remain stored on non-volatile onboard disk for at least **$30\text{ days}$** without timing out.

---

## 📌 AC-TECH-06: Cybersecurity, Medical Privacy, and Radiation Hardening (SEU)

| Identifier | `AC-TECH-06` |
| :--- | :--- |
| **SRS Requirements** | `RNF-SEC-01`, `RNF-SEC-02`, `RNF-SEC-04` |
| **User Stories** | `HU-16` |
| **Use Cases** | `CU-10`, `CU-11` |
| **Verification Method** | **Cryptographic Analysis (A) and Fault-Injection Test (T)** |

### Criterion Statement:
Astronaut health data **must** be protected against unauthorized access and, fundamentally, against physical bit corruption (*Single-Event Upsets - SEU*) caused by heavy ions in galactic cosmic rays (GCR).

### Specific Acceptance Criteria:
1. **Encryption at Rest and in Local Transit:**
   * The local SQLite medical database must be encrypted at rest using **AES-256** (SQLCipher or aerospace-grade equivalent). All local BLE/Wi-Fi transmissions must use an encrypted secure tunnel.
2. **Bit-Flip Detection and Correction (SEU):**
   * Every persisted biomedical record block must include a **CRC32 / SHA-256** checksum.
   * When reading a record from flash memory, if the checksum mismatches (ionizing-particle bit inversion detected), the system must discard the corrupted block and automatically restore it from the mirror replica on a neighboring mesh node.
3. **Immutable Medical Audit Chain:**
   * All medical interventions, drug administrations, and absorbed radiation doses must be recorded in an append-only event log (*Append-Only Hash Chain*), ensuring no record can be altered retroactively.
