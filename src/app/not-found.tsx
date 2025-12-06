import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-white">
            <h2 className="text-2xl font-bold">Not Found</h2>
            <p className="mb-4 text-zinc-400">Could not find requested resource</p>
            <Link
                href="/"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
                Return Home
            </Link>
        </div>
    );
}
