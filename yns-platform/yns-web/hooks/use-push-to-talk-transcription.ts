'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { PushToTalkRecorder } from '@/lib/audio/push-to-talk-recorder';
import {
  cancelSpeechTranscription,
  getSpeechTranscription,
  uploadSpeechRecording,
  type TranscriptionJob,
} from '@/lib/services/speech-transcription';

const MAX_RECORDING_DURATION_MS = 5 * 60 * 1000;
const MAX_TRANSCRIPTION_WAIT_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 1_500;

export type PushToTalkPhase =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'completed'
  | 'error';

type UsePushToTalkTranscriptionOptions = {
  sessionId: string | null;
  onTranscript: (transcript: string) => void;
};

export function usePushToTalkTranscription({
  sessionId,
  onTranscript,
}: UsePushToTalkTranscriptionOptions) {
  const [phase, setPhaseState] = useState<PushToTalkPhase>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');

  const phaseRef = useRef<PushToTalkPhase>('idle');
  const recorderRef = useRef<PushToTalkRecorder | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const pollControllerRef = useRef<AbortController | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const automaticStopRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const runIdRef = useRef(0);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const setPhase = useCallback((nextPhase: PushToTalkPhase) => {
    phaseRef.current = nextPhase;
    setPhaseState(nextPhase);
  }, []);

  const clearRecordingTimers = useCallback(() => {
    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (automaticStopRef.current !== null) {
      window.clearTimeout(automaticStopRef.current);
      automaticStopRef.current = null;
    }

    recordingStartedAtRef.current = null;
  }, []);

  const cancelRemoteJob = useCallback(
    async (targetSessionId: string, jobId: string) => {
      try {
        await cancelSpeechTranscription(targetSessionId, jobId);
      } catch {
        // Server-side expiry cleanup and the GCS lifecycle remain as fallbacks.
      }
    },
    [],
  );

  const pollForTranscript = useCallback(
    async (
      targetSessionId: string,
      jobId: string,
      runId: number,
      signal: AbortSignal,
    ) => {
      const deadline = Date.now() + MAX_TRANSCRIPTION_WAIT_MS;

      while (Date.now() < deadline) {
        await wait(POLL_INTERVAL_MS, signal);
        const job = await getSpeechTranscription(targetSessionId, jobId, {
          signal,
        });

        if (runId !== runIdRef.current) {
          return;
        }

        if (job.status === 'completed') {
          finishWithTranscript(job);
          return;
        }

        if (job.status === 'failed') {
          jobIdRef.current = null;
          throw new Error(job.error ?? 'Transcription failed. Please try again.');
        }

        if (job.status === 'cancelled') {
          jobIdRef.current = null;
          throw new Error('The transcription was cancelled.');
        }
      }

      throw new Error('Transcription took too long. Please record your answer again.');

      function finishWithTranscript(job: TranscriptionJob) {
        if (!job.transcript?.trim()) {
          throw new Error('No speech was detected. Please record your answer again.');
        }

        jobIdRef.current = null;
        onTranscriptRef.current(job.transcript.trim());
        setError('');
        setPhase('completed');
      }
    },
    [setPhase],
  );

  const stopRecording = useCallback(async () => {
    if (
      phaseRef.current !== 'recording' ||
      !recorderRef.current ||
      !sessionId
    ) {
      return;
    }

    const runId = runIdRef.current;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    clearRecordingTimers();
    setPhase('uploading');
    setError('');
    let pollController: AbortController | null = null;

    try {
      const recording = await recorder.stop();
      const job = await uploadSpeechRecording(sessionId, recording.blob);

      if (runId !== runIdRef.current) {
        await cancelRemoteJob(sessionId, job.jobId);
        return;
      }

      jobIdRef.current = job.jobId;

      if (job.status === 'completed' && job.transcript?.trim()) {
        jobIdRef.current = null;
        onTranscriptRef.current(job.transcript.trim());
        setPhase('completed');
        return;
      }

      if (job.status === 'failed' || job.status === 'cancelled') {
        jobIdRef.current = null;
        throw new Error(job.error ?? 'Transcription could not be completed.');
      }

      setPhase('transcribing');
      pollController = new AbortController();
      pollControllerRef.current = pollController;

      await pollForTranscript(
        sessionId,
        job.jobId,
        runId,
        pollController.signal,
      );
    } catch (caughtError) {
      if (isAbortError(caughtError) || runId !== runIdRef.current) {
        return;
      }

      const jobId = jobIdRef.current;
      jobIdRef.current = null;
      if (jobId) {
        await cancelRemoteJob(sessionId, jobId);
      }

      setError(errorMessage(caughtError));
      setPhase('error');
    } finally {
      if (pollControllerRef.current === pollController) {
        pollControllerRef.current = null;
      }
    }
  }, [cancelRemoteJob, clearRecordingTimers, pollForTranscript, sessionId, setPhase]);

  const startRecording = useCallback(async () => {
    if (!sessionId) {
      setError('The interview session is not ready yet.');
      setPhase('error');
      return;
    }

    if (
      phaseRef.current === 'requesting_permission' ||
      phaseRef.current === 'recording' ||
      phaseRef.current === 'uploading' ||
      phaseRef.current === 'transcribing'
    ) {
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setElapsedSeconds(0);
    setError('');
    setPhase('requesting_permission');

    const recorder = new PushToTalkRecorder();
    recorderRef.current = recorder;

    try {
      await recorder.start();

      if (runId !== runIdRef.current) {
        await recorder.cancel();
        return;
      }

      setPhase('recording');
      recordingStartedAtRef.current = Date.now();
      recordingIntervalRef.current = window.setInterval(() => {
        const startedAt = recordingStartedAtRef.current;
        if (startedAt !== null) {
          setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        }
      }, 250);
      automaticStopRef.current = window.setTimeout(() => {
        void stopRecording();
      }, MAX_RECORDING_DURATION_MS);
    } catch (caughtError) {
      recorderRef.current = null;
      if (runId !== runIdRef.current) {
        return;
      }

      setError(errorMessage(caughtError));
      setPhase('error');
    }
  }, [sessionId, setPhase, stopRecording]);

  const cancel = useCallback(async () => {
    runIdRef.current += 1;
    clearRecordingTimers();
    pollControllerRef.current?.abort();
    pollControllerRef.current = null;

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      await recorder.cancel();
    }

    const jobId = jobIdRef.current;
    jobIdRef.current = null;
    if (sessionId && jobId) {
      await cancelRemoteJob(sessionId, jobId);
    }

    setElapsedSeconds(0);
    setError('');
    setPhase('idle');
  }, [cancelRemoteJob, clearRecordingTimers, sessionId, setPhase]);

  useEffect(() => {
    setElapsedSeconds(0);
    setError('');
    setPhase('idle');

    return () => {
      runIdRef.current += 1;
      clearRecordingTimers();
      pollControllerRef.current?.abort();

      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        void recorder.cancel();
      }

      const jobId = jobIdRef.current;
      jobIdRef.current = null;
      if (sessionId && jobId) {
        void cancelRemoteJob(sessionId, jobId);
      }
    };
  }, [cancelRemoteJob, clearRecordingTimers, sessionId, setPhase]);

  return {
    phase,
    elapsedSeconds,
    maxRecordingSeconds: MAX_RECORDING_DURATION_MS / 1000,
    error,
    isRecording: phase === 'recording',
    isBusy:
      phase === 'requesting_permission' ||
      phase === 'uploading' ||
      phase === 'transcribing',
    startRecording,
    stopRecording,
    cancel,
  };
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Request aborted.', 'AbortError'));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);

    function abort() {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Request aborted.', 'AbortError'));
    }

    signal.addEventListener('abort', abort, { once: true });
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Microphone access was denied. Allow microphone access and try again.';
  }

  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'No microphone was found on this device.';
  }

  return error instanceof Error
    ? error.message
    : 'Voice recording could not be completed. Please try again.';
}
