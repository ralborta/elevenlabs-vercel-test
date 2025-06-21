import { createClient } from '@vercel/kv';

const CACHE_TTL_SECONDS = 300; // 5 minutos de caché

export default async function handler(req, res) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const kvUrl = process.env.KV_URL;
    const kvToken = process.env.KV_TOKEN;

    if (!apiKey || !kvUrl || !kvToken) {
      return res.status(500).json({ error: 'Faltan variables de entorno del servidor. Asegúrate de conectar Vercel KV y la API Key.' });
    }

    const kvClient = createClient({ url: kvUrl, token: kvToken });
    const { startDate, endDate, force_refresh } = req.query;
    
    const cacheKey = `v2:conversations:${startDate || 'all'}:${endDate || 'all'}`;

    if (force_refresh !== 'true') {
      const cachedData = await kvClient.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(cachedData);
      }
    }

    const allConversations = await fetchAllPages(apiKey, startDate, endDate);
    const processedData = processConversations(allConversations);

    await kvClient.set(cacheKey, processedData, { ex: CACHE_TTL_SECONDS });
    
    res.status(200).json(processedData);

  } catch (error) {
    console.error('Error en el API handler:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la solicitud.', details: error.message });
  }
}

async function fetchAllPages(apiKey, startDate, endDate) {
  let allConversations = [];
  let nextUrl = `https://api.elevenlabs.io/v1/convai/conversations`;
  const params = new URLSearchParams();
  if(startDate) params.append('start_date', startDate);
  if(endDate) params.append('end_date', endDate);
  
  const initialParams = params.toString();
  if (initialParams) {
    nextUrl += `?${initialParams}`;
  }

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { 'xi-api-key': apiKey }
    });
    
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error de la API de ElevenLabs: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    allConversations = allConversations.concat(data.conversations);
    
    // La API no parece tener paginación para este endpoint, por lo que el bucle se ejecutará una vez.
    // Se mantiene como una salvaguarda por si se añade en el futuro.
    nextUrl = null; 
  }

  return allConversations;
}

function processConversations(conversations) {
  if (!conversations || conversations.length === 0) {
    return {
      totalCalls: 0,
      avgDurationSeconds: 0,
      totalDurationSeconds: 0,
      callsByProvider: {},
      callsOverTime: {},
      detailedCalls: []
    };
  }

  const totalDurationSeconds = conversations.reduce((acc, call) => acc + (call.end_time - call.start_time), 0);
  
  const callsByProvider = conversations.reduce((acc, call) => {
    const provider = call.provider || 'Desconocido';
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});

  const callsOverTime = conversations.reduce((acc, call) => {
    const date = new Date(call.start_time * 1000).toISOString().split('T')[0]; // Agrupar por día
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const detailedCalls = conversations.map(call => ({
    id: call.conversation_id,
    startTime: new Date(call.start_time * 1000).toLocaleString(),
    endTime: new Date(call.end_time * 1000).toLocaleString(),
    duration: call.end_time - call.start_time,
    provider: call.provider || 'Desconocido'
  })).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  return {
    totalCalls: conversations.length,
    avgDurationSeconds: totalDurationSeconds / conversations.length,
    totalDurationSeconds: totalDurationSeconds,
    callsByProvider: callsByProvider,
    callsOverTime: Object.fromEntries(Object.entries(callsOverTime).sort()), // Ordenar por fecha
    detailedCalls: detailedCalls
  };
} 