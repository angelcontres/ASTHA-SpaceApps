# 🛡️ Package 4: Architecture, Resilience, and Communications
**Module:** P2P Mesh Network, DTN Protocol, and Power Efficiency | **Standard:** CCSDS DTN / Deep Space Constraints

---

## 📋 Use Case: CU-10
### Title: Decentralized P2P Mesh Synchronization Across Cabin Nodes

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-10` |
| **Primary Actor** | Local ASTHA Node (Edge Client) |
| **Secondary Actors** | Neighboring Cabin Nodes / Software Engineer |
| **Level** | Architecture Level / Distributed Synchronization |
| **SRS Requirements** | `RNF-NET-02`, `RNF-NET-04`, `RNF-SEC-04` |
| **Traced Stories** | `HU-15`, `HU-16` |

### 1. Brief Description:
Ensures that any change in health status, completed checklist, or telemetry reading performed on one device (e.g., crew quarters tablet) propagates and reconciles automatically across all other spacecraft terminals over an ad-hoc mesh network without relying on a central server.

### 2. Preconditions:
1. At least two ASTHA terminals are powered on with their local radio interfaces (Wi-Fi 802.11s or Bluetooth Mesh) enabled.
2. Each node holds a local asymmetric cryptographic key pair to authenticate transactions.

### 3. Trigger:
Completion of a medical checklist, clinical state change, or connection of a new node to the local network.

### 4. Main Flow of Events:
1. An astronaut completes a task on their touchscreen tablet (e.g., oral medication administration in crew quarters).
2. The emitting node creates a structured record with a unique UUIDv4 identifier, MET timestamp, and private-key digital signature.
3. The record is stored in the local distributed database based on **CRDT (Conflict-free Replicated Data Type)** structures.
4. The emitting node broadcasts a compressed state vector to its direct mesh peers using a Gossip protocol over UDP multicast.
5. Neighboring nodes receive the packet, verify the cryptographic signature, and compare their Lamport logical clock.
6. Upon detecting a newer event, peer nodes merge the mutation into their local databases without locks or inconsistencies.
7. In under 3 seconds, all bulkhead displays and tablets aboard the spacecraft reflect the completed checklist.

### 5. Alternative Flows:
* **FA-01: Reconciliation after network partition (shielded hatches closed):**
  1. If a module becomes temporarily isolated by closing a pneumatic shielded hatch, the node in that compartment continues operating and logging data locally.
  2. Once the hatch reopens and the radio link is restored, the nodes exchange their histories and resolve any conflict using a deterministic causal clock rule (*Last-Write-Wins with vector timestamps*).

### 6. Exception Flows:
* **FE-01: Intrusion or radiation-induced packet corruption:**
  1. If a node receives a packet whose digital signature or SHA-256 checksum fails verification, the packet is immediately rejected, the IP/MAC is placed on a temporary quarantine list, and the Communications Engineer is notified.

### 7. Postconditions:
* **Success:** $100\%$ data consistency across the entire spacecraft with no single point of failure (*No Single Point of Failure*).

---

## 📋 Use Case: CU-11
### Title: Asynchronous DTN Bundling and Queuing for Houston

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-11` |
| **Primary Actor** | ASTHA Communications Engine |
| **Secondary Actors** | Ground Flight Surgeon (Houston Flight Surgeon) |
| **Level** | Interplanetary Communication Level / Transport Protocol |
| **SRS Requirements** | `RF-GUI-05`, `RNF-NET-03`, `RNF-SEC-01` |
| **Traced Stories** | `HU-14` |

### 1. Brief Description:
Consolidates, compresses, and encrypts historical telemetry, clinical incidents, and countermeasure actions into autonomous packets compliant with Delay- and Disruption-Tolerant Networking (**DTN / CCSDS Bundle Protocol**), managing transmission to the Deep Space Network (DSN) without blocking for real-time acknowledgment.

### 2. Preconditions:
1. The system has accumulated telemetry over the daily flight cycle or a Medium/High priority medical alert has occurred.
2. The spacecraft has the interplanetary DTN router configured and connected to the X/Ka-band transponder.

### 3. Trigger:
End of daily cycle (23:59 MET), firing of a critical clinical alert, or opening of a radio link window with Earth.

### 4. Main Flow of Events:
1. The communications engine extracts the consolidated log for the past 24 hours (or the acute episode).
2. The system applies high-efficiency Brotli/Gzip compression, reducing file size by more than $75\%$.
3. The information is encapsulated into a standard **Bundle Protocol (RFC 5050 / CCSDS 734.2-B-1)** packet.
4. The bundle is cryptographically signed with the spacecraft's mission digital certificate.
5. The bundle is transferred to the persistent outbound queue of the onboard router.
6. When the high-gain antenna establishes contact with a DSN ground station (Goldstone, Madrid, or Canberra), the bundle is transmitted at the available link rate.
7. The system does not block any onboard function and continues autonomous medical operations, assuming a 22-minute one-way propagation delay to Earth.

### 5. Alternative Flows:
* **FA-01: Receipt of delayed medical recommendation message from Houston:**
  1. After 44 minutes (22 min outbound + 22 min return), the transponder receives a response bundle signed by the Ground Flight Surgeon.
  2. ASTHA validates message authenticity and displays a non-intrusive notification: "Asynchronous Flight Surgeon Message received; review secondary suggestions".
  3. The Crew Medical Officer reviews Houston's suggestions as consultative support while maintaining spacecraft operational autonomy.

### 6. Exception Flows:
* **FE-01: Prolonged DSN signal blackout (Solar conjunction):**
  1. During Mars solar conjunction, the Sun blocks all radio communication for up to 2 weeks.
  2. DTN bundles remain safeguarded in local non-volatile storage without expiring (*Time-to-Live* extended to 30 days).

### 7. Postconditions:
* **Success:** Medical data are preserved and transmitted losslessly, adapting to the physics of interplanetary signal propagation.

---

## 📋 Use Case: CU-12
### Title: Switching to Electrical Contingency Profile (< 350 mW)

| Attribute | Detail |
| :--- | :--- |
| **Identifier** | `CU-12` |
| **Primary Actor** | Spacecraft Electrical Power System Bus (EPS) |
| **Secondary Actors** | Mission Commander |
| **Level** | Avionics Survival Level / Thermal and Power Management |
| **SRS Requirements** | `RNF-POW-01..04`, `RNF-POW-03` |
| **Traced Stories** | `HU-20` |

### 1. Brief Description:
When the spacecraft experiences a power generation failure (e.g., solar array damage or power diversion to emergency propulsion maneuvers) and enters backup battery mode, ASTHA drastically reduces its electrical draw to under 5 Watts to guarantee uninterrupted vital monitoring for days.

### 2. Preconditions:
1. The EPS power subsystem emits the contingency signal "Primary Battery Bus Low / Level 2".
2. ASTHA receives the signal through the embedded operating system's power management interface.

### 3. Trigger:
Receipt of power-bus telemetry event: $\text{PowerState} == \text{BATTERY\_CRITICAL}$.

### 4. Main Flow of Events:
1. The ASTHA core intercepts the electrical emergency event.
2. The system immediately disables all complex graphical animations, CSS shadows, and smooth transitions.
3. The display visual refresh rate drops from 60 Hz to 0.2 Hz (1 update every 5 seconds).
4. OLED touchscreen brightness drops to $20\%$ (leveraging black pixels that turn off organic diodes, cutting panel draw by more than $65\%$).
5. Periodic Gossip synchronization over the mesh network is suspended, transmitting only on red-severity clinical events.
6. The processor execution thread is set to a reduced frequency (CPU Governor in `powersave` mode), keeping sustained SoC draw below $2.5\text{ W}$.
7. The system verifies that cardiac arrest, ventricular tachycardia, and anoxia detection algorithms remain $100\%$ active in memory.
8. A discreet badge appears in the upper corner: "Power Survival Mode Active (< 350 mW)".

### 5. Alternative Flows:
* **FA-01: Solar power bus restoration:**
  1. Once current flow from the photovoltaic arrays normalizes, the system gradually restores the refresh rate to 60 fps and normal tactical brightness.

### 6. Exception Flows:
* **FE-01: Critical temperature due to lack of air convection:**
  1. If cooling fans are shut down for power savings and processor temperature exceeds $75^\circ\text{C}$, the software disables non-vital background threads (e.g., predictive linear regression computation) to prevent thermal throttling.

### 7. Postconditions:
* **Success:** The life-monitoring system continues safeguarding the astronauts without accelerating depletion of critical spacecraft batteries.
