import io
import wave
import numpy as np


def pcm_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    """Wrap raw int16 PCM samples in a WAV header, in memory, so the
    browser's decodeAudioData() can play it directly."""
    buffer = io.BytesIO()  # an in-memory "file" -- no disk write
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # int16 = 2 bytes per sample
        wf.setframerate(sample_rate)
        wf.writeframes(audio.tobytes())
    return buffer.getvalue()  # the complete WAV file, as bytes