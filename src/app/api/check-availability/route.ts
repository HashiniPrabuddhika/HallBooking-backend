import { NextRequest, NextResponse } from "next/server";
import { checkAvailability } from "../../../../lib/booking";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room_name = searchParams.get("room_name")!;
  const date = searchParams.get("date")!;
  const start_time = searchParams.get("start_time")!;
  const end_time = searchParams.get("end_time")!;

  const result = await checkAvailability({ room_name, date, start_time, end_time });
  return NextResponse.json(result);
}
