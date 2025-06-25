import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface BookingParams {
  room_name: string;
  date: string;
  start_time: string;
  end_time: string;
  created_by?: string;
}

function formatTime(time: string): string {
  return time.length === 4 ? `0${time}` : time;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);
  
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
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

    const formattedStartTime = formatTime(start_time);
    const formattedEndTime = formatTime(end_time);

    console.log("Time range:", { date, start_time: formattedStartTime, end_time: formattedEndTime });

    const existingBookings = await prisma.mrbsentry.findMany({
      where: {
        roomId: room.id,
        booking_date: date
      },
      select: {
        id: true,
        name: true,
        start_time: true,
        end_time: true,
        created_by: true
      }
    });

    const conflict = existingBookings.find(booking => 
      isTimeOverlap(booking.start_time, booking.end_time, formattedStartTime, formattedEndTime)
    );

    if (conflict) {
      console.log("❌ Conflict found:", {
        booking_id: conflict.id,
        booking_name: conflict.name,
        conflict_time: `${conflict.start_time} - ${conflict.end_time}`,
        created_by: conflict.created_by
      });
      return { 
        available: false, 
        message: `Room is NOT available at that time. Conflicting booking: "${conflict.name}" from ${conflict.start_time} to ${conflict.end_time}`,
        conflict_details: {
          booking_id: conflict.id,
          booking_name: conflict.name,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          created_by: conflict.created_by
        }
      };
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

    const formattedStartTime = formatTime(start_time);
    const formattedEndTime = formatTime(end_time);

    if (timeToMinutes(formattedStartTime) >= timeToMinutes(formattedEndTime)) {
      throw new Error("Start time must be before end time");
    }

    console.log("Booking time range:", { date, start_time: formattedStartTime, end_time: formattedEndTime });

    const availability = await checkAvailability({ room_name, date, start_time, end_time, created_by });
    
    if (!availability.available) {
      throw new Error(availability.message);
    }

    console.log("About to create booking with room.id:", room.id, "type:", typeof room.id);

    const booking = await prisma.mrbsentry.create({
      data: {
        roomId: room.id,
        name: `${room_name}`,
        booking_date: date,
        start_time: formattedStartTime,  
        end_time: formattedEndTime,     
        created_by: created_by,
        modified_by: created_by,
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
        start_time: formattedStartTime,
        end_time: formattedEndTime,
        created_by
      }
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
}

export async function getRoomBookings(room_name: string, date: string) {
  try {
    const room = await prisma.mrbsroom.findUnique({ 
      where: { room_name } 
    });

    if (!room) {
      return { error: "Room not found" };
    }

    const bookings = await prisma.mrbsentry.findMany({
      where: {
        roomId: room.id,
        booking_date: date
      },
      orderBy: {
        start_time: 'asc'  
      },
      select: {
        id: true,
        name: true,
        start_time: true,
        end_time: true,
        description: true,
        created_by: true,
      }
    });

    const formattedBookings = bookings.map(booking => ({
      ...booking,
      readable_time: `${booking.start_time} - ${booking.end_time}`,  
      readable_date: date
    }));

    return {
      room_name,
      date,
      bookings: formattedBookings,
      total_bookings: bookings.length
    };
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return { error: "Error fetching bookings" };
  }
}