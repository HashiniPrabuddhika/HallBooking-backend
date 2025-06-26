export const API_ROUTES = {

  ASK_LLM: "/api/ask-llm",

  BOOK: "/api/book",

  CHECK_AVAILABILITY: (
    room_name: string,
    date: string,
    start_time: string,
    end_time: string
  ) =>
    `/api/check-availability?room_name=${encodeURIComponent(
      room_name
    )}&date=${date}&start_time=${start_time}&end_time=${end_time}`,
    
};