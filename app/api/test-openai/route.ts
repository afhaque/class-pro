import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_HACKATHON_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          status: 'error',
          message: 'OPENAI_HACKATHON_KEY environment variable is not set'
        },
        { status: 500 }
      );
    }

    // Simple test call to OpenAI
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
            role: 'user',
            content: 'Say "API key works!"'
          }
        ],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { 
          status: 'error',
          message: 'OpenAI API returned an error',
          statusCode: response.status,
          error: error
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      status: 'success',
      message: 'OpenAI API key is working correctly!',
      response: data.choices[0]?.message?.content || 'No content',
      model: data.model,
      usage: data.usage
    });

  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Error testing OpenAI API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

