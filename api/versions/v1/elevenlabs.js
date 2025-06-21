import { createClient } from '@vercel/kv';

const CACHE_TTL_SECONDS = 300; // 5 minutos de caché

export default async function handler(req, res) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Falta la variable de entorno ELEVENLABS_API_KEY del servidor.' });
    }

    // Lógica de caché deshabilitada temporalmente
    /* 
    const kvUrl = process.env.KV_URL;
    const kvToken = process.env.KV_TOKEN;

    if (!kvUrl || !kvToken) {
      // No bloqueamos, solo lo notificamos en consola por ahora
      console.warn("Vercel KV no está configurado. La caché está deshabilitada.");
    } else {
      const kvClient = createClient();
      const { force_refresh } = req.query;
      const cacheKey = `v1:conversations:${startDate || 'all'}:${endDate || 'all'}`;

      if (force_refresh !== 'true') {
        const cachedData = await kvClient.get(cacheKey);
        if (cachedData) {
          console.log("Sirviendo respuesta desde la caché de Vercel KV.");
          return res.status(200).json(cachedData);
        }
      }
    }
    */

    const { startDate, endDate } = req.query;
    // IGNORANDO FILTROS TEMPORALMENTE PARA DEPURACIÓN
    console.log(`Recibidas fechas de filtro (ignoradas por ahora): ${startDate}, ${endDate}`);
    const allConversations = await fetchAllPages(apiKey, null, null);
    const processedData = processConversations(allConversations);

    // Guardado en caché deshabilitado temporalmente
    /*
    if (process.env.KV_URL && process.env.KV_TOKEN) {
       const kvClient = createClient();
       const cacheKey = `v1:conversations:${startDate || 'all'}:${endDate || 'all'}`;
       await kvClient.set(cacheKey, processedData, { ex: CACHE_TTL_SECONDS });
       console.log("Respuesta guardada en la caché de Vercel KV.");
    }
    */
    
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

  // Filtra conversaciones para asegurar que tengan timestamps válidos y numéricos
  const validConversations = conversations.filter(call => {
    const hasValidTimestamps = call && 
                               typeof call.start_time === 'number' && 
                               typeof call.end_time === 'number' &&
                               !isNaN(call.start_time) && 
                               !isNaN(call.end_time);
    if (!hasValidTimestamps) {
      console.warn('Se ignora una conversación por tener timestamps inválidos:', call);
    }
    return hasValidTimestamps;
  });

  if (validConversations.length === 0) {
    return { totalCalls: 0, avgDurationSeconds: 0, totalDurationSeconds: 0, callsByProvider: {}, callsOverTime: {}, detailedCalls: [] };
  }

  const totalDurationSeconds = validConversations.reduce((acc, call) => acc + (call.end_time - call.start_time), 0);
  
  const callsByProvider = validConversations.reduce((acc, call) => {
    const provider = call.provider || 'Desconocido';
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});

  const callsOverTime = validConversations.reduce((acc, call) => {
    const date = new Date(call.start_time * 1000).toISOString().split('T')[0]; // Agrupar por día
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const detailedCalls = validConversations.map(call => ({
    id: call.conversation_id,
    startTime: new Date(call.start_time * 1000).toLocaleString(),
    endTime: new Date(call.end_time * 1000).toLocaleString(),
    duration: call.end_time - call.start_time,
    provider: call.provider || 'Desconocido'
  })).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  return {
    totalCalls: validConversations.length,
    avgDurationSeconds: totalDurationSeconds / validConversations.length,
    totalDurationSeconds: totalDurationSeconds,
    callsByProvider: callsByProvider,
    callsOverTime: Object.fromEntries(Object.entries(callsOverTime).sort()), // Ordenar por fecha
    detailedCalls: detailedCalls
  };
} 