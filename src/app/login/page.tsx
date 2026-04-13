import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";

import { Button } from "@/components/ui/button";

export default function LoginPage(){
    return(
        <main className="h-dvh flex flex-col items-center gap-6 text-4xl p-4">
            <h1>RailSpec</h1>
            <Button asChild>
                <LoginLink>Sign In</LoginLink>
            </Button>
        </main>
    )
}

// "use client";

// import { useState, useEffect } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

// export default function LoginPage() {
//   const router = useRouter();
//   const [showPassword, setShowPassword] = useState(false);
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//   });
//   const [rememberMe, setRememberMe] = useState(false);

//   useEffect(() => {
//     document.title = "Login | RailSpec";
//   }, []);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     // Handle login logic here
//     // For now, just redirect to dashboard
//     router.push("/projects");
//   };

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
//       <div className="w-full max-w-md">
//         {/* Logo */}
//         <div className="flex justify-center mb-8">
//           <Image 
//             src="/images/logos/Railsafe-Secondary-Tagline-Black.svg" 
//             alt="RailSafe Logo" 
//             width={180}
//             height={48}
//             className="object-contain"
//             priority
//             quality={100}
//           />
//         </div>

//         {/* Login Card */}
//         <div className="bg-white rounded-lg shadow-lg p-8">
//           <div className="mb-6">
//             <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
//             <p className="text-sm text-gray-600">Sign in to access your account</p>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             {/* Email Field */}
//             <div>
//               <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <Mail size={18} className="text-gray-400" />
//                 </div>
//                 <input
//                   id="email"
//                   name="email"
//                   type="email"
//                   required
//                   value={formData.email}
//                   onChange={handleInputChange}
//                   className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rail-light-blue focus:border-transparent"
//                   placeholder="you@example.com"
//                 />
//               </div>
//             </div>

//             {/* Password Field */}
//             <div>
//               <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
//                 Password
//               </label>
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                   <Lock size={18} className="text-gray-400" />
//                 </div>
//                 <input
//                   id="password"
//                   name="password"
//                   type={showPassword ? "text" : "password"}
//                   required
//                   value={formData.password}
//                   onChange={handleInputChange}
//                   className="w-full pl-10 pr-12 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rail-light-blue focus:border-transparent"
//                   placeholder="Enter your password"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
//                 >
//                   {showPassword ? (
//                     <EyeOff size={18} className="text-gray-400 hover:text-gray-600" />
//                   ) : (
//                     <Eye size={18} className="text-gray-400 hover:text-gray-600" />
//                   )}
//                 </button>
//               </div>
//             </div>

//             {/* Remember Me & Forgot Password */}
//             <div className="flex items-center justify-between">
//               <div className="flex items-center">
//                 <input
//                   id="remember-me"
//                   name="remember-me"
//                   type="checkbox"
//                   checked={rememberMe}
//                   onChange={(e) => setRememberMe(e.target.checked)}
//                   className="h-4 w-4 text-rail-light-blue focus:ring-rail-light-blue border-gray-300 rounded cursor-pointer"
//                 />
//                 <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
//                   Remember me
//                 </label>
//               </div>
//               <Link href="/forgot-password" className="text-sm font-medium text-rail-light-blue hover:text-[#333] transition-colors">
//                 Forgot password?
//               </Link>
//             </div>

//             {/* Submit Button */}
//             <button
//               type="submit"
//               className="w-full flex items-center justify-center gap-2 bg-rail-light-blue text-white py-3 px-4 rounded-lg font-semibold text-sm hover:bg-[#333] transition-colors cursor-pointer"
//             >
//               Sign In
//               <ArrowRight size={18} />
//             </button>
//           </form>

//           {/* Divider */}
//           <div className="mt-6 mb-6">
//             <div className="relative">
//               <div className="absolute inset-0 flex items-center">
//                 <div className="w-full border-t border-gray-300"></div>
//               </div>
//               <div className="relative flex justify-center text-sm">
//                 <span className="px-2 bg-white text-gray-500">Or</span>
//               </div>
//             </div>
//           </div>

//           {/* Sign Up Link */}
//           <div className="text-center">
//             <p className="text-sm text-gray-600">
//               Don&apos;t have an account?{" "}
//               <Link href="/signup" className="font-semibold text-rail-light-blue hover:text-[#333] transition-colors">
//                 Sign up
//               </Link>
//             </p>
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="mt-8 text-center">
//           <p className="text-xs text-gray-500">
//             © 2025 RailSafe. All rights reserved.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }
