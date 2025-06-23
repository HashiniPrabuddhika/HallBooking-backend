import { NextRequest, NextResponse } from "next/server";
import { addBooking } from "../../../../lib/booking";

export async function POST(req: NextRequest) {
  const data = await req.json();
  const result = await addBooking(data);
  return NextResponse.json(result);
}
