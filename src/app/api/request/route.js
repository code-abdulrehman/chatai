// app/api/request/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const {
      model,
      apiKey,
      message,
      systemMessage = "You are a helpful AI assistant.",
      temperature = 0.7,
      maxTokens = 1024,
      customApiUrl
    } = await request.json();

    if (!model || !apiKey || !message) {
      return NextResponse.json(
        {
          error: "Missing required fields: model, apiKey, and message are required."
        },
        { status: 400 }
      );
    }

    // Use a more streamlined system message that doesn't create those "Response" and "Tasks & Code" sections
    const enhancedSystemMessage = `${systemMessage}
You are a helpful assistant. Provide direct, clear responses without using section headers like "Response" or "Tasks & Code".`;

    let apiResponse;
    const startTime = Date.now();
    
    // Handle different model APIs
    if (model.startsWith('claude')) {
      // Claude API request
      const anthropicUrl = 'https://api.anthropic.com/v1/messages';
      const response = await fetch(anthropicUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          temperature: temperature,
          system: enhancedSystemMessage,
          messages: [{ role: 'user', content: message }]
        })
      });

      apiResponse = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: "API Request Failed", details: apiResponse.error?.message || "Unknown error" },
          { status: response.status }
        );
      }

      // Format the response
      return NextResponse.json({
        content: apiResponse.content[0].text,
        model: model,
        usage: apiResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        timing: Date.now() - startTime
      });
    }
    else if (model.startsWith('gpt')) {
      // OpenAI API
      const openaiUrl = 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(openaiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: enhancedSystemMessage },
            { role: 'user', content: message }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        })
      });

      apiResponse = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: "API Request Failed", details: apiResponse.error?.message || "Unknown error" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        content: apiResponse.choices[0].message.content,
        model: model,
        usage: apiResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        timing: Date.now() - startTime
      });
    }
    else if (model.startsWith('gemini')) {
      // Google AI API for Gemini models
      const googleUrl = 'https://generativelanguage.googleapis.com/v1/models/' + model + ':generateContent';
      const response = await fetch(`${googleUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${enhancedSystemMessage}\n\nUser query: ${message}` }
              ]
            }
          ],
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: maxTokens
          }
        })
      });

      apiResponse = await response.json();

      if (!response.ok || apiResponse.error) {
        return NextResponse.json(
          { error: "API Request Failed", details: apiResponse.error?.message || "Unknown error" },
          { status: response.status || 500 }
        );
      }

      // Extract content from Google's response format
      const content = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";

      return NextResponse.json({
        content: content,
        model: model,
        usage: { total_tokens: apiResponse.usageMetadata?.totalTokenCount || 0 },
        timing: Date.now() - startTime
      });
    }
    else if (model.startsWith('llama')) {
      // Groq API for Llama models
      const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
      const response = await fetch(groqUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: enhancedSystemMessage },
            { role: 'user', content: message }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        })
      });

      apiResponse = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: "API Request Failed", details: apiResponse.error?.message || "Unknown error" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        content: apiResponse.choices[0].message.content,
        model: model,
        usage: apiResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        timing: Date.now() - startTime
      });
    }
    else if (model === 'custom' && customApiUrl) {
      // Custom API request logic
      const response = await fetch(customApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          message: message,
          system: enhancedSystemMessage,
          temperature: temperature,
          max_tokens: maxTokens
        })
      });

      apiResponse = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: "API Request Failed", details: "Custom API error" },
          { status: response.status }
        );
      }

      // Return the response (assuming a standard format, adjust as needed)
      return NextResponse.json({
        content: apiResponse.content || apiResponse.text || apiResponse.message || "Response received from custom API",
        model: 'custom',
        usage: apiResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        timing: Date.now() - startTime
      });
    }
    else {
      // For demo purposes or unknown models, return a simulated response
      return NextResponse.json({
        content: `I'm responding to your message: "${message}"`,
        model: model,
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        timing: 500
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: "API Request Failed", details: error.message },
      { status: 500 }
    );
  }
}