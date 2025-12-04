# Guía Paso a Paso: Generar tu App Android (AAB)

Sigue estos pasos detallados para convertir tu proyecto en un archivo listo para Google Play Store.

## Paso 0: Preparación (Ya realizado por mí)
He sincronizado tu última configuración (la URL de Vercel) con el proyecto Android.

## Paso 1: Instalar Android Studio
1.  Ve a [developer.android.com/studio](https://developer.android.com/studio).
2.  Descarga e instala **Android Studio Ladybug** (o la versión más reciente).
3.  Durante la instalación, asegúrate de marcar "Android SDK" y "Android Virtual Device" si te lo pide.
4.  Abre Android Studio y completa el asistente de configuración inicial (Standard settings está bien).

## Paso 2: Abrir el Proyecto
1.  En la pantalla de bienvenida de Android Studio, haz clic en **Open**.
2.  Navega hasta la carpeta de tu proyecto:
    `c:\Users\aitor\Downloads\oneline-codex-fix-creation-logic-for-user-vaults\mobile-build\android`
    *(Asegúrate de seleccionar la carpeta `android` dentro de `mobile-build`, no la carpeta raíz).*
3.  Haz clic en **OK**.
4.  **ESPERA**: Abajo a la derecha verás una barra de progreso que dice "Gradle Sync". **Deja que termine**. Puede tardar 5-10 minutos la primera vez.

## Paso 3: Generar el Archivo Firmado (Signed Bundle)
Una vez que la barra de progreso haya terminado y no haya errores rojos:

1.  En el menú superior, ve a **Build** > **Generate Signed Bundle / APK...**
2.  Selecciona **Android App Bundle** y dale a **Next**.
3.  En "Key store path", probablemente esté vacío. Haz clic en **Create new...** debajo del campo.
    *   **Key store path:** Elige una carpeta segura (ej. Documentos) y dale un nombre (ej. `mi-app-key.jks`).
    *   **Password:** Inventa una contraseña segura y **apúntala**.
    *   **Confirm:** Repite la contraseña.
    *   **Alias:** Puedes dejarlo como `key0` o poner `upload`.
    *   **Key Password:** Misma contraseña que antes.
    *   **Certificate:** Rellena al menos "First and Last Name" (tu nombre) y "Country Code" (ES).
    *   Dale a **OK**.
4.  De vuelta en la ventana anterior, asegúrate de que "Remember passwords" esté marcado y dale a **Next**.
5.  Selecciona **release** en la lista de variantes.
6.  Haz clic en **Create**.

## Paso 4: Encontrar tu archivo
1.  Android Studio trabajará un rato (verás "Gradle Build Running" abajo).
2.  Cuando termine, aparecerá una ventanita emergente abajo a la derecha: "Generate Signed Bundle".
3.  Haz clic en la palabra azul **locate**.
4.  Se abrirá una carpeta con un archivo llamado `app-release.aab`.

¡Ese archivo `app-release.aab` es el que tienes que subir a la Google Play Console!
