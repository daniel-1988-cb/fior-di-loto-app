import { NextResponse } from "next/server";
import { getClientInteractions } from "@/lib/actions/clients";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const rows = await getClientInteractions(id);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
