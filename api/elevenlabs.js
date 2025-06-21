import { createClient } from '@vercel/kv';

// Duración del caché en segundos (5 minutos)
const CACHE_TTL_SECONDS = 300;

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  // Validar que la API key esté presente
  if (!apiKey) {
    return res.status(400).json({ error: 'API key de ElevenLabs no configurada' });
  }

  // Inicializar cliente de Vercel KV
  const kvClient = createClient({
    url: process.env.KV_URL,
    token: process.env.KV_TOKEN,
  });

  // Leer los parámetros de fecha desde la query de la solicitud
  const { startDate, endDate } = req.query;

  // Clave de caché versionada para forzar una actualización
  const cacheKey = `v2:conversations:${startDate || 'all'}:${endDate || 'all'}`;

  try {
    // 1. Intentar obtener los datos desde el caché
    let cachedData = await kvClient.get(cacheKey);
    if (cachedData) {
      // Cache hit: Devolver los datos cacheados
      return res.status(200).json(cachedData);
    }

    // --- Lógica de paginación ---
    let allConversations = [];
    let hasMore = true;
    let nextCursor = null;
    const baseUrl = 'https://api.elevenlabs.io/v1/convai/conversations';
    const url = new URL(baseUrl);

    // Añadir filtros de fecha
    if (startDate) {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      url.searchParams.append('call_start_after_unix', startTimestamp);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      const endTimestamp = Math.floor(endOfDay.getTime() / 1000);
      url.searchParams.append('call_start_before_unix', endTimestamp);
    }
    url.searchParams.append('page_size', 100);

    while (hasMore) {
      if (nextCursor) {
        url.searchParams.set('cursor', nextCursor);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Devolvemos el error de la API de ElevenLabs para entender qué pasa
        return res.status(response.status).json({ error: "Error desde la API de ElevenLabs", details: errorData });
      }

      const pageData = await response.json();
      if (pageData.conversations) {
        allConversations.push(...pageData.conversations);
      }

      hasMore = pageData.has_more;
      nextCursor = pageData.next_cursor;
    }
    // --- Fin de la lógica de paginación ---

    const stats = processConversations(allConversations);
    
    // 4. Guardar los datos procesados en el caché
    await kvClient.set(cacheKey, stats, { ex: CACHE_TTL_SECONDS });
    
    // 5. Devolver los datos procesados al cliente
    return res.status(200).json(stats);

  } catch (error) {
    console.error('Error en el backend:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

function processConversations(conversations) {
  const totalCalls = conversations.length;
  if (totalCalls === 0) {
    return {
      totalCalls: 0,
      totalDurationSecs: 0,
      averageDurationSecs: 0,
      callsByAgent: {},
      callsOverTime: [],
      conversations: []
    };
  }

  const totalDurationSecs = conversations.reduce((sum, conv) => sum + (conv.call_duration_secs || 0), 0);
  const averageDurationSecs = totalDurationSecs / totalCalls;

  const callsByAgent = conversations.reduce((acc, conv) => {
    const agentName = conv.agent_name || 'Desconocido';
    acc[agentName] = (acc[agentName] || 0) + 1;
    return acc;
  }, {});
  
  const callsOverTime = conversations.reduce((acc, conv) => {
    const date = new Date(conv.start_time_unix_secs * 1000).toISOString().split('T')[0];
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ date: date, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    totalCalls,
    totalDurationSecs,
    averageDurationSecs: Math.round(averageDurationSecs),
    callsByAgent,
    callsOverTime,
    conversations: conversations.sort((a,b) => b.start_time_unix_secs - a.start_time_unix_secs)
  };
} 