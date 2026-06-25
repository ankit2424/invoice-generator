import React from 'react';
import { motion } from 'motion/react';

export default function InvoiceIllustration() {
  return (
    <div className="relative w-32 h-32 mx-auto mb-8 cursor-pointer group">
      {/* Background glow animated */}
      <motion.div 
        className="absolute inset-0 bg-indigo-500 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* 3D Isometric Base Plate */}
      <motion.div 
        className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center justify-center overflow-hidden"
        initial={{ rotateX: 20, rotateZ: -10, y: 10 }}
        whileHover={{ rotateX: 0, rotateZ: 0, y: -5 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Floating Paper 1 */}
        <motion.div
          className="absolute w-20 h-24 bg-indigo-50 rounded-lg border border-indigo-100 flex flex-col p-2 space-y-2 shadow-sm"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-1/2 h-2 bg-indigo-200 rounded-full" />
          <div className="w-full h-1.5 bg-indigo-100 rounded-full" />
          <div className="w-3/4 h-1.5 bg-indigo-100 rounded-full" />
          <div className="mt-auto self-end w-1/3 h-3 bg-indigo-300 rounded-full" />
        </motion.div>

        {/* Floating Paper 2 (Top Invoice) */}
        <motion.div
          className="absolute w-20 h-24 bg-white rounded-lg border border-gray-200 shadow-md flex flex-col p-2.5 space-y-2"
          initial={{ y: -10, x: 10 }}
          animate={{ 
            y: [-10, -15, -10],
          }}
          transition={{
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div className="flex justify-between items-center mb-1">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-[8px] tracking-tighter">
              INV
            </div>
            <div className="w-6 h-2 bg-green-100 rounded-sm" />
          </div>
          <div className="w-full h-1 bg-gray-100 rounded-full" />
          <div className="w-5/6 h-1 bg-gray-100 rounded-full" />
          
          <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-center">
             <div className="w-8 h-1.5 bg-gray-200 rounded-full" />
             <div className="w-6 h-2 bg-indigo-600 rounded-full" />
          </div>
        </motion.div>
        
        {/* Decorative Badge */}
        <motion.div
          className="absolute -right-2 -bottom-2 w-10 h-10 bg-green-400 rounded-xl shadow-lg flex items-center justify-center text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.5, bounce: 0.5 }}
          whileHover={{ rotate: 15, scale: 1.1 }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
