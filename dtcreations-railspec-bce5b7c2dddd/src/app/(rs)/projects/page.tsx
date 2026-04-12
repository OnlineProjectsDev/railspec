// /app/(rs)/projects/page.tsx
import { getCurrentEmployee } from "@/lib/queries/getCurrentEmployee";
import { getCurrentCustomer } from "@/lib/queries/getCustomer";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import ProjectDashboard from "@/app/(rs)/projects/dashboard"
import { GetOpenJobs } from "@/lib/queries/GetopenJobs";
import { GetOpenJobsForCurrentCustomer } from "@/lib/queries/getOpenJobsForCustomer";
import { getShopDrawingRevisionsForStage } from "@/lib/queries/getShopDrawingRevision";
import { getShopDrawingRevisionSyncStatus } from "@/lib/queries/getShopDrawingRevisionSyncStatus";
import { getFabricationRevisionSyncStatus } from "@/lib/queries/getFabricationRevisionSyncStatus";


export const metadata = {
    title: "Project Editor",
}

type DashboardOrder = {
    id: number;
    jobDate: Date;
    jobAddress: string;
    job_number: number;
    job_id: number;
    stage: number;
    design: string;
    hasStage: boolean;
    editorBalconyCount: number;
    company: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    zip: string | null;
    status: string;
};

type DashboardOrderRevisionOption = {
    value: string;
    label: string;
};

type EnrichedDashboardOrder = DashboardOrder & {
    revisionOptions: DashboardOrderRevisionOption[];
    selectedRevisionOption: string;
};

async function enrichOrdersWithRevisionOptions(
    orders: DashboardOrder[] | null
): Promise<EnrichedDashboardOrder[] | null> {
    if (!orders?.length) return null;

    return Promise.all(
        orders.map(async (order) => {
            if (!order.hasStage || !order.id) {
                return {
                    ...order,
                    revisionOptions: [{ value: "unsynced", label: "Unsynced" }] as DashboardOrderRevisionOption[],
                    selectedRevisionOption: "unsynced",
                };
            }

            const clientName = [order.company, order.firstName, order.lastName]
                .filter(Boolean)
                .join(" - ")
                .replace(" -  - ", " - ");

            const siteAddressLine = [order.address1, order.address2]
                .filter(Boolean)
                .join(", ");

            const cityLine = [order.city, order.zip]
                .filter(Boolean)
                .join(" ");

            const [revisions, shopSync, fabricationSync] = await Promise.all([
                getShopDrawingRevisionsForStage(order.id),
                getShopDrawingRevisionSyncStatus({
                    jobId: order.job_id,
                    jobNumber: order.job_number,
                    jobStageId: order.id,
                    stageNo: order.stage,
                    clientName,
                    siteAddressLine,
                    cityLine,
                }),
                getFabricationRevisionSyncStatus({
                    jobId: order.job_id,
                    jobStageId: order.id,
                    stageNo: order.stage,
                }),
            ]);

            const hasUnsyncedState =
                !shopSync.hasRevision ||
                shopSync.isDirty ||
                !fabricationSync.hasRevision ||
                fabricationSync.isDirty;

            const syncedRevisionOptions: DashboardOrderRevisionOption[] = revisions.map((revision) => ({
                value: revision.revisionCode,
                label: `Rev ${revision.revisionCode}`,
            }));

            const revisionOptions: DashboardOrderRevisionOption[] = hasUnsyncedState
                ? [{ value: "unsynced", label: "Unsynced" }, ...syncedRevisionOptions]
                : syncedRevisionOptions;

            const currentRevision =
                revisions.find((revision) => revision.isCurrent)?.revisionCode ??
                revisions[0]?.revisionCode ??
                "unsynced";

            return {
                ...order,
                revisionOptions,
                selectedRevisionOption: hasUnsyncedState ? "unsynced" : currentRevision,
            };
        })
    );
}

export default async function Projects() {


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

    let orders: EnrichedDashboardOrder[] | null = null

    if (isRailsafeEmployee) {
        employeeRow = await getCurrentEmployee();
        orders = await enrichOrdersWithRevisionOptions(await GetOpenJobs());
    }


    let customerRow = null;

    if (!isRailsafeEmployee) {
        if (user?.email) {
            customerRow = await getCurrentCustomer(user.email);
            orders = await enrichOrdersWithRevisionOptions(
                await GetOpenJobsForCurrentCustomer(user.email)
            );
        }
    }

    

    return (
        <ProjectDashboard isRailsafeEmployee={isRailsafeEmployee} employeeRow={employeeRow} customerRow={customerRow} orders={orders} />
    )
}