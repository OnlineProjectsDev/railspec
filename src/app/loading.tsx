import { LoaderCircle } from "lucide-react";
import Image from "next/image";

export default function Loading(){
    return (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm">
            <div className="w-full h-dvh flex flex-col items-center justify-center gap-6">
                <Image
                    src="/images/logos/RAILSPEC-logo.svg"
                    alt="RailSpec"
                    width={140}
                    height={46}
                    className="opacity-80"
                    priority
                />
                <LoaderCircle className="h-7 w-7 animate-spin text-rail-light-blue" />
                <p className="text-xs text-muted-foreground tracking-wide">Loading...</p>
            </div>
        </div>
    )
}