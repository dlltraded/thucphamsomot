import { NextRequest, NextResponse } from 'next/server';
import { getZaloConfig } from '@/lib/zalo';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    const { token, userAccessToken } = await request.json();

    if (!token || !userAccessToken) {
      return NextResponse.json(
        { error: 400, message: 'Missing token or userAccessToken' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    const config = await getZaloConfig();
    if (!config || !config.secret_key) {
      return NextResponse.json(
        { error: 500, message: 'Missing Zalo App Secret Key in server configuration' }, 
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('Zalo Decrypt Phone: Fetching profile from graph.zalo.me...');
    
    const response = await fetch('https://graph.zalo.me/v2.0/me/info', {
      method: 'GET',
      headers: {
        'access_token': userAccessToken,
        'code': token,
        'secret_key': config.secret_key,
      },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Zalo Decrypt Phone API failed:', data);
      return NextResponse.json(
        { error: data.error || 500, message: data.message || 'Zalo API error' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      error: 0,
      message: 'Success',
      data: {
        id: data.id,
        name: data.name,
        phone: data.phone || (data.number ? data.number : null),
      }
    }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Zalo Decrypt Phone: Exception occurred:', error);
    return NextResponse.json(
      { error: 500, message: String(error) }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
