export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  // Validar que la API key esté presente
  if (!apiKey) {
    return res.status(400).json({ error: 'API key de ElevenLabs no configurada' });
  }

  // Leer los parámetros de fecha desde la query de la solicitud
  const { startDate, endDate } = req.query;

  // Construir la URL base
  const baseUrl = 'https://api.elevenlabs.io/v1/convai/conversations';
  const url = new URL(baseUrl);

  // Añadir los filtros de fecha si existen
  if (startDate) {
    // Convertir la fecha a timestamp Unix en segundos (al inicio del día)
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    url.searchParams.append('call_start_after_unix', startTimestamp);
  }
  if (endDate) {
    // Para la fecha de fin, tomamos el final del día para incluirlo completo
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    const endTimestamp = Math.floor(endOfDay.getTime() / 1000);
    url.searchParams.append('call_start_before_unix', endTimestamp);
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Reenviar la respuesta de ElevenLabs, sea exitosa o de error
    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Error en el proxy a ElevenLabs:', error);
    return res.status(500).json({ error: 'Error interno del servidor al contactar ElevenLabs' });
  }
} 