import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing text or target language' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Use OpenAI to detect language and translate if necessary
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
            content: `You are a language detection and translation assistant. 
Your task is to:
1. Detect the language of the input text
2. Determine if the detected language matches the target language code
3. If they don't match, translate the text to the target language
4. Return a JSON response with: {"detectedLanguage": "code", "needsTranslation": boolean, "translatedText": "text or null"}

Language codes: en=English, es=Spanish, fr=French, de=German, zh=Chinese, ja=Japanese, ko=Korean, ar=Arabic, hi=Hindi, pt=Portuguese, ru=Russian, it=Italian

IMPORTANT: Return ONLY valid JSON, no other text.`
          },
          {
            role: 'user',
            content: `Target language: ${targetLanguage}\nText to analyze: ${text}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Translation service error' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from translation service' },
        { status: 500 }
      );
    }

    // Parse the JSON response from OpenAI
    const result = JSON.parse(content);

    return NextResponse.json({
      detectedLanguage: result.detectedLanguage,
      needsTranslation: result.needsTranslation,
      translatedText: result.translatedText,
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

