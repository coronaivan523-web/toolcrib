import React, { useState, useEffect } from 'react'
import { X, Check, AlertTriangle } from 'lucide-react'
import { requisitionService } from '../services/requisitions'

export default function IncomingModal({ requisition, onClose, onSuccess }) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (requisition) {
            // Initialize with 0 quantity to receive
            setItems(requisition.items.map(item => ({
                ...item,
                to_receive: 0,
                // Ensure quantity_received defaults to 0 if undefined
                quantity_received: item.quantity_received || 0
            })))
        }
    }, [requisition])

    const handleQuantityChange = (itemId, val) => {
        // Parse input to integer, default to 0 if NaN
        let qty = parseInt(val)
        if (isNaN(qty)) qty = 0

        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item

            // Calculate remaining quantity allowed
            const remaining = Math.max(0, item.quantity_requested - (item.quantity_received || 0))

            // Enforce limits: no negatives, no over-receiving
            if (qty < 0) qty = 0
            if (qty > remaining) qty = remaining

            return { ...item, to_receive: qty }
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Filter only items with > 0 to_receive
            const payloadItems = items
                .filter(i => i.to_receive > 0)
                .map(i => ({
                    item_id: i.id,
                    material_id: i.material_id,
                    quantity: i.to_receive
                }))

            if (payloadItems.length === 0) {
                setError("Please enter a quantity for at least one item.")
                setLoading(false)
                return
            }

            await requisitionService.processIncoming(requisition.id, payloadItems)
            onSuccess() // Context should handle refresh
            onClose()
        } catch (err) {
            console.error(err)
            setError(err.message || "Failed to process incoming materials")
        } finally {
            setLoading(false)
        }
    }

    if (!requisition) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">

                {/* Header - Professional Blue Gradient */}
                <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-indigo-800 flex justify-between items-center text-white shadow-md">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Incoming Materials</h2>
                        <div className="flex items-center gap-2 text-blue-100 text-sm mt-1 opacity-90">
                            <span className="font-semibold">{requisition.req_number || requisition.folio}</span>
                            <span>•</span>
                            <span>{requisition.requester?.full_name}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors text-blue-50 hover:text-white"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100 shadow-sm">
                            <AlertTriangle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 font-semibold text-xs text-slate-500 uppercase tracking-wider py-3 px-4 bg-slate-100/80 border-b border-slate-200">
                            <div className="col-span-4 pl-2">Material / Description</div>
                            <div className="col-span-2 text-center">Unit</div>
                            <div className="col-span-2 text-center text-blue-600">Requested</div>
                            <div className="col-span-2 text-center text-emerald-600">Received</div>
                            <div className="col-span-2 text-center text-indigo-600">Incoming Now</div>
                        </div>

                        {/* Table Items */}
                        <div className="divide-y divide-slate-100">
                            {items.map(item => {
                                const isFullyReceived = (item.quantity_received || 0) >= item.quantity_requested
                                const remaining = Math.max(0, item.quantity_requested - (item.quantity_received || 0))
                                const isFocused = item.to_receive > 0

                                return (
                                    <div
                                        key={item.id}
                                        className={`grid grid-cols-12 gap-4 items-center py-4 px-4 transition-colors ${isFocused ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="col-span-4 pl-2">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-base mb-0.5">
                                                    {item.material?.name || item.material_name || "Unknown Material"}
                                                </span>
                                                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs border border-slate-200">Part #: {item.material?.part_number || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-center text-sm font-medium text-slate-600 bg-slate-50 py-1 rounded mx-2 border border-slate-100">
                                            {item.unit || 'PCS'}
                                        </div>
                                        <div className="col-span-2 text-center text-sm font-bold text-slate-700">
                                            {item.quantity_requested}
                                        </div>
                                        <div className="col-span-2 text-center text-sm font-bold text-emerald-600 flex items-center justify-center gap-1">
                                            {item.quantity_received || 0}
                                            {isFullyReceived && <Check size={14} strokeWidth={3} />}
                                        </div>
                                        <div className="col-span-2 flex justify-center relative">
                                            {!isFullyReceived ? (
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={remaining}
                                                        className={`w-24 p-2 text-center border-2 rounded-lg outline-none transition-all font-bold text-indigo-700 ${item.to_receive > 0
                                                            ? 'border-indigo-400 bg-white ring-2 ring-indigo-100'
                                                            : 'border-slate-200 bg-slate-50 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100'
                                                            }`}
                                                        placeholder="0"
                                                        value={item.to_receive === 0 ? '' : item.to_receive}
                                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    />
                                                    {remaining > 0 && (
                                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap">
                                                            Max: {remaining}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
                                                    <Check size={12} strokeWidth={3} />
                                                    Complete
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
                    <div className="text-xs text-slate-400 font-medium">
                        * Quantities are auto-limited to remaining amount
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200/70 hover:text-slate-800 rounded-lg transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 text-sm"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </div>
                            ) : (
                                <>
                                    Confirm Incoming <Check size={16} strokeWidth={3} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
