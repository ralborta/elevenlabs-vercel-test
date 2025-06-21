import { createClient } from '@vercel/kv';

// Duración del caché en segundos (5 minutos)
const CACHE_TTL_SECONDS = 300;

export default async function handler(req, res) {
  const debugInfo = {};

  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const kvUrl = process.env.KV_URL;
    const kvToken = process.env.KV_TOKEN;
    
    debugInfo.env = {
        hasApiKey: !!apiKey,
        hasKvUrl: !!kvUrl,
        hasKvToken: !!kvToken,
    };

    if (!apiKey || !kvUrl || !kvToken) {
        return res.status(500).json({ 
            error: 'Faltan variables de entorno en el servidor de Vercel.', 
            details: 'Asegúrate de que la API Key de ElevenLabs y la base de datos de Vercel KV están conectadas correctamente al proyecto.',
            debug: debugInfo 
        });
    }

    const kvClient = createClient({ url: kvUrl, token: kvToken });
    const { startDate, endDate } = req.query;
    const cacheKey = `v2:conversations:${startDate || 'all'}:${endDate || 'all'}`;
    debugInfo.cache = { key: cacheKey, hit: false };

    let cachedData = await kvClient.get(cacheKey);
    if (cachedData) {
        debugInfo.cache.hit = true;
        cachedData.debug = debugInfo;
        return res.status(200).json(cachedData);
    }

    let allConversations = [];
    let hasMore = true;
    let nextCursor = null;
    let pagesFetched = 0;
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
        
        debugInfo.lastApiUrl = url.toString();

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }
        });
        
        pagesFetched++;
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
    
    debugInfo.api = { pagesFetched, totalConversationsFound: allConversations.length };
    
    const stats = processConversations(allConversations);
    stats.debug = debugInfo;

    await kvClient.set(cacheKey, stats, { ex: CACHE_TTL_SECONDS });
    return res.status(200).json(stats);

  } catch (error) {
    console.error('Error en el backend:', error);
    debugInfo.error = error.message;
    return res.status(500).json({ error: 'Error interno del servidor', debug: debugInfo });
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