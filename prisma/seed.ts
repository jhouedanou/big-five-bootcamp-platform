import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("BigFive2026!Secure", 12);

  const admin = await prisma.user.upsert({
    where: { email: "cossi@bigfiveabidjan.com" },
    update: {
      password: hashedPassword,
      role: "admin",
      subscriptionStatus: "active",
    },
    create: {
      name: "Admin BigFive",
      email: "cossi@bigfiveabidjan.com",
      password: hashedPassword,
      role: "admin",
      subscriptionStatus: "active",
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
