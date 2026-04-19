import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Minimum 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const employeeSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  department: z.string().min(1, "Department required"),
  title: z.string().min(1, "Title required"),
  salary: z.coerce.number().int().nonnegative("Salary must be >= 0"),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]).default("ACTIVE"),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
