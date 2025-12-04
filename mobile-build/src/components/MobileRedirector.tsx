'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function MobileRedirector() {
    const router = useRouter();

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        const hasSeenIntro = localStorage.getItem('oneline_mobile_intro_seen');

        if (hasSeenIntro) {
            // User has been here before, skip landing and go to app
            router.replace('/today');
        } else {
            // First time, mark as seen so next time they skip it
            localStorage.setItem('oneline_mobile_intro_seen', 'true');
        }
    }, [router]);

    return null;
}
