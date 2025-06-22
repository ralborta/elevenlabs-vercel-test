// api/versions/v1/elevenlabs.js
// Versión que imprime los datos crudos en los logs del servidor para una depuración más sencilla.

function processHistory(history) {
  if (!history || history.length === 0) {
    return {
      totalCalls: 0,
      avgDurationSeconds: 0,
      totalDurationSeconds: 0,
      callsByProvider: {},
      callsOverTime: {},
      detailedCalls: []
    };
  }

  // Como es un historial de TTS, la duración no aplica. La marcamos como 0.
  const totalDurationSeconds = 0;

  const callsByProvider = history.reduce((acc, item) => {
    const provider = item.voice_name || 'Desconocido';
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});

  const callsOverTime = history.reduce((acc, item) => {
    const date = new Date(item.date_unix * 1000).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const detailedCalls = history.map(item => ({
    id: item.history_item_id,
    startTime: new Date(item.date_unix * 1000).toLocaleString(),
    // No hay hora de fin ni duración en los eventos de TTS
    endTime: new Date(item.date_unix * 1000).toLocaleString(),
    duration: 0, 
    provider: item.voice_name || 'Desconocido',
    text: item.text // Añadimos el texto generado para mostrarlo en el dashboard
  })).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return {
    totalCalls: history.length,
    avgDurationSeconds: 0,
    totalDurationSeconds: 0,
    callsByProvider,
    callsOverTime: Object.fromEntries(Object.entries(callsOverTime).sort()),
    detailedCalls
  };
}

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
    const processedData = processHistory(rawData.history);
    
    // 4. ¡IMPORTANTE! Imprimimos los datos en los logs del servidor para poder verlos.
    console.log("=== INICIO DE DATOS CRUDOS DE ELEVENLABS ===");
    console.log(JSON.stringify(processedData, null, 2));
    console.log("=== FIN DE DATOS CRUDOS DE ELEVENLABS ===");

    // 5. Enviamos la respuesta al navegador (aunque no la usaremos por ahora).
    res.status(200).json(processedData);

  } catch (error) {
    console.error('Error en el API handler v1:', error);
    res.status(500).json({ error: 'Error interno del servidor en la v1.', details: error.message });
  }
} 