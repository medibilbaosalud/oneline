'use client';

import { useState, useRef } from 'react';

type SpeechToTextProps = {
    onTranscript: (text: string) => void;
    disabled?: boolean;
};

export function SpeechToText({ onTranscript, disabled }: SpeechToTextProps) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

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

                const formData = new FormData();
                formData.append('audio', audioBlob);

                try {
                    const response = await fetch('/api/transcribe', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) throw new Error('Transcription failed');

                    const data = await response.json();
                    if (data.text) {
                        onTranscript(data.text);
                    }
                } catch (error) {
                    console.error('Transcription error:', error);
                } finally {
                    setStatus('idle');
                    stream.getTracks().forEach(track => track.stop());
                }
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

    const handleClick = () => {
        if (status === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const isRecording = status === 'recording';
    const isProcessing = status === 'processing';

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
