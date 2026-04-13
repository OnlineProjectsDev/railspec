// /app/(rs)/jobs/form/JobForm.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { Resolver } from "react-hook-form";

import { z } from "zod";
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"

import { InputWithLabel } from "@/components/inputs/InputWithLabel"
import { SelectWithLabel } from "@/components/inputs/SelectWithLabel"
import { TextAreaWithLabel } from "@/components/inputs/TextAreaWithLabel"
import { CheckboxWithLabel } from "@/components/inputs/CheckboxWithLabel"

import { createNextStageAction } from "@/app/actions/createNextStageAction";
import { insertJobSchema, selectJobSchemaType, type insertJobSchemaType, type selectJobSchema } from "@/zod-schemas/jobs"
import { selectJobStagesSchema, type selectJobStagesSchemaType, type selectJobStagesSchemaTypeNoDefaults } from "@/zod-schemas/jobstages"
import { selectCustomerSchemaType } from "@/zod-schemas/customer"



import { useAction } from "next-safe-action/hooks"
import { saveJobAction } from "@/app/actions/savejobActions"
// import { saveJobStageAction } from "@/app/actions/saveJobStageAction"
import { toast } from "sonner"
import { LoaderCircle } from "lucide-react"
import { DisplayServerActionResponse } from "@/components/DisplayServerActionResponse"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { NumberInputWithLabel } from "@/components/inputs/NumberWithLabel";
import { createStageAction } from "@/app/actions/createStageAction";
import ContinueToJobDialog from "@/components/ContinueToJobDialog";



type Props = {
    customer: selectCustomerSchemaType,
    job?: selectJobSchemaType,
    jobStages?: selectJobStagesSchemaTypeNoDefaults[],
    techs?: {
        id: string,
        description: string,
    }[],
    isEditable?: boolean,
    isManager?: boolean|undefined,
}

export default function JobForm({
    customer, job, jobStages, techs, isEditable = true, isManager = false
}: Props) {

    const router = useRouter()
    const searchParams = useSearchParams()
    const hasJobNumber = searchParams.has("jobId")
    const hasCustomerID = searchParams.has("customerId")

    const emptyValues: insertJobSchemaType = {
        id: '(New)',
        job_number: 1,
        stage: 1,
        customerId: hasCustomerID ? customer.id : 1,           // >= 1 (or set a real customer id)
        address1: "123 Test Lane",
        address2: "",
        city: "Sydney",
        zip: "0000",             // 4 digits placeholder so it passes regex
        project_status: 0,
        measurer: "",
        height_default: 1020,
        max_height_default: 1200,
        max_post_spacing: 1280,
        design_default: "RD-D1",
        anchorage_default: "BP",
        toprail_default: "Elite",
        infill_default: "6.38mm Clear Laminate",
        wind_load: { bldg_height: 30, wind_region: "A", terrain_category: 2 },
        notes: "",
    }
        
    const defaultValues: insertJobSchemaType = hasJobNumber ? {
        id: job?.id ?? '(New)',
        job_number: job?.job_number ?? 1,
        stage: job?.stage ?? 1,
        customerId: job?.customerId ?? customer.id,
        address1: job?.address1 ?? '',
        address2: job?.address2 ?? '',
        city: job?.city ?? '',
        zip: job?.zip ?? '0000',
        project_status: job?.project_status ?? 0,
        measurer: job?.measurer ?? '',
        height_default: job?.height_default ?? 1020,
        max_height_default: job?.max_height_default ?? 1200,
        max_post_spacing: job?.max_post_spacing ?? 1280,
        design_default:job?.design_default ?? "RD-D1",
        anchorage_default: job?.anchorage_default ?? "BP",
        toprail_default: job?.toprail_default ?? "Elite",
        infill_default: job?.infill_default ?? "6.38mm Clear Laminate",
        wind_load: job?.wind_load ?? {bldg_height: 30, wind_region: "A", terrain_category: 2},
        notes: job?.notes ?? '',
    } : emptyValues



    type FormValues = z.infer<typeof insertJobSchema>;

    const form = useForm<FormValues>({
        mode: 'onBlur',
        resolver: zodResolver(insertJobSchema) as Resolver<FormValues>,
        defaultValues
    });

    const [continueDialogOpen, setContinueDialogOpen] = useState(false)
    const [continueHref, setContinueHref] = useState<string | null>(null)

    // const form = useForm<insertJobSchemaType>({
    //     mode: 'onBlur',
    //     resolver: zodResolver(insertJobSchema),
    //     defaultValues,

    // })
    const {
        execute: executeSave,
        result: saveResult,
        isPending: isSaving,
        reset: resetSaveAction,
    } = useAction(saveJobAction,{
        onSuccess({ data, input }){
            toast.success(data?.message)

            if (input.job_number && input.stage) {
                setContinueHref(`/editor/${input.job_number}/${input.stage}`)
                setContinueDialogOpen(true)
            }
        },
        onError({error}){
            toast.error("Save Failed")
        }
    })

    const {
        execute: executeCopy,
        result: copyResult,
        isPending: isCopying,
        reset: resetCopyAction,
    } = useAction(createNextStageAction,{
        onSuccess({data}){
            toast.success( data?.message )
        },
        onError({error}){
            toast.error("Save Failed")
        }
    })
    
    async function submitForm(data: insertJobSchemaType){
        console.log(data)
        executeSave(data)
    }

    async function copyForm(data: insertJobSchemaType){
        // console.log(data.job_number, data.stage + 1)
        // executeCopy(data)
        // Cannot create a new stage for an unsaved job
        if (data.id === "(New)") {
            toast.error("Save the job before creating a new stage");
            return;
        }

        executeCopy({
            jobId: data.id,            // now definitely a number
            currentStage: data.stage,  // server will create stage + 1
        });
    }


    
    return (
        <div className="flex flex-col gap-1 sm:px-8">
            <DisplayServerActionResponse result={saveResult} />
            <ContinueToJobDialog
                open={continueDialogOpen}
                onOpenChange={setContinueDialogOpen}
                href={continueHref}
            />
            <div>
                <h2 className="text-2xl font-bold">
                    {job?.id && isEditable ? `Edit Job #${job.job_number}` : job?.job_number ? `View Job #${job.job_number}` : "New Job Form"}
                </h2>
            </div>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(submitForm)} 
                className="flex flex-col md:flex-row gap-4 md:gap-8"
                >
                    <div className="flex flex-col gap-4 w-full max-w-xs">
                    
                        <NumberInputWithLabel<insertJobSchemaType>
                            fieldTitle="Job_number"
                            nameInSchema="job_number"
                            min={1}
                            max={99999}
                            disabled={!isEditable}
                        />
                        
                        <NumberInputWithLabel<insertJobSchemaType>
                            fieldTitle="Stage"
                            nameInSchema="stage"
                            min={1}
                            max={10}
                            disabled={!isEditable}
                        />

                        <SelectWithLabel<insertJobSchemaType>
                                fieldTitle="Project_status"
                                nameInSchema="project_status"
                                data={[{ id: '0', description: 'new job'}]}
                            />

                        { isManager && techs ? (
                            <SelectWithLabel<insertJobSchemaType>
                                fieldTitle="Measurer"
                                nameInSchema="measurer"
                                data={[{ id: 'new-job@example.com', description: 'new-job@example.com'}, ...techs]}
                            />
                        ) : (
                            <InputWithLabel<insertJobSchemaType>
                                fieldTitle="Measurer"
                                nameInSchema="measurer"
                                disabled={true}
                            />
                        )}

                        {/* <SelectWithLabel<insertJobSchemaType>
                            fieldTitle="Height"
                            nameInSchema="height_default"
                            data={[{ id: '1020', description: '1020'},
                                { id: '1050', description: '1050'},
                                { id: '1100', description: '1100'},
                                { id: '1200', description: '1200'}]}
                        /> */}

                        <NumberInputWithLabel<insertJobSchemaType>
                            fieldTitle="Height_default"
                            nameInSchema="height_default"
                            min={1020}
                            max={1200}
                            disabled={!isEditable}
                        />

                        <SelectWithLabel<insertJobSchemaType>
                            fieldTitle="Design"
                            nameInSchema="design_default"
                            data={[{ id: 'RD-D1', description: 'RD-D1'},
                                { id: 'RD-D2', description: 'RD-D2'},
                                { id: 'RD-D3', description: 'RD-D3'},
                                { id: 'RD-D3SLATS', description: 'RD-D3SLATS'},
                                { id: 'RD-D4', description: 'RD-D4'},
                                { id: 'RD-D4SLATS', description: 'RD-D4SLATS'},
                                { id: 'RD-D5', description: 'RD-D5'},
                                { id: 'RD-D6', description: 'RD-D6'},
                                { id: 'RD-D7', description: 'RD-D7'},
                                { id: 'RD-D8', description: 'RD-D8'},
                                { id: 'RD-D9', description: 'RD-D9'},
                                { id: 'RD-D10', description: 'RD-D10'},
                                { id: 'RD-D11', description: 'RD-D11'},
                                { id: 'RD-D12', description: 'RD-D12'},
                                { id: 'RD-D13', description: 'RD-D13'}]}
                            />

                        <SelectWithLabel<insertJobSchemaType>
                            fieldTitle="Anchorage"
                            nameInSchema="anchorage_default"
                            data={[{ id: 'BP', description: 'Baseplate'},
                                { id: 'DP', description: 'Deckplate'},
                                { id: 'CD', description: 'Core drilled'},
                                { id: 'SF', description: 'Side Fixed'}]}
                        />
                        
                        <SelectWithLabel<insertJobSchemaType>
                            fieldTitle="Toprail"
                            nameInSchema="toprail_default"
                            data={[{ id: 'Elite', description: 'Elite Toprail'},
                                { id: 'Visage', description: 'Visage Toprail'},
                                { id: 'Slenderline', description: 'Slenderline Toprail'},
                                { id: 'Oval', description: 'Core drilled'},
                                { id: 'Round', description: 'Side Fixed'}]}
                        />

                        {/* { job?.design_default == "RD-D1" || job?.design_default == "RD-D2" ? ( */}
                            <SelectWithLabel<insertJobSchemaType>
                                fieldTitle="Infill"
                                nameInSchema="infill_default"
                                data={[{ id: '6.38mm Clear Laminate', description: '6.38mm Clear Laminate'},
                                    { id: '6.38mm Translucent', description: '6.38mm Translucent'},
                                ]}
                            />
                            {/*):(null) 
                        }

                        { job?.design_default == "RD-D6" ? 
                            (<SelectWithLabel<insertJobSchemaType>
                                fieldTitle="Glass_default"
                                nameInSchema="glass_default"
                                data={[{ id: '10mm Clear Laminate', description: '10mm Clear Laminate'},
                                    { id: '10mm Translucent', description: '10mm Translucent'},
                                ]}
                            />)
                            :(null) 
                        }

                        { job?.design_default == "RD-D7" || job?.design_default == "RD-D8" ? 
                            (<SelectWithLabel<insertJobSchemaType>
                                fieldTitle="Glass_default"
                                nameInSchema="glass_default"
                                data={[{ id: '9.52mm Clear Laminate', description: '9.52mm Clear Laminate'},
                                    { id: '9.52mm Translucent', description: '9.52mm Translucent'},
                                ]}
                            />)
                            :(null) 
                        } */}

                        <InputWithLabel<insertJobSchemaType>
                            fieldTitle="Address1"
                            nameInSchema="address1"
                        />

                        <InputWithLabel<insertJobSchemaType>
                            fieldTitle="Address2"
                            nameInSchema="address2"
                        />

                        <InputWithLabel<insertJobSchemaType>
                            fieldTitle="City"
                            nameInSchema="city"
                        />

                        <InputWithLabel<insertJobSchemaType>
                            fieldTitle="Zip code"
                            nameInSchema="zip"
                        />

                        
                        


                        
                        {/* { job?.id ? (
                        <CheckboxWithLabel<insertJobSchemaType>
                            fieldTitle="Project_status"
                            nameInSchema="project_status"
                            message="Yes"
                            disabled={!isEditable}
                        />) : null } */}

                        {/* <div className="mt-4 space-y-2">
                            <h3 className="text-lg">Customer Info</h3>
                            <hr className="w-4/5" />
                            <p>{customer.firstName} {customer.lastName}</p>
                            <p>{customer.address1}</p>
                            {customer.address2 ? <p>{customer.address2}</p>:null}
                            <p>{customer.city}, {customer.state}, {customer.zip}</p>
                            <hr className="w-4/5" />
                            <p>{customer.email}</p>
                            <p>Phone: {customer.phone}</p>
                            <p>Job#: {job?.job_number}</p>
                        </div> */}
                        
                    </div>

                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        
                        <TextAreaWithLabel<insertJobSchemaType>
                            fieldTitle="Notes"
                            nameInSchema="notes"
                            className="h-96"
                            disabled={!isEditable}
                        />

                        {isEditable ? 
                        (<div className="flex gap 2">
                            <Button
                                type="submit"
                                className="w-2/4"
                                variant="default"
                                title="Save"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <LoaderCircle className="animate-spin" /> Saving
                                    </>
                                ) : "Save"}
                            </Button>
                            <Button
                                type="button"
                                className="w-1/4"
                                variant="ghost"
                                title="Copy"
                                disabled={isSaving || isCopying}
                                onClick={() => {
                                    copyForm(defaultValues)
                                }}
                            >
                                Copy
                            </Button>

                            <Button
                                type="button"
                                variant="destructive"
                                title="Reset"
                                onClick={() => {
                                    form.reset(defaultValues)
                                    resetSaveAction()
                                }}
                            >
                                Reset
                            </Button>
                        </div>) : null }

                    </div>

                    <div className="mt-4 space-y-2">

                        <h3 className="text-lg">Job Info</h3>
                        <hr className="w-4/5" />
                        <p>Client: {customer.company} - {customer.firstName}  {customer.lastName}</p>
                        <p>Address: {job?.address1}</p>
                        {job?.address2 ? <p>:{job?.address2}</p>:null}
                        <p>City: {job?.city}, {job?.zip}</p>

                        <hr className="w-4/5" />

                        {jobStages?.map((stage, index) => (
                            <div key={stage.id ?? index}>
                                <p>Job#: {job?.job_number} Stage: {stage.stage} of {jobStages.length} 
                                <Button
                                    type="button"
                                    className="w-1/6"
                                    variant="secondary"
                                    title={String(job?.job_number) + " stage " + String(stage.stage)}
                                    disabled={false}
                                    onClick={() => {
                                        // viewStage
                                    }}
                                >
                                    View
                                </Button></p>
                                <p>Status: {stage.status}</p>
                                <hr className="w-4/5" />
                            </div>
                            
                        ))}
                       
                        




                        <p>Status: {job?.project_status}</p>
                        <p>Design: {job?.design_default}</p>
                        <p>Anchorage: {job?.anchorage_default}</p>
                        <p>Top rail: {job?.toprail_default}</p>
                        <p>Infill: {job?.infill_default}</p>
                        <p>Wind load: {JSON.stringify(job?.wind_load)}</p>
                        <p>Notes: {job?.notes}</p>
                        <hr className="w-4/5" />
                    </div>
                    
                </form>  
                
                             
            </Form>
        </div>
    )
}