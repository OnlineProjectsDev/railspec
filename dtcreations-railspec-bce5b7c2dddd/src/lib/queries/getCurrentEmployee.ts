import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function getCurrentEmployee() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.email) {
    return null; // Not logged in or no email available
  }

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.kindeUserId, user.email));

  return employee ?? null;
}
