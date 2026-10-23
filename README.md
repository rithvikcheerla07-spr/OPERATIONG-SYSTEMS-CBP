# Operating System Execution Replay and State Analysis System

An educational CPU-scheduling analysis and visualization platform developed for the **Operating Systems with Linux Laboratory** curriculum.

---

## 1. Purpose & Unique Selling Proposition (USP)

Most CPU scheduling simulators generate only a static post-mortem Gantt chart with summary metrics. While helpful, a static chart fails to convey *how* the operating system made scheduling decisions, how the ready queue evolved over time, or what process states looked like at critical transition boundaries (arrivals, quantum expirations, and preemption).

### The USP: State-Aware Execution Replay Powered by a Real Linux C Engine
This system records every discrete scheduling event along with a **complete snapshot** of the simulated system state:
- **Direct Snapshot Restoration:** Clicking **Previous**, **Next**, **Reset**, or clicking any event in the history timeline does not merely translate a visual cursor across a static image; it **restores the exact system snapshot** captured at that exact timestamp.
- **Full State Inspection:** At any step, students can inspect:
  - Exact **CPU core assignment** (which PID is running and its exact remaining burst, or whether the core is IDLE).
  - Exact ordered **Ready Queue** (FIFO order of waiting processes).
  - Exact **Process State** for every process (including not-yet-arrived processes).
  - Exact **Remaining Burst Time** for each process.
- **Genuine Linux C Architecture:** Scheduling logic is implemented in portable POSIX C99 and compiled natively with GCC. The Node.js Express backend spawns the compiled C binary as a subprocess and streams input via `stdin`, parsing the structured JSON output returned via `stdout`.

### Scope Boundary
This tool simulates discrete CPU scheduling algorithms and provides deterministic event replay of the simulation. It does not pause, inspect, attach to, or reverse real host Linux processes.

---

## 2. Scheduling Rules & Specification

### Implemented Algorithms
1. **First-Come, First-Served (FCFS):** Non-preemptive scheduling where processes are allocated the CPU in strictly chronological order of arrival.
2. **Shortest Job First (SJF - Non-Preemptive):** When the CPU becomes idle, the process in the ready queue with the smallest total burst time is selected. Once dispatched, it runs to completion.
3. **Round Robin (RR):** Preemptive scheduling using a fixed time quantum ($q$). When a process has executed for $q$ units of time, it is preempted if other work is queued. If a process finishes before its quantum expires, it yields the CPU immediately at that exact timestamp.

### Deterministic Tie-Breaking & Simultaneous Events
- **Equal Arrival / Burst Times:** Tie-breaking favors the lower alphanumeric PID (e.g. `P1` before `P2`), or the original input sequence.
- **Simultaneous Arrival & Quantum Expiration (Crucial Rule):** If a process arrives at time $t$ exactly when a currently executing process's quantum expires at time $t$, **the newly arriving process is enqueued into the ready queue BEFORE the preempted process**.
- **CPU Idle State:** If the CPU becomes free and the ready queue is empty while processes have future arrival times, the CPU transitions to an `IDLE` state. The Gantt chart renders distinct idle blocks and the system records a `CPU_IDLE` event.
- **Context Switches:** Counted strictly as transitions between consecutive, distinct, non-idle processes (idle segments do not count as context switches).

---

## 3. Simulated Process State Model

This laboratory environment models four discrete lifecycle states:
- `NEW` (*"Not arrived"*): The current simulation time is strictly less than the process arrival time ($t < \text{arrival}$).
- `READY` (*"In ready queue"*): The process has arrived ($t \ge \text{arrival}$) and is queued waiting for CPU assignment.
- `RUNNING` (*"Executing on core"*): The process is currently executing on the simulated CPU.
- `TERMINATED` (*"Completed"*): The process has exhausted its total burst time and finished execution.

> **Note on WAITING state:** Because this is a CPU-bound scheduling simulation without blocking disk or network I/O, there is no `WAITING` (I/O blocked) state. This is a deliberate pedagogical simplification.

---

## 4. Performance Metric Formulas

- **Turnaround Time (TAT):** $\text{Completion Time} - \text{Arrival Time}$
- **Waiting Time (WT):** $\text{Turnaround Time} - \text{Burst Time}$
- **Response Time (RT):** $\text{First CPU Dispatch Time} - \text{Arrival Time}$
- **CPU Utilization:** $\left(\frac{\text{Total Burst Time}}{\text{Total Elapsed Simulation Time}}\right) \times 100\%$
- **Context Switches:** Number of process switches between consecutive non-idle execution blocks.

### Reference Benchmark (P1: 0,4 | P2: 1,3 | P3: 2,2)

| Algorithm | Gantt Execution Order | Avg Waiting | Avg Turnaround | Avg Response | Context Switches |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **FCFS** | P1 (0–4), P2 (4–7), P3 (7–9) | **2.67** | **5.67** | **2.67** | **2** |
| **SJF** | P1 (0–4), P3 (4–6), P2 (6–9) | **2.33** | **5.33** | **2.33** | **2** |
| **RR ($q=2$)** | P1 (0–2), P2 (2–4), P3 (4–6), P1 (6–8), P2 (8–9) | **3.67** | **6.67** | **1.00** | **4** |

---

## 5. Repository Layout

```text
/engine          C scheduling engine (cpu_scheduler.c), Makefile, test suite
/server          Express API, input validation, child-process runner, test suite
/client          React + TypeScript + Vite user interface & components
/scripts         ensure-deps.js (cross-platform dependency check for VS Code)
/.vscode         launch.json (one-click F5 run), tasks.json, settings.json, extensions.json
/.devcontainer   devcontainer.json (Linux environment with GCC, Make, Node 20)
package.json     Root manifest with npm scripts & dependencies
Dockerfile       Multi-stage production build (GCC builder + minimal Node runtime)
docker-compose.yml Single-command orchestration
.gitignore       Ignores node_modules, dist, .env, and local compiled engine binary
.gitattributes   Enforces LF line endings for C files, Makefiles, and shell scripts
.env.example     Sample environment configuration template
.nvmrc           Pins Node.js version 20
README.md        Lab manual, setup guide, and architectural specification
```

---

## 6. Setup & Execution Workflows

### Option 1: One-Click Run in VS Code (F5)
*Zero terminal commands required.*
1. Clone the repository and open the workspace folder in VS Code.
2. Ensure you have **Node 20** and a **C compiler** installed:
   - Linux: `sudo apt-get install gcc make`
   - macOS: `xcode-select --install`
   - Windows: Use WSL2 or Docker Dev Container.
3. Press **F5** (or open the **Run & Debug** panel and click **Run Full App**).
4. VS Code will automatically:
   - Run `scripts/ensure-deps.js` to install dependencies if `node_modules` is missing.
   - Run `make -C engine` to compile the C scheduler binary with GCC.
   - Launch the Express backend and the Vite client dev server in parallel.
   - Automatically launch the browser to `http://localhost:5173` (or `http://localhost:3000`).

---

### Option 2: Docker / Docker Compose (Recommended for isolated runs)
Run the entire production stack inside an isolated Linux container:
```bash
docker compose up --build
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

### Option 3: VS Code Dev Container
If you open this repository in VS Code with the **Remote - Containers** extension:
1. Click **Reopen in Container** when prompted.
2. The container provisions an official Debian Bookworm image with GCC, Make, and Node 20 pre-configured.
3. Press **F5** or run `npm run dev`.

---

### Option 4: Standard Terminal Workflow
```bash
# 1. Install dependencies
npm install

# 2. Build the C engine
npm run build:engine

# 3. Start development servers (Express backend on 3001 + Vite client on 3000)
npm run dev
```

---

### Option 5: Running the C Engine Manually (Lab Demonstration)
To demonstrate raw POSIX C execution via command-line pipes during an OS lab session:
```bash
cd engine
make
./cpu_scheduler < tests/sample1.txt
```
The engine reads from `stdin` and writes formatted JSON directly to `stdout`.

---

### Option 6: Running the Full Test Suite
The test suite validates both the C engine test cases (including tie-breaks, idle blocks, and invalid input rejection) and the Express backend integration:
```bash
npm test
```
Or run individually:
```bash
npm run test:engine  # Runs make -C engine test
npm run test:server  # Runs tsx --test server/tests/server.test.ts
```

> **Note on Binary Artifacts:** The compiled binary `engine/cpu_scheduler` is built locally on each machine and is intentionally ignored by `.gitignore`. A binary compiled on macOS will not execute on Linux or Windows; building from source ensures cross-platform portability.

---

## 7. Linux Concepts Demonstrated

This project serves as a practical, working demonstration of core Linux systems programming concepts taught in operating systems courses:
1. **Compilation with GCC & Make:** Compiling C99 with strict flags (`-Wall -Wextra -O2 -std=c99 -pedantic`) and tracking target dependencies via `Makefile`.
2. **Standard Streams (`stdin`, `stdout`, `stderr`):** Structured IPC where the engine accepts line-oriented input on `stdin`, produces machine-readable JSON on `stdout`, and emits diagnostic errors on `stderr`.
3. **Exit Status Codes:** Conforming to UNIX standards where successful execution returns exit code `0` and errors return non-zero exit codes.
4. **Child Process Spawning:** The Node.js server acts as an OS process coordinator, using `child_process.spawn` to launch the binary with resource bounds (3-second timeout and 5MB stdout cap) to prevent runaway execution or fork bombs.
5. **Deterministic State Modeling:** Tracking Process Control Blocks (PCBs), process scheduling queues, context switches, and CPU registers.
