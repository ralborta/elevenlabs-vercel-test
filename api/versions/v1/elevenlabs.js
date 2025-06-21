// api/versions/v1/elevenlabs.js
// Versión simplificada que apunta al endpoint de Voice Chat History

export default async function handler(req, res) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Falta la variable de entorno ELEVENLABS_API_KEY.' });
    }

    // 1. Apuntamos al endpoint que parece ser el correcto.
    const url = 'https://api.elevenlabs.io/v1/voice-chat/history';

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

    // 3. Devolvemos los datos crudos, sin tocar, como pediste.
    const rawData = await response.json();
    res.status(200).json(rawData);

  } catch (error) {
    console.error('Error en el API handler v1:', error);
    res.status(500).json({ error: 'Error interno del servidor en la v1.', details: error.message });
  }
} 