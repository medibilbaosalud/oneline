'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-4 text-white">
            <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6">
                <h2 className="mb-2 text-xl font-bold text-red-500">Something went wrong!</h2>
                <p className="mb-4 text-sm text-neutral-300">
                    We encountered an error while loading this page.
                </p>

                <div className="mb-6 overflow-auto rounded bg-black/50 p-3 text-xs font-mono text-red-200">
                    <p className="font-bold">Error Message:</p>
                    <p>{error.message}</p>
                    {error.digest && (
                        <p className="mt-2 text-neutral-500">Digest: {error.digest}</p>
                    )}
                    {error.stack && (
                        <details className="mt-2">
                            <summary className="cursor-pointer text-neutral-500 hover:text-neutral-400">Stack Trace</summary>
                            <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
                        </details>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => reset()}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => window.location.href = '/today'}
                        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                    >
                        Go to Today
                    </button>
                </div>
            </div>
        </div>
    );
}
