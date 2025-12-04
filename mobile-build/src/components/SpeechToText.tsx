'use client';

import { useState, useEffect, useCallback } from 'react';

type SpeechToTextProps = {
    onTranscript: (text: string) => void;
    disabled?: boolean;
};

export function SpeechToText({ onTranscript, disabled }: SpeechToTextProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                setIsSupported(true);
                const recog = new SpeechRecognition();
                recog.continuous = false;
                recog.interimResults = false;
                recog.lang = 'es-ES'; // Default to Spanish as per user language, could be dynamic

                recog.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    onTranscript(transcript);
                    setIsListening(false);
                };

                recog.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };

                recog.onend = () => {
                    setIsListening(false);
                };

                setRecognition(recog);
            }
        }
    }, [onTranscript]);

    const toggleListening = useCallback(() => {
        if (!recognition) return;

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            try {
                recognition.start();
                setIsListening(true);
            } catch (e) {
                console.error('Failed to start recognition', e);
            }
        }
    }, [isListening, recognition]);

    if (!isSupported) return null;

    return (
        <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            className={`relative inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-all ${isListening
                    ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                } disabled:opacity-50`}
            title="Dictar entrada"
        >
            {isListening ? (
                <>
                    <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                    Escuchando...
                </>
            ) : (
                <>
                    <span className="mr-2 text-lg">🎙️</span>
                    Dictar
                </>
            )}
        </button>
    );
}
