'use client';

export function SpeechToText({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled?: boolean }) {
    return (
        <div className="p-4 bg-green-500 text-white font-bold border-4 border-white">
            MIC COMPONENT IS WORKING (SIMPLE VERSION)
            <button type="button" onClick={() => onTranscript("Test transcript")} className="block mt-2 bg-black p-2">
                Click to Test
            </button>
        </div>
    );
}
