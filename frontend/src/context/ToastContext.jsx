import React, { createContext, useContext, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import clsx from 'clsx'

const ToastContext = createContext(null)

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) throw new Error('useToast must be used within a ToastProvider')
    return context
}

const toastTypes = {
    success: { icon: CheckCircle, className: 'bg-white border-l-4 border-green-500 text-slate-800' },
    error: { icon: AlertCircle, className: 'bg-red-50 border border-red-200 text-red-900 shadow-red-100/50' },
    warning: { icon: AlertTriangle, className: 'bg-white border-l-4 border-amber-500 text-slate-800' },
    info: { icon: Info, className: 'bg-white border-l-4 border-blue-500 text-slate-800' }
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts(prev => [...prev, { id, message, type, duration }])

        // Auto remove
        setTimeout(() => {
            removeToast(id)
        }, duration)
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info')
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => {
                        const TypeIcon = toastTypes[t.type].icon
                        return (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                layout
                                className={clsx(
                                    "pointer-events-auto min-w-[300px] max-w-[400px] p-4 rounded-md shadow-lg border border-slate-100 flex items-start gap-3 relative overflow-hidden",
                                    toastTypes[t.type].className,
                                    "backdrop-blur-sm"
                                )}
                            >
                                <TypeIcon className={clsx(
                                    "shrink-0 mt-0.5",
                                    t.type === 'success' && "text-green-600",
                                    t.type === 'error' && "text-red-600",
                                    t.type === 'warning' && "text-amber-600",
                                    t.type === 'info' && "text-blue-600"
                                )} size={20} />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-sm capitalize mb-0.5 text-slate-900">{t.type}</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{t.message}</p>
                                </div>
                                <button
                                    onClick={() => removeToast(t.id)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}
