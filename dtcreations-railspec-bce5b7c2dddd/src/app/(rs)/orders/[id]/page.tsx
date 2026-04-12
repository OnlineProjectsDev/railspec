import { Metadata } from "next";
import { notFound } from "next/navigation";
import OrderDetailsClient from "@/components/order-details-client";
import { promises as fs } from "fs";
import path from "path";
import { getJobStageByJobAndStageWithDetails } from "@/lib/queries/getJobStage";


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


async function getOrder(id: string): Promise<Order | undefined> {
  const filePath = path.join(process.cwd(), "public", "data", "orders.json");
  const fileContents = await fs.readFile(filePath, "utf8");
  const orders: Order[] = JSON.parse(fileContents);
  return orders.find(order => order.id.toString() === id);
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const order = await getJobStageByJobAndStageWithDetails(Number(params.id),1);
  if (!order) {
    return {
      title: "Order Not Found | RailSpec",
    };
  }

  return {
    title: `Order ${order.id} | RailSpec`,
    description: `Order details for ${order.company} - ${order.job_number} - Stage ${order.stage}`,
  };
}

export default async function OrderDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const order = await getJobStageByJobAndStageWithDetails(Number(params.id),1);

  if (!order) {
    notFound();
  }

  return <OrderDetailsClient order={order} />;
}
