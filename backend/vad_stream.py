import webrtcvad

SAMPLE_RATE = 16000
FRAME_MS = 30
FRAME_BYTES = int(SAMPLE_RATE * FRAME_MS / 1000) * 2  # 960 bytes = one 30ms frame


class StreamingVad:
    def __init__(self, silence_frames_threshold=25):
        self.vad = webrtcvad.Vad(2)
        self.silence_frames_threshold = silence_frames_threshold
        self.leftover = b""
        self.frames = []
        self.triggered = False
        self.num_silent = 0

    def process_chunk(self, pcm_bytes: bytes):
        self.leftover += pcm_bytes
        result = None

        while len(self.leftover) >= FRAME_BYTES:
            frame = self.leftover[:FRAME_BYTES]
            self.leftover = self.leftover[FRAME_BYTES:]

            is_speech = self.vad.is_speech(frame, SAMPLE_RATE)
            if not self.triggered:
                if is_speech:
                    self.triggered = True
                    self.frames.append(frame)
            else:
                self.frames.append(frame)
                if not is_speech:
                    self.num_silent += 1
                    if self.num_silent > self.silence_frames_threshold:
                        result = b"".join(self.frames)
                        self.frames = []
                        self.triggered = False
                        self.num_silent = 0
                else:
                    self.num_silent = 0

        return result