import { createClient } from '@vercel/kv';
import { kv } from '@vercel/kv';

const CACHE_TTL_SECONDS = 300; // 5 minutos de caché

// Force redeploy
export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const kvUrl = process.env.KV_URL || process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_TOKEN;

  const missingVars = [];
  if (!apiKey) missingVars.push('ELEVENLABS_API_KEY');
  if (!kvUrl) missingVars.push('KV_URL o KV_REST_API_URL');
  if (!kvToken) missingVars.push('KV_TOKEN');

  if (missingVars.length > 0) {
    const errorMsg = `Error: Faltan las siguientes variables de entorno en Vercel: ${missingVars.join(', ')}.`;
    console.error(errorMsg);
    return res.status(500).json({ 
        error: errorMsg,
        details: 'Por favor, ve a la configuración de tu proyecto en Vercel, sección "Settings" > "Environment Variables" y asegúrate de que están definidas y asignadas al entorno de Producción.'
    });
  }

  try {
    const kvClient = createClient({ url: kvUrl, token: kvToken });
    const { startDate, endDate, force_refresh } = req.query;
    
    // Usamos una clave de caché versionada para poder invalidarla en el futuro si es necesario.
    const cacheKey = `v3:conversations:${startDate || 'all'}:${endDate || 'all'}`;

    let cachedData = await kvClient.get(cacheKey);
    if (cachedData) {
      // Devolver datos del caché inmediatamente si existen.
      return res.status(200).json(cachedData);
    }

    // Si no hay caché, obtener de ElevenLabs con paginación completa.
    let allConversations = [];
    let hasMore = true;
    let nextCursor = null;
    const baseUrl = 'https://api.elevenlabs.io/v1/convai/conversations';
    
    while (hasMore) {
        const url = new URL(baseUrl);
        if (startDate) url.searchParams.append('call_start_after_unix', Math.floor(new Date(startDate).getTime() / 1000));
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            url.searchParams.append('call_start_before_unix', Math.floor(endOfDay.getTime() / 1000));
        }
        url.searchParams.append('page_size', 100);
        if (nextCursor) url.searchParams.set('cursor', nextCursor);
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }
        });
        
        const pageData = await response.json();

        if (!response.ok) {
            throw new Error(`Error de ElevenLabs: ${response.status} - ${JSON.stringify(pageData)}`);
        }

        if (pageData.conversations) {
            allConversations.push(...pageData.conversations);
        }
        hasMore = pageData.has_more;
        nextCursor = pageData.next_cursor;
    }
    
    const stats = processConversations(allConversations);

    // Guardar los resultados procesados en el caché para futuras peticiones.
    await kvClient.set(cacheKey, stats, { ex: CACHE_TTL_SECONDS });
    
    return res.status(200).json(stats);

  } catch (error) {
    console.error('Error en el backend:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}

function processConversations(conversations) {
    const totalCalls = conversations.length;
    if (totalCalls === 0) {
        return { totalCalls: 0, totalDurationSecs: 0, averageDurationSecs: 0, callsByAgent: {}, callsOverTime: [], conversations: [] };
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
        if (existing) { existing.count++; } else { acc.push({ date: date, count: 1 }); }
        return acc;
    }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

    return { totalCalls, totalDurationSecs, averageDurationSecs: Math.round(averageDurationSecs), callsByAgent, callsOverTime, conversations: conversations.sort((a, b) => b.start_time_unix_secs - a.start_time_unix_secs) };
} 