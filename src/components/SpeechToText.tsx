'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SpeechToTextProps = {
    onTranscript: (text: string) => void;
    disabled?: boolean;
};

export function SpeechToText({ onTranscript, disabled }: SpeechToTextProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [recognition, setRecognition] = useState<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
}
                }
if (finalTranscript) {
    onTranscript(finalTranscript);
}
            };

recognitionInstance.onerror = (event: any) => {
    console.error('Speech recognition error', event.error);
    stopListening();
};

recognitionInstance.onend = () => {
    // If it stops but we think we are listening, it might be silence timeout.
    // We'll just reset state to be safe.
    if (isListening) {
        stopListening();
    }
};

setRecognition(recognitionInstance);
        }
return () => {
    if (timerRef.current) clearInterval(timerRef.current);
};
    }, [onTranscript]);

const startTimer = () => {
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
    }, 1000);
};

const stopTimer = () => {
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
    setElapsedSeconds(0);
};

const stopListening = useCallback(() => {
    setIsListening(false);
    stopTimer();
    if (recognition) {
        recognition.stop();
    }
}, [recognition]);

const toggleListening = useCallback(() => {
    if (!recognition || disabled) return;

    if (isListening) {
        stopListening();
    } else {
        try {
            recognition.start();
            setIsListening(true);
            startTimer();
        } catch (e) {
            console.error("Failed to start recognition", e);
            setIsListening(false);
        }
    }
}, [isListening, recognition, disabled, stopListening]);

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// If not supported, we can render a disabled state or nothing.
// User requested improvement, so a disabled state is better UX than disappearing.
const isDisabled = disabled || !isSupported;

return (
    <div className="relative flex items-center">
        <AnimatePresence>
            {isListening && (
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="absolute right-full mr-3 flex items-center gap-2 whitespace-nowrap rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400"
                >
                    <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="h-2 w-2 rounded-full bg-red-500"
                    />
                    <span>{formatTime(elapsedSeconds)}</span>
                </motion.div>
            )}
        </AnimatePresence>

        <button
            type="button"
            onClick={toggleListening}
            disabled={isDisabled}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${isListening
                ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
                } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
            title={!isSupported ? 'Speech recognition not supported' : (isListening ? 'Stop recording' : 'Start dictation')}
        >
            <AnimatePresence mode="wait">
                {isListening ? (
                    <motion.div
                        key="stop"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                    >
                        <div className="h-3.5 w-3.5 rounded-sm bg-white" />
                    </motion.div>
                ) : (
                    <motion.svg
                        key="mic"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform duration-300 group-hover:scale-110"
                    >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                    </motion.svg>
                )}
            </AnimatePresence>

            {/* Ring animation when listening */}
            {isListening && (
                <span className="absolute inset-0 -z-10 animate-ping rounded-xl bg-red-500 opacity-20" />
            )}
        </button>
    </div>
);
}
