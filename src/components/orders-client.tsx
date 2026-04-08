"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Eye, X, Check, ChevronDown, CheckCircle2, Clock, AlertCircle, Download, Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

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

interface OrdersClientProps {
  orders: Order[]|null;
}

export default function OrdersClient({ orders }: OrdersClientProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [railingTypeFilter, setRailingTypeFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"all" | "completed" | "in-progress" | "incomplete">("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const ordersPerPage = 10;

  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setCurrentTime(new Date());
  //   }, 1000);

  //   return () => clearInterval(timer);
  // }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const totalOrders = orders?.length ?? 0;
  const completedOrders = orders?.filter(order => order.status === "Delivered").length ?? 0;
  const inProgressOrders = orders?.filter(order => order.status === "Processing" || order.status === "Shipped").length ?? 0;
  const incompleteOrders = orders?.filter(order => order.status === "Pending").length ?? 0;

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      Delivered: "bg-green-100 text-green-700",
      Shipped: "bg-blue-100 text-blue-700",
      Processing: "bg-yellow-100 text-yellow-700",
      Pending: "bg-gray-100 text-gray-700"
    };
    return statusStyles[status as keyof typeof statusStyles] || statusStyles.Pending;
  };

  const uniqueStatuses = Array.from(new Set(orders?.map(order => order.status)));
  const uniqueRailingTypes = Array.from(new Set(orders?.map(order => order.design)));

  const matchesDateRange = (orderDate: string) => {
    if (dateRange === "all") return true;
    
    const today = new Date();
    const [month, day, year] = orderDate.split('/');
    const orderDateObj = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (dateRange === "today") {
      return orderDateObj.toDateString() === today.toDateString();
    } else if (dateRange === "week") {
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      return orderDateObj >= oneWeekAgo && orderDateObj <= today;
    } else if (dateRange === "month") {
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      return orderDateObj >= oneMonthAgo && orderDateObj <= today;
    }
    return true;
  };

  const filteredOrders = orders?.filter((order) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      order.job_number.toString().includes(query) ||
      order?.company?.toLowerCase().includes(query) ||
      order.design.toLowerCase().includes(query);
    
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(order.status);
    const matchesRailingType = railingTypeFilter.length === 0 || railingTypeFilter.includes(order.design);
    const matchesDate = matchesDateRange(new Date(order.jobDate as any).toLocaleDateString("en-AU", { dateStyle: "medium" }));
    
    let matchesViewMode = true;
    if (viewMode === "completed") {
      matchesViewMode = order.status === "Delivered";
    } else if (viewMode === "in-progress") {
      matchesViewMode = order.status === "Processing" || order.status === "Shipped";
    } else if (viewMode === "incomplete") {
      matchesViewMode = order.status === "Pending";
    }
    
    return matchesSearch && matchesStatus && matchesRailingType && matchesViewMode && matchesDate;
  });

  const totalPages = filteredOrders != undefined ? Math.ceil(filteredOrders.length / ordersPerPage) : 1;
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const paginatedOrders = filteredOrders != undefined ? filteredOrders.slice(startIndex, endIndex) : filteredOrders;

  const resetPage = () => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    resetPage();
  };

  const toggleRailingTypeFilter = (type: string) => {
    setRailingTypeFilter(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    resetPage();
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setRailingTypeFilter([]);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-115px)]">
      {/* Sidebar */}
      <div className="w-[280px] rounded-md flex flex-col h-full bg-white">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-5 p-6">
            {/* Search Orders */}
            <div>
              <h3 className="text-[11px] font-semibold text-gray-900 mb-3">Search Orders</h3>
              <div className="relative">
                <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-[11px] rounded-md bg-[#f5f5f5] border-none focus:outline-none focus:ring-2 focus:ring-rail-light-blue"
                />
              </div>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold text-gray-900">Date Range</h3>
              <div className="flex flex-col gap-2">
                {(['all', 'today', 'week', 'month'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      dateRange === range
                        ? "bg-rail-light-blue text-white"
                        : "bg-[#f5f5f5] text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <div className={`p-1.5 rounded-md ${dateRange === range ? "bg-white/20" : "bg-gray-100"}`}>
                      <Calendar size={11} className={dateRange === range ? "text-white" : "text-gray-600"} />
                    </div>
                    <span className="flex-1 text-left">
                      {range === 'all' && 'All Time'}
                      {range === 'today' && 'Today'}
                      {range === 'week' && 'This Week'}
                      {range === 'month' && 'This Month'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* View Options */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold text-gray-900">View Options</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setViewMode("all")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    viewMode === "all" ? "bg-rail-light-blue text-white" : "bg-[#f5f5f5] text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${viewMode === "all" ? "bg-white/20" : "bg-gray-100"}`}>
                    <Search size={11} className={viewMode === "all" ? "text-white" : "text-gray-600"} />
                  </div>
                  <span className="flex-1 text-left">All Orders</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${viewMode === "all" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                    {totalOrders}
                  </span>
                </button>
                <button
                  onClick={() => setViewMode("completed")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    viewMode === "completed" ? "bg-rail-light-blue text-white" : "bg-[#f5f5f5] text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${viewMode === "completed" ? "bg-white/20" : "bg-green-100"}`}>
                    <CheckCircle2 size={11} className={viewMode === "completed" ? "text-white" : "text-green-600"} />
                  </div>
                  <span className="flex-1 text-left">Completed</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${viewMode === "completed" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                    {completedOrders}
                  </span>
                </button>
                <button
                  onClick={() => setViewMode("in-progress")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    viewMode === "in-progress" ? "bg-rail-light-blue text-white" : "bg-[#f5f5f5] text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${viewMode === "in-progress" ? "bg-white/20" : "bg-yellow-100"}`}>
                    <Clock size={11} className={viewMode === "in-progress" ? "text-white" : "text-yellow-600"} />
                  </div>
                  <span className="flex-1 text-left">In Progress</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${viewMode === "in-progress" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                    {inProgressOrders}
                  </span>
                </button>
                <button
                  onClick={() => setViewMode("incomplete")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    viewMode === "incomplete" ? "bg-rail-light-blue text-white" : "bg-[#f5f5f5] text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${viewMode === "incomplete" ? "bg-white/20" : "bg-gray-100"}`}>
                    <AlertCircle size={11} className={viewMode === "incomplete" ? "text-white" : "text-gray-600"} />
                  </div>
                  <span className="flex-1 text-left">Incomplete</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${viewMode === "incomplete" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                    {incompleteOrders}
                  </span>
                </button>
              </div>
            </div>

            {/* Railing Type Filter */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold text-gray-900">Railing Type</h3>
                {railingTypeFilter.length > 0 && (
                  <button
                    onClick={() => setRailingTypeFilter([])}
                    className="text-[10px] text-rail-light-blue hover:text-[#333333] font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between px-3 py-2 text-[11px] rounded-md bg-[#f5f5f5] text-gray-700 font-medium transition-colors hover:bg-gray-200 cursor-pointer">
                    <span>
                      {railingTypeFilter.length > 0 
                        ? `${railingTypeFilter.length} selected` 
                        : 'All Types'}
                    </span>
                    <ChevronDown size={11} className="text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search type..." />
                    <CommandList>
                      <CommandEmpty>No type found.</CommandEmpty>
                      <CommandGroup>
                        {uniqueRailingTypes.map((type) => (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={() => toggleRailingTypeFilter(type)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                railingTypeFilter.includes(type) 
                                  ? 'bg-rail-light-blue border-rail-light-blue' 
                                  : 'border-gray-300'
                              }`}>
                                {railingTypeFilter.includes(type) && (
                                  <Check size={12} className="text-white" />
                                )}
                              </div>
                              <span className="flex-1">{type}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 h-full">
        {/* Header Section */}
        <div className="bg-white rounded-md px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
              <p className="text-sm text-gray-600 mt-1">View and manage all your orders</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Clock size={18} className="text-rail-light-blue" />
                <span>{formatTime(currentTime)}</span>
              </div>
              <div className="text-[11px] text-gray-600">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Orders List Section */}
        <div className="bg-white rounded-lg flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-6 pr-6">
              {/* Column Headers */}
              <div className="flex items-center gap-4 px-2 pb-2 border-b">
            <div className="w-[80px] flex-shrink-0">
              <span className="text-xs font-bold text-gray-900">Order ID</span>
            </div>
            <div className="w-[80px] flex-shrink-0">
              <span className="text-xs font-bold text-gray-900">Date</span>
            </div>
            <div className="flex-1 min-w-[180px]">
              <span className="text-xs font-bold text-gray-900">Customer</span>
            </div>
            <div className="w-[160px] flex-shrink-0">
              <span className="text-xs font-bold text-gray-900">Job number</span>
            </div>
            <div className="w-[120px] flex-shrink-0">
              <span className="text-xs font-bold text-gray-900">Railing Design</span>
            </div>
            <div className="w-[90px] flex-shrink-0">
              <span className="text-xs font-bold text-gray-900">Anchorage</span>
            </div>
            <div className="w-[100px] flex-shrink-0">
              <span className="text-xs font-bold text-gray-900">Status</span>
            </div>
            <div className="w-[120px] flex-shrink-0 text-center">
              <span className="text-xs font-bold text-gray-900">Actions</span>
            </div>
              </div>

              {/* Orders List */}
              <div className="space-y-2.5">
                {paginatedOrders?.map((order) => (
                  <div key={order.id} className="bg-[#f5f5f5] rounded-lg p-2">
                  <div className="flex items-center gap-4">
                    <div className="w-[80px] flex-shrink-0 pl-1">
                      <span className="font-semibold text-rail-light-blue text-xs bg-rail-light-blue/10 px-2 py-1 rounded-md inline-block">
                        {order.id}
                      </span>
                    </div>
                    <div className="w-[80px] flex-shrink-0 text-gray-600 text-xs">
                      {new Date(order.jobDate as any).toLocaleDateString("en-AU", { dateStyle: "medium" })}
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-gray-900 font-medium text-xs truncate">{order.company}</p>
                    </div>
                    <div className="w-[160px] flex-shrink-0 text-gray-600 text-xs">
                      {order.job_number}
                    </div>
                    <div className="w-[120px] flex-shrink-0 text-gray-600 text-xs">
                      {order.design}
                    </div>
                    <div className="w-[90px] flex-shrink-0 font-semibold text-gray-900 text-xs">
                      {order.anchorage}
                    </div>
                    <div className="w-[100px] flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="w-[120px] flex-shrink-0 flex justify-end gap-2 pr-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => handleViewOrder(order.job_number.toString())}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye size={16} className="text-gray-600" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Details</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer">
                            <Download size={16} className="text-gray-600" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download Invoice</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
              <div className="text-[11px] text-gray-600">
                { filteredOrders != undefined ? <> Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders </> : <>No orders to show</>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 py-1.5 text-[10px] font-medium rounded-md transition-colors cursor-pointer ${
                        currentPage === page
                          ? 'bg-rail-light-blue text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
