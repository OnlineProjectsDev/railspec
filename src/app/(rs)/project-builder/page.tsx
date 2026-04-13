// /app/(rs)/project-builder/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import JobWizard from "./JobWizard"
import { selectCustomerSchemaType } from "@/zod-schemas/customer";
import { getAllActiveCustomers, getCurrentCustomer } from "@/lib/queries/getCustomer";
import type { PowdercoatColour } from "@/components/project-builder-components/steps/colour-step"; 
import { getAvailableColours } from "@/lib/queries/getAvailableColours";
import { getNextJobNumber } from "@/lib/queries/getNextJobNumber";

export default async function ProjectBuilder(){

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

    
    let customers: selectCustomerSchemaType[] = [];
    let currentCustomer: selectCustomerSchemaType | null = null;

    if (isRailsafeEmployee) {
        customers = await getAllActiveCustomers();
    } else if (user?.email) {
        currentCustomer = await getCurrentCustomer(user.email);
    }

    const nextJobNumber = await getNextJobNumber();

    // Default design options should match your wizard defaultValues
    const colours = await getAvailableColours({
    design: "RD-D1",
    infill: "6.38mm Clear Laminate",
    toprail: "Elite",
    anchorage: "BP",
    environment: "exterior",   // or derive from wind_load later
  });

    return (
        <JobWizard
            isRailsafeEmployee={isRailsafeEmployee}
            customers={customers}
            currentCustomer={currentCustomer}
            colours={colours}
            initialJobNumber={nextJobNumber}
        />
    )
}