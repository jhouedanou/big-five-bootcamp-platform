import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Middleware désactivé pour la démo
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: []
}
