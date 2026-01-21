
import React from 'react'

export default function Card({ children, title, className = '' }) {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
            {title && (
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                </div>
            )}
            <div className="p-0">
                {children}
            </div>
        </div>
    )
}
