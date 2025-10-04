import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userType } = await request.json();
    
    // Use server-side API key (not exposed to client)
    // Falls back to NEXT_PUBLIC version for development
    const apiKey = process.env.DAILY_API_KEY || process.env.NEXT_PUBLIC_DAILY_API_KEY;
    const roomUrl = process.env.NEXT_PUBLIC_DAILY_ROOM_URL;
    
    if (!apiKey || !roomUrl) {
      return NextResponse.json(
        { error: 'Missing Daily API credentials' },
        { status: 500 }
      );
    }
    
    // Extract room name from URL
    const roomName = roomUrl.split('/').pop();
    const isTeacher = userType === 'teacher';
    
    // Create token with appropriate permissions
    const tokenConfig = {
      properties: {
        room_name: roomName,
        user_name: isTeacher ? 'Teacher' : `Student ${Math.floor(Math.random() * 1000)}`,
        is_owner: isTeacher, // Teachers are room owners
        ...(isTeacher && {
          // Give teachers transcription admin permission
          permissions: {
            canAdmin: ['transcription']
          }
        })
      }
    };
    
    const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenConfig),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Daily API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate token', details: error },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json({ token: data.token });
    
  } catch (error: any) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

