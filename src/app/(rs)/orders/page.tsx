import { Metadata } from "next";
import OrdersClient from "@/components/orders-client";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentEmployee } from "@/lib/queries/getCurrentEmployee";
import { getCurrentCustomer } from "@/lib/queries/getCustomer";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { GetOpenJobsWithDetails } from "@/lib/queries/GetopenJobs";
import { GetOpenJobsForCurrentCustomerWithDetails } from "@/lib/queries/getOpenJobsForCustomer";

export const metadata: Metadata = {
  title: "Orders | RailSpec",
  description: "View and manage your orders",
};

interface Order {
    id: number;
    jobDate: Date;
    job_number: number;
    stage: number;
    company: string | null;
    jobAddress: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    status: string;
    design: string;
    anchorage: string;
    toprail: string;
    height: number;
}

async function getOrders(): Promise<Order[]> {
  const filePath = path.join(process.cwd(), "public", "data", "orders.json");
  const fileContents = await fs.readFile(filePath, "utf8");
  return JSON.parse(fileContents);
}

export default async function OrdersPage() {

        const { getUser, getPermission } = getKindeServerSession();
    const user = await getUser();

    const admin = await getPermission("admin");
    const manager = await getPermission("manager");
    const employee = await getPermission("employee");

    const isRailsafeEmployee = !!(
    admin?.isGranted ||
    manager?.isGranted ||
    employee?.isGranted
    );

    let employeeRow = null; // ← declare variable first

    let orders = null

    if (isRailsafeEmployee) {
        employeeRow = await getCurrentEmployee();  // ← assign value inside block
        orders = await GetOpenJobsWithDetails();
    }


    let customerRow = null;

    if (!isRailsafeEmployee) {
        if (user?.email) {
            customerRow = await getCurrentCustomer(user.email);
            orders = await GetOpenJobsForCurrentCustomerWithDetails(user.email)
        }
    }

  return <OrdersClient orders={orders} />;
}
