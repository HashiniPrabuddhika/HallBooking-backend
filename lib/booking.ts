// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// interface BookingParams {
//   room_name: string;
//   date: string;
//   start_time: string;
//   end_time: string;
//   created_by?: string;
// }

// function formatTime(time: string): string {
//   return time.length === 4 ? `0${time}` : time;
// }

// function timeToMinutes(time: string): number {
//   const [hours, minutes] = time.split(':').map(Number);
//   return hours * 60 + minutes;
// }

// function isTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
//   const start1Minutes = timeToMinutes(start1);
//   const end1Minutes = timeToMinutes(end1);
//   const start2Minutes = timeToMinutes(start2);
//   const end2Minutes = timeToMinutes(end2);
  
//   return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
// }

// export async function checkAvailability({ room_name, date, start_time, end_time }: BookingParams) {
//   try {
//     console.log("Checking availability for room:", room_name);
    
//     const room = await prisma.mrbsroom.findUnique({ 
//       where: { room_name } 
//     });
    
//     if (!room) {
//       console.log("Room not found:", room_name);
//       return { available: false, message: "Room not found" };
//     }

//     console.log("Room found:", room);

//     const formattedStartTime = formatTime(start_time);
//     const formattedEndTime = formatTime(end_time);

//     console.log("Time range:", { date, start_time: formattedStartTime, end_time: formattedEndTime });

//     const existingBookings = await prisma.mrbsentry.findMany({
//       where: {
//         roomId: room.id,
//         booking_date: date
//       },
//       select: {
//         id: true,
//         name: true,
//         start_time: true,
//         end_time: true,
//         created_by: true
//       }
//     });

//     const conflict = existingBookings.find(booking => 
//       isTimeOverlap(booking.start_time, booking.end_time, formattedStartTime, formattedEndTime)
//     );

//     if (conflict) {
//       console.log("❌ Conflict found:", {
//         booking_id: conflict.id,
//         booking_name: conflict.name,
//         conflict_time: `${conflict.start_time} - ${conflict.end_time}`,
//         created_by: conflict.created_by
//       });
//       return { 
//         available: false, 
//         message: `Room is NOT available at that time. Conflicting booking: "${conflict.name}" from ${conflict.start_time} to ${conflict.end_time}`,
//         conflict_details: {
//           booking_id: conflict.id,
//           booking_name: conflict.name,
//           start_time: conflict.start_time,
//           end_time: conflict.end_time,
//           created_by: conflict.created_by
//         }
//       };
//     }

//     return { available: true, message: "Room is available." };
//   } catch (error) {
//     console.error("❌ Error checking availability:", error);
//     return { available: false, message: "Error checking availability" };
//   }
// }

// export async function addBooking({ room_name, date, start_time, end_time, created_by = "system" }: BookingParams) {
//   try {
//     if (!room_name || !date || !start_time || !end_time) {
//       throw new Error("Missing required booking parameters");
//     }

//     console.log("Searching for room:", room_name);
    
//     const room = await prisma.mrbsroom.findUnique({ 
//       where: { room_name } 
//     });

//     if (!room) {
//       console.error("Room not found:", room_name);
//       throw new Error(`Room '${room_name}' not found in database.`);
//     }

//     console.log("Room found:", room);
//     console.log("Room ID type and value:", typeof room.id, room.id);

//     if (!room.id || typeof room.id !== "number") {
//       console.error("Invalid room ID:", room.id);
//       throw new Error(`Invalid room ID for room '${room_name}'`);
//     }

//     const formattedStartTime = formatTime(start_time);
//     const formattedEndTime = formatTime(end_time);

//     if (timeToMinutes(formattedStartTime) >= timeToMinutes(formattedEndTime)) {
//       throw new Error("Start time must be before end time");
//     }

//     console.log("Booking time range:", { date, start_time: formattedStartTime, end_time: formattedEndTime });

//     const availability = await checkAvailability({ room_name, date, start_time, end_time, created_by });
    
//     if (!availability.available) {
//       throw new Error(availability.message);
//     }

//     console.log("About to create booking with room.id:", room.id, "type:", typeof room.id);

//     const booking = await prisma.mrbsentry.create({
//       data: {
//         roomId: room.id,
//         name: `${room_name}`,
//         booking_date: date,
//         start_time: formattedStartTime,  
//         end_time: formattedEndTime,     
//         created_by: created_by,
//         modified_by: created_by,
//         description: `Booked by ${created_by}`,
//       },
//     });

//     console.log("Booking created successfully:", booking);

//     return { 
//       success: true,
//       message: "Booking successful", 
//       booking_id: booking.id,
//       booking_details: {
//         room_name,
//         date,
//         start_time: formattedStartTime,
//         end_time: formattedEndTime,
//         created_by
//       }
//     };
//   } catch (error) {
//     console.error("Error creating booking:", error);
//     throw error;
//   }
// }

// export async function getRoomBookings(room_name: string, date: string) {
//   try {
//     const room = await prisma.mrbsroom.findUnique({ 
//       where: { room_name } 
//     });

//     if (!room) {
//       return { error: "Room not found" };
//     }

//     const bookings = await prisma.mrbsentry.findMany({
//       where: {
//         roomId: room.id,
//         booking_date: date
//       },
//       orderBy: {
//         start_time: 'asc'  
//       },
//       select: {
//         id: true,
//         name: true,
//         start_time: true,
//         end_time: true,
//         description: true,
//         created_by: true,
//       }
//     });

//     const formattedBookings = bookings.map(booking => ({
//       ...booking,
//       readable_time: `${booking.start_time} - ${booking.end_time}`,  
//       readable_date: date
//     }));

//     return {
//       room_name,
//       date,
//       bookings: formattedBookings,
//       total_bookings: bookings.length
//     };
//   } catch (error) {
//     console.error("Error fetching bookings:", error);
//     return { error: "Error fetching bookings" };
//   }
// }

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface BookingParams {
  room_name: string;
  date: string; 
  start_time: string; 
  end_time: string; 
  created_by?: string;
}

function parseTimeToTimestamp(dateStr: string, timeStr: string): number {
  const cleanTime = timeStr.trim();
  
  try {
    const [hours, minutes] = cleanTime.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }
    
    const dateTime = new Date(`${dateStr}T${cleanTime.padStart(5,'0')}:00`);
    
    if (isNaN(dateTime.getTime())) {
      throw new Error(`Invalid date/time combination: ${dateStr} ${timeStr}`);
    }
    
    return Math.floor(dateTime.getTime() / 1000);
  } catch (error) {
    console.error(`🔴 Time Parsing Error: ${error}`);
    throw new Error(`Invalid time format. Use HH:MM format. Error: ${error}`);
  }
}

function timestampToTimeString(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toTimeString().slice(0, 5); 
}

function generateICalUID(roomName: string, startTimestamp: number, endTimestamp: number): string {
  return `${roomName}_${startTimestamp}_${endTimestamp}`;
}

export async function checkAvailability({ room_name, date, start_time, end_time,created_by = "system" }: BookingParams) {
  try {
    console.log(`🔵 Received Input -> room_name: ${room_name}, date: ${date}, start_time: ${start_time}, end_time: ${end_time}`);
    
    const cleanStartTime = start_time.trim();
    const cleanEndTime = end_time.trim();
    
    console.log(`🟢 Cleaned Input -> start_time: ${cleanStartTime}, end_time: ${cleanEndTime}`);
    
    const room = await prisma.mrbsroom.findUnique({ 
      where: { room_name } 
    });
    
    if (!room) {
      console.log(`🔴 Room '${room_name}' not found`);
      return { available: false, message: "Room not found" };
    }

    console.log(`✅ Room Found -> room_id: ${room.id}`);

    let startTimestamp: number;
    let endTimestamp: number;
    
    try {
      startTimestamp = parseTimeToTimestamp(date, cleanStartTime);
      endTimestamp = parseTimeToTimestamp(date, cleanEndTime);
      console.log(`🟣 Converted Timestamps -> start_timestamp: ${startTimestamp}, end_timestamp: ${endTimestamp}`);
    } catch (error) {
      console.error(`🔴 Timestamp conversion error: ${error}`);
      return { available: false, message: `Invalid time format: ${error}` };
    }

    if (startTimestamp >= endTimestamp) {
      return { available: false, message: "Start time must be before end time" };
    }

    const existingBookings = await prisma.mrbsentry.findMany({
      where: {
        roomId: room.id,
        booking_date: date,
        AND: [
          { start_time: { lt: endTimestamp } },
          { end_time: { gt: startTimestamp } }
        ]
      },
      select: {
        id: true,
        name: true,
        start_time: true,
        end_time: true,
        created_by: true
      }
    });

    if (existingBookings.length > 0) {
      const conflict = existingBookings[0];
      const conflictStartTime = timestampToTimeString(conflict.start_time);
      const conflictEndTime = timestampToTimeString(conflict.end_time);
      
      console.log(`❌ Room '${room_name}' is NOT available at this time`);
      console.log("❌ Conflict found:", {
        booking_id: conflict.id,
        booking_name: conflict.name,
        conflict_time: `${conflictStartTime} - ${conflictEndTime}`,
        created_by: conflict.created_by
      });
      
      return { 
        available: false, 
        message: `Room is NOT available at that time. Conflicting booking: "${conflict.name}" from ${conflictStartTime} to ${conflictEndTime}`,
        conflict_details: {
          booking_id: conflict.id,
          booking_name: conflict.name,
          start_time: conflictStartTime,
          end_time: conflictEndTime,
          created_by: conflict.created_by
        }
      };
    }

    console.log(`✅ Room '${room_name}' is available for booking`);
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

    let startTimestamp: number;
    let endTimestamp: number;
    
    try {
      startTimestamp = parseTimeToTimestamp(date, start_time.trim());
      endTimestamp = parseTimeToTimestamp(date, end_time.trim());
      console.log(`🟣 Converted Timestamps -> start_timestamp: ${startTimestamp}, end_timestamp: ${endTimestamp}`);
    } catch (error) {
      throw new Error(`Time conversion error: ${error}`);
    }

    if (startTimestamp >= endTimestamp) {
      throw new Error("Start time must be before end time");
    }

    console.log("Booking time range:", { date, start_timestamp: startTimestamp, end_timestamp: endTimestamp });

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
        start_time: startTimestamp,  
        end_time: endTimestamp,     
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
        start_time: timestampToTimeString(startTimestamp),
        end_time: timestampToTimeString(endTimestamp),
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
      start_time_readable: timestampToTimeString(booking.start_time),
      end_time_readable: timestampToTimeString(booking.end_time),
      readable_time: `${timestampToTimeString(booking.start_time)} - ${timestampToTimeString(booking.end_time)}`,  
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
