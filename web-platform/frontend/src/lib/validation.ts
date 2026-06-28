import { z } from "zod";

// Contact form validation schema
export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().refine((val) => !val || /^\+?[1-9]\d{1,14}$/.test(val), "Invalid phone number"),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(100, "Subject must be less than 100 characters"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000, "Message must be less than 5000 characters"),
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Signup validation schema
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain uppercase").regex(/[0-9]/, "Password must contain number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Newsletter signup
export const newsletterSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type NewsletterData = z.infer<typeof newsletterSchema>;
