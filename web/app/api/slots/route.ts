import { NextResponse, type NextRequest } from "next/server";
import { availableSlots, getActiveService } from "@/lib/booking";
import { getPublishedTrainer } from "@/lib/trainer";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const slug = params.get("slug") ?? "";
  const serviceId = params.get("serviceId") ?? "";
  const date = params.get("date") ?? "";

  const trainer = await getPublishedTrainer(slug);
  if (!trainer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const service = await getActiveService(trainer.id, serviceId);
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const slots = await availableSlots(trainer, service, date);
  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) }, { headers: { "Cache-Control": "no-store" } });
}
