import {
  AdminActionType,
  BookingStatus,
  DisputeResolution,
  DisputeStatus,
  PaymentMode,
  PrismaClient,
  RefundStatus,
  Role,
  VerificationStatus,
  type Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

const OWNER_ID = "6f1c2a10-0000-4000-8000-000000000001";
const PLAYER_ID = "6f1c2a10-0000-4000-8000-000000000002";
const ADMIN_ID = "6f1c2a10-0000-4000-8000-000000000003";

const IST = "Asia/Kolkata";

function istDateKey(offsetDays: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 86_400_000));
}

function istSlot(dateKey: string, hour: number): Date {
  return new Date(
    `${dateKey}T${String(hour).padStart(2, "0")}:00:00+05:30`,
  );
}

const VENUES = [
  {
    id: "6f1c2a10-0000-4000-8000-000000000101",
    name: "Melvisharam Turf Arena",
    address: "No. 12, Arcot Road, Melvisharam, Ranipet, Tamil Nadu 632509",
    amenities: ["Parking", "Floodlights", "Changing Room", "Drinking Water"],
    verificationStatus: VerificationStatus.VERIFIED,
    verificationNotes: "Owner documents and ground photos verified.",
  },
  {
    id: "6f1c2a10-0000-4000-8000-000000000102",
    name: "Green Field Sports Club",
    address: "No. 45, Cuddalore Road, Melvisharam, Ranipet, Tamil Nadu 632509",
    amenities: ["Parking", "Floodlights", "Washroom", "Seating Area"],
    verificationStatus: VerificationStatus.VERIFIED,
    verificationNotes: "Verified for badminton and cricket bookings.",
  },
  {
    id: "6f1c2a10-0000-4000-8000-000000000103",
    name: "Vellore Sports Hub",
    address: "Plot 8, Katpadi Main Road, Vellore, Tamil Nadu 632007",
    amenities: ["Parking", "Floodlights", "First Aid", "Cafeteria"],
    verificationStatus: VerificationStatus.PENDING,
    verificationNotes: "Awaiting owner ID, UPI proof, and floodlit ground photos.",
  },
] as const;

const COURTS = [
  {
    id: "6f1c2a10-0000-4000-8000-000000000201",
    venueId: VENUES[0].id,
    name: "Court A (5v5)",
    sportType: "Football",
    price: 800,
  },
  {
    id: "6f1c2a10-0000-4000-8000-000000000202",
    venueId: VENUES[0].id,
    name: "Court B (7v7)",
    sportType: "Football",
    price: 1200,
  },
  {
    id: "6f1c2a10-0000-4000-8000-000000000203",
    venueId: VENUES[1].id,
    name: "Badminton Court 1",
    sportType: "Badminton",
    price: 400,
  },
  {
    id: "6f1c2a10-0000-4000-8000-000000000204",
    venueId: VENUES[1].id,
    name: "Cricket Net 1",
    sportType: "Cricket",
    price: 600,
  },
  {
    id: "6f1c2a10-0000-4000-8000-000000000205",
    venueId: VENUES[2].id,
    name: "Vellore Turf 1",
    sportType: "Football",
    price: 900,
  },
  {
    id: "6f1c2a10-0000-4000-8000-000000000206",
    venueId: VENUES[2].id,
    name: "Vellore Cricket Net",
    sportType: "Cricket",
    price: 500,
  },
  {
    id: "6f1c2a10-0000-4000-8000-000000000207",
    venueId: VENUES[0].id,
    name: "Test Court (₹1 Mobile Test)",
    sportType: "Football",
    price: 1.0,
  },
] as const;

async function main() {
  const owner = await prisma.user.upsert({
    where: { phone: "9876543210" },
    update: {
      name: "Test Owner",
      role: Role.OWNER,
    },
    create: {
      id: OWNER_ID,
      phone: "9876543210",
      name: "Test Owner",
      role: Role.OWNER,
    },
  });

  const player = await prisma.user.upsert({
    where: { phone: "9876543211" },
    update: {
      name: "Arjun Kumar",
      role: Role.PLAYER,
    },
    create: {
      id: PLAYER_ID,
      phone: "9876543211",
      name: "Arjun Kumar",
      role: Role.PLAYER,
    },
  });

  const admin = await prisma.user.upsert({
    where: { phone: "9876543212" },
    update: {
      name: "Platform Admin",
      role: Role.ADMIN,
    },
    create: {
      id: ADMIN_ID,
      phone: "9876543212",
      name: "Platform Admin",
      role: Role.ADMIN,
    },
  });

  for (const venue of VENUES) {
    const verifiedAt =
      venue.verificationStatus === VerificationStatus.VERIFIED
        ? new Date(Date.now() - 2 * 86_400_000)
        : null;

    await prisma.venue.upsert({
      where: { id: venue.id },
      update: {
        ownerId: owner.id,
        name: venue.name,
        city: venue.id === VENUES[2].id ? "Vellore" : "Melvisharam",
        address: venue.address,
        amenities: [...venue.amenities],
        verificationStatus: venue.verificationStatus,
        verificationNotes: venue.verificationNotes,
        verifiedAt,
      },
      create: {
        id: venue.id,
        ownerId: owner.id,
        name: venue.name,
        city: venue.id === VENUES[2].id ? "Vellore" : "Melvisharam",
        address: venue.address,
        amenities: [...venue.amenities],
        verificationStatus: venue.verificationStatus,
        verificationNotes: venue.verificationNotes,
        verifiedAt,
      },
    });
  }

  for (const court of COURTS) {
    await prisma.court.upsert({
      where: { id: court.id },
      update: {
        venueId: court.venueId,
        name: court.name,
        sportType: court.sportType,
        price: court.price,
      },
      create: {
        id: court.id,
        venueId: court.venueId,
        name: court.name,
        sportType: court.sportType,
        price: court.price,
      },
    });
  }

  const upcomingStart = istSlot(istDateKey(1), 18);
  const pendingStart = istSlot(istDateKey(1), 20);
  const pastStart = istSlot(istDateKey(-3), 19);
  const cancelledStart = istSlot(istDateKey(-2), 18);
  const cricketStart = istSlot(istDateKey(1), 19);

  const demoBookings: Array<
    Prisma.BookingUncheckedCreateInput & { id: string }
  > = [
    {
      id: "6f1c2a10-0000-4000-8000-000000000301",
      userId: player.id,
      courtId: COURTS[0].id,
      slotStart: upcomingStart,
      slotEnd: new Date(upcomingStart.getTime() + 60 * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      paymentMode: PaymentMode.FULL_ONLINE,
      paidAmount: 825,
      dueAmount: 0,
      convenienceFee: 25,
      ownerPayout: 800,
      utrNumber: "900000000001",
      createdAt: new Date(Date.now() - 86_400_000),
    },
    {
      id: "6f1c2a10-0000-4000-8000-000000000302",
      userId: player.id,
      courtId: COURTS[2].id,
      slotStart: pastStart,
      slotEnd: new Date(pastStart.getTime() + 60 * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      paymentMode: PaymentMode.FULL_ONLINE,
      paidAmount: 425,
      dueAmount: 0,
      convenienceFee: 25,
      ownerPayout: 400,
      utrNumber: "900000000002",
      createdAt: new Date(Date.now() - 4 * 86_400_000),
    },
    {
      id: "6f1c2a10-0000-4000-8000-000000000303",
      userId: player.id,
      courtId: COURTS[0].id,
      slotStart: pendingStart,
      slotEnd: new Date(pendingStart.getTime() + 60 * 60 * 1000),
      status: BookingStatus.PENDING,
      paymentMode: PaymentMode.FULL_ONLINE,
      paidAmount: 0,
      dueAmount: 825,
      convenienceFee: 25,
      ownerPayout: 800,
      utrNumber: null,
      createdAt: new Date(),
    },
    {
      id: "6f1c2a10-0000-4000-8000-000000000304",
      userId: player.id,
      courtId: COURTS[1].id,
      slotStart: cancelledStart,
      slotEnd: new Date(cancelledStart.getTime() + 2 * 60 * 60 * 1000),
      status: BookingStatus.CANCELLED,
      paymentMode: PaymentMode.FULL_ONLINE,
      paidAmount: 2425,
      dueAmount: 0,
      convenienceFee: 25,
      ownerPayout: 2400,
      utrNumber: "900000000004",
      cancelledAt: new Date(Date.now() - 3 * 86_400_000),
      cancellationReason:
        "Change of plans — Player requested cancellation through the CourtConnect app.",
      refundAmount: 1200,
      refundStatus: RefundStatus.PROCESSED,
      refundPolicy: "50% court fee · 2–6 hours before start",
      refundedAt: new Date(Date.now() - 2 * 86_400_000),
      createdAt: new Date(Date.now() - 5 * 86_400_000),
    },
    {
      id: "6f1c2a10-0000-4000-8000-000000000305",
      userId: player.id,
      courtId: COURTS[3].id,
      slotStart: cricketStart,
      slotEnd: new Date(cricketStart.getTime() + 60 * 60 * 1000),
      status: BookingStatus.CONFIRMED,
      paymentMode: PaymentMode.FULL_ONLINE,
      paidAmount: 625,
      dueAmount: 0,
      convenienceFee: 25,
      ownerPayout: 600,
      utrNumber: "900000000005",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  ];

  for (const booking of demoBookings) {
    const { id, ...bookingData } = booking;

    await prisma.booking.upsert({
      where: { id },
      update: bookingData,
      create: booking,
    });
  }

  const demoDisputes: Array<Prisma.DisputeUncheckedCreateInput & { id: string }> = [
    {
      id: "6f1c2a10-0000-4000-8000-000000000401",
      bookingId: "6f1c2a10-0000-4000-8000-000000000301",
      playerId: player.id,
      status: DisputeStatus.OPEN,
      reason: "Double booking at the venue",
      details:
        "Player reports another group was assigned the same Court A slot at 6:00 PM. Venue has not responded yet.",
      resolution: DisputeResolution.NONE,
      resolutionNote: null,
      refundAmount: 0,
      resolvedById: null,
      resolvedAt: null,
    },
    {
      id: "6f1c2a10-0000-4000-8000-000000000402",
      bookingId: "6f1c2a10-0000-4000-8000-000000000304",
      playerId: player.id,
      status: DisputeStatus.UNDER_REVIEW,
      reason: "Refund not received after cancellation",
      details:
        "The cancellation refund of ₹1,200 was marked processed, but the player says it has not reached their UPI account.",
      resolution: DisputeResolution.NONE,
      resolutionNote: "Waiting for the venue settlement statement.",
      refundAmount: 0,
      resolvedById: null,
      resolvedAt: null,
    },
  ];

  for (const dispute of demoDisputes) {
    const { id, ...disputeData } = dispute;

    await prisma.dispute.upsert({
      where: { id },
      update: disputeData,
      create: { id, ...disputeData },
    });
  }

  await prisma.adminAction.upsert({
    where: { id: "6f1c2a10-0000-4000-8000-000000000501" },
    update: {
      adminId: admin.id,
      action: AdminActionType.VENUE_VERIFIED,
      entityType: "VENUE",
      entityId: VENUES[0].id,
      summary: "Verified Melvisharam Turf Arena for public listing.",
      metadata: { previousStatus: "PENDING" },
    },
    create: {
      id: "6f1c2a10-0000-4000-8000-000000000501",
      adminId: admin.id,
      action: AdminActionType.VENUE_VERIFIED,
      entityType: "VENUE",
      entityId: VENUES[0].id,
      summary: "Verified Melvisharam Turf Arena for public listing.",
      metadata: { previousStatus: "PENDING" },
    },
  });

  console.log(
    `Seeded 1 owner, 1 demo player, 1 platform admin, ${VENUES.length} venues, ${COURTS.length} courts, ${demoBookings.length} demo bookings, and ${demoDisputes.length} disputes in Melvisharam & Vellore.`,
  );
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
