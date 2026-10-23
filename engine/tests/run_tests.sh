#!/usr/bin/env bash
set -e

# Move to the engine directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ENGINE_DIR}"

EXECUTABLE="./cpu_scheduler"

if [ ! -f "${EXECUTABLE}" ]; then
  echo "Compiling ${EXECUTABLE}..."
  make all
fi

echo "=== Running Engine Test Suite ==="

# Test 1: FCFS sample
echo "-> Testing FCFS sample1..."
OUT1=$(${EXECUTABLE} < tests/sample1.txt)
echo "${OUT1}" | grep -q '"algorithm": "FCFS"' || { echo "Failed algorithm check"; exit 1; }
echo "${OUT1}" | grep -q '"waiting": 2.67' || { echo "Failed FCFS waiting time (expected 2.67)"; exit 1; }
echo "${OUT1}" | grep -q '"turnaround": 5.67' || { echo "Failed FCFS turnaround time (expected 5.67)"; exit 1; }
echo "${OUT1}" | grep -q '"response": 2.67' || { echo "Failed FCFS response time (expected 2.67)"; exit 1; }
echo "${OUT1}" | grep -q '"contextSwitches": 2' || { echo "Failed FCFS context switches (expected 2)"; exit 1; }
echo "   FCFS passed!"

# Test 2: SJF sample
echo "-> Testing SJF sample2..."
OUT2=$(${EXECUTABLE} < tests/sample2_sjf.txt)
echo "${OUT2}" | grep -q '"algorithm": "SJF"' || { echo "Failed algorithm check"; exit 1; }
echo "${OUT2}" | grep -q '"waiting": 2.33' || { echo "Failed SJF waiting time (expected 2.33)"; exit 1; }
echo "${OUT2}" | grep -q '"turnaround": 5.33' || { echo "Failed SJF turnaround time (expected 5.33)"; exit 1; }
echo "${OUT2}" | grep -q '"response": 2.33' || { echo "Failed SJF response time (expected 2.33)"; exit 1; }
echo "${OUT2}" | grep -q '"contextSwitches": 2' || { echo "Failed SJF context switches (expected 2)"; exit 1; }
echo "   SJF passed!"

# Test 3: RR q=2 sample
echo "-> Testing Round Robin q=2 sample3..."
OUT3=$(${EXECUTABLE} < tests/sample3_rr.txt)
echo "${OUT3}" | grep -q '"algorithm": "RR"' || { echo "Failed algorithm check"; exit 1; }
echo "${OUT3}" | grep -q '"quantum": 2' || { echo "Failed quantum check"; exit 1; }
echo "${OUT3}" | grep -q '"waiting": 3.67' || { echo "Failed RR waiting time (expected 3.67)"; exit 1; }
echo "${OUT3}" | grep -q '"turnaround": 6.67' || { echo "Failed RR turnaround time (expected 6.67)"; exit 1; }
echo "${OUT3}" | grep -q '"response": 1.00' || { echo "Failed RR response time (expected 1.00)"; exit 1; }
echo "${OUT3}" | grep -q '"contextSwitches": 4' || { echo "Failed RR context switches (expected 4)"; exit 1; }
echo "   RR passed!"

# Test 4: Idle block (Single process arriving at 5 with burst 3)
echo "-> Testing Idle block sample_idle..."
OUT4=$(${EXECUTABLE} < tests/sample_idle.txt)
echo "${OUT4}" | grep -q '"isIdle": true' || { echo "Failed idle block detection"; exit 1; }
echo "${OUT4}" | grep -q '"cpuUtilization": 37.50' || { echo "Failed cpu utilization (expected 37.50)"; exit 1; }
echo "${OUT4}" | grep -q '"totalTime": 8' || { echo "Failed total time (expected 8)"; exit 1; }
echo "   Idle block passed!"

# Test 5: Rejection of invalid inputs
echo "-> Testing rejection of invalid inputs..."
# Burst 0
printf "FCFS 1\n1\nP1 0 0\n" | ${EXECUTABLE} >/dev/null 2>&1 && { echo "Should reject burst 0"; exit 1; }
# Negative arrival
printf "FCFS 1\n1\nP1 -2 3\n" | ${EXECUTABLE} >/dev/null 2>&1 && { echo "Should reject negative arrival"; exit 1; }
# Duplicate PID
printf "FCFS 1\n2\nP1 0 3\nP1 1 2\n" | ${EXECUTABLE} >/dev/null 2>&1 && { echo "Should reject duplicate PID"; exit 1; }
# Invalid algorithm
printf "MAGIC 1\n1\nP1 0 3\n" | ${EXECUTABLE} >/dev/null 2>&1 && { echo "Should reject invalid algorithm"; exit 1; }
# Missing / 0 quantum for RR
printf "RR 0\n1\nP1 0 3\n" | ${EXECUTABLE} >/dev/null 2>&1 && { echo "Should reject RR quantum 0"; exit 1; }
echo "   All invalid input rejections passed!"

echo "=== All Engine Tests Passed Successfully! ==="
