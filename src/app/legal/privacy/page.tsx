export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  const lastUpdated = "8 de diciembre de 2024";

  return (
    <main className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-zinc-400">Última actualización: {lastUpdated}</p>

        <div className="mt-8 space-y-8 text-zinc-300">

          {/* Intro */}
          <section>
            <p>
              En OneLine (&quot;nosotros&quot;, &quot;nuestro&quot;) nos tomamos muy en serio tu privacidad.
              Esta política explica qué datos recopilamos, cómo los usamos y cuáles son tus derechos
              conforme al Reglamento General de Protección de Datos (RGPD/GDPR) de la UE y la
              Ley Orgánica de Protección de Datos y Garantía de Derechos Digitales (LOPDGDD) de España.
            </p>
          </section>

          {/* 1. Responsable */}
          <section>
            <h2 className="text-lg font-semibold text-white">1. Responsable del Tratamiento</h2>
            <p className="mt-2">
              El responsable del tratamiento de tus datos personales es OneLine.
              Para cualquier consulta relacionada con privacidad, puedes contactarnos en:
              <span className="text-indigo-400"> privacy@oneline.app</span>
            </p>
          </section>

          {/* 2. Datos que recopilamos */}
          <section>
            <h2 className="text-lg font-semibold text-white">2. Datos que Recopilamos</h2>
            <div className="mt-2 space-y-3">
              <div>
                <h3 className="font-medium text-zinc-200">Datos de cuenta:</h3>
                <ul className="ml-4 mt-1 list-disc text-sm">
                  <li>Correo electrónico</li>
                  <li>Método de autenticación (email/contraseña o Google OAuth)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-zinc-200">Datos del diario:</h3>
                <ul className="ml-4 mt-1 list-disc text-sm">
                  <li>Entradas de diario (encriptadas de extremo a extremo)</li>
                  <li>Metadatos: fechas, estado de ánimo, racha de escritura</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-zinc-200">Datos de uso:</h3>
                <ul className="ml-4 mt-1 list-disc text-sm">
                  <li>Interacciones con el Coach de IA (conversaciones)</li>
                  <li>Preferencias de la aplicación</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Base legal */}
          <section>
            <h2 className="text-lg font-semibold text-white">3. Base Legal del Tratamiento</h2>
            <div className="mt-2 space-y-2 text-sm">
              <p><strong>Ejecución del contrato (Art. 6.1.b RGPD):</strong> Necesitamos tus datos para proporcionarte el servicio de diario digital.</p>
              <p><strong>Consentimiento (Art. 6.1.a RGPD):</strong> Para funcionalidades opcionales como el Coach de IA, solicitamos tu consentimiento explícito.</p>
              <p><strong>Interés legítimo (Art. 6.1.f RGPD):</strong> Para mejorar el servicio y prevenir fraudes.</p>
            </div>
          </section>

          {/* 4. Servicios de terceros */}
          <section>
            <h2 className="text-lg font-semibold text-white">4. Servicios de Terceros y Transferencias Internacionales</h2>
            <p className="mt-2 text-sm">
              Utilizamos los siguientes proveedores de servicios que pueden procesar datos en tu nombre:
            </p>
            <div className="mt-3 space-y-4 text-sm">

              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Supabase (Base de datos)</h3>
                <ul className="ml-4 mt-1 list-disc text-zinc-400">
                  <li>Ubicación: UE (Frankfurt, Alemania)</li>
                  <li>Propósito: Almacenamiento de datos de cuenta y metadatos</li>
                  <li>Datos procesados: Email, preferencias, metadatos de entradas</li>
                  <li>Nota: Las entradas del diario están encriptadas y no pueden ser leídas por Supabase</li>
                </ul>
              </div>

              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Groq (Coach de IA)</h3>
                <ul className="ml-4 mt-1 list-disc text-zinc-400">
                  <li>Ubicación: EE.UU.</li>
                  <li>Propósito: Proporcionar respuestas del Coach de IA</li>
                  <li>Datos procesados: Mensajes de chat, metadatos de patrones (NO contenido de entradas encriptadas)</li>
                  <li>Transferencia: Basada en Cláusulas Contractuales Tipo (SCC) de la UE</li>
                  <li>Retención: Los mensajes no se almacenan permanentemente por Groq</li>
                </ul>
              </div>

              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Google Gemini (Generación de historias)</h3>
                <ul className="ml-4 mt-1 list-disc text-zinc-400">
                  <li>Ubicación: EE.UU./Global</li>
                  <li>Propósito: Generar narrativas, audio e imágenes de historias</li>
                  <li>Datos procesados: Contenido desencriptado de entradas (solo cuando tú lo solicitas)</li>
                  <li>Transferencia: Basada en SCC y certificación DPF</li>
                  <li>Nota: Solo se envía cuando generas activamente una historia</li>
                </ul>
              </div>

              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Vercel (Hosting)</h3>
                <ul className="ml-4 mt-1 list-disc text-zinc-400">
                  <li>Ubicación: Global (CDN con nodos en UE)</li>
                  <li>Propósito: Alojar la aplicación web</li>
                  <li>Datos procesados: Logs de acceso, IP (anonimizada)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Encriptación */}
          <section>
            <h2 className="text-lg font-semibold text-white">5. Encriptación de Extremo a Extremo</h2>
            <p className="mt-2 text-sm">
              Tus entradas de diario se encriptan en tu dispositivo antes de ser enviadas a nuestros servidores.
              Solo tú, con tu frase de contraseña, puedes descifrarlas. Ni OneLine ni nuestros proveedores
              pueden leer el contenido de tus entradas.
            </p>
            <p className="mt-2 text-sm text-amber-400/80">
              ⚠️ Importante: Si pierdes tu frase de contraseña, no podremos recuperar tus entradas.
            </p>
          </section>

          {/* 6. Tus derechos */}
          <section>
            <h2 className="text-lg font-semibold text-white">6. Tus Derechos (RGPD/LOPDGDD)</h2>
            <p className="mt-2 text-sm">Tienes derecho a:</p>
            <ul className="ml-4 mt-2 list-disc text-sm">
              <li><strong>Acceso:</strong> Solicitar una copia de tus datos personales</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos</li>
              <li><strong>Supresión:</strong> Eliminar tu cuenta y todos los datos asociados</li>
              <li><strong>Portabilidad:</strong> Exportar tus datos en formato legible</li>
              <li><strong>Oposición:</strong> Oponerte al tratamiento basado en interés legítimo</li>
              <li><strong>Limitación:</strong> Restringir el tratamiento en ciertas circunstancias</li>
              <li><strong>Retirar consentimiento:</strong> En cualquier momento, sin afectar la licitud del tratamiento previo</li>
            </ul>
            <p className="mt-3 text-sm">
              Puedes ejercer estos derechos desde <strong>Ajustes → Privacidad</strong> en la app o
              contactando a <span className="text-indigo-400">privacy@oneline.app</span>
            </p>
          </section>

          {/* 7. Retención */}
          <section>
            <h2 className="text-lg font-semibold text-white">7. Período de Retención</h2>
            <ul className="ml-4 mt-2 list-disc text-sm">
              <li>Datos de cuenta: Mientras mantengas la cuenta activa</li>
              <li>Entradas del diario: Hasta que las elimines o cierres tu cuenta</li>
              <li>Conversaciones del Coach: 30 días, después se eliminan automáticamente</li>
              <li>Logs de uso: 90 días máximo</li>
            </ul>
            <p className="mt-2 text-sm">
              Al eliminar tu cuenta, todos tus datos se borran permanentemente en un plazo de 30 días.
            </p>
          </section>

          {/* 8. Menores */}
          <section>
            <h2 className="text-lg font-semibold text-white">8. Menores de Edad</h2>
            <p className="mt-2 text-sm">
              OneLine no está dirigido a menores de 16 años (14 años en España según la LOPDGDD).
              No recopilamos conscientemente datos de menores. Si eres padre/tutor y crees que tu hijo
              ha proporcionado datos, contacta con nosotros para eliminarlos.
            </p>
          </section>

          {/* 9. Cookies */}
          <section>
            <h2 className="text-lg font-semibold text-white">9. Cookies</h2>
            <p className="mt-2 text-sm">
              Utilizamos únicamente cookies técnicas esenciales para el funcionamiento de la aplicación
              (autenticación, preferencias). No utilizamos cookies de seguimiento ni publicidad.
            </p>
          </section>

          {/* 10. Cambios */}
          <section>
            <h2 className="text-lg font-semibold text-white">10. Cambios en esta Política</h2>
            <p className="mt-2 text-sm">
              Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios significativos
              por email o mediante un aviso en la aplicación. La fecha de última actualización aparece al
              inicio del documento.
            </p>
          </section>

          {/* 11. Autoridad de control */}
          <section>
            <h2 className="text-lg font-semibold text-white">11. Autoridad de Control</h2>
            <p className="mt-2 text-sm">
              Si consideras que el tratamiento de tus datos vulnera la normativa, tienes derecho a
              presentar una reclamación ante la{" "}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 underline"
              >
                Agencia Española de Protección de Datos (AEPD)
              </a>
              {" "}o la autoridad de control de tu país de residencia.
            </p>
          </section>

          {/* Contacto */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-lg font-semibold text-white">Contacto</h2>
            <p className="mt-2 text-sm">
              Para cualquier pregunta sobre esta política o el tratamiento de tus datos:
            </p>
            <p className="mt-2 text-sm text-indigo-400">
              📧 privacy@oneline.app
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}