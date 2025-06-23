import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface BookingParams {
  room_name: string;
  date: string;
  start_time: string;
  end_time: string;
  created_by?: string;
}

function toUnix(date: string, time: string): number {
  return Math.floor(new Date(`${date}T${time}:00`).getTime() / 1000);
}

export async function checkAvailability({ room_name, date, start_time, end_time }: BookingParams) {
  try {
    console.log("Checking availability for room:", room_name);
    
    const room = await prisma.mrbsroom.findUnique({ 
      where: { room_name } 
    });
    
    if (!room) {
      console.log("Room not found:", room_name);
      return { available: false, message: "Room not found" };
    }

    console.log("Room found:", room);

    const start_ts = toUnix(date, start_time);
    const end_ts = toUnix(date, end_time);

    console.log("Time range:", { start_ts, end_ts, date, start_time, end_time });

    const conflict = await prisma.mrbsentry.findFirst({
      where: {
        roomId: room.id,
        start_time: { lt: end_ts },
        end_time: { gt: start_ts },
      },
    });

    if (conflict) {
      console.log("❌ Conflict found:", conflict);
      return { available: false, message: "Room is NOT available at that time." };
    }

    return { available: true, message: "Room is available." };
  } catch (error) {
    console.error("❌ Error checking availability:", error);
    return { available: false, message: "Error checking availability" };
  }
}

export async function addBooking({ room_name, date, start_time, end_time, created_by = "system" }: BookingParams) {
  try {
    if (!room_name || !date || !start_time || !end_time) {
      throw new Error("Missing required booking parameters");
    }

    console.log("Searching for room:", room_name);
    
    const room = await prisma.mrbsroom.findUnique({ 
      where: { room_name } 
    });

    if (!room) {
      console.error("Room not found:", room_name);
      throw new Error(`Room '${room_name}' not found in database.`);
    }

    console.log("Room found:", room);
    console.log("Room ID type and value:", typeof room.id, room.id);

    if (!room.id || typeof room.id !== "number") {
      console.error("Invalid room ID:", room.id);
      throw new Error(`Invalid room ID for room '${room_name}'`);
    }

    const start_ts = toUnix(date, start_time);
    const end_ts = toUnix(date, end_time);

    console.log("Booking time range:", { start_ts, end_ts, date, start_time, end_time });

    const conflict = await prisma.mrbsentry.findFirst({
      where: {
        roomId: room.id,
        start_time: { lt: end_ts },
        end_time: { gt: start_ts },
      },
    });

    if (conflict) {
      console.log("Time slot conflict:", conflict);
      throw new Error("Time slot is already booked");
    }

    console.log("About to create booking with room.id:", room.id, "type:", typeof room.id);

    const booking = await prisma.mrbsentry.create({
      data: {
        roomId: room.id,
        start_time: start_ts,
        end_time: end_ts,
        created_by: created_by,
        modified_by: created_by,
        name: `Booking for ${room_name}`,
        description: `Booked by ${created_by}`,
      },
    });

    console.log("Booking created successfully:", booking);

    return { 
      success: true,
      message: "Booking successful", 
      booking_id: booking.id,
      booking_details: {
        room_name,
        date,
        start_time,
        end_time,
        created_by
      }
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
}