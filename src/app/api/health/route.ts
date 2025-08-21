import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Проверяем что приложение работает
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'protekauto-cms'
    })
  } catch {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Service unavailable',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 