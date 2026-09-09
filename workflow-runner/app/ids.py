import os
import threading
import time


class SnowflakeIdGenerator:
    _epoch_ms = 1_735_689_600_000

    def __init__(self, worker_id: int | None = None):
        resolved = worker_id if worker_id is not None else os.getpid() % 1024
        self.worker_id = resolved & 0x3FF
        self._sequence = 0
        self._last_ms = -1
        self._lock = threading.Lock()

    def next_id(self) -> int:
        with self._lock:
            now = int(time.time() * 1000)
            if now < self._last_ms:
                now = self._last_ms
            if now == self._last_ms:
                self._sequence = (self._sequence + 1) & 0xFFF
                if self._sequence == 0:
                    while now <= self._last_ms:
                        now = int(time.time() * 1000)
            else:
                self._sequence = 0
            self._last_ms = now
            return ((now - self._epoch_ms) << 22) | (self.worker_id << 12) | self._sequence


id_generator = SnowflakeIdGenerator()
