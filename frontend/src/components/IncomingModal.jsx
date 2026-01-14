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
        const qty = parseInt(val) || 0
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, to_receive: qty } : item
        ))
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Incoming Materials</h2>
                        <p className="text-sm text-gray-500">Requisition: {requisition.req_number || requisition.folio} - {requisition.requester?.full_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
                            <AlertTriangle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 font-medium text-xs text-gray-500 uppercase tracking-wider pb-2 border-b">
                            <div className="col-span-4">Material / Description</div>
                            <div className="col-span-2 text-center">Unit</div>
                            <div className="col-span-2 text-center">Requested</div>
                            <div className="col-span-2 text-center">Received So Far</div>
                            <div className="col-span-2 text-center">Incoming Now</div>
                        </div>

                        {items.map(item => {
                            const isFullyReceived = (item.quantity_received || 0) >= item.quantity_requested
                            const remaining = Math.max(0, item.quantity_requested - (item.quantity_received || 0))

                            return (
                                <div key={item.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2">
                                    <div className="col-span-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 text-base mb-0.5">
                                                {item.material?.name || item.material_name || "Unknown Material"}
                                            </span>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                                <span>Part #: <span className="text-gray-700">{item.material?.part_number || 'N/A'}</span></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 text-center text-sm text-gray-600">{item.unit || 'PCS'}</div>
                                    <div className="col-span-2 text-center text-sm font-medium">{item.quantity_requested}</div>
                                    <div className="col-span-2 text-center text-sm text-blue-600 font-medium">
                                        {item.quantity_received || 0}
                                        {isFullyReceived && <Check size={14} className="inline ml-1 text-green-500" />}
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        {!isFullyReceived ? (
                                            <input
                                                type="number"
                                                min="0"
                                                max={remaining}
                                                className="w-20 p-2 text-center border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                                placeholder="0"
                                                value={item.to_receive === 0 ? '' : item.to_receive}
                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            />
                                        ) : (
                                            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                                Complete
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Processing...' : 'Confirm Incoming'}
                    </button>
                </div>
            </div>
        </div>
    )
}
