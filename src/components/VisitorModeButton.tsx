"use client";

import { useRouter } from "next/navigation";
import { useVisitor } from "@/components/VisitorMode";

type Props = {
    className?: string;
};

export function VisitorModeButton({ className }: Props) {
    const router = useRouter();
    const { enterVisitorMode } = useVisitor();

    const handleClick = () => {
        enterVisitorMode();
        router.push("/today");
    };

    return (
        <button
            onClick={handleClick}
            className={className || "rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"}
        >
            <span className="flex items-center gap-2">
                <span>👀</span>
                <span>Just explore</span>
            </span>
        </button>
    );
}
