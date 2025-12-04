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
                recog.lang = 'en-US'; // Default to English

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
            className={`relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${isListening
                ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/50'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                } disabled:opacity-50`}
            title="Dictate entry"
        >
            {isListening ? (
                <>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span>Listening...</span>
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
