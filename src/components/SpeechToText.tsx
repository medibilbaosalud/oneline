'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type SpeechToTextProps = {
    onTranscript: (text: string) => void;
    disabled?: boolean;
};

export function SpeechToText({ onTranscript, disabled }: SpeechToTextProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'recording' | 'processing'>('idle');
    const [progress, setProgress] = useState(0);
    const worker = useRef<Worker | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    useEffect(() => {
        if (!worker.current) {
            worker.current = new Worker('/worker.js', { type: 'module' });

            worker.current.onmessage = (event) => {
                const { type, data } = event.data;
                if (type === 'progress') {
                    setStatus('loading');
                    // data is { status: 'progress', name: '...', file: '...', progress: 0-100, ... }
                    // We only care about the main model file or just show generic progress
                    if (data.status === 'progress') {
                        setProgress(data.progress);
                    } else if (data.status === 'done') {
                        // Model loaded
                    }
                } else if (type === 'ready') {
                    setStatus('ready');
                    setProgress(0);
                } else if (type === 'result') {
                    onTranscript(data);
                    setStatus('ready');
                } else if (type === 'error') {
                    console.error('Worker error:', data);
                    setStatus('ready'); // Reset to ready on error
                }
            };

            // Trigger model load immediately
            worker.current.postMessage({ type: 'load' });
        }

        return () => {
            // Cleanup worker on unmount? 
            // Better to keep it alive if possible, but for now let's terminate to avoid leaks
            // worker.current?.terminate(); 
        };
    }, [onTranscript]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = async () => {
                setStatus('processing');
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                const audioBuffer = await readAudio(audioBlob);
                worker.current?.postMessage({ type: 'generate', data: { audio: audioBuffer } });

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.current.start();
            setStatus('recording');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            mediaRecorder.current.stop();
        }
    };

    // Helper to decode audio and resample to 16000Hz
    async function readAudio(blob: Blob): Promise<Float32Array> {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const arrayBuffer = await blob.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(arrayBuffer);
        return decoded.getChannelData(0);
    }

    const handleClick = () => {
        if (status === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const isLoading = status === 'loading';
    const isRecording = status === 'recording';
    const isProcessing = status === 'processing';
    const isReady = status === 'ready' || status === 'idle'; // Idle usually means loading hasn't finished reporting 'ready' yet, but we trigger load on mount.

    // If loading, show progress
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 rounded-xl bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
                <span>Loading AI ({Math.round(progress)}%)...</span>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled || isProcessing}
            className={`relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${isRecording
                    ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/50'
                    : isProcessing
                        ? 'bg-indigo-500/10 text-indigo-400'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                } disabled:opacity-50`}
            title="Dictate entry"
        >
            {isRecording ? (
                <>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span>Stop</span>
                </>
            ) : isProcessing ? (
                <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    <span>Processing...</span>
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                        <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.964V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.536c2.96-.38 5.25-2.904 5.25-5.964v-.357a.75.75 0 00-1.5 0V10c0 2.485-2.015 4.5-4.5 4.5s-4.5-2.015-4.5-4.5v-.357z" />
                    </svg>
                    <span>Dictate</span>
                </>
            )}
        </button>
    );
}
