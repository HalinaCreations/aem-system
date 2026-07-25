-- CreateEnum
CREATE TYPE "SELLevel" AS ENUM ('THRIVING', 'STABLE', 'AT_RISK', 'CRITICAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SEL_ASSESSMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SEL_ASSESSMENT_READ';

-- CreateTable
CREATE TABLE "SELAssessment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "assessedById" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emotionalWellbeing" "SELLevel" NOT NULL,
    "stressLevel" "SELLevel" NOT NULL,
    "peerRelationships" "SELLevel" NOT NULL,
    "selfAssessment" "SELLevel",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SELAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SELAssessment_enrollmentId_assessedAt_idx" ON "SELAssessment"("enrollmentId", "assessedAt");

-- CreateIndex
CREATE INDEX "SELAssessment_assessedById_idx" ON "SELAssessment"("assessedById");

-- AddForeignKey
ALTER TABLE "SELAssessment" ADD CONSTRAINT "SELAssessment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SELAssessment" ADD CONSTRAINT "SELAssessment_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
