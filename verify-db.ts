import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type UserRow = {
  name: string;
  email: string;
};

async function main() {
  const users = (await prisma.user.findMany()) as UserRow[];
  console.log("\n✓ Database Verification:");
  console.log(`  Total users: ${users.length}`);
  users.forEach((user: UserRow) => {
    console.log(`  - ${user.name} (${user.email})`);
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
