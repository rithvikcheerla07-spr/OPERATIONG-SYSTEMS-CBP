/**
 * Operating System Execution Replay and State Analysis System
 * CPU Scheduling Simulation Engine in C99 / POSIX.
 *
 * Supported Algorithms:
 *   - FCFS (First-Come, First-Served)
 *   - SJF  (Shortest Job First - Non-preemptive)
 *   - RR   (Round Robin)
 *
 * Input:
 *   Line 1: <ALGO> <quantum>
 *   Line 2: <n>
 *   Next n lines: <pid> <arrival> <burst>
 *
 * Output:
 *   Single JSON object on stdout containing Gantt chart, metrics, and state snapshots.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <ctype.h>

#define MAX_PROCESSES 10
#define MAX_PID_LEN 16
#define MAX_EVENTS 10000
#define MAX_GANTT 1000

typedef enum {
    STATE_NEW,
    STATE_READY,
    STATE_RUNNING,
    STATE_TERMINATED
} ProcessState;

typedef enum {
    EV_ARRIVAL,
    EV_CPU_ASSIGNED,
    EV_QUANTUM_EXPIRED,
    EV_PROCESS_COMPLETED,
    EV_CPU_IDLE,
    EV_SIMULATION_COMPLETE
} EventType;

typedef struct {
    char pid[MAX_PID_LEN];
    int arrival;
    int burst;
    int remaining;
    int start_time;
    int completion_time;
    int waiting_time;
    int turnaround_time;
    int response_time;
    int input_index;
    ProcessState state;
} Process;

typedef struct {
    char pid[MAX_PID_LEN];
    bool is_idle;
    int start;
    int end;
} GanttSegment;

typedef struct {
    char running_pid[MAX_PID_LEN];
    bool has_running;
    char ready_queue[MAX_PROCESSES][MAX_PID_LEN];
    int ready_count;
    ProcessState states[MAX_PROCESSES];
    int remaining[MAX_PROCESSES];
} SystemSnapshot;

typedef struct {
    int index;
    int time;
    EventType type;
    char process[MAX_PID_LEN];
    char description[256];
    SystemSnapshot snapshot;
} SimEvent;

/* Global Simulation State */
static Process procs[MAX_PROCESSES];
static int num_procs = 0;
static char algorithm[16];
static int time_quantum = 1;

static GanttSegment gantt[MAX_GANTT];
static int num_gantt = 0;

static SimEvent events[MAX_EVENTS];
static int num_events = 0;

static int ready_queue[MAX_PROCESSES];
static int queue_head = 0;
static int queue_tail = 0;
static int queue_size = 0;

static int current_running_idx = -1;

/* Queue helper functions */
static void queue_push(int p_idx) {
    if (queue_size >= MAX_PROCESSES) return;
    ready_queue[queue_tail] = p_idx;
    queue_tail = (queue_tail + 1) % MAX_PROCESSES;
    queue_size++;
}

static int queue_pop(void) {
    if (queue_size == 0) return -1;
    int val = ready_queue[queue_head];
    queue_head = (queue_head + 1) % MAX_PROCESSES;
    queue_size--;
    return val;
}

static void queue_remove_at(int pos) {
    if (pos < 0 || pos >= queue_size) return;
    for (int i = pos; i < queue_size - 1; i++) {
        int curr_idx = (queue_head + i) % MAX_PROCESSES;
        int next_idx = (queue_head + i + 1) % MAX_PROCESSES;
        ready_queue[curr_idx] = ready_queue[next_idx];
    }
    queue_tail = (queue_tail - 1 + MAX_PROCESSES) % MAX_PROCESSES;
    queue_size--;
}

static int queue_peek(int pos) {
    if (pos < 0 || pos >= queue_size) return -1;
    return ready_queue[(queue_head + pos) % MAX_PROCESSES];
}

static const char* state_to_string(ProcessState s) {
    switch (s) {
        case STATE_NEW: return "NEW";
        case STATE_READY: return "READY";
        case STATE_RUNNING: return "RUNNING";
        case STATE_TERMINATED: return "TERMINATED";
        default: return "UNKNOWN";
    }
}

static const char* event_type_to_string(EventType t) {
    switch (t) {
        case EV_ARRIVAL: return "ARRIVAL";
        case EV_CPU_ASSIGNED: return "CPU_ASSIGNED";
        case EV_QUANTUM_EXPIRED: return "QUANTUM_EXPIRED";
        case EV_PROCESS_COMPLETED: return "PROCESS_COMPLETED";
        case EV_CPU_IDLE: return "CPU_IDLE";
        case EV_SIMULATION_COMPLETE: return "SIMULATION_COMPLETE";
        default: return "UNKNOWN";
    }
}

/* Capture complete snapshot of all processes at this instant */
static void capture_snapshot(SystemSnapshot *snap) {
    if (current_running_idx >= 0) {
        snap->has_running = true;
        strncpy(snap->running_pid, procs[current_running_idx].pid, MAX_PID_LEN - 1);
        snap->running_pid[MAX_PID_LEN - 1] = '\0';
    } else {
        snap->has_running = false;
        snap->running_pid[0] = '\0';
    }

    snap->ready_count = queue_size;
    for (int i = 0; i < queue_size; i++) {
        int p_idx = queue_peek(i);
        strncpy(snap->ready_queue[i], procs[p_idx].pid, MAX_PID_LEN - 1);
        snap->ready_queue[i][MAX_PID_LEN - 1] = '\0';
    }

    for (int i = 0; i < num_procs; i++) {
        snap->states[i] = procs[i].state;
        snap->remaining[i] = procs[i].remaining;
    }
}

static void record_event(int time, EventType type, const char *proc_pid, const char *desc) {
    if (num_events >= MAX_EVENTS) return;
    SimEvent *ev = &events[num_events];
    ev->index = num_events;
    ev->time = time;
    ev->type = type;
    if (proc_pid != NULL) {
        strncpy(ev->process, proc_pid, MAX_PID_LEN - 1);
        ev->process[MAX_PID_LEN - 1] = '\0';
    } else {
        ev->process[0] = '\0';
    }
    strncpy(ev->description, desc, sizeof(ev->description) - 1);
    ev->description[sizeof(ev->description) - 1] = '\0';

    capture_snapshot(&ev->snapshot);
    num_events++;
}

static void add_gantt_segment(const char *pid, bool is_idle, int start, int end) {
    if (start >= end) return;
    if (num_gantt > 0 && gantt[num_gantt - 1].is_idle == is_idle &&
        strcmp(gantt[num_gantt - 1].pid, pid) == 0 && gantt[num_gantt - 1].end == start) {
        gantt[num_gantt - 1].end = end;
        return;
    }
    if (num_gantt >= MAX_GANTT) return;
    strncpy(gantt[num_gantt].pid, pid, MAX_PID_LEN - 1);
    gantt[num_gantt].pid[MAX_PID_LEN - 1] = '\0';
    gantt[num_gantt].is_idle = is_idle;
    gantt[num_gantt].start = start;
    gantt[num_gantt].end = end;
    num_gantt++;
}

/* Tie-breaker: returns <0 if a has higher priority than b, >0 if b has higher priority */
static int tie_break_compare(int a, int b) {
    int c = strcmp(procs[a].pid, procs[b].pid);
    if (c != 0) return c;
    return procs[a].input_index - procs[b].input_index;
}

/* Check for any new arrivals at exact time 'current_time' */
static void handle_arrivals(int current_time) {
    /* Collect all processes arriving at current_time */
    int arriving[MAX_PROCESSES];
    int arr_count = 0;
    for (int i = 0; i < num_procs; i++) {
        if (procs[i].arrival == current_time && procs[i].state == STATE_NEW) {
            arriving[arr_count++] = i;
        }
    }

    /* Sort arriving processes by tie-breaker */
    for (int i = 0; i < arr_count - 1; i++) {
        for (int j = i + 1; j < arr_count; j++) {
            if (tie_break_compare(arriving[i], arriving[j]) > 0) {
                int tmp = arriving[i];
                arriving[i] = arriving[j];
                arriving[j] = tmp;
            }
        }
    }

    for (int i = 0; i < arr_count; i++) {
        int idx = arriving[i];
        procs[idx].state = STATE_READY;
        queue_push(idx);

        char desc[256];
        snprintf(desc, sizeof(desc), "%s arrives (burst: %d)", procs[idx].pid, procs[idx].burst);
        record_event(current_time, EV_ARRIVAL, procs[idx].pid, desc);
    }
}

/* Select next process for SJF */
static int sjf_pick_next(void) {
    if (queue_size == 0) return -1;
    int best_pos = 0;
    int best_idx = queue_peek(0);

    for (int i = 1; i < queue_size; i++) {
        int candidate = queue_peek(i);
        if (procs[candidate].burst < procs[best_idx].burst) {
            best_idx = candidate;
            best_pos = i;
        } else if (procs[candidate].burst == procs[best_idx].burst) {
            if (tie_break_compare(candidate, best_idx) < 0) {
                best_idx = candidate;
                best_pos = i;
            }
        }
    }

    queue_remove_at(best_pos);
    return best_idx;
}

/* Main Simulation Execution */
static void run_simulation(void) {
    int current_time = 0;
    int completed_count = 0;
    current_running_idx = -1;

    /* Handle arrivals at t = 0 */
    handle_arrivals(0);

    while (completed_count < num_procs) {
        if (current_running_idx == -1) {
            /* CPU is idle, check ready queue */
            if (queue_size == 0) {
                /* Find next arrival time */
                int next_arr = -1;
                for (int i = 0; i < num_procs; i++) {
                    if (procs[i].state == STATE_NEW) {
                        if (next_arr == -1 || procs[i].arrival < next_arr) {
                            next_arr = procs[i].arrival;
                        }
                    }
                }

                if (next_arr > current_time) {
                    record_event(current_time, EV_CPU_IDLE, NULL, "CPU is idle waiting for process arrival");
                    add_gantt_segment("IDLE", true, current_time, next_arr);
                    current_time = next_arr;
                    handle_arrivals(current_time);
                }
                continue;
            }

            /* Pick process from queue */
            int next_proc = -1;
            if (strcmp(algorithm, "SJF") == 0) {
                next_proc = sjf_pick_next();
            } else {
                next_proc = queue_pop();
            }

            current_running_idx = next_proc;
            procs[current_running_idx].state = STATE_RUNNING;
            if (procs[current_running_idx].start_time == -1) {
                procs[current_running_idx].start_time = current_time;
                procs[current_running_idx].response_time = current_time - procs[current_running_idx].arrival;
            }

            char desc[256];
            snprintf(desc, sizeof(desc), "CPU assigned to %s (remaining: %d)",
                     procs[current_running_idx].pid, procs[current_running_idx].remaining);
            record_event(current_time, EV_CPU_ASSIGNED, procs[current_running_idx].pid, desc);
        }

        /* Running process execution step */
        int run_idx = current_running_idx;
        int time_slice = 0;

        if (strcmp(algorithm, "RR") == 0) {
            time_slice = (procs[run_idx].remaining < time_quantum) ? procs[run_idx].remaining : time_quantum;
        } else {
            time_slice = procs[run_idx].remaining;
        }

        int start_slice = current_time;
        int end_slice = current_time + time_slice;

        /* Check for any arrivals occurring strictly during (start_slice, end_slice) */
        /* To preserve chronological order and proper event records, step time tick-by-tick or interval */
        int t = start_slice;
        while (t < end_slice) {
            t++;
            procs[run_idx].remaining--;

            /* Are there arrivals at time t that are BEFORE the end of slice? */
            if (t < end_slice) {
                handle_arrivals(t);
            }
        }

        current_time = end_slice;
        add_gantt_segment(procs[run_idx].pid, false, start_slice, end_slice);

        if (procs[run_idx].remaining == 0) {
            /* Process completed */
            procs[run_idx].state = STATE_TERMINATED;
            procs[run_idx].completion_time = current_time;
            procs[run_idx].turnaround_time = current_time - procs[run_idx].arrival;
            procs[run_idx].waiting_time = procs[run_idx].turnaround_time - procs[run_idx].burst;
            completed_count++;

            /* Any arrivals at current_time? */
            handle_arrivals(current_time);

            current_running_idx = -1;
            char desc[256];
            snprintf(desc, sizeof(desc), "%s completed execution (turnaround: %d, waiting: %d)",
                     procs[run_idx].pid, procs[run_idx].turnaround_time, procs[run_idx].waiting_time);
            record_event(current_time, EV_PROCESS_COMPLETED, procs[run_idx].pid, desc);
        } else {
            /* Quantum expired (RR only) */
            /* Crucial scheduling rule:
             * "a process arriving at the same instant a quantum expires is queued BEFORE the preempted process."
             */
            handle_arrivals(current_time);

            procs[run_idx].state = STATE_READY;
            queue_push(run_idx);
            current_running_idx = -1;

            char desc[256];
            snprintf(desc, sizeof(desc), "Quantum expired for %s (remaining: %d)",
                     procs[run_idx].pid, procs[run_idx].remaining);
            record_event(current_time, EV_QUANTUM_EXPIRED, procs[run_idx].pid, desc);
        }
    }

    /* Simulation complete */
    char desc[256];
    snprintf(desc, sizeof(desc), "Simulation complete at time %d", current_time);
    record_event(current_time, EV_SIMULATION_COMPLETE, NULL, desc);
}

/* Calculate context switches, averages, and print JSON */
static void output_json(void) {
    int total_time = (num_gantt > 0) ? gantt[num_gantt - 1].end : 0;
    int total_burst = 0;
    for (int i = 0; i < num_procs; i++) {
        total_burst += procs[i].burst;
    }

    double cpu_utilization = (total_time > 0) ? ((double)total_burst / (double)total_time) * 100.0 : 0.0;

    /* Context switches: changes between consecutive non-idle Gantt segments */
    int context_switches = 0;
    const char *last_non_idle = NULL;
    for (int i = 0; i < num_gantt; i++) {
        if (!gantt[i].is_idle) {
            if (last_non_idle != NULL && strcmp(last_non_idle, gantt[i].pid) != 0) {
                context_switches++;
            }
            last_non_idle = gantt[i].pid;
        }
    }

    double sum_waiting = 0;
    double sum_turnaround = 0;
    double sum_response = 0;

    for (int i = 0; i < num_procs; i++) {
        sum_waiting += procs[i].waiting_time;
        sum_turnaround += procs[i].turnaround_time;
        sum_response += procs[i].response_time;
    }

    double avg_waiting = (num_procs > 0) ? (sum_waiting / num_procs) : 0.0;
    double avg_turnaround = (num_procs > 0) ? (sum_turnaround / num_procs) : 0.0;
    double avg_response = (num_procs > 0) ? (sum_response / num_procs) : 0.0;

    printf("{\n");
    printf("  \"algorithm\": \"%s\",\n", algorithm);
    printf("  \"quantum\": %d,\n", time_quantum);

    /* Gantt */
    printf("  \"gantt\": [\n");
    for (int i = 0; i < num_gantt; i++) {
        printf("    {\"pid\": \"%s\", \"start\": %d, \"end\": %d, \"isIdle\": %s}%s\n",
               gantt[i].pid,
               gantt[i].start,
               gantt[i].end,
               gantt[i].is_idle ? "true" : "false",
               (i < num_gantt - 1) ? "," : "");
    }
    printf("  ],\n");

    /* Metrics */
    printf("  \"metrics\": {\n");
    printf("    \"processes\": [\n");
    for (int i = 0; i < num_procs; i++) {
        printf("      {\"pid\": \"%s\", \"arrival\": %d, \"burst\": %d, \"start\": %d, "
               "\"completion\": %d, \"waiting\": %d, \"turnaround\": %d, \"response\": %d}%s\n",
               procs[i].pid,
               procs[i].arrival,
               procs[i].burst,
               procs[i].start_time,
               procs[i].completion_time,
               procs[i].waiting_time,
               procs[i].turnaround_time,
               procs[i].response_time,
               (i < num_procs - 1) ? "," : "");
    }
    printf("    ],\n");
    printf("    \"averages\": {\n");
    printf("      \"waiting\": %.2f,\n", avg_waiting);
    printf("      \"turnaround\": %.2f,\n", avg_turnaround);
    printf("      \"response\": %.2f\n", avg_response);
    printf("    },\n");
    printf("    \"cpuUtilization\": %.2f,\n", cpu_utilization);
    printf("    \"contextSwitches\": %d,\n", context_switches);
    printf("    \"totalTime\": %d\n", total_time);
    printf("  },\n");

    /* Events */
    printf("  \"events\": [\n");
    for (int i = 0; i < num_events; i++) {
        SimEvent *ev = &events[i];
        printf("    {\n");
        printf("      \"index\": %d,\n", ev->index);
        printf("      \"time\": %d,\n", ev->time);
        printf("      \"type\": \"%s\",\n", event_type_to_string(ev->type));
        if (ev->process[0] != '\0') {
            printf("      \"process\": \"%s\",\n", ev->process);
        } else {
            printf("      \"process\": null,\n");
        }
        printf("      \"description\": \"%s\",\n", ev->description);
        printf("      \"snapshot\": {\n");
        if (ev->snapshot.has_running) {
            printf("        \"running\": \"%s\",\n", ev->snapshot.running_pid);
        } else {
            printf("        \"running\": null,\n");
        }
        printf("        \"readyQueue\": [");
        for (int q = 0; q < ev->snapshot.ready_count; q++) {
            printf("\"%s\"%s", ev->snapshot.ready_queue[q], (q < ev->snapshot.ready_count - 1) ? ", " : "");
        }
        printf("],\n");
        printf("        \"states\": {");
        for (int p = 0; p < num_procs; p++) {
            printf("\"%s\": \"%s\"%s", procs[p].pid, state_to_string(ev->snapshot.states[p]),
                   (p < num_procs - 1) ? ", " : "");
        }
        printf("},\n");
        printf("        \"remaining\": {");
        for (int p = 0; p < num_procs; p++) {
            printf("\"%s\": %d%s", procs[p].pid, ev->snapshot.remaining[p],
                   (p < num_procs - 1) ? ", " : "");
        }
        printf("}\n");
        printf("      }\n");
        printf("    }%s\n", (i < num_events - 1) ? "," : "");
    }
    printf("  ]\n");
    printf("}\n");
}

/* Strict Input Parsing and Validation */
static bool is_valid_pid(const char *pid) {
    size_t len = strlen(pid);
    if (len < 1 || len > 8) return false;
    for (size_t i = 0; i < len; i++) {
        char c = pid[i];
        if (!isalnum((unsigned char)c) && c != '_' && c != '-') return false;
    }
    return true;
}

int main(void) {
    char line[512];

    /* Line 1: <ALGO> <quantum> */
    if (!fgets(line, sizeof(line), stdin)) {
        fprintf(stderr, "Error: Missing algorithm line.\n");
        return 1;
    }

    char algo_buf[32];
    int q_val = 1;
    int parsed = sscanf(line, "%31s %d", algo_buf, &q_val);
    if (parsed < 1) {
        fprintf(stderr, "Error: Invalid algorithm specification.\n");
        return 1;
    }

    if (strcmp(algo_buf, "FCFS") == 0) {
        strncpy(algorithm, "FCFS", sizeof(algorithm));
        time_quantum = 1;
    } else if (strcmp(algo_buf, "SJF") == 0) {
        strncpy(algorithm, "SJF", sizeof(algorithm));
        time_quantum = 1;
    } else if (strcmp(algo_buf, "RR") == 0) {
        strncpy(algorithm, "RR", sizeof(algorithm));
        if (parsed < 2 || q_val < 1 || q_val > 100) {
            fprintf(stderr, "Error: Round Robin requires a valid time quantum between 1 and 100.\n");
            return 1;
        }
        time_quantum = q_val;
    } else {
        fprintf(stderr, "Error: Unsupported algorithm '%s'. Allowed: FCFS, SJF, RR.\n", algo_buf);
        return 1;
    }

    /* Line 2: <n> */
    if (!fgets(line, sizeof(line), stdin)) {
        fprintf(stderr, "Error: Missing process count.\n");
        return 1;
    }
    int n = 0;
    if (sscanf(line, "%d", &n) != 1 || n < 1 || n > MAX_PROCESSES) {
        fprintf(stderr, "Error: Process count must be an integer between 1 and %d.\n", MAX_PROCESSES);
        return 1;
    }
    num_procs = n;

    /* Next n lines: <pid> <arrival> <burst> */
    for (int i = 0; i < num_procs; i++) {
        if (!fgets(line, sizeof(line), stdin)) {
            fprintf(stderr, "Error: Unexpected end of input reading process %d.\n", i + 1);
            return 1;
        }
        char pid_buf[64];
        int arr = -1;
        int bst = -1;
        if (sscanf(line, "%63s %d %d", pid_buf, &arr, &bst) != 3) {
            fprintf(stderr, "Error: Process format error on row %d (expected '<pid> <arrival> <burst>').\n", i + 1);
            return 1;
        }

        if (!is_valid_pid(pid_buf)) {
            fprintf(stderr, "Error: Invalid PID '%s'. Must be 1-8 alphanumeric, dash, or underscore characters.\n", pid_buf);
            return 1;
        }

        for (int j = 0; j < i; j++) {
            if (strcmp(procs[j].pid, pid_buf) == 0) {
                fprintf(stderr, "Error: Duplicate PID '%s' detected.\n", pid_buf);
                return 1;
            }
        }

        if (arr < 0 || arr > 1000) {
            fprintf(stderr, "Error: Arrival time for '%s' must be between 0 and 1000.\n", pid_buf);
            return 1;
        }

        if (bst < 1 || bst > 1000) {
            fprintf(stderr, "Error: Burst time for '%s' must be between 1 and 1000.\n", pid_buf);
            return 1;
        }

        strncpy(procs[i].pid, pid_buf, MAX_PID_LEN - 1);
        procs[i].pid[MAX_PID_LEN - 1] = '\0';
        procs[i].arrival = arr;
        procs[i].burst = bst;
        procs[i].remaining = bst;
        procs[i].start_time = -1;
        procs[i].completion_time = 0;
        procs[i].waiting_time = 0;
        procs[i].turnaround_time = 0;
        procs[i].response_time = 0;
        procs[i].input_index = i;
        procs[i].state = STATE_NEW;
    }

    run_simulation();
    output_json();

    return 0;
}
