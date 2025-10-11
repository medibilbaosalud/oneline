async function onSignIn(e: React.FormEvent) {
  e.preventDefault();
  setMsg(null);
  setLoading(true);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: pw,
  });

  if (error) {
    setLoading(false);
    setMsg(error.message);
    return;
  }

  // 1) Actualiza metadata para pasar el gate de consentimiento
  await supabase.auth.updateUser({
    data: { has_consented: true },
  }).catch(() => { /* ignore */ });

  // 2) Asegura que la sesión esté lista y redirige con fuerza
  // (a veces la sesión tarda un tick)
  await supabase.auth.getSession();
  setLoading(false);
  router.replace('/today');
  router.refresh();
}