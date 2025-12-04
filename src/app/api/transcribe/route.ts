
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
        // Use flash model for speed
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const arrayBuffer = await audioFile.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

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
        console.error('Transcription error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
