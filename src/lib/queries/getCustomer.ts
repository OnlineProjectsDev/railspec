import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getCustomer(id: number) {
    const customer = await db.select()
        .from(customers)
        .where(eq(customers.id, id))

    return customer[0]    
}


export async function getCurrentCustomer(email: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, email));

  return customer ?? null;
}

export async function getAllActiveCustomers() {
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.active, true))
    .orderBy(
      asc(customers.company),
      asc(customers.firstName),
      asc(customers.lastName)
    );

  return rows;
}