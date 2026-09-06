import subprocess
import threading
import queue


def start_ffmpeg():
    """
    Starts ffmpeg using plain, blocking subprocess (not asyncio's subprocess
    support) so this works identically on every OS, including Windows,
    where asyncio's own subprocess handling has event-loop restrictions.

    Two background threads (same pattern as your original CLI project's
    synthesis_worker/playback_worker) bridge the blocking pipes to
    thread-safe queues, which async code can then read from safely.

    Returns (process, input_queue, output_queue):
      - put bytes into input_queue to feed ffmpeg's stdin
      - put None into input_queue to signal "no more input"
      - get() from output_queue to read decoded PCM chunks
      - output_queue yields None once ffmpeg's output has ended
    """
    process = subprocess.Popen(
        [
            "ffmpeg",
            "-i", "pipe:0",
            "-f", "s16le",
            "-ar", "16000",
            "-ac", "1",
            "pipe:1",
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )

    input_queue = queue.Queue()
    output_queue = queue.Queue()

    def writer_thread():
        # Pulls chunks off input_queue and writes them into ffmpeg's stdin.
        while True:
            chunk = input_queue.get()  # blocks until something is queued
            if chunk is None:
                break  # sentinel: no more input coming
            try:
                process.stdin.write(chunk)
                process.stdin.flush()
            except (BrokenPipeError, OSError):
                break
        try:
            process.stdin.close()
        except OSError:
            pass

    def reader_thread():
        # Reads decoded PCM out of ffmpeg's stdout and queues it for us.
        CHUNK_BYTES = 3200
        while True:
            data = process.stdout.read(CHUNK_BYTES)
            if not data:
                output_queue.put(None)  # sentinel: ffmpeg's output ended
                break
            output_queue.put(data)

    threading.Thread(target=writer_thread, daemon=True).start()
    threading.Thread(target=reader_thread, daemon=True).start()

    return process, input_queue, output_queue