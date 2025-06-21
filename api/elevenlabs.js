export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const { method } = req;
  const { callId, voiceId } = req.query;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key de ElevenLabs no configurada' });
  }

  const baseUrl = 'https://api.elevenlabs.io/v1';

  try {
    switch (method) {
      case 'GET':
        // Obtener historial de conversaciones
        if (callId) {
          // Obtener una conversación específica
          const response = await fetch(`${baseUrl}/voice-chat/history/${callId}`, {
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ 
              error: 'Error al obtener conversación específica',
              details: errorText
            });
          }
          
          const conversationData = await response.json();
          return res.status(200).json(conversationData);
        } else {
          // Obtener todo el historial
          const response = await fetch(`${baseUrl}/voice-chat/history`, {
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ 
              error: 'Error al obtener historial',
              details: errorText
            });
          }
          
          const historyData = await response.json();
          return res.status(200).json(historyData);
        }

      case 'POST':
        // Crear una nueva conversación
        const { text, voice_id } = req.body;
        
        if (!text || !voice_id) {
          return res.status(400).json({ 
            error: 'Se requiere texto y voice_id para crear una conversación' 
          });
        }

        const createResponse = await fetch(`${baseUrl}/voice-chat/create`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            voice_id
          })
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          return res.status(createResponse.status).json({ 
            error: 'Error al crear conversación',
            details: errorText
          });
        }

        const createData = await createResponse.json();
        return res.status(201).json(createData);

      default:
        return res.status(405).json({ error: 'Método no permitido' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
} 