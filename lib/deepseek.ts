export async function callDeepSeek(prompt: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY2}`,
      "Content-Type": "application/json",
      "X-Title": "HBA"
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1-0528:free",
      messages: [
        {
          role: "system",
          content: "You extract structured data from room availability questions. Output JSON with action, room_name, date, start_time, end_time.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("DeepSeek API Error:", response.status, errorText);
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  console.log("DeepSeek raw response:", JSON.stringify(data, null, 2));

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error("Invalid response structure from DeepSeek");
  }

  return data.choices[0].message.content;
}
