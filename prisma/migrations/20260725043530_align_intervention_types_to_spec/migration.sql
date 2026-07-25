-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InterventionType" ADD VALUE 'TUTORING';
ALTER TYPE "InterventionType" ADD VALUE 'PEER_SUPPORT';
ALTER TYPE "InterventionType" ADD VALUE 'PARENT_CONFERENCE';
ALTER TYPE "InterventionType" ADD VALUE 'EXTERNAL_REFERRAL';
ALTER TYPE "InterventionType" ADD VALUE 'SEL_PROGRAM';
ALTER TYPE "InterventionType" ADD VALUE 'STUDY_SKILLS_WORKSHOP';
