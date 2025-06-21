import { createClient } from '@vercel/kv';
import { getVersionConfig, DEFAULT_VERSION } from './versions/config.js';

const CACHE_TTL_SECONDS = 300; // 5 minutos de caché

export default async function handler(req, res) {
  try {
    const { version = DEFAULT_VERSION } = req.query;
    const versionConfig = getVersionConfig(version);

    if (!versionConfig || !versionConfig.name) {
      throw new Error(`Versión no configurada o inválida: ${version}`);
    }

    // Importa dinámicamente el handler de la versión solicitada
    // La ruta es relativa a la ubicación de este archivo
    const versionModule = await import(`./versions/${versionConfig.name}/elevenlabs.js`);
    const versionHandler = versionModule.default;

    if (typeof versionHandler !== 'function') {
      throw new Error(`El handler para la versión '${versionConfig.name}' no es una función.`);
    }

    console.log(`Enrutando a la versión de la API: ${versionConfig.name}`);

    // Eliminamos el parámetro 'version' de la query para que no interfiera
    // con la lógica del handler específico de la versión.
    const { version: _, ...originalQuery } = req.query;
    req.query = originalQuery;

    // Ejecuta directamente el handler de la versión correspondiente
    return await versionHandler(req, res);

  } catch (error) {
    console.error('Error en el router de versiones:', error.stack);
    res.status(500).json({ 
      error: 'Error crítico en el router de la API.',
      details: error.message,
      _version: 'router'
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