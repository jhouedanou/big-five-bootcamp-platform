import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin2014!k", 12);

  const admin = await prisma.user.upsert({
    where: { email: "jeffrey@bigfive.com" },
    update: {
      password: hashedPassword,
      role: "admin",
      status: "active",
    },
    create: {
      name: "Jeffrey",
      email: "jeffrey@bigfive.com",
      password: hashedPassword,
      role: "admin",
      plan: "premium",
      status: "active",
    },
  });

  console.log("Admin user created:", admin.email, "role:", admin.role);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
