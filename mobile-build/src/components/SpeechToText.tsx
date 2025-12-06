'use client';

import { useEffect, useRef, useState } from 'react';

type SpeechToTextProps = {
    onTranscript: (text: string) => void;
    disabled?: boolean;
};

export function SpeechToText({ onTranscript, disabled }: SpeechToTextProps) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [statusDetail, setStatusDetail] = useState<string | null>(null);
    const [modelUsed, setModelUsed] = useState<string | null>(null);
    const [supported, setSupported] = useState(true);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    useEffect(() => {
        const hasSupport = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
        setSupported(hasSupport);
    }, []);

    const startRecording = async () => {
        try {
            setErrorMessage(null);
            setModelUsed(null);
            setStatusDetail('Listening — tap stop when you are done.');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = async () => {
                setStatus('processing');
                setStatusDetail('Sending audio to Gemini 2.5 Flash Live…');
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });

                const formData = new FormData();
                formData.append('audio', audioBlob);

                try {
                    const response = await fetch('/api/transcribe', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Transcription failed');
                    }

                    if (data.text) {
                        onTranscript(data.text);
                        setModelUsed(data.modelUsed || 'Gemini dictation');
                        setStatusDetail(data.modelUsed ? `Captured with ${data.modelUsed}` : 'Captured successfully');
                        setStatus('idle');
                        setTimeout(() => setStatusDetail(null), 4000);
                    }
                } catch (error: any) {
                    console.error('Transcription error:', error);
                    setStatus('error');
                    setErrorMessage(error.message || 'Error processing audio');
                    setStatusDetail(null);
                    setTimeout(() => {
                        setStatus('idle');
                        setErrorMessage(null);
                    }, 5000);
                } finally {
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.current.start();
            setStatus('recording');
        } catch (err) {
            console.error('Failed to start recording', err);
            setStatus('error');
            setErrorMessage('Could not access microphone');
            setStatusDetail(null);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            mediaRecorder.current.stop();
        }
    };

    const handleClick = () => {
        if (status === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const isRecording = status === 'recording';
    const isProcessing = status === 'processing';
    const isError = status === 'error';

    const disableMic = disabled || isProcessing || !supported;

    return (
        <div className="flex w-full flex-col items-start gap-2 text-left text-neutral-100" aria-live="polite">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Dictation</div>
            <button
                type="button"
                onClick={handleClick}
                disabled={disableMic}
                className={`relative inline-flex min-w-[180px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition-all sm:w-auto ${isRecording
                        ? 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/50'
                        : isProcessing
                            ? 'bg-indigo-500/10 text-indigo-200 ring-1 ring-indigo-500/40'
                            : isError
                                ? 'bg-red-500/10 text-red-200 ring-1 ring-red-500/50'
                                : 'bg-neutral-800 text-neutral-100 hover:border-white/20 hover:bg-neutral-700'
                    } disabled:opacity-50`}
                title={supported ? 'Dictate entry' : 'Microphone not available on this device'}
            >
                {isRecording ? (
                    <>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        <span>Stop dictation</span>
                    </>
                ) : isProcessing ? (
                    <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                        <span>Processing…</span>
                    </>
                ) : isError ? (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <span>Error</span>
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
            {(statusDetail || modelUsed) && !isError && (
                <p className="text-xs text-neutral-400">
                    {statusDetail || (modelUsed ? `Captured with ${modelUsed}` : null)}
                </p>
            )}
                {errorMessage && (
                    <span className="text-xs text-red-400 animate-pulse">{errorMessage}</span>
            )}
            {!supported && !errorMessage && (
                <span className="text-xs text-amber-200">Microphone not available in this browser.</span>
            )}
        </div>
    );
}
