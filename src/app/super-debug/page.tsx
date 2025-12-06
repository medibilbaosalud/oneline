'use client';

import { useState } from 'react';
import { SpeechToText } from '@/components/SpeechToText';

export default function SuperDebugPage() {
    const [text, setText] = useState('');

    return (
        <div>
            <h2>SpeechToText Component Test</h2>
            <div style={{ border: '2px solid blue', padding: '20px', margin: '20px 0' }}>
                <SpeechToText
                    onTranscript={(transcript) => setText((prev) => prev + ' ' + transcript)}
                />
            </div>
            <h3>Transcript Output:</h3>
            <pre style={{ background: '#f0f0f0', padding: '10px' }}>{text || 'Waiting for speech...'}</pre>

            <div style={{ marginTop: '50px', fontSize: '12px', color: '#666' }}>
                <p>Debug Info:</p>
                <p>Window defined: {typeof window !== 'undefined' ? 'Yes' : 'No'}</p>
                <p>SpeechRecognition available: {typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) ? 'Yes' : 'No'}</p>
            </div>
        </div>
    );
}
