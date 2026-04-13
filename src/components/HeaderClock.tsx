'use client'

import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

export function HeaderClock() {
    const [now, setNow] = useState<Date | null>(null)

    useEffect(() => {
        setNow(new Date())
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    if (!now) return null

    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

    return (
        <div className="flex items-center gap-1.5 bg-muted rounded-md px-3 h-9 text-xs text-muted-foreground select-none">
            <Clock size={13} />
            <span className="font-medium tabular-nums">{time}</span>
            <span className="text-muted-foreground/60">·</span>
            <span>{date}</span>
        </div>
    )
}
