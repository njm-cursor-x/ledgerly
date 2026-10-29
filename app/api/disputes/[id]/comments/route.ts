import { NextResponse } from "next/server";
import { createDisputeComment, listDisputeComments } from "@/lib/data";

function pageFrom(request: Request) {
  const raw = new URL(request.url).searchParams.get("page");
  const page = Number(raw ?? "1");
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await listDisputeComments(id, pageFrom(request));
  if (!comments) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }
  return NextResponse.json(comments);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: { body?: unknown } = {};
  try {
    payload = (await request.json()) as { body?: unknown };
  } catch {
    payload = {};
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  const comment = await createDisputeComment(id, body);
  if (!comment) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }
  return NextResponse.json({ comment });
}
