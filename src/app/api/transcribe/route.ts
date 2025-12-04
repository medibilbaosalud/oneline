
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

        // Try 2.5 Flash first (better quality), fallback to 2.0 Flash (higher limits)
        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
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
                return NextResponse.json({ text });
            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        throw lastError || new Error('All models failed');

    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
