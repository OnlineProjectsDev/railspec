// "use client";

// import { Package, Calendar, ArrowRight, CheckCircle2, Clock, AlertCircle, HelpCircle, MessageCircle, User, Pencil } from "lucide-react";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { useRouter } from "next/navigation";
// import { useState, useEffect } from "react";
// import { OrderCard } from "@/components/dashboard-components/order-card";
// import { EmptyState } from "@/components/dashboard-components/empty-state";

// interface Order {
//     id: number;
//     jobDate: Date;
//     jobAddress: string;
//     job_number: number;
//     job_id: number;
//     stage: number;
//     design: string;
//     hasStage: boolean;
//     editorBalconyCount: number;
//     company: string | null;
//     firstName: string | null;
//     lastName: string | null;
//     email: string | null;
//     status: string;
// }

// interface DashboardClientProps {
//   orders: Order[];
// }

// export default function DashboardClient({ orders }: DashboardClientProps) {
//   const router = useRouter();
//   const [currentTime, setCurrentTime] = useState(new Date());
//   const [showPlaceholder, setShowPlaceholder] = useState(() => {
//     if (typeof window !== 'undefined') {
//       const stored = localStorage.getItem('showPlaceholder');
//       return stored === null ? true : stored === 'true';
//     }
//     return true;
//   });

//   // useEffect(() => {
//   //   const timer = setInterval(() => {
//   //     setCurrentTime(new Date());
//   //   }, 1000);

//   //   return () => clearInterval(timer);
//   // }, []);

//   useEffect(() => {
//     const handleToggle = () => {
//       if (typeof window !== 'undefined') {
//         const stored = localStorage.getItem('showPlaceholder');
//         setShowPlaceholder(stored === 'true');
//       }
//     };

//     window.addEventListener('placeholderToggle', handleToggle);
//     return () => window.removeEventListener('placeholderToggle', handleToggle);
//   }, []);

//   const filteredOrders = showPlaceholder ? orders : [];

//   const getGreeting = () => {
//     const hour = currentTime.getHours();
//     if (hour < 12) return "Good morning";
//     if (hour < 18) return "Good afternoon";
//     return "Good evening";
//   };

//   const formatTime = (date: Date) => {
//     return date.toLocaleTimeString('en-US', { 
//       hour: '2-digit', 
//       minute: '2-digit',
//       hour12: true 
//     });
//   };

//   const formatDate = (date: Date) => {
//     return date.toLocaleDateString('en-US', { 
//       weekday: 'long',
//       year: 'numeric', 
//       month: 'long', 
//       day: 'numeric' 
//     });
//   };

//   const getStatusBadge = (status: string) => {
//     const statusStyles = {
//       draft: "bg-yellow-100 text-yellow-700",
//       Delivered: "bg-green-100 text-green-700",
//       Shipped: "bg-blue-100 text-blue-700",
//       Processing: "bg-yellow-100 text-yellow-700",
//       Pending: "bg-gray-100 text-gray-700"
//     };
//     return statusStyles[status as keyof typeof statusStyles] || statusStyles.Pending;
//   };

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case "draft":
//         return <Pencil size={16} className="text-yellow-600" />;
//       case "Delivered":
//         return <CheckCircle2 size={16} className="text-green-600" />;
//       case "Shipped":
//       case "Processing":
//         return <Clock size={16} className="text-blue-600" />;
//       case "Pending":
//         return <AlertCircle size={16} className="text-orange-600" />;
//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="p-4 flex gap-4 h-[calc(100vh-115px)]">
//       {/* Sidebar */}
//       <div className="w-[280px] rounded-md flex flex-col h-full bg-white">
//         {/* Profile Section */}
//         <div className="flex flex-col gap-3 p-4 pb-5 border-b">
//           <div className="flex items-center gap-3 bg-[#f5f5f5] rounded-md p-3">
//             <div className="w-9 h-9 bg-rail-light-blue rounded-full flex items-center justify-center">
//               <User size={16} className="text-white" />
//             </div>
//             <div>
//               <p className="text-sm font-semibold text-gray-900">John Smith</p>
//               <p className="text-[10px] text-gray-500">john.smith@example.com</p>
//             </div>
//           </div>
//         </div>

//         <ScrollArea className="flex-1">
//           <div className="flex flex-col gap-5 px-6 py-6">
//             {/* Account Overview */}
//             <div className="flex flex-col gap-3">
//               <h3 className="text-[11px] font-semibold text-gray-900">Overview</h3>
//               <div className="flex flex-col gap-2">
//                 <div className="bg-[#f5f5f5] rounded-md px-3 py-3 flex justify-between items-center">
//                   <div className="flex items-center gap-2">
//                     <div className="p-1.5 rounded-md bg-rail-light-blue/10">
//                       <Package size={12} className="text-rail-light-blue" />
//                     </div>
//                     <span className="text-[11px] text-gray-500">Total Orders</span>
//                   </div>
//                   <p className="text-md font-bold text-gray-900">127</p>
//                 </div>
//                 <div className="bg-[#f5f5f5] rounded-md px-3 py-3 flex justify-between items-center">
//                   <div className="flex items-center gap-2">
//                     <div className="p-1.5 rounded-md bg-orange-100">
//                       <Clock size={12} className="text-orange-600" />
//                     </div>
//                     <span className="text-[11px] text-gray-500">Pending Orders</span>
//                   </div>
//                   <p className="text-lg font-bold text-gray-900">8</p>
//                 </div>
//               </div>
//             </div>

//             {/* Quick Actions */}
//             <div className="flex flex-col gap-3">
//               <h3 className="text-[11px] font-semibold text-gray-900">Quick Actions</h3>
//               <div className="flex flex-col gap-2">
//                 <button 
//                   onClick={() => router.push('/builder')}
//                   className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-rail-light-blue text-white hover:bg-[#333] cursor-pointer"
//                 >
//                   <div className="p-1.5 rounded-md bg-white/20">
//                     <Package size={11} />
//                   </div>
//                   <span className="flex-1 text-left">New Build</span>
//                 </button>
                
//               </div>
//             </div>
//           </div>
//         </ScrollArea>

//         {/* Help & Support */}
//         <div className="flex flex-col gap-3 px-6 pb-6 border-t pt-5">
//           <h3 className="text-[11px] font-semibold text-gray-900">Help & Support</h3>
//           <div className="flex flex-col gap-2">
//             <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-50 cursor-pointer">
//               <div className="p-1.5 rounded-md bg-gray-200">
//                 <HelpCircle size={11} className="text-gray-600" />
//               </div>
//               <span className="flex-1 text-left">Help Center</span>
//             </button>
//             <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors bg-[#f5f5f5] text-gray-700 hover:bg-gray-50 cursor-pointer">
//               <div className="p-1.5 rounded-md bg-gray-200">
//                 <MessageCircle size={11} className="text-gray-600" />
//               </div>
//               <span className="flex-1 text-left">Contact Support</span>
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col gap-4 h-full">
//         {/* Header Section */}
//         <div className="bg-white rounded-md px-6 py-6">
//           <div className="flex items-center justify-between">
//             <div>
//               <div className="flex items-center gap-2">
//                 <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, John!</h1>
//                 <span className="text-2xl">👋</span>
//               </div>
//               <p className="text-xs text-gray-600 mt-1.5">Ready to create something amazing today?</p>
//             </div>
//             <div className="flex flex-col items-end gap-1.5">
//               <div className="flex items-center gap-2.5">
//                 <div className="flex flex-col items-end">
//                   <div className="text-2xl font-bold text-gray-900 tabular-nums">
//                     {formatTime(currentTime)}
//                   </div>
//                   <div className="text-[11px] text-gray-500 font-medium">
//                     {formatDate(currentTime)}
//                   </div>
//                 </div>
//                 <div className="w-px h-10 bg-gray-200"></div>
//                 <div className="p-2.5 rounded-lg bg-rail-light-blue/10">
//                   <Clock size={20} className="text-rail-light-blue" />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Recent Orders Section */}
//         <div className="bg-white rounded-lg p-6 flex-1 flex flex-col overflow-hidden">
//                 <div className="flex items-center justify-between mb-3 pb-2">
//                   <div className="flex items-center gap-2">
//                     <Package size={18} className="text-rail-light-blue" />
//                     <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
//                   </div>
//                   <button 
//                     onClick={() => router.push('/orders')}
//                     className="text-[11px] text-rail-light-blue hover:text-[#333] font-medium flex items-center gap-1 cursor-pointer"
//                   >
//                     View All
//                     <ArrowRight size={14} />
//                   </button>
//                 </div>

//                 <div className="flex flex-col gap-3">
//                   {filteredOrders.length > 0 ? (
//                     filteredOrders.map((order) => (
//                       <OrderCard
//                         key={order.id}
//                         order={order}
//                         getStatusIcon={getStatusIcon}
//                         getStatusBadge={getStatusBadge}
//                       />
//                     ))
//                   ) : (
//                     <EmptyState />
//                   )}
//                 </div>
//         </div>
//       </div>
//     </div>
//   );
// }
