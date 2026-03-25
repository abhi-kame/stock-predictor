import { NextResponse } from "next/server";

// Auth disabled for testing — all routes are public
export function middleware() {
  return NextResponse.next();
}
