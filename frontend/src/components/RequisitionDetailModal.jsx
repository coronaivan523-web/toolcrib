import React, { useState } from 'react'
import { X, CheckCircle, Clock, XCircle, AlertCircle, FileText, User } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { requisitionService } from '../services/requisitions'

export default function RequisitionDetailModal({ isOpen, onClose, requisition, currentUser, onActionSuccess }) {
    if (!isOpen || !requisition) return null

    const [actionLoading, setActionLoading] = useState(false)

    // Helper for Status Colors
    const getStatusColor = (status) => {
        switch (status) {
            case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200'
            case 'UNDER_APPROVAL': return 'bg-blue-50 text-blue-700 border-blue-200'
            case 'APPROVED_PRE_PURCHASE': return 'bg-green-50 text-green-700 border-green-200'
            case 'REWORK_REQUIRED': return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'REJECTED_FINAL': return 'bg-red-50 text-red-700 border-red-200'
            case 'CANCELED': return 'bg-slate-50 text-slate-500 border-slate-200'
            default: return 'bg-slate-100 text-slate-700'
        }
    }

    const getStepIcon = (status) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle size={18} className="text-green-600" />
            case 'REJECTED': return <XCircle size={18} className="text-red-600" />
            case 'PENDING': return <Clock size={18} className="text-blue-600 animate-pulse" />
            case 'WAITING': return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
            case 'SKIPPED': return <div className="w-4 h-4 rounded-full bg-slate-200" />
            default: return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
        }
    }

    // --- Permissions Logic ---
    const currentUserId = currentUser?.id

    // Check if user has a pending approval step
    const myPendingStep = requisition.approvals?.find(step =>
        step.step_status === 'PENDING' &&
        step.assigned_to_user_id === currentUserId
    )
    const isAssignedApprover = Boolean(myPendingStep)

    // Owner actions
    const isOwner = requisition.requester_id === currentUserId
    const canResubmit = requisition.status === 'REWORK_REQUIRED' && isOwner
    const canCancel = ['DRAFT', 'UNDER_APPROVAL', 'REWORK_REQUIRED'].includes(requisition.status) && isOwner

    // --- Handlers ---
    const handleApprove = async () => {
        if (!confirm("Are you sure you want to APPROVE this requisition?")) return
        setActionLoading(true)
        try {
            await requisitionService.approve(requisition.id)
            onActionSuccess()
            onClose()
        } catch (e) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleReject = async () => {
        const comment = prompt("Please enter a reason for rejection:")
        if (comment === null) return // User cancelled prompt
        if (!comment.trim()) {
            alert("Comment is required for rejection.")
            return
        }

        setActionLoading(true)
        try {
            await requisitionService.reject(requisition.id, comment)
            onActionSuccess()
            onClose()
        } catch (e) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleResubmit = async () => {
        if (!confirm("Confirm resubmission?")) return
        setActionLoading(true)
        try {
            await requisitionService.resubmit(requisition.id)
            onActionSuccess()
            onClose()
        } catch (e) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to CANCEL this requisition? It cannot be undone.")) return
        setActionLoading(true)
        try {
            await requisitionService.cancel(requisition.id)
            onActionSuccess()
            onClose()
        } catch (e) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                                {requisition.req_number || 'New Draft'}
                                <span className={clsx("text-xs px-2.5 py-0.5 rounded-full font-bold border", getStatusColor(requisition.status))}>
                                    {requisition.status?.replace(/_/g, " ")}
                                </span>
                            </h2>
                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                <Clock size={14} />
                                Submitted: {requisition.submitted_at ? format(new Date(requisition.submitted_at), 'PPP p') : 'Not Submitted'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Requester</span>
                            <div className="flex items-center gap-2 mt-2 font-medium text-slate-700">
                                <User size={16} />
                                {requisition.requester?.full_name || requisition.requester?.email || requisition.requester_id || 'Unknown'}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Priority</span>
                            <div className={clsx("mt-2 font-bold inline-flex items-center gap-1.5", requisition.priority === 'URGENT' ? 'text-red-600' : 'text-slate-700')}>
                                {requisition.priority === 'URGENT' && <AlertCircle size={16} />}
                                {requisition.priority}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Justification</span>
                            <p className="mt-2 text-sm text-slate-600 italic">"{requisition.justification}"</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="bg-primary-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                            Requested Items
                        </h3>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2">Material / Part #</th>
                                        <th className="px-4 py-2 text-center">Qty</th>
                                        <th className="px-4 py-2 text-right">Unit Price</th> {/* If available */}
                                        <th className="px-4 py-2 text-right">Ext. Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requisition.items?.map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{item.material_name || item.material_id}</div>
                                                <div className="text-xs text-slate-400">Part #: {item.part_number || 'N/A'} | ID: {item.material_id}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-700">{item.quantity_requested}</td>
                                            <td className="px-4 py-3 text-right text-slate-500">-</td>
                                            <td className="px-4 py-3 text-right text-slate-500">-</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <span className="bg-primary-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                            Approval Workflow
                        </h3>
                        <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
                            {(requisition.approvals || []).sort((a, b) => a.step_order - b.step_order).map((step) => (
                                <div key={step.id} className="relative pl-6">
                                    <div className="absolute -left-[1.6rem] top-0 bg-white p-1 rounded-full border border-slate-100 shadow-sm">
                                        {getStepIcon(step.step_status)}
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Step {step.step_order}</span>
                                            <h4 className="font-bold text-slate-800">{step.step_name.replace(/_/g, ' ')}</h4>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Assigned: {step.assigned_to_user_id ? step.assigned_to_user_id.slice(0, 8) + '...' : 'System'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={clsx(
                                                "text-xs font-bold px-2 py-0.5 rounded border uppercase",
                                                step.step_status === 'APPROVED' ? "bg-green-50 text-green-700 border-green-100" :
                                                    step.step_status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-100" :
                                                        "bg-slate-100 text-slate-500 border-slate-200"
                                            )}>
                                                {step.step_status}
                                            </span>
                                            {step.action_at && (
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {format(new Date(step.action_at), 'MMM d, p')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Comments */}
                                    {step.comment && (
                                        <div className="mt-2 bg-slate-50 p-2.5 rounded border border-slate-100 text-sm text-slate-600 italic border-l-4 border-l-slate-300">
                                            "{step.comment}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex gap-2">
                        {canResubmit && (
                            <button
                                onClick={handleResubmit}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {actionLoading ? 'Processing...' : 'Resubmit Requisition'}
                            </button>
                        )}
                        {canCancel && (
                            <button
                                onClick={handleCancel}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-300 transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? 'Processing...' : 'Cancel Requisition'}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onClose} disabled={actionLoading} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm">
                            Close
                        </button>

                        {isAssignedApprover && (
                            <>
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {actionLoading ? '...' : 'Reject'}
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {actionLoading ? '...' : 'Approve'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
