export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const { callId } = req.query;

  let url = 'https://api.elevenlabs.io/v1/voice-chat/history';
  if (callId) {
    url += `/${callId}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de ElevenLabs:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Error al conectarse con ElevenLabs',
        details: errorText,
        status: response.status
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
