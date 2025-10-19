// src/lib/getJournalTable.ts

/**
 * Devuelve el nombre de la tabla en Supabase que almacena el journal.
 * Permite sobrescribirlo con la variable NEXT_PUBLIC_SUPABASE_TABLE.
 */
export function getJournalTable(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_TABLE?.trim() || "journal";
}
