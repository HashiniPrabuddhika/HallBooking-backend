import { NextRequest, NextResponse } from "next/server";
import { callDeepSeek } from "../../../../lib/deepseek";
import { checkAvailability, addBooking } from "../../../../lib/booking";

// Supported actions
const supportedActions = ["check_availability", "add_booking", "cancel_booking"];

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  // Construct a structured prompt for DeepSeek
  const prompt = `
You are an intelligent assistant that helps manage room bookings.

From the following user request:
"${question}"

Extract the **action** and its corresponding **parameters** in **strict JSON format**.

Supported actions:
- "check_availability"
- "add_booking"
- "cancel_booking"

Required JSON structure:
{
  "action": "check_availability" | "add_booking" | "cancel_booking",
  "parameters": {
    "room_name": "...",
    "date": "yyyy-mm-dd",
    "start_time": "HH:MM",
    "end_time": "HH:MM",
    "booking_id": "..."  // Only for cancel_booking
  }
}

Respond in **JSON only**, without explanation.
`;

  let llmRaw: string;

  try {
    llmRaw = await callDeepSeek(prompt);
    console.log("🔁 Raw LLM Response:", llmRaw);
  } catch (error) {
    return NextResponse.json({ error: "Failed to call LLM", detail: String(error) }, { status: 500 });
  }

  try {
    // Clean up markdown formatting like ```json blocks
    const cleaned = llmRaw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    console.log("🧹 Cleaned JSON to parse:", cleaned);

    let parsed = JSON.parse(cleaned);

    // If no parameters object, reconstruct it manually
    if (!parsed.parameters) {
      parsed = {
        action: parsed.action,
        parameters: {
          room_name: parsed.room_name,
          date: parsed.date,
          start_time: parsed.start_time,
          end_time: parsed.end_time,
          booking_id: parsed.booking_id ?? null,
        },
      };
    }

    let { action, parameters } = parsed;

    // Normalize action
    let normalizedAction = action.toLowerCase();
    if (normalizedAction === "book") normalizedAction = "add_booking";

    if (!supportedActions.includes(normalizedAction)) {
      return NextResponse.json({ error: "Unsupported action", action: normalizedAction }, { status: 400 });
    }

    // Handle action types
    if (normalizedAction === "check_availability") {
      const result = await checkAvailability(parameters);
      return NextResponse.json(result);
    }

    if (normalizedAction === "add_booking") {
      const result = await addBooking({
        ...parameters,
        created_by: parameters.created_by ?? "system",
      });
      return NextResponse.json(result);
    }

    // Cancel booking — not implemented yet
    if (normalizedAction === "cancel_booking") {
      return NextResponse.json({ error: "Cancel booking not implemented" }, { status: 501 });
    }

  } catch (error) {
    console.error("❌ JSON Parse or Logic Error:", error);
    return NextResponse.json({ error: "LLM Response Parse Error", detail: String(error) }, { status: 500 });
  }
}
