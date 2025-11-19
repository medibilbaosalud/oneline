// src/app/encryption/page.tsx
export const metadata = { title: "Encryption — OneLine" };

const lastUpdated = new Date().toISOString().slice(0, 10);

export default function EncryptionPage() {
  return (
    <main className="prose prose-invert mx-auto max-w-3xl px-6 py-10">
      <h1>Cifrado de extremo a extremo</h1>
      <p>Última actualización: {lastUpdated}</p>

      <p>
        OneLine fue diseñado como un diario privado. Todo el contenido sensible se cifra en tu dispositivo
        con claves que sólo tú controlas y únicamente almacenamos el cifrado más los metadatos necesarios
        para sincronizarlo entre tus dispositivos. Nunca enviamos tu passphrase ni texto plano a nuestros
        servidores.
      </p>

      <h2>Cómo protegemos tus entradas</h2>
      <ol>
        <li>
          Derivamos una clave de cifrado usando tu passphrase local mediante WebCrypto y parámetros que se
          almacenan junto al cifrado (salt, iteraciones y versión de clave).
        </li>
        <li>
          Cada entrada se cifra con AES-GCM antes de salir de tu dispositivo. Guardamos el ciphertext, IVs y
          etiquetas de autenticidad para que puedas verificar que no han sido manipuladas.
        </li>
        <li>
          Nuestros servidores sólo procesan blobs cifrados y nunca reciben la clave que los descifra. Si
          pierdes la passphrase no existe un mecanismo de recuperación porque nosotros tampoco podemos
          leerlos.
        </li>
      </ol>

      <h2>Creación de tu Story anual</h2>
      <p>
        Cuando activas la Story (por ejemplo, la Year Story con Gemini) seguimos el mismo modelo de
        privacidad. El flujo completo ocurre así:
      </p>
      <ol>
        <li>
          Desbloqueas tu diario introduciendo la passphrase. El descifrado ocurre exclusivamente en tu
          navegador o app, nunca en la nube.
        </li>
        <li>
          Seleccionas qué entradas quieres resumir. El cliente genera localmente el prompt estructurado con
          ese texto ya descifrado y lo mantiene sólo en memoria.
        </li>
        <li>
          Ese prompt se envía directamente, cifrado mediante TLS, al endpoint de Gemini que procesa la
          solicitud. Nuestros servidores sólo ven que pediste una Story, pero no reciben el contenido
          descifrado.
        </li>
        <li>
          Gemini devuelve la respuesta (tu Story) por el mismo canal seguro y ésta llega de vuelta a tu
          dispositivo. Ahí la renderizamos y, si decides guardarla, se vuelve a cifrar inmediatamente antes de
          sincronizarla.
        </li>
      </ol>

      <p>
        Gracias a este flujo, el texto descifrado únicamente existe en tu dispositivo y en la memoria efímera
        del proveedor de IA durante la ejecución de la solicitud. En ningún otro punto permanece almacenado o
        se registra en texto plano.
      </p>

      <h2>Transparencia y controles</h2>
      <ul>
        <li>
          Puedes revocar la integración de Gemini en cualquier momento desde los ajustes; la app dejará de
          enviar texto descifrado para Stories hasta que vuelvas a autorizarlo.
        </li>
        <li>
          Cada solicitud requiere tu confirmación explícita y el desbloqueo local del passphrase, así evitamos
          ejecuciones en segundo plano sin tu consentimiento.
        </li>
        <li>
          Toda la telemetría relacionada con Stories es puramente técnica (identificadores de solicitud,
          duración, consumo) y nunca incluye contenido descifrado.
        </li>
      </ul>

      <p>
        Si tienes dudas adicionales escríbenos a
        <a href="mailto:oneline.developerteam@gmail.com"> oneline.developerteam@gmail.com</a>. Estamos
        comprometidos con que tus palabras sólo te pertenezcan a ti.
      </p>
    </main>
  );
}
