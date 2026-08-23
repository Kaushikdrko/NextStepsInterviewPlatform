const TARGET_SAMPLE_RATE = 16_000;

type BrowserWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export type RecordedAudio = {
  blob: Blob;
  durationMs: number;
};

export class PushToTalkRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private chunks: Float32Array[] = [];
  private recording = false;

  get isRecording() {
    return this.recording;
  }

  async start(): Promise<void> {
    if (this.recording) {
      throw new Error('A recording is already in progress.');
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone recording is not supported in this browser.');
    }

    const browserWindow = window as BrowserWithWebkitAudio;
    const AudioContextConstructor =
      window.AudioContext ?? browserWindow.webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error('Web Audio is not supported in this browser.');
    }

    this.chunks = [];

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.context = new AudioContextConstructor({
        sampleRate: TARGET_SAMPLE_RATE,
        latencyHint: 'interactive',
      });

      await this.context.audioWorklet.addModule('/audio/pcm-recorder-worklet.js');
      await this.context.resume();

      this.source = this.context.createMediaStreamSource(this.stream);
      this.worklet = new AudioWorkletNode(this.context, 'pcm-recorder', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      });

      this.worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (this.recording && event.data.length > 0) {
          this.chunks.push(event.data);
        }
      };

      this.source.connect(this.worklet);
      this.worklet.connect(this.context.destination);
      this.recording = true;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  async stop(): Promise<RecordedAudio> {
    if (!this.recording || !this.context) {
      throw new Error('No recording is currently in progress.');
    }

    this.recording = false;

    const inputSampleRate = this.context.sampleRate;
    const chunks = this.chunks;
    this.chunks = [];

    await this.cleanup();

    const samples = mergeChunks(chunks);
    if (samples.length === 0) {
      throw new Error('No audio was captured.');
    }

    const durationMs = Math.round((samples.length / inputSampleRate) * 1000);
    const outputSamples = downsample(
      samples,
      inputSampleRate,
      TARGET_SAMPLE_RATE,
    );

    return {
      blob: encodeWav(outputSamples, TARGET_SAMPLE_RATE),
      durationMs,
    };
  }

  async cancel(): Promise<void> {
    this.recording = false;
    this.chunks = [];
    await this.cleanup();
  }

  private async cleanup(): Promise<void> {
    if (this.worklet) {
      this.worklet.port.onmessage = null;
      this.worklet.port.close();
      this.worklet.disconnect();
      this.worklet = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.context) {
      if (this.context.state !== 'closed') {
        await this.context.close();
      }
      this.context = null;
    }
  }
}

function mergeChunks(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function downsample(
  samples: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (inputRate === outputRate) {
    return samples;
  }

  if (outputRate > inputRate) {
    throw new Error('Audio sample rate is too low.');
  }

  const ratio = inputRate / outputRate;
  const outputLength = Math.round(samples.length / ratio);
  const output = new Float32Array(outputLength);

  let inputOffset = 0;

  for (let outputOffset = 0; outputOffset < outputLength; outputOffset += 1) {
    const nextInputOffset = Math.min(
      samples.length,
      Math.round((outputOffset + 1) * ratio),
    );

    let total = 0;
    let count = 0;

    for (let index = inputOffset; index < nextInputOffset; index += 1) {
      total += samples[index];
      count += 1;
    }

    output[outputOffset] = count > 0 ? total / count : 0;
    inputOffset = nextInputOffset;
  }

  return output;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeText(view, 0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  writeText(view, 8, 'WAVE');
  writeText(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(view, 36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = headerSize;

  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    const value =
      clamped < 0
        ? Math.round(clamped * 0x8000)
        : Math.round(clamped * 0x7fff);

    view.setInt16(offset, value, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeText(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
