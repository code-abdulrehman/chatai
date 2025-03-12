// pages/api/request.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const {
      model,
      apiKey,
      message,
      systemMessage = "You are a helpful AI assistant.",
      temperature = 0.7,
      maxTokens = 1024,
      customApiUrl
    } = req.body;
    if (!model || !apiKey || !message) {
      return res.status(400).json({
        error: "Missing required fields: model, apiKey, and message are required."
      });
    }
    // Insert your model handling logic here.
    // For now, we return a dummy response.
    return res.status(200).json({
      content: `You sent: ${message}`,
      model: model,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      timing: 0
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: "API Request Failed", details: error.message });
  }
}
