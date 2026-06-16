import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Zalo Webhook Event:', body);
    
    // Zalo yêu cầu trả về HTTP 200 OK
    return NextResponse.json({ error: 0, message: "Success" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: -1, message: "Internal Error" }, { status: 200 });
  }
}
