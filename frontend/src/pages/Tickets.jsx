import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Check, X, Clock, User, Package, FileText } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import PageHeader from '../components/PageHeader'

export default function Tickets() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [materials, setMaterials] = useState([]) // For selection
    const [currentUser, setCurrentUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false) // Simple check for now

    // New Ticket State
    const [newTicketItems, setNewTicketItems] = useState([{ material_id: '', quantity: 1 }])

    useEffect(() => {
        fetchUserAndTickets()
        fetchMaterials()
    }, [])

    const fetchUserAndTickets = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)

        if (user) {
            // Get full profile
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setUserProfile(profile)

            const isAdminRole = profile?.role === 'admin' || user.email?.includes('admin')
            setIsAdmin(isAdminRole)

            // Fetch Tickets
            let query = supabase.from('tickets').select('*, items:ticket_items(*, material:materials(name, part_number)), requester:profiles(email, full_name, avatar_url)').order('created_at', { ascending: false })

            if (!isAdminRole) {
                query = query.eq('requester_id', user.id)
            }

            const { data, error } = await query
            if (data) setTickets(data)
            if (error) console.error("Error fetching tickets:", error)
        }
        setLoading(false)
    }

    const fetchMaterials = async () => {
        const { data } = await supabase.from('materials').select('id, name, part_number, current_stock').eq('status', 'active')
        if (data) setMaterials(data)
    }

    const handleCreateTicket = async () => {
        try {
            // Create Ticket Logic (Client Side for simplicity as per previous impl)
            const { data: ticket, error: ticketError } = await supabase.from('tickets').insert([{
                requester_id: currentUser.id,
                status: 'PENDIENTE'
            }]).select().single()

            if (ticketError) throw ticketError

            const items = newTicketItems.map(item => ({
                ticket_id: ticket.id,
                material_id: item.material_id,
                quantity_requested: parseInt(item.quantity)
            }))

            const { error: itemsError } = await supabase.from('ticket_items').insert(items)
            if (itemsError) throw itemsError

            setIsCreateModalOpen(false)
            setNewTicketItems([{ material_id: '', quantity: 1 }])
            fetchUserAndTickets()

        } catch (error) {
            console.error(error)
            alert("Error creating ticket")
        }
    }

    const handleCloseTicket = async (ticketId, items) => {
        if (!isAdmin) return

        // 1. Deduct Stock
        for (const item of items) {
            const { data: mat } = await supabase.from('materials').select('current_stock').eq('id', item.material_id).single()
            const current = mat?.current_stock || 0
            const newStock = current - item.quantity_requested

            await supabase.from('materials').update({ current_stock: newStock }).eq('id', item.material_id)
            await supabase.from('ticket_items').update({ quantity_fulfilled: item.quantity_requested }).eq('id', item.id)
        }

        // 2. Update Ticket
        await supabase.from('tickets').update({ status: 'ENTREGADO', assigned_to: currentUser.id }).eq('id', ticketId)
        fetchUserAndTickets()
    }

    // Helper to add row to modal
    const addRow = () => setNewTicketItems([...newTicketItems, { material_id: '', quantity: 1 }])

    // Helper to update row
    const updateRow = (index, field, value) => {
        const rows = [...newTicketItems]
        rows[index][field] = value
        setNewTicketItems(rows)
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

            <PageHeader
                title="Tickets"
                subtitle="Manage material requests and approvals."
                user={currentUser}
                profile={userProfile}
                bgColor="#164e63" // Cyan-900: Deep professional teal/blue
            />

            {/* Toolbar */}
            <div className="bg-primary-900 px-8 pb-3 pt-0 flex justify-end border-t border-primary-800/50 shadow-md z-20">
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-white text-primary-900 px-4 py-1.5 rounded-md flex items-center gap-2 font-bold shadow-lg hover:bg-slate-50 transition-all text-sm transform hover:-translate-y-0.5"
                >
                    <Plus size={16} strokeWidth={3} />
                    New Request
                </button>
            </div>

            <div className="flex-1 overflow-auto p-8">
                <div className="grid gap-4 max-w-5xl mx-auto">
                    {loading ? <p className="text-center text-slate-500 py-10">Loading tickets...</p> : tickets.map(ticket => (
                        <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                            {/* Header Info */}
                            <div className="md:w-1/4 border-r border-slate-100 pr-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-full ${ticket.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                        {ticket.status === 'PENDIENTE' ? <Clock size={20} /> : <Check size={20} />}
                                    </div>
                                    <span className="font-bold text-slate-800">{ticket.status}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-mono mb-1">ID: {ticket.id.slice(0, 8)}</p>
                                <div className="flex items-center gap-2 mt-3">
                                    {ticket.requester?.avatar_url ? (
                                        <img src={ticket.requester.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs text-slate-500">
                                            {ticket.requester?.email?.[0]}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-slate-700">{ticket.requester?.full_name || ticket.requester?.email}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{format(new Date(ticket.created_at), 'PPP p')}</p>
                            </div>

                            {/* Items List */}
                            <div className="flex-1">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Requested Items</h4>
                                <div className="space-y-2">
                                    {ticket.items?.map(item => (
                                        <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-1.5 rounded-md border border-slate-200 text-slate-500">
                                                    <Package size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 text-sm">{item.material?.name || 'Unknown Item'}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{item.material?.part_number}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block font-bold text-primary-900 text-lg">{item.quantity_requested} <span className="text-xs font-normal text-slate-500">qty</span></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions (Admin Only) */}
                            {isAdmin && ticket.status === 'PENDIENTE' && (
                                <div className="md:w-40 flex flex-col justify-center gap-2 pl-4 border-l border-slate-100">
                                    <button
                                        onClick={() => handleCloseTicket(ticket.id, ticket.items)}
                                        className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Check size={16} /> Approve
                                    </button>
                                    <button className="w-full bg-white border border-slate-200 text-slate-600 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                        <X size={16} /> Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {tickets.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">No tickets found</h3>
                            <p className="text-slate-500">Create a new request to get started.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-primary-900 text-white">
                            <h3 className="font-bold text-lg">New Material Request</h3>
                            <button onClick={() => setIsCreateModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {newTicketItems.map((row, idx) => (
                                    <div key={idx} className="flex gap-4 items-start">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Material</label>
                                            <select
                                                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                                                value={row.material_id}
                                                onChange={e => updateRow(idx, 'material_id', e.target.value)}
                                            >
                                                <option value="">Select Item...</option>
                                                {materials.map(m => (
                                                    <option key={m.id} value={m.id}>{m.part_number} - {m.name} (Stock: {m.current_stock})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Qty</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                                value={row.quantity}
                                                onChange={e => updateRow(idx, 'quantity', e.target.value)}
                                            />
                                        </div>
                                        {idx > 0 && (
                                            <button onClick={() => {
                                                const n = [...newTicketItems]; n.splice(idx, 1); setNewTicketItems(n);
                                            }} className="mt-6 text-red-400 hover:text-red-600"><X size={20} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={addRow} className="mt-4 text-primary-600 font-bold text-sm flex items-center gap-1">+ Add Another Item</button>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">Cancel</button>
                            <button onClick={handleCreateTicket} className="px-4 py-2 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 shadow-lg">Submit Request</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
