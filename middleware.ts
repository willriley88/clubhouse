import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Only the club social feed requires login
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/club/:path*']
}