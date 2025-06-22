// api/versions/v1/elevenlabs.js
// Versión que imprime los datos crudos en los logs del servidor para una depuración más sencilla.

export default async function handler(req, res) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Falta la variable de entorno ELEVENLABS_API_KEY.' });
    }

    // 1. Apuntamos al endpoint CONFIRMADO por el usuario.
    const url = 'https://api.elevenlabs.io/v1/history';

    // 2. Hacemos la llamada.
    const response = await fetch(url, {
      headers: { 
        'xi-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error de la API de ElevenLabs (${response.status}): ${errorBody}`);
    }

    // 3. Devolvemos los datos crudos, sin tocar.
    const rawData = await response.json();

    // 4. ¡IMPORTANTE! Imprimimos los datos en los logs del servidor para poder verlos.
    console.log("=== INICIO DE DATOS CRUDOS DE ELEVENLABS ===");
    console.log(JSON.stringify(rawData, null, 2));
    console.log("=== FIN DE DATOS CRUDOS DE ELEVENLABS ===");

    // 5. Enviamos la respuesta al navegador (aunque no la usaremos por ahora).
    res.status(200).json(rawData);

  } catch (error) {
    console.error('Error en el API handler v1:', error);
    res.status(500).json({ error: 'Error interno del servidor en la v1.', details: error.message });
  }
} 