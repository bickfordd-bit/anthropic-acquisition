import { scoreOPTR } from "@/lib/optr";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const intent = await req.json();
  return Response.json(scoreOPTR(intent));
}
