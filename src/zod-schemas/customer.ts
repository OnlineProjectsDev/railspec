// /zod-schemas/customer.ts
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from 'zod';
import { customers } from "@/db/schema"

export const insertCustomerSchema = createInsertSchema(customers, {
    company: (schema) => schema.min(1, "Company name is required"),
    firstName: (schema) => schema.min(1, "First name is required"),
    lastName: (schema) => schema.min(1, "Last name is required"),
    address1: (schema) => schema.min(1, "Address is required"),
    city: (schema) => schema.min(1, "City is required"),
    state: (schema) => schema.max(3, "State must be exactly 2 or 3 characters"),
    email: (schema) => schema.email("Invalid email address"),
    zip: (schema) => schema.regex(/^\d{4}?$/, "Invalid Zip code. Use 5 digits or 5 digits followed by a hyphen and 4 digits"),
    phone: (schema) => schema.regex(/^\d{3}-\d{3}-\d{3}$/, "Invalid phone number format. Use XXX-XXX-XXX"),
})

export const selectCustomerSchema = createSelectSchema(customers)

export type insertCustomerSchemaType = z.infer<typeof insertCustomerSchema>

export type selectCustomerSchemaType = z.infer<typeof selectCustomerSchema>