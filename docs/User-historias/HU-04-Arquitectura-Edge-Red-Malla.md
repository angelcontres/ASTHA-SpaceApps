# 🛡️ EPIC 4: Edge Resilience, P2P Mesh Network, and Asynchronous Earth Link
**Module:** Aerospace Architecture and Networking | **Standard:** CCSDS DTN / NASA Deep Space Constraints

---

## 📌 HU-13: 100% Offline Autonomous Medical Operation (Zero-Ping Edge Computing)

* **ID:** `HU-13`
* **Epic:** Epic 4 - Edge Resilience and Mesh Network
* **MoSCoW Priority:** **Must Have** (Deep Space *Sine Qua Non* Condition)
* **Story Points:** 8 SP
* **Traced SRS Requirements:** `RF-OFF-01..04`, `RNF-NET-01`, `RNF-POW-01`
* **Official Sources:** Deep Space Mars Mission Physics (44 min RTT) / Edge Architecture

### 📖 User Story:
> **As the** Entire Flight Crew en route to Mars,  
> **I want** 100% of the detection algorithms, Z-score calculations, anatomical maps, and checklist generation to run locally with no Internet or cloud connectivity,  
> **So that** my life safety and medical diagnostics never depend on an Earth radio link with a 44-minute round-trip delay.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Complete execution under network isolation
* **Given** the network adapter is completely disconnected or isolated flight mode is enabled on the client node,
* **When** a new biomedical telemetry signal is injected or received,
* **Then** the system must process the decision rules, update the graphical interface, and generate clinical recommendations in under $100\text{ ms}$,
* **And** it must not raise any network error, UI freeze, or connection exception.

#### Scenario 2: Availability of embedded local resources
* **Given** the software runs on a cabin tablet or bulkhead node with no access to external repositories,
* **When** the application cold-starts,
* **Then** all models, clinical rules, countermeasure catalogs, and databases must load from local flash storage without downloading scripts or fonts at runtime.

---

## 📌 HU-14: Asynchronous DTN Bundling for the Flight Surgeon in Houston

* **ID:** `HU-14`
* **Epic:** Epic 4 - Edge Resilience and Mesh Network
* **MoSCoW Priority:** **Must Have** (Earth–Space Communication)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RF-GUI-05`, `RNF-NET-03`, `RNF-SEC-01`
* **Official Sources:** CCSDS Delay-Tolerant Networking (DTN) Bundle Protocol

### 📖 User Story:
> **As a** Flight Surgeon at the Houston Mission Control Center (JSC),  
> **I want** to periodically receive consolidated, compressed bundles containing the medical audit trail, telemetry trends, and countermeasures applied by the crew,  
> **So that** I can analyze the astronauts' clinical progression and send secondary recommendations without interfering with the spacecraft's medical autonomy.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: DTN bundle generation upon critical medical alert
* **Given** a severe clinical event is recorded (e.g., acute SANS episode in C003),
* **When** the system executes the local medical protocol,
* **Then** it must automatically generate a compressed bundle (`.dtn.bundle`) containing:
  * Vital signs summary (30 minutes before and after the event),
  * Triggered rule and clinical rationale,
  * Crew-checked actions from the checklist,
  * Cryptographic SHA-256 digital signature.

#### Scenario 2: Disruption-tolerant queueing during radio blackouts
* **Given** the spacecraft's high-gain antenna may lose alignment with the Deep Space Network (DSN) during attitude maneuvers or orbital rotations,
* **When** the Earth link is unavailable,
* **Then** the bundle must remain safely stored in the persistent local DTN queue without being discarded,
* **And** transmit automatically during the next confirmed orbital visibility window.

---

## 📌 HU-15: Decentralized P2P Mesh Synchronization Across Cabin Nodes

* **ID:** `HU-15`
* **Epic:** Epic 4 - Edge Resilience and Mesh Network
* **MoSCoW Priority:** **Should Have** (Fault Tolerance)
* **Story Points:** 8 SP
* **Traced SRS Requirements:** `RNF-NET-02`, `RNF-NET-04`, `RNF-POW-04`
* **Official Sources:** P2P Mesh Architectures for Manned Spacecraft / CRDTs

### 📖 User Story:
> **As a** Communications Officer and Flight Crew,  
> **I want** every astronaut to be able to query and update their health status from any tablet or bulkhead node in the spacecraft via peer-to-peer (P2P) synchronization,  
> **So that** the catastrophic failure of a single tablet or module never destroys the crew's medical history or leaves the team without clinical support.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Automated serverless synchronization
* **Given** the spacecraft has multiple distributed monitoring nodes (crew quarters, medical bay, ARED gym, airlock),
* **When** two nodes come within local radio range (low-power Wi-Fi or Bluetooth Mesh),
* **Then** they must reconcile their medical records using Conflict-Free Replicated Data Types (CRDTs),
* **And** guarantee that the latest completed checklist is reflected across all devices in under 5 seconds.

#### Scenario 2: Recovery after physical node loss
* **Given** a medical tablet suffers depressurization or total hardware failure,
* **When** the crewmember powers on a spare tablet,
* **Then** the new tablet must discover its peers on the local mesh network and transparently download the complete crew medical history without manual intervention.

---

## 📌 HU-16: Medical Data Integrity Protection Against Space Radiation (SEU)

* **ID:** `HU-16`
* **Epic:** Epic 4 - Edge Resilience and Mesh Network
* **MoSCoW Priority:** **Must Have** (Space Cybersecurity and Reliability)
* **Story Points:** 5 SP
* **Traced SRS Requirements:** `RNF-SEC-04`, `RNF-SEC-02`
* **Official Sources:** NASA Single-Event Upset (SEU) Avionics Architecture

### 📖 User Story:
> **As a** Mission Software and Systems Engineer,  
> **I want** all telemetry readings, cumulative radiation doses, and clinical databases to be protected with cyclic redundancy checks and immutable checksums (CRC32 / SHA-256),  
> **So that** any memory bit alteration (Bit-Flips / SEU) caused by heavy ions from Galactic Cosmic Rays (GCR) is automatically detected and corrected.

### 🧪 Acceptance Criteria (Gherkin BDD):

#### Scenario 1: Bit-flip detection in biomedical records
* **Given** a high-energy ionizing particle alters a bit in RAM or flash memory where blood pressure history is stored,
* **When** the system reads the record to compute the morning Z-score,
* **Then** the integrity validator must detect the mismatch against the stored checksum,
* **And** recover the intact block from the mirror replica on the neighboring mesh node without propagating corrupted data to the clinician.

#### Scenario 2: Immutable cryptographic audit trail
* **Given** all changes to astronaut health records must be auditable,
* **When** a new measurement is logged or an emergency checklist is completed,
* **Then** the record must be cryptographically signed and linked into an immutable event log (Append-Only Hash Chain) protected against unauthorized writes.
