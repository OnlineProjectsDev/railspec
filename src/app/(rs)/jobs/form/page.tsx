// /app/(rs)/jobs/form/page.tsx
import { getCustomer } from "@/lib/queries/getCustomer";
import { getJob } from "@/lib/queries/getJob";
import { BackButton } from "@/components/BackButton";
import * as Sentry from "@sentry/nextjs"
import JobForm from "@/app/(rs)/jobs/form/JobForm";

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { Users, init as kindeInit } from "@kinde/management-api-js"
import { getAllStagesForJob, getAllStagesForJobnoDefaults } from "@/lib/queries/getJobStage";


export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}){
    const { customerId, jobId } = await searchParams

    if(!customerId && !jobId) return {
        title: 'Missing Job ID or Customer ID'
    }

    if(customerId) return {
        title: `New Job for Customer #${customerId}`
    }

    if(jobId) return {
        title: `Edit Job #${jobId}`
    }
}

export default async function JobFormPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}){
    try{
        const { customerId, jobId } = await searchParams

        // Edit customer form
        if (!customerId && !jobId){
            return (
                <>
                    <h2 className="tet-2xl mb-2">Customer ID or Job ID required to load form.</h2>
                    <BackButton title="Go Back" variant="default"/>
                </>
            )
        }

        const { getPermission, getUser } = getKindeServerSession()
        const [managerPermission, user] = await Promise.all([
            getPermission("manager"),
            getUser(),
        ])

        const isManager = managerPermission?.isGranted

        if (customerId){
            const customer = await getCustomer(parseInt(customerId))

            if (!customer){
                return (
                    <>
                        <h2 className="tet-2xl mb-2">Customer ID #{customerId} not found.</h2>
                        <BackButton title="Go Back" variant="default"/>
                    </>
                )
            }

            if(!customer.active){
                return (
                    <>
                        <h2 className="tet-2xl mb-2">Customer ID #{customerId} is not active.</h2>
                        <BackButton title="Go Back" variant="default"/>
                    </>
                )
            }

            //return job form
            if (isManager){
                kindeInit() // Initializes the Kinde Management API
                const { users } = await Users.getUsers()

                const techs =
                    users?.flatMap((user) => {
                        const email = user.email?.toLowerCase();
                        return email ? [{ id: email, description: email }] : [];
                    }) ?? [];
                    
                return <JobForm customer={customer} techs={techs} isManager={isManager} />
            } else {
                return <JobForm customer={customer} />
            }            
        }


        // Edit job form
        if (jobId){
            const job = await getJob(parseInt(jobId))

            if (!job){
                return (
                    <>
                        <h2 className="tet-2xl mb-2">Job ID <div id={jobId}></div> not found.</h2>
                        <BackButton title="Go Back" variant="default"/>
                    </>
                )
            }

            const customer = await getCustomer(job.customerId)
            const jobStages = await getAllStagesForJobnoDefaults(job.id)
            
            // return jb
             if (isManager){
                kindeInit() // Initializes the Kinde Management API
                const { users } = await Users.getUsers()

                const techs = users ? users.map(user => ({ id: user.email!, description: user.email!})) : []

                return <JobForm customer={customer} job={job} jobStages={jobStages} techs={techs} isManager={isManager} />
            } else {
                const isEditable = false // user!.email?.toLocaleLowerCase() === job.tech.toLocaleLowerCase()
                return <JobForm customer={customer} job={job} isEditable={isEditable}/>
            }    

        }


    } catch (e) {
        if (e instanceof Error){
            Sentry.captureException(e)
            throw e
        }
    }
}