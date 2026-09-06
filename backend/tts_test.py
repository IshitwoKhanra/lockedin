import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

PIPER_MODEL_PATH="en_US-lessac-medium.onnx"

FADE_MS=8

_voice=PiperVoice.load(PIPER_MODEL_PATH)

_SYN_CONFIG=SynthesisConfig(
    length_scale=1.05,
    noise_scale=0.75,
    noise_w_scale=0.9
)

def _apply_fade(audio:np.ndarray,sample_rate:int,fade_ms:int=FADE_MS)->np.ndarray:
    n_fade=int(sample_rate*fade_ms/1000)
    if n_fade<=0 or len(audio)<n_fade*2:
        return audio
    
    audio=audio.astype(np.float32)
    ramp=np.linspace(0.0,1.0,n_fade,dtype=np.float32)
    audio[:n_fade] *=ramp
    audio[-n_fade:]*=ramp[::-1]
    return audio.astype(np.int16)

def synthesize(text:str):
    chunks=[]
    sample_rate=_voice.config.sample_rate
    for audio_chunk in _voice.synthesize(text,syn_config=_SYN_CONFIG):
        sample_rate=audio_chunk.sample_rate
        chunks.append(np.frombuffer(audio_chunk.audio_int16_bytes,dtype=np.int16))

    if not chunks:
        return np.array([],dtype=np.int16),sample_rate
    
    audio = np.concatenate(chunks)
    audio = _apply_fade(audio, sample_rate)
    return audio, sample_rate
