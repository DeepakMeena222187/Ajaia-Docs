import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    console.warn("Skipping Prisma seed in production because this seed creates demo data and should not be run automatically.");
    return;
  }

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log("Demo seed skipped because the database is not empty.");
    return;
  }

  const deepak = await prisma.user.create({
    data: {
      name: "Deepak Meena",
      email: "deepak@demo.local",
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "priya@demo.local",
    },
  });

  const alex = await prisma.user.create({
    data: {
      name: "Alex Chen",
      email: "alex@demo.local",
    },
  });

  console.log("✓ Created demo users:");
  console.log(`  - ${deepak.name} (${deepak.email})`);
  console.log(`  - ${priya.name} (${priya.email})`);
  console.log(`  - ${alex.name} (${alex.email})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
