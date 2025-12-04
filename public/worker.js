
import { pipeline, env } from '@xenova/transformers';

// Skip local model checks since we are running in browser
env.allowLocalModels = false;

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny.en';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, {
                quantized: true,
                progress_callback
            });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    if (type === 'load') {
        try {
            console.log('[Worker] Starting model load...');
            const start = performance.now();
            await PipelineSingleton.getInstance((x) => {
                // We also send progress updates back to the main thread
                self.postMessage({ type: 'progress', data: x });
            });
            const end = performance.now();
            console.log(`[Worker] Model loaded in ${(end - start).toFixed(2)}ms`);
            self.postMessage({ type: 'ready' });
        } catch (err) {
            console.error('[Worker] Load error:', err);
            self.postMessage({ type: 'error', data: err.message });
        }
    } else if (type === 'generate') {
        try {
            console.log('[Worker] Starting transcription...');
            const start = performance.now();
            const transcriber = await PipelineSingleton.getInstance();

            // Run the transcription
            // data.audio should be a Float32Array of the audio
            console.log(`[Worker] Audio length: ${data.audio.length} samples`);

            const output = await transcriber(data.audio, {
                chunk_length_s: 30,
                stride_length_s: 5,
                language: 'english',
                task: 'transcribe',
            });

            const end = performance.now();
            console.log(`[Worker] Transcription finished in ${(end - start).toFixed(2)}ms`);
            console.log('[Worker] Result:', output.text);

            self.postMessage({
                type: 'result',
                data: output.text,
            });
        } catch (err) {
            console.error('[Worker] Generate error:', err);
            self.postMessage({ type: 'error', data: err.message });
        }
    }
});
