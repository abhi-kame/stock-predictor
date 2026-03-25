import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json([]);

  try {
    const alerts = await prisma.alert.findMany({
      where: { userId: (session.user as any).id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(alerts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol, targetPrice, direction } = await request.json();

  try {
    const alert = await prisma.alert.create({
      data: {
        userId: (session.user as any).id,
        symbol,
        targetPrice,
        direction: direction, // ABOVE or BELOW
        isActive: true
      }
    });
    return NextResponse.json(alert);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
