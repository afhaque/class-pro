import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_HACKATHON_KEY;
    
    // Debug: Log the API key (first 20 chars and last 4 chars for security)
    if (apiKey) {
      console.log('OpenAI Hackathon Key loaded:', apiKey.substring(0, 20) + '...' + apiKey.substring(apiKey.length - 4));
      console.log('API Key length:', apiKey.length);
      console.log('First char is quote?', apiKey[0] === '"');
    } else {
      console.log('OpenAI Hackathon Key is NOT loaded');
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI Hackathon API key not configured' },
        { status: 500 }
      );
    }

    // Use OpenAI to detect language
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a language detection assistant. Detect the language of the input text and return ONLY a JSON object with this format: {"languageCode": "code", "languageName": "name"}

Use these language codes:
- en = English
- es = Spanish
- fr = French
- de = German
- zh = Chinese
- ja = Japanese
- ko = Korean
- ar = Arabic
- hi = Hindi
- pt = Portuguese
- ru = Russian
- it = Italian

Return ONLY valid JSON, no other text.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: error
      });
      return NextResponse.json(
        { 
          error: 'Language detection service error',
          details: error.error?.message || 'OpenAI API error',
          status: response.status
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('OpenAI response:', data);
    
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response:', data);
      return NextResponse.json(
        { error: 'No response from language detection service' },
        { status: 500 }
      );
    }

    console.log('Raw content from OpenAI:', content);

    // Parse the JSON response from OpenAI
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Content was:', content);
      return NextResponse.json(
        { error: 'Invalid response format from language detection service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      languageCode: result.languageCode,
      languageName: result.languageName,
    });

  } catch (error) {
    console.error('Language detection error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

