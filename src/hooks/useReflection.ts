// src/hooks/useReflection.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Reflection = {
    date: string;
    insight: string;
    question: string;
};

type UseReflectionResult = {
    pendingReflection: Reflection | null;
    isLoading: boolean;
    checkForPending: () => Promise<void>;
    markAsViewed: (date: string) => Promise<void>;
    generateReflection: (entryText: string, entryDate: string) => Promise<boolean>;
};

export function useReflection(): UseReflectionResult {
    const [pendingReflection, setPendingReflection] = useState<Reflection | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const getAuthToken = useCallback(async (): Promise<string | null> => {
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    }, []);

    const checkForPending = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token) return;

            const response = await fetch("/api/reflection/generate", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.hasPending && data.reflection) {
                    setPendingReflection(data.reflection);
                }
            }
        } catch (error) {
            console.error("[useReflection] Error checking pending:", error);
        }
    }, [getAuthToken]);

    const markAsViewed = useCallback(async (date: string) => {
        try {
            const token = await getAuthToken();
            if (!token) return;

            await fetch("/api/reflection/generate", {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ entryDate: date }),
            });

            setPendingReflection(null);
        } catch (error) {
            console.error("[useReflection] Error marking viewed:", error);
        }
    }, [getAuthToken]);

    const generateReflection = useCallback(async (entryText: string, entryDate: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) return false;

            const response = await fetch("/api/reflection/generate", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ entryText, entryDate }),
            });

            setIsLoading(false);
            return response.ok;
        } catch (error) {
            console.error("[useReflection] Error generating:", error);
            setIsLoading(false);
            return false;
        }
    }, [getAuthToken]);

    // Check for pending reflection on mount
    useEffect(() => {
        checkForPending();
    }, [checkForPending]);

    return {
        pendingReflection,
        isLoading,
        checkForPending,
        markAsViewed,
        generateReflection,
    };
}
