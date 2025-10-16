// src/app/api/entries/route.ts
 export async function POST(req: Request) {
-  const supabase = supabaseServer();
+  const supabase = await supabaseServer();
   const { data: { user } } = await supabase.auth.getUser();
   ...
 }