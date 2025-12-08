export const dynamic = 'force-dynamic';

export default function TermsPage() {
  const lastUpdated = "8 de diciembre de 2024";

  return (
    <main className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">Términos de Servicio</h1>
        <p className="mt-2 text-sm text-zinc-400">Última actualización: {lastUpdated}</p>

        <div className="mt-8 space-y-8 text-zinc-300 text-sm">

          {/* Intro */}
          <section>
            <p>
              Estos Términos de Servicio (&quot;Términos&quot;) rigen el uso de OneLine (&quot;el Servicio&quot;, &quot;la Aplicación&quot;).
              Al usar OneLine, aceptas estos Términos. Si no estás de acuerdo, no uses el Servicio.
            </p>
          </section>

          {/* 1. Descripción */}
          <section>
            <h2 className="text-lg font-semibold text-white">1. Descripción del Servicio</h2>
            <p className="mt-2">
              OneLine es una aplicación de diario personal digital que ofrece:
            </p>
            <ul className="ml-4 mt-2 list-disc">
              <li>Escritura y almacenamiento de entradas de diario con encriptación de extremo a extremo</li>
              <li>Seguimiento de estado de ánimo y patrones</li>
              <li>Coach de IA para reflexión personal (powered by Groq)</li>
              <li>Generación de narrativas, audio e imágenes (powered by Google Gemini)</li>
              <li>Transcripción de voz a texto</li>
            </ul>
          </section>

          {/* 2. Cuenta */}
          <section>
            <h2 className="text-lg font-semibold text-white">2. Cuenta de Usuario</h2>
            <ul className="ml-4 mt-2 list-disc">
              <li>Debes tener al menos 16 años (14 años en España) para usar el Servicio</li>
              <li>Eres responsable de mantener la seguridad de tu cuenta y contraseña</li>
              <li>Eres responsable de guardar tu frase de contraseña de encriptación de forma segura</li>
              <li>No debes compartir tu cuenta con terceros</li>
            </ul>
          </section>

          {/* 3. Contenido del usuario */}
          <section>
            <h2 className="text-lg font-semibold text-white">3. Tu Contenido</h2>
            <p className="mt-2">
              <strong>Propiedad:</strong> Mantienes todos los derechos sobre el contenido que creas en OneLine.
              No reclamamos propiedad sobre tus entradas de diario.
            </p>
            <p className="mt-2">
              <strong>Licencia:</strong> Al usar funciones de IA (Coach, generación de historias),
              nos otorgas una licencia limitada para procesar tu contenido con el único propósito de
              proporcionarte esas funcionalidades.
            </p>
            <p className="mt-2">
              <strong>Responsabilidad:</strong> Eres responsable del contenido que creas. No uses el
              Servicio para contenido ilegal, dañino o que infrinja derechos de terceros.
            </p>
          </section>

          {/* 4. Servicios de IA */}
          <section>
            <h2 className="text-lg font-semibold text-white">4. Servicios de Inteligencia Artificial</h2>
            <div className="mt-2 space-y-3">
              <div className="rounded border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Coach de IA (Groq)</h3>
                <p className="mt-1 text-zinc-400">
                  El Coach de IA está diseñado para fomentar la reflexión personal, NO para proporcionar
                  asesoramiento médico, psicológico o profesional. Las respuestas son generadas por
                  modelos de lenguaje y pueden contener errores o imprecisiones.
                </p>
              </div>
              <div className="rounded border border-zinc-800 p-3">
                <h3 className="font-medium text-indigo-400">Generación de Historias (Google Gemini)</h3>
                <p className="mt-1 text-zinc-400">
                  Las narrativas, audio e imágenes generadas son creaciones asistidas por IA basadas
                  en tu contenido. Revisa siempre el contenido generado antes de compartirlo.
                </p>
              </div>
              <p className="text-amber-400/80">
                ⚠️ Las funciones de IA requieren enviar datos a proveedores externos (Groq, Google).
                Consulta nuestra <a href="/legal/privacy" className="underline">Política de Privacidad</a> para más detalles.
              </p>
            </div>
          </section>

          {/* 5. Uso aceptable */}
          <section>
            <h2 className="text-lg font-semibold text-white">5. Uso Aceptable</h2>
            <p className="mt-2">No puedes usar OneLine para:</p>
            <ul className="ml-4 mt-2 list-disc">
              <li>Violar leyes aplicables</li>
              <li>Almacenar contenido ilegal</li>
              <li>Intentar acceder a datos de otros usuarios</li>
              <li>Interferir con el funcionamiento del Servicio</li>
              <li>Usar bots o sistemas automatizados sin autorización</li>
              <li>Revender o redistribuir el Servicio</li>
            </ul>
          </section>

          {/* 6. Privacidad */}
          <section>
            <h2 className="text-lg font-semibold text-white">6. Privacidad y Datos</h2>
            <p className="mt-2">
              Tu privacidad es fundamental. Consulta nuestra{" "}
              <a href="/legal/privacy" className="text-indigo-400 underline">Política de Privacidad</a>{" "}
              para entender cómo recopilamos, usamos y protegemos tus datos conforme al RGPD y la LOPDGDD.
            </p>
          </section>

          {/* 7. Encriptación */}
          <section>
            <h2 className="text-lg font-semibold text-white">7. Encriptación y Seguridad</h2>
            <p className="mt-2">
              Tus entradas de diario se encriptan en tu dispositivo. Eres el único responsable de
              recordar tu frase de contraseña de encriptación.
            </p>
            <p className="mt-2 text-amber-400/80">
              ⚠️ Si pierdes tu frase de contraseña, no podremos recuperar tus entradas encriptadas.
              No existe un sistema de recuperación.
            </p>
          </section>

          {/* 8. Limitación */}
          <section>
            <h2 className="text-lg font-semibold text-white">8. Limitación de Responsabilidad</h2>
            <p className="mt-2">
              El Servicio se proporciona &quot;tal cual&quot; y &quot;según disponibilidad&quot;. En la máxima medida
              permitida por la ley:
            </p>
            <ul className="ml-4 mt-2 list-disc">
              <li>No garantizamos que el Servicio esté libre de errores o interrupciones</li>
              <li>No somos responsables de pérdida de datos causada por fallos técnicos o pérdida de tu contraseña</li>
              <li>No somos responsables por el contenido generado por IA</li>
              <li>Nuestra responsabilidad máxima se limita al importe que hayas pagado en los últimos 12 meses</li>
            </ul>
            <p className="mt-2 text-zinc-400">
              Estas limitaciones no aplican a casos de dolo o negligencia grave, ni excluyen derechos
              que la ley no permita limitar.
            </p>
          </section>

          {/* 9. Modificaciones */}
          <section>
            <h2 className="text-lg font-semibold text-white">9. Modificaciones</h2>
            <p className="mt-2">
              Podemos modificar estos Términos ocasionalmente. Te notificaremos de cambios significativos
              con al menos 30 días de antelación. El uso continuado del Servicio tras los cambios
              implica tu aceptación.
            </p>
          </section>

          {/* 10. Terminación */}
          <section>
            <h2 className="text-lg font-semibold text-white">10. Terminación</h2>
            <p className="mt-2">
              Puedes eliminar tu cuenta en cualquier momento desde Ajustes. Nos reservamos el derecho
              de suspender o terminar cuentas que violen estos Términos, con preaviso razonable salvo
              en casos graves.
            </p>
          </section>

          {/* 11. Ley aplicable */}
          <section>
            <h2 className="text-lg font-semibold text-white">11. Ley Aplicable y Jurisdicción</h2>
            <p className="mt-2">
              Estos Términos se rigen por la legislación española. Para cualquier disputa,
              intentaremos resolver amistosamente primero. En su defecto, serán competentes
              los tribunales de tu domicilio como consumidor, según la normativa europea.
            </p>
          </section>

          {/* Contacto */}
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-lg font-semibold text-white">Contacto</h2>
            <p className="mt-2">
              Para cualquier pregunta sobre estos Términos:
            </p>
            <p className="mt-2 text-indigo-400">
              📧 legal@oneline.app
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}