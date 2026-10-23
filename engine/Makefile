CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2 -std=c99 -pedantic
TARGET = cpu_scheduler
SRC = cpu_scheduler.c

.PHONY: all clean test

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) -o $(TARGET) $(SRC)

test: $(TARGET)
	@chmod +x tests/run_tests.sh
	@./tests/run_tests.sh

clean:
	rm -f $(TARGET)
