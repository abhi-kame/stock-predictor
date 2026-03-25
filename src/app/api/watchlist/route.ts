import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json([]);

  try {
    const watchlist = await prisma.watchlist.findMany({
      where: { userId: (session.user as any).id },
      orderBy: { addedAt: 'desc' }
    });
    return NextResponse.json(watchlist);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol, name } = await request.json();

  try {
    const item = await prisma.watchlist.create({
      data: {
        userId: (session.user as any).id,
        symbol,
        name
      }
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol } = await request.json();

  try {
    await prisma.watchlist.deleteMany({
      where: {
        userId: (session.user as any).id,
        symbol
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }
}
