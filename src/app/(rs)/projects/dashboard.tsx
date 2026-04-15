// /app/(rs)/projects/dashboard.tsx
"use client"

import { Package, Calendar, CheckCircle2, Clock, AlertCircle, HelpCircle, MessageCircle, User, Pencil, Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";

import { OrderCard } from "@/components/dashboard-components/order-card";
import { EmptyState } from "@/components/dashboard-components/empty-state";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

interface employeeDetails {
    id: number;
    kindeUserId: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface customerDetails {
    id: number;
    company: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address1: string;
    address2: string | null;
    city: string;
    state: string;
    zip: string;
    notes: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface Order {
    id: number;
    jobDate: Date;
    jobAddress: string;
    job_number: number;
    job_id: number;
    stage: number;
    design:string;
    hasStage: boolean;
    editorBalconyCount: number;
    company: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    status: string;
    revisionOptions: {
        value: string;
        label: string;
    }[];
    selectedRevisionOption: string;
}

interface DashboardProps {
    isRailsafeEmployee: boolean;
    employeeRow : employeeDetails | null;
    customerRow : customerDetails | null;
    orders : Order[] | null;
}

const PENDING_STATUSES = [
  "Pending",
  "Processing",
  "draft",
  "started",
];


function normalizeDateForSearch(raw: string | Date | null | undefined): string {
  if (!raw) return "";

  const s = String(raw);               // "2025-11-13 04:03:11.039455"
  const [datePart] = s.split(" ");     // "2025-11-13"
  return datePart;                     // we search over this
}

export default function ProjectDashboard({isRailsafeEmployee, employeeRow, customerRow, orders}:DashboardProps){
    
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in-progress" | "delivered">("all");
    
    const [showPlaceholder, setShowPlaceholder] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('showPlaceholder');
            return stored === null ? true : stored === 'true';
        }
        return true;
    });

    useEffect(() => {
        const handleToggle = () => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('showPlaceholder');
            setShowPlaceholder(stored === 'true');
        }
        };

        window.addEventListener('placeholderToggle', handleToggle);
        return () => window.removeEventListener('placeholderToggle', handleToggle);
    }, []);


    // const filteredOrders = showPlaceholder ? orders : [];
    const safeOrders = useMemo(() => orders ?? [], [orders]);
    const totalOrdersCount = useMemo(() => safeOrders.length, [safeOrders]);

    const pendingOrdersCount = useMemo(
      () => safeOrders.filter((order) => PENDING_STATUSES.includes(order.status)).length,
      [safeOrders]
    );

    const filteredOrders = useMemo(() => {
      if (!showPlaceholder) return [];

      let result = safeOrders;

      if (statusFilter === "pending") {
        result = result.filter(o => o.status === "Pending");
      } else if (statusFilter === "in-progress") {
        result = result.filter(o => ["Processing", "Shipped", "draft", "started"].includes(o.status));
      } else if (statusFilter === "delivered") {
        result = result.filter(o => o.status === "Delivered");
      }

      const q = searchTerm.trim().toLowerCase();
      if (q) {
        result = result.filter(order => {
          const valuesToCheck = [
            order.jobAddress,
            order.company,
            order.firstName,
            order.lastName,
            order.email,
            order.status,
            order.design,
            String(order.job_number),
            String(order.stage),
            order.jobDate ? normalizeDateForSearch(order.jobDate) : null,
          ];
          return valuesToCheck.some(value =>
            value?.toString().toLowerCase().includes(q)
          );
        });
      }

      return result;
    }, [safeOrders, showPlaceholder, searchTerm, statusFilter]);

    const getStatusBadge = (status: string) => {
    const statusStyles = {
        draft: "bg-yellow-100 text-yellow-700",
        Delivered: "bg-green-100 text-green-700",
        Shipped: "bg-blue-100 text-blue-700",
        Processing: "bg-yellow-100 text-yellow-700",
        Pending: "bg-gray-100 text-gray-700"
        };
        return statusStyles[status as keyof typeof statusStyles] || statusStyles.Pending;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
        case "draft":
            return <Pencil size={16} className="text-yellow-600" />;
        case "Delivered":
            return <CheckCircle2 size={16} className="text-green-600" />;
        case "Shipped":
        case "Processing":
            return <Clock size={16} className="text-blue-600" />;
        case "Pending":
            return <AlertCircle size={16} className="text-orange-600" />;
        default:
            return null;
        }
    };

    console.log(employeeRow)

    return (
        <div className="flex gap-4 flex-1 min-h-0">
      {/* Sidebar */}
      <div className="w-[280px] rounded-md flex flex-col min-h-0 bg-white">
        {/* Profile Section */}
        <div className="flex flex-col gap-3 p-4 pb-5 border-b">
          <div className="flex items-center gap-3 bg-[#f5f5f5] rounded-md p-3">
            <div className="w-9 h-9 bg-rail-light-blue rounded-full flex items-center justify-center">
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{(isRailsafeEmployee) ? employeeRow?.firstName + ' ' + employeeRow?.lastName : customerRow?.firstName + ' ' + customerRow?.lastName}</p>
              <p className="text-[10px] text-gray-500">{(isRailsafeEmployee) ? employeeRow?.kindeUserId : customerRow?.email}</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-5 px-6 py-6">
            {/* Account Overview */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold text-gray-900">Overview</h3>
              <div className="flex flex-col gap-2">
                <div className="bg-[#f5f5f5] rounded-md px-3 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-rail-light-blue/10">
                      <Package size={13} className="text-rail-light-blue" />
                    </div>
                    <span className="text-[11px] text-gray-500">Total Orders</span>
                  </div>
                  <p className="text-md font-bold text-gray-900">{totalOrdersCount}</p>
                </div>
                <div className="bg-[#f5f5f5] rounded-md px-3 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-orange-100">
                      <Clock size={13} className="text-orange-500" />
                    </div>
                    <span className="text-[11px] text-gray-500">Pending Orders</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{pendingOrdersCount}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold text-gray-900">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => router.push('/project-builder')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer"
                  suppressHydrationWarning
                >
                  <div className="p-1.5 rounded-md bg-white/20">
                    <Calendar size={13} className="text-white" />
                  </div>
                  <span className="flex-1 text-left">New Project</span>
                </button>
                
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Help & Support */}
        <div className="flex flex-col gap-3 px-6 pb-6 border-t pt-5">
          <h3 className="text-[11px] font-semibold text-gray-900">Help & Support</h3>
          <div className="flex flex-col gap-2">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-50 cursor-pointer"
              suppressHydrationWarning
            >
              <div className="p-1.5 rounded-md bg-gray-200">
                <HelpCircle size={13} className="text-gray-500" />
              </div>
              <span className="flex-1 text-left">Help Center</span>
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-50 cursor-pointer"
              suppressHydrationWarning
            >
              <div className="p-1.5 rounded-md bg-gray-200">
                <MessageCircle size={13} className="text-gray-500" />
              </div>
              <span className="flex-1 text-left">Contact Support</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 h-full">
        {/* Header Section */}
        <div className="bg-white rounded-md px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{} </h1>
                <span className="text-2xl">👋 Welcome</span>
              </div>
              <p className="text-xs text-gray-600 mt-1.5">Ready to create something amazing today?</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2.5">
                <div className="flex flex-col items-end">
                  <div className="text-2xl font-bold text-gray-900 tabular-nums" suppressHydrationWarning>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium" suppressHydrationWarning>
                    {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div className="w-px h-10 bg-gray-200"></div>
                <div className="p-2.5 rounded-lg bg-rail-light-blue/10">
                  <Clock size={20} className="text-rail-light-blue" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders Section */}
        <div className="bg-white rounded-lg p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col gap-2 mb-3 pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={18} className="text-rail-light-blue" />
                      <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status filter pills */}
                      <div className="flex items-center gap-1">
                        {([
                          { key: "all", label: "All" },
                          { key: "pending", label: "Pending" },
                          { key: "in-progress", label: "In Progress" },
                          { key: "delivered", label: "Delivered" },
                        ] as const).map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => setStatusFilter(key)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                              statusFilter === key
                                ? "bg-rail-light-blue text-white"
                                : "bg-[#f5f5f5] text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {/* Search — expands inline from the icon */}
                      <div className={`flex items-center gap-1.5 rounded-md overflow-hidden transition-all duration-200 ${
                        searchOpen ? "bg-[#f5f5f5] ring-2 ring-rail-light-blue w-52" : "bg-transparent w-7"
                      }`}>
                        <button
                          onClick={() => {
                            setSearchOpen(o => {
                              if (o) setSearchTerm("");
                              return !o;
                            });
                          }}
                          className={`flex-shrink-0 p-1.5 rounded-md transition-colors cursor-pointer ${
                            searchOpen
                              ? "text-rail-light-blue"
                              : "bg-[#f5f5f5] text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          <Search size={13} />
                        </button>
                        {searchOpen && (
                          <input
                            autoFocus
                            type="text"
                            suppressHydrationWarning
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search…"
                            className="flex-1 py-1.5 pr-2 text-[11px] bg-transparent border-none focus:outline-none min-w-0"
                          />
                        )}
                        {searchOpen && searchTerm && (
                          <button
                            onClick={() => setSearchTerm("")}
                            className="flex-shrink-0 pr-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="flex flex-col gap-3 pr-2">
                    {filteredOrders != null && filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          getStatusIcon={getStatusIcon}
                          getStatusBadge={getStatusBadge}
                        />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </ScrollArea>
        </div>
      </div>
    </div>
    )
}