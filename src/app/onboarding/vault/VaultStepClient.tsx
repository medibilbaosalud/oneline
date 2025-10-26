"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import VaultGate from "@/components/VaultGate";
import { useVault } from "@/hooks/useVault";

export default function VaultStepClient({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const { dataKey, hasBundle } = useVault();

  useEffect(() => {
    if (hasBundle && dataKey) {
      const target = redirectTo
        ? `/onboarding/done?redirectTo=${encodeURIComponent(redirectTo)}`
        : "/onboarding/done";
      router.replace(target);
    }
  }, [hasBundle, dataKey, redirectTo, router]);

  return (
    <div className="mt-6">
      <VaultGate>
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
          ¡Bóveda lista! Te llevamos a la bienvenida…
        </div>
      </VaultGate>
    </div>
  );
}
