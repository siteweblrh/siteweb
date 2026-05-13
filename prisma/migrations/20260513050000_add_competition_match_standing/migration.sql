-- CreateEnum
CREATE TYPE "SponsorScope" AS ENUM ('LIGUE', 'CLUB', 'EVENT');

-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('GAZON', 'SALLE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'POSTPONED', 'CANCELLED');

-- AlterTable Club: add slug + shortCode
ALTER TABLE "Club" ADD COLUMN "slug" TEXT;
-- Backfill: use cuid as slug for any pre-existing rows (none in dev; clubs are seeded post-migration)
UPDATE "Club" SET "slug" = "id" WHERE "slug" IS NULL;
ALTER TABLE "Club" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Club" ADD COLUMN "shortCode" TEXT;

-- AlterTable Sponsor: clubId nullable, add scope
ALTER TABLE "Sponsor" ALTER COLUMN "clubId" DROP NOT NULL;
ALTER TABLE "Sponsor" ADD COLUMN "scope" "SponsorScope" NOT NULL DEFAULT 'CLUB';

-- DropForeignKey + recreate to allow null
ALTER TABLE "Sponsor" DROP CONSTRAINT IF EXISTS "Sponsor_clubId_fkey";
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");
CREATE UNIQUE INDEX "Club_shortCode_key" ON "Club"("shortCode");

-- CreateTable Competition
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "season" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Sénior',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateTable Match
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "homeClubId" TEXT NOT NULL,
    "awayClubId" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "matchday" INTEGER,
    "sponsorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Match_competitionId_kickoffAt_idx" ON "Match"("competitionId", "kickoffAt");
CREATE INDEX "Match_status_kickoffAt_idx" ON "Match"("status", "kickoffAt");
CREATE INDEX "Match_homeClubId_idx" ON "Match"("homeClubId");
CREATE INDEX "Match_awayClubId_idx" ON "Match"("awayClubId");

ALTER TABLE "Match" ADD CONSTRAINT "Match_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable Goal
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "scoringClubId" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "scorerName" TEXT,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Goal_matchId_idx" ON "Goal"("matchId");

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_scoringClubId_fkey" FOREIGN KEY ("scoringClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Standing
CREATE TABLE "Standing" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Standing_competitionId_clubId_key" ON "Standing"("competitionId", "clubId");
CREATE INDEX "Standing_competitionId_rank_idx" ON "Standing"("competitionId", "rank");

ALTER TABLE "Standing" ADD CONSTRAINT "Standing_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
