from faster_whisper import WhisperModel
import numpy as np
import threading
import time

MODEL_SIZE = "small.en"

model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")


def _to_whisper_array(audio: np.ndarray) -> np.ndarray:
    """faster-whisper expects float32 audio normalized to [-1, 1], not raw
    int16 samples. This does the same conversion internally applied when it
    decodes a file via ffmpeg."""
    return audio.astype(np.float32) / 32768.0


def transcribe(audio_path: str) -> str:
    """Original file-based entry point -- unchanged behavior, kept for
    compatibility with anything still passing a .wav path."""
    segments, info = model.transcribe(audio_path, beam_size=1, language="en")
    text = " ".join(seg.text.strip() for seg in segments)
    return text


def transcribe_array(audio: np.ndarray, beam_size: int = 1) -> str:
    """
    Transcribe directly from an in-memory int16 numpy array (16kHz mono),
    skipping the wav.write() -> disk -> wav.read() round trip that the
    file-based path does. Used both for the final accurate pass and for
    incremental partial-hypothesis updates below.
    """
    float_audio = _to_whisper_array(audio)
    segments, info = model.transcribe(
        float_audio,
        beam_size=beam_size,
        language="en",
        # Partial/incomplete audio isn't "real" prior context -- letting
        # Whisper condition on its own previous (possibly-wrong, still-
        # forming) output tends to compound errors on growing buffers.
        condition_on_previous_text=False,
    )
    return " ".join(seg.text.strip() for seg in segments)


class StreamingTranscriber:

    def __init__(self, min_interval_s: float = 0.8):
        self.min_interval_s = min_interval_s
        self._lock = threading.Lock()
        self._latest_audio = None      # most recent audio snapshot to process
        self._partial_text = ""
        self._busy = False
        self._running = False
        self._worker_thread = None
        self._wake = threading.Event()

    def start(self):
        self._running = True
        self._worker_thread = threading.Thread(target=self._run, daemon=True)
        self._worker_thread.start()

    def update_audio(self, audio: np.ndarray):
        with self._lock:
            self._latest_audio = audio
        self._wake.set()

    def get_partial_text(self) -> str:
        with self._lock:
            return self._partial_text

    def stop(self):
        self._running = False
        self._wake.set()
        if self._worker_thread is not None:
            self._worker_thread.join(timeout=2)

    def _run(self):
        last_run_time = 0.0
        while self._running:
            self._wake.wait(timeout=0.2)
            self._wake.clear()

            if not self._running:
                break

            now = time.time()
            if now - last_run_time < self.min_interval_s:
                continue

            with self._lock:
                audio_snapshot = self._latest_audio
                busy = self._busy

            if audio_snapshot is None or busy or len(audio_snapshot) < 4000:
                # too little audio yet (< ~0.25s at 16kHz) isn't worth a pass
                continue

            with self._lock:
                self._busy = True

            try:
                text = transcribe_array(audio_snapshot)
                with self._lock:
                    self._partial_text = text
            finally:
                with self._lock:
                    self._busy = False
                last_run_time = time.time()


if __name__ == "__main__":
    audio_path = "test_utterance.wav"

    start = time.time()
    result = transcribe(audio_path)
    elapsed = time.time() - start

    print(f"Transcript: {result}")
    print(f"Transcription took {elapsed:.2f}s")