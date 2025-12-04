
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as Blob;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const arrayBuffer = await audioFile.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        // Robust fallback chain:
        // 1. Gemini 2.5 Flash: Best quality (Experimental)
        // 2. Gemini 2.0 Flash: High limits & speed (Stable)
        // 3. Gemini 1.5 Flash: Old reliable fallback
        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: audioFile.type || 'audio/webm',
                            data: base64Audio
                        }
                    },
                    { text: "Transcribe this audio exactly as spoken. Do not add any commentary. Return only the text." }
                ]);

                const text = result.response.text();
                if (!text) throw new Error('Empty response');

                return NextResponse.json({ text });
            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        // If we get here, all models failed
        console.error('All transcription models failed');
        return NextResponse.json(
            { error: "Lo siento, los servicios de IA están saturados en este momento. Por favor, inténtalo de nuevo en unos segundos." },
            { status: 503 }
        );

    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json(
            { error: "Error al procesar el audio. Por favor, verifica tu conexión." },
            { status: 500 }
        );
    }
}
