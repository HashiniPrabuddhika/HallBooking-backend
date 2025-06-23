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
  const room = await prisma.mrbsroom.findUnique({ where: { room_name } });
  if (!room) return { available: false, message: "Room not found" };

  const start_ts = toUnix(date, start_time);
  const end_ts = toUnix(date, end_time);

  const conflict = await prisma.mrbsentry.findFirst({
    where: {
      roomId: room.id,
      start_time: { lt: end_ts },
      end_time: { gt: start_ts },
    },
  });

  if (conflict) {
    return { available: false, message: "Room is NOT available at that time." };
  }

  return { available: true, message: "Room is available." };
}

export async function addBooking({ room_name, date, start_time, end_time, created_by = "system" }: BookingParams) {
 if (!room_name || !date || !start_time || !end_time) {
    throw new Error("Missing required booking parameters");
  }
  console.log("🔍 Searching for room:", room_name);
  const room = await prisma.mrbsroom.findUnique({ where: { room_name } });

if (!room || typeof room.id !== "number") {
    console.error("❌ Room not found or invalid:", room_name);
    throw new Error(`Room '${room_name}' not found in database.`);
  }

  const start_ts = toUnix(date, start_time);
  const end_ts = toUnix(date, end_time);

  const conflict = await prisma.mrbsentry.findFirst({
    where: {
      roomId: room.id,
      start_time: { lt: end_ts },
      end_time: { gt: start_ts },
    },
  });

  if (conflict) {
    throw new Error("Time slot is already booked");
  }

  const booking = await prisma.mrbsentry.create({
    data: {
      roomId: room.id,
      start_time: start_ts,
      end_time: end_ts,
      created_by,
      modified_by: created_by,
      name: `Booking for ${room_name}`,
      description: `Booked by ${created_by}`,
    },
  });

  return { message: "Booking successful", booking_id: booking.id };
}


/* generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model MRBSRoom {
  id          Int         @id @default(autoincrement())
  room_name   String      @unique
  description String?
  capacity    Int
  bookings    MRBSEntry[]
}

model MRBSEntry {
  id          Int      @id @default(autoincrement())
  start_time  Int
  end_time    Int
  room        MRBSRoom @relation(fields: [roomId], references: [id])
  roomId      Int
  created_by  String
  modified_by String
  name        String
  description String?
}
*/