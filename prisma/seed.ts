import { PrismaClient, EmployeeStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@morohub.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "MoroHub@12345";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: Role.ADMIN, name: "MoroHub Admin" },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
      name: "MoroHub Admin",
    },
  });

  const userEmail = "viewer@morohub.local";
  const userHash = await bcrypt.hash("Viewer@12345", 10);
  await prisma.user.upsert({
    where: { email: userEmail },
    update: { passwordHash: userHash, role: Role.USER, name: "Demo Viewer" },
    create: {
      email: userEmail,
      passwordHash: userHash,
      role: Role.USER,
      name: "Demo Viewer",
    },
  });

  const employees: Array<{
    fullName: string;
    email: string;
    department: string;
    title: string;
    salary: number;
    status: EmployeeStatus;
  }> = [
    { fullName: "Sara Al-Farsi", email: "sara@morohub.local", department: "Engineering", title: "Senior Platform Engineer", salary: 120000, status: EmployeeStatus.ACTIVE },
    { fullName: "Ahmed Khan", email: "ahmed@morohub.local", department: "Engineering", title: "SRE Lead", salary: 140000, status: EmployeeStatus.ACTIVE },
    { fullName: "Leila Haddad", email: "leila@morohub.local", department: "Product", title: "Product Manager", salary: 115000, status: EmployeeStatus.ACTIVE },
    { fullName: "Omar Saleh", email: "omar@morohub.local", department: "Security", title: "Security Architect", salary: 150000, status: EmployeeStatus.ACTIVE },
    { fullName: "Yasmin Idris", email: "yasmin@morohub.local", department: "Design", title: "Staff Designer", salary: 110000, status: EmployeeStatus.ON_LEAVE },
    { fullName: "Hassan Rabah", email: "hassan@morohub.local", department: "Finance", title: "Financial Controller", salary: 125000, status: EmployeeStatus.ACTIVE },
    { fullName: "Noura Bilal", email: "noura@morohub.local", department: "Operations", title: "DevOps Engineer", salary: 118000, status: EmployeeStatus.ACTIVE },
    { fullName: "Imran Qureshi", email: "imran@morohub.local", department: "Engineering", title: "Backend Engineer", salary: 105000, status: EmployeeStatus.ACTIVE },
    { fullName: "Rania Yusuf", email: "rania@morohub.local", department: "HR", title: "Head of People", salary: 130000, status: EmployeeStatus.ACTIVE },
    { fullName: "Karim Nader", email: "karim@morohub.local", department: "Engineering", title: "Junior Engineer", salary: 70000, status: EmployeeStatus.TERMINATED },
  ];

  for (const e of employees) {
    await prisma.employee.upsert({
      where: { email: e.email },
      update: e,
      create: e,
    });
  }

  console.log(`Seed complete. Admin = ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
