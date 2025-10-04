import { NextRequest, NextResponse } from 'next/server';

// Language code mapping
const LANGUAGE_NAMES: { [key: string]: string } = {
  'EN': 'English',
  'ES': 'Spanish',
  'FR': 'French',
  'DE': 'German',
  'ZH': 'Chinese',
  'JA': 'Japanese',
  'KO': 'Korean',
  'AR': 'Arabic',
  'HI': 'Hindi',
  'PT': 'Portuguese',
  'RU': 'Russian',
  'IT': 'Italian',
};

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing text or target language' },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPL_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepL API key not configured' },
        { status: 500 }
      );
    }

    console.log('DeepL translation request:', { targetLanguage, hasSource: !!sourceLanguage });

    // Determine if using free or pro API based on key suffix
    const isFreeApi = apiKey.endsWith(':fx');
    const baseUrl = isFreeApi 
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    // Map language codes to DeepL format (uppercase)
    const targetLang = targetLanguage.toUpperCase();
    
    // Build request body
    const body = new URLSearchParams({
      auth_key: apiKey,
      text: text,
      target_lang: targetLang,
    });

    // Add source language if provided
    if (sourceLanguage) {
      body.append('source_lang', sourceLanguage.toUpperCase());
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('DeepL API error:', error);
      return NextResponse.json(
        { error: 'Translation service error', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.translations || data.translations.length === 0) {
      return NextResponse.json(
        { error: 'No translation returned' },
        { status: 500 }
      );
    }

    const translation = data.translations[0];
    const detectedLang = translation.detected_source_language;
    
    console.log('DeepL response:', {
      detectedLanguage: detectedLang,
      targetLanguage: targetLang,
      translated: translation.text !== text
    });

    // Check if the detected language matches the target language
    const needsTranslation = detectedLang !== targetLang;

    return NextResponse.json({
      translatedText: needsTranslation ? translation.text : null,
      detectedSourceLanguage: detectedLang,
      detectedLanguageName: LANGUAGE_NAMES[detectedLang] || detectedLang,
      needsTranslation: needsTranslation,
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

