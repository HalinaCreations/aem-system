-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_CHANGED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
