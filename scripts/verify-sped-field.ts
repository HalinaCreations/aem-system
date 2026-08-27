// Verifies Student.spedStatus is declared in schema.prisma AND present in the
// database, so Prisma Client can read and write it.
// Usage: tsx scripts/verify-sped-field.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dbCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'Student' AND column_name = 'spedStatus'
  `;
  console.log(`DB column Student.spedStatus present: ${dbCols.length === 1}`);
  if (dbCols.length !== 1) throw new Error("Student.spedStatus missing from the database");

  const dbTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'SpedStatusChange'
  `;
  console.log(`DB table SpedStatusChange present: ${dbTables.length === 1}`);
  if (dbTables.length !== 1) throw new Error("SpedStatusChange missing from the database");

  // Readable through the generated client — this is what fails before the fix.
  const sample = await prisma.student.findFirst({ select: { lrn: true, spedStatus: true } });
  console.log(`Prisma Client can select spedStatus: true (sample: ${JSON.stringify(sample)})`);

  console.log("PASS");
}

main()
  .catch((e) => {
    console.error("FAIL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
