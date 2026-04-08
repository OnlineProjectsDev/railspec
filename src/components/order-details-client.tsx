"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Download, CheckCircle2, Clock, AlertCircle, Package, HelpCircle, MessageCircle, Image } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface OrderDetailsClientProps {
  order: Order;
}

const getStatusBadge = (status: string) => {
  const statusStyles = {
    Delivered: "bg-green-100 text-green-700",
    Shipped: "bg-blue-100 text-blue-700",
    Processing: "bg-yellow-100 text-yellow-700",
    Pending: "bg-gray-100 text-gray-700"
  };
  return statusStyles[status as keyof typeof statusStyles] || statusStyles.Pending;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Delivered":
      return <CheckCircle2 size={20} className="text-green-600" />;
    case "Shipped":
    case "Processing":
      return <Clock size={20} className="text-blue-600" />;
    case "Pending":
      return <AlertCircle size={20} className="text-orange-600" />;
    default:
      return null;
  }
};

export default function OrderDetailsClient({ order }: OrderDetailsClientProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

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

  return (
    <div className="p-4 flex gap-4 h-[calc(100vh-136px)]">
      {/* Sidebar */}
      <div className="w-[280px] rounded-md flex flex-col h-full bg-white min-h-0">
        {/* Back Button at Top */}
        <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <button
            onClick={() => router.push("/orders")}
            className="w-full flex items-center justify-center gap-2 text-white transition-colors text-[11px] font-medium bg-rail-light-blue rounded-md py-2 px-3 cursor-pointer hover:bg-[#333]"
          >
            <ArrowLeft size={13} />
            <span>Back to Orders</span>
          </button>
        </div>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-5 p-6">
            {/* Order Overview */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold text-gray-900">Order Overview</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-0.5 bg-[#f5f5f5] rounded-md px-3 py-2">
                  <span className="text-[11px] text-gray-500">Order ID</span>
                  <span className="text-[11px] font-bold text-rail-light-blue">{order.id}</span>
                </div>
                <div className="flex items-center justify-between gap-0.5 bg-[#f5f5f5] rounded-md px-3 py-2">
                  <span className="text-[11px] text-gray-500">Order Date</span>
                  <span className="text-[11px] font-medium text-gray-900">{new Date(order.jobDate as any).toLocaleDateString("en-AU", { dateStyle: "medium" })}</span>
                </div>
                <div className="flex items-center justify-between gap-0.5 bg-[#f5f5f5] rounded-md px-3 py-2">
                  <span className="text-[11px] text-gray-500">Status</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${getStatusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold text-gray-900">Client Details</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-0.5 bg-[#f5f5f5] rounded-md px-3 py-2">
                  <span className="text-[11px] text-gray-500">Customer</span>
                  <span className="text-[11px] font-medium text-gray-900 overflow-hidden whitespace-nowrap hover:overflow-x-auto hover:whitespace-normal max-w-[130px]">{order.company}</span>
                </div>
                <div className="flex items-center justify-between gap-0.5 bg-[#f5f5f5] rounded-md px-3 py-2">
                  <span className="text-[11px] text-gray-500">Project</span>
                  <span className="text-[11px] font-medium text-gray-900 overflow-hidden whitespace-nowrap hover:overflow-x-auto hover:whitespace-normal max-w-[130px]">{order.design}-{order.anchorage}</span>
                </div>
                {/* <div className="flex items-center justify-between gap-0.5 bg-[#f5f5f5] rounded-md px-3 py-2">
                  <span className="text-[11px] text-gray-500">Phone</span>
                  <span className="text-[11px] font-medium text-gray-900 overflow-hidden whitespace-nowrap hover:overflow-x-auto hover:whitespace-normal max-w-[130px]">{order.}/span>
                </div> */}
                <div className="flex items-center justify-between gap-0.5 bg-[#f5f5f5] rounded-md px-3 py-2">
                  <span className="text-[11px] text-gray-500">Email</span>
                  <span className="text-[11px] font-medium text-rail-light-blue overflow-hidden whitespace-nowrap hover:overflow-x-auto hover:whitespace-normal max-w-[130px]">{order.email}</span>
                </div>
              </div>
            </div>

            {/* Download Invoice */}
            <div className="flex flex-col gap-3">
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer">
                <Download size={11} />
                <span>Download Invoice</span>
              </button>
            </div>

            {/* Help & Support */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold text-gray-900">Help & Support</h3>
              <div className="flex flex-col gap-2">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer">
                  <HelpCircle size={11} className="text-gray-600" />
                  <span className="flex-1 text-left">Order Help</span>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-200 cursor-pointer">
                  <MessageCircle size={11} className="text-gray-600" />
                  <span className="flex-1 text-left">Contact Support</span>
                </button>
              </div>
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
              <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
              <p className="text-sm text-gray-600 mt-1">Complete information about order {order.id}</p>
            </div>
            {/* <div className="flex flex-col-reverse items-end gap-1">
              <div className="text-2xl font-bold text-rail-light-blue">
                {order.total}
              </div>
              <div className="text-[11px] text-gray-600">
                Total Amount
              </div>
            </div> */}
          </div>
        </div>

        {/* Order Information Section */}
        <div className="bg-white rounded-lg flex-1 overflow-hidden">
          <ScrollArea className="h-full p-6">
            <div className="space-y-6">
              {/* Product Details */}
              <div className="bg-[#f5f5f5] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4 pb-3">
                  <Package size={18} className="text-rail-light-blue" />
                  <h2 className="text-lg font-semibold text-gray-900">Product Configuration</h2>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {/* Column 1 */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Railing Type</p>
                      <p className="text-sm font-medium text-gray-900">{order.design}-{order.anchorage}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Mounting Type</p>
                      <p className="text-sm font-medium text-gray-900">Surface Mount</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Shape</p>
                      <p className="text-sm font-medium text-gray-900">Straight Run</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Material</p>
                      <p className="text-sm font-medium text-gray-900">Aluminum 6061-T6</p>
                    </div>
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Total Length</p>
                      <p className="text-sm font-medium text-gray-900">15 linear feet</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Height</p>
                      <p className="text-sm font-medium text-gray-900">42 inches</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Post Spacing</p>
                      <p className="text-sm font-medium text-gray-900">6 feet</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Color/Finish</p>
                      <p className="text-sm font-medium text-gray-900">Black Powder Coat</p>
                    </div>
                  </div>

                  {/* Column 3 */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Order Status</p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Estimated Delivery</p>
                      <p className="text-sm font-medium text-gray-900">2024-02-15</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Number of Posts</p>
                      <p className="text-sm font-medium text-gray-900">4 posts</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1 tracking-wide">Infill Panels</p>
                      <p className="text-sm font-medium text-gray-900">3 panels</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Design Preview */}
              <div className="bg-[#f5f5f5] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                  <Image size={18} className="text-rail-light-blue" />
                  <h2 className="text-lg font-semibold text-gray-900">Design Preview</h2>
                </div>
                <div className="space-y-4">
                  {/* 3D View Placeholder */}
                  <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <Package size={48} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">3D Railing Preview</p>
                      <p className="text-[11px] text-gray-500 mt-1">{order.design}-{order.anchorage} - 15 linear feet</p>
                    </div>
                  </div>
                  
                  {/* Design Notes */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-[11px] text-gray-500 mb-1">Configuration</p>
                      <p className="text-sm font-medium text-gray-900">Straight Run, Surface Mount</p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-[11px] text-gray-500 mb-1">Dimensions</p>
                      <p className="text-sm font-medium text-gray-900">15 ft  42 in (L  H)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
