"use client";

import { useState } from "react";

export default function ImageTestPage() {
    const [prompt, setPrompt] = useState(
        "A serene mountain landscape at sunset with golden light reflecting on a calm lake"
    );
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [elapsed, setElapsed] = useState<number | null>(null);

    const generateImage = async () => {
        if (!prompt.trim()) {
            setError("Please enter a prompt");
            return;
        }

        setLoading(true);
        setError(null);
        setImageUrl(null);
        setElapsed(null);

        const startTime = Date.now();

        try {
            const res = await fetch("/api/image-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt.trim() }),
            });

            const elapsedMs = Date.now() - startTime;
            setElapsed(elapsedMs);

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error || `HTTP ${res.status}`);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: "auto", padding: 20, fontFamily: "system-ui" }}>
            <h1>🎨 HuggingFace Image Test</h1>
            <p style={{ color: "#666" }}>
                Test Stable Diffusion XL image generation via HuggingFace Inference API.
            </p>

            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter image prompt..."
                rows={4}
                style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    marginBottom: 12,
                }}
            />

            <button
                onClick={generateImage}
                disabled={loading}
                style={{
                    padding: "12px 24px",
                    fontSize: 16,
                    backgroundColor: loading ? "#999" : "#7c3aed",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: loading ? "wait" : "pointer",
                }}
            >
                {loading ? "⏳ Generating (30-60s)..." : "🖼️ Generate Image"}
            </button>

            {error && (
                <div
                    style={{
                        marginTop: 16,
                        padding: 12,
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        borderRadius: 8,
                    }}
                >
                    ❌ {error}
                </div>
            )}

            {elapsed !== null && (
                <p style={{ color: "#666", marginTop: 12 }}>
                    ⏱️ Completed in {(elapsed / 1000).toFixed(1)}s
                </p>
            )}

            {imageUrl && (
                <div style={{ marginTop: 20 }}>
                    <h3>Generated Image:</h3>
                    <img
                        src={imageUrl}
                        alt="Generated"
                        style={{
                            maxWidth: "100%",
                            borderRadius: 12,
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        }}
                    />
                </div>
            )}
        </div>
    );
}
