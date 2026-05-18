import { prisma } from "@/lib/prisma";

export async function getBureau() {
  return prisma.bureauMember.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      fullName: true,
      role: true,
      order: true,
      photo: true,
      email: true,
      phone: true,
      bio: true,
      startedAt: true,
    },
  });
}

export async function getCommissions() {
  return prisma.commission.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      mission: true,
      order: true,
      members: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          fullName: true,
          role: true,
          order: true,
          photo: true,
          email: true,
        },
      },
    },
  });
}

export async function getCommissionBySlug(slug: string) {
  return prisma.commission.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      mission: true,
      members: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          fullName: true,
          role: true,
          order: true,
          photo: true,
          email: true,
        },
      },
    },
  });
}

export async function getAllPlayerOfMonth() {
  return prisma.playerOfMonth.findMany({
    orderBy: [{ mode: "asc" }, { effectiveAt: "desc" }],
    select: {
      id: true,
      mode: true,
      periodLabel: true,
      effectiveAt: true,
      photo: true,
      goals: true,
      assists: true,
      extraStatLabel: true,
      extraStatValue: true,
      sponsor: true,
      quote: true,
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jerseyNumber: true,
          position: true,
          photo: true,
          club: { select: { id: true, name: true, shortCode: true } },
        },
      },
    },
  });
}

export async function getMembersForPicker() {
  return prisma.member.findMany({
    where: { kind: "PLAYER" },
    orderBy: [{ club: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jerseyNumber: true,
      position: true,
      club: { select: { id: true, name: true, shortCode: true } },
    },
  });
}

export type BureauMemberRow = Awaited<ReturnType<typeof getBureau>>[number];
export type CommissionRow = Awaited<ReturnType<typeof getCommissions>>[number];
export type CommissionMemberRow = CommissionRow["members"][number];
export type PlayerOfMonthRow = Awaited<ReturnType<typeof getAllPlayerOfMonth>>[number];
export type MemberPickerRow = Awaited<ReturnType<typeof getMembersForPicker>>[number];
