import { createClient } from '@vercel/kv';

const CACHE_TTL_SECONDS = 300; // 5 minutos de caché

export default async function handler(req, res) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const kvUrl = process.env.KV_URL;
    const kvToken = process.env.KV_TOKEN;

    if (!apiKey || !kvUrl || !kvToken) {
      return res.status(500).json({ error: 'Para ejecutar este paso de depuración, por favor, asegúrate de que las variables de entorno de Vercel KV (KV_URL, KV_TOKEN) y ELEVENLABS_API_KEY estén configuradas en los ajustes de tu proyecto en Vercel.' });
    }

    // 1. Traemos todo, como pediste.
    const allConversations = await fetchAllPages(apiKey, null, null);
    
    // 2. Guardamos los datos crudos en la DB volátil (Vercel KV) para poder verlos.
    const kvClient = createClient({ url: kvUrl, token: kvToken });
    const debugKey = "debug:raw-conversations-data";
    await kvClient.set(debugKey, allConversations);
    
    // 3. Ahora, intentamos procesar los datos. Si esto falla, los datos ya están guardados.
    const processedData = processConversations(allConversations);
    
    res.status(200).json(processedData);

  } catch (error) {
    console.error('Error en el API handler, pero los datos crudos han sido guardados en KV.', error);
    res.status(500).json({ 
      error: 'Error interno del servidor, pero los datos crudos fueron guardados en Vercel KV para su inspección.', 
      details: `Revisa la clave 'debug:raw-conversations-data' en tu dashboard de Vercel KV. Error original: ${error.message}`
    });
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
    nextUrl = null; 
  }

  return allConversations;
}

function processConversations(conversations) {
  // Sin filtros, como pediste. Dejamos que se rompa si los datos son malos.
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
    const date = new Date(call.start_time * 1000).toISOString().split('T')[0];
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
    callsOverTime: Object.fromEntries(Object.entries(callsOverTime).sort()),
    detailedCalls: detailedCalls
  };
} 