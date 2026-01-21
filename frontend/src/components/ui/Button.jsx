
import React from 'react'
import { Loader2 } from 'lucide-react'

export default function Button({ children, onClick, isLoading, icon: Icon, variant = 'primary', className = '', ...props }) {
    const baseStyles = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"

    const variants = {
        primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-sm focus:ring-primary-500",
        secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm focus:ring-gray-200",
        danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-red-500",
        ghost: "hover:bg-gray-100 text-gray-600"
    }

    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : Icon && <Icon size={18} />}
            {children}
        </button>
    )
}
