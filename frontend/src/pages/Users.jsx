import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Trash2, StopCircle, CheckCircle, Mail, Edit, X, Save, Send, Key, Eye, EyeOff, Users as UsersIcon, Filter, LogIn, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useNavigate, useOutletContext } from 'react-router-dom';

const userService = {
    getAll: async () => {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    create: async (userData) => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to create user');
        }
        return response.json();
    },
    update: async (id, updates) => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to update user');
        }
        return response.json();
    },
    delete: async (id) => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to delete user');
        }
        return response.json();
    },
    impersonate: async (id) => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${id}/impersonate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to impersonate user');
        }
        return response.json();
    }
};

export default function Users() {
    // Get profile from layout context for the header
    const { userProfile } = useOutletContext();

    // Local auth state for API calls/permissions
    const [currentUser, setCurrentUser] = useState(null);
    const [session, setSession] = useState(null);

    // Auth Check
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setCurrentUser(session?.user);
        });
    }, []);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [positionFilter, setPositionFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messageModalOpen, setMessageModalOpen] = useState(false);

    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [messageSubject, setMessageSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
    const [userToImpersonate, setUserToImpersonate] = useState(null);
    const [impersonateLoading, setImpersonateLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        employee_number: '',
        role_name: 'user',
        department: '',
        position: ''
    });

    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        if (!currentUser) return; // Wait for auth

        // Strict Access Control
        const allowedEmail = 'ivan.corona@wasion.cn';
        const allowedEmailAlt = 'ivan.corona@wasion.com';

        if (currentUser?.email !== allowedEmail && currentUser?.email !== allowedEmailAlt) {
            setAccessDenied(true);
            setLoading(false);
            return;
        }

        fetchUsers();
    }, [currentUser]);

    const [fetchError, setFetchError] = useState(null);
    const navigate = useNavigate();

    const handleError = async (error) => {
        console.error('Operation failed:', error);
        if (error.message && error.message.includes('Session from session_id claim in JWT does not exist')) {
            alert('Your session has expired or is invalid. Please log in again.');
            await supabase.auth.signOut();
            navigate('/login');
        } else {
            alert(error.message || 'An error occurred');
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            console.log('Fetching users...');
            const data = await userService.getAll();
            console.log('Users fetched:', data);
            setUsers(data || []);
            if (!data || data.length === 0) {
                setFetchError('No users returned from Supabase. Check RLS policies.');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setFetchError(error.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            // Ensure system email has suffix
            if (formData.isSystemEmail && !formData.email.includes('@')) {
                formData.email = `${formData.email}@toolcrib.internal`;
            }

            await userService.create(formData);
            setIsCreateOpen(false);
            fetchUsers();
            resetForm();
        } catch (error) {
            handleError(error);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            let finalEmail = formData.email;
            // Ensure system email has suffix if manually edited to just username
            if (formData.isSystemEmail && !finalEmail.includes('@')) {
                finalEmail = `${finalEmail}@toolcrib.internal`;
            }

            const updates = {
                email: finalEmail,
                full_name: formData.full_name,
                employee_number: formData.employee_number,
                role_name: formData.role_name,
                department: formData.department,
                position: formData.position,
            };

            // Only include password if user typed one
            if (formData.password) {
                updates.password = formData.password;
            }

            await userService.update(selectedUser.id, updates);
            setIsEditOpen(false);
            fetchUsers();
            resetForm();
            alert('User updated successfully');
        } catch (error) {
            handleError(error);
        }
    };

    const openImpersonateModal = (user) => {
        setUserToImpersonate(user);
        setImpersonateModalOpen(true);
    };

    const confirmImpersonate = async () => {
        if (!userToImpersonate) return;
        setImpersonateLoading(true);
        try {
            // 1. Get Magic Link
            const data = await userService.impersonate(userToImpersonate.id);
            if (data.magic_link) {
                // 2. Sign out current admin
                await supabase.auth.signOut();

                // 3. Redirect to magic link
                window.location.href = data.magic_link;
            } else {
                throw new Error("No magic link returned");
            }
        } catch (error) {
            alert('Impersonation failed: ' + error.message);
            setImpersonateLoading(false);
            setImpersonateModalOpen(false);
        }
    };

    const handleSuspend = async (user) => {
        if (!confirm(`Are you sure you want to ${user.is_active ? 'suspend' : 'activate'} ${user.full_name}?`)) return;
        try {
            await userService.update(user.id, { is_active: !user.is_active });
            fetchUsers();
        } catch (error) {
            handleError(error);
        }
    };

    const handleDelete = async (user) => {
        if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${user.full_name}? This cannot be undone.`)) return;
        try {
            await userService.delete(user.id);
            fetchUsers();
        } catch (error) {
            handleError(error);
        }
    };

    const toggleSelectAll = () => {
        if (selectedUserIds.size === filteredUsers.length) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const toggleSelectUser = (id) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedUserIds(newSet);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        setIsSending(true);
        try {
            const promises = Array.from(selectedUserIds).map(userId =>
                fetch(`${import.meta.env.VITE_API_BASE_URL}/messages/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}` // Wait, need to fix Auth token access
                    },
                    body: JSON.stringify({
                        recipient_id: userId,
                        subject: messageSubject,
                        body: messageBody,
                        type: 'announcement'
                    })
                })
            );

            // We need to get the token properly. 
            // The component doesn't have 'session' in scope easily unless we use useAuth logic or supabase.auth.getSession
            // Let's fix the fetch logic inside the loop or use a helper.

            await Promise.all(promises);

            setMessageModalOpen(false);
            setSelectedUserIds(new Set());
            setMessageSubject('');
            setMessageBody('');
            alert('Messages sent successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to send some messages');
        } finally {
            setIsSending(false);
        }
    };
    const openEdit = (user) => {
        setSelectedUser(user);
        setFormData({
            email: user.email || '',
            password: '',
            full_name: user.full_name || '',
            employee_number: user.employee_number || '',
            role_name: user.role || 'user',
            department: user.department || '',
            position: user.position || ''
        });
        setIsEditOpen(true);
        setShowPassword(false);
    };

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            full_name: '',
            employee_number: '',
            role_name: 'user',
            department: '',
            position: ''
        });
        setSelectedUser(null);
        setShowPassword(false);
    };


    if (accessDenied) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                    <StopCircle size={48} className="mx-auto mb-4 text-slate-300" />
                    <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
                    <p>This page is only accessible to authorized administrators.</p>
                </div>
            </div>
        );
    }

    // Derived unique options for filters
    const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))].sort();
    const uniquePositions = [...new Set(users.map(u => u.position).filter(Boolean))].sort();
    const uniqueDepartments = [...new Set(users.map(u => u.department).filter(Boolean))].sort();

    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();

        // Search Filter
        const matchesSearch =
            (user.full_name?.toLowerCase().includes(searchLower)) ||
            (user.email?.toLowerCase().includes(searchLower)) ||
            (user.employee_number?.includes(searchLower)) ||
            (user.position?.toLowerCase().includes(searchLower));

        // Dropdown Filters
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesPosition = positionFilter === 'all' || user.position === positionFilter;
        const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;

        return matchesSearch && matchesRole && matchesPosition && matchesDepartment;
    });

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            <PageHeader
                title="User Management"
                subtitle="Manage system access and permissions"
                user={currentUser}
                profile={userProfile}
                bgColor="#6b21a8" // Purple-800
            />

            {fetchError && (
                <div className="mx-8 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error Loading Users: </strong>
                    <span className="block sm:inline">{fetchError}</span>
                    <br />
                    <span className="text-sm">Account: {currentUser?.email} (Role: {currentUser?.role})</span>
                </div>
            )}

            {/* Filters & Toolbar */}
            <div className="bg-white border-b border-slate-200 shadow-sm z-20">
                {/* Global Stats / Filter Row - Medium purple to create gradient effect */}
                <div className="px-8 py-3 bg-indigo-100/40 border-b border-indigo-200/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                            <UsersIcon className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold text-slate-800">{users.length}</span>
                            <span className="text-slate-400">Total</span>
                        </div>
                        {filteredUsers.length !== users.length && (
                            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-md border border-purple-200 text-purple-700">
                                <Filter className="w-4 h-4" />
                                <span className="font-semibold">{filteredUsers.length}</span>
                                <span className="opacity-75">Filtered</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {/* Role Filter */}
                        <select
                            className="text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>

                        {/* Position Filter */}
                        <select
                            className="text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none"
                            value={positionFilter}
                            onChange={(e) => setPositionFilter(e.target.value)}
                        >
                            <option value="all">All Positions</option>
                            {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        {/* Department Filter */}
                        <select
                            className="text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none"
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                        >
                            <option value="all">All Departments</option>
                            {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        {(roleFilter !== 'all' || positionFilter !== 'all' || departmentFilter !== 'all') && (
                            <button
                                onClick={() => { setRoleFilter('all'); setPositionFilter('all'); setDepartmentFilter('all'); }}
                                className="text-xs text-red-500 hover:text-red-700 font-medium px-2"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters & Search Toolbar - Matches Purple Theme */}
                <div className="px-8 py-4 bg-indigo-50 border-b border-indigo-100 flex flex-col sm:flex-row gap-4 items-center justify-between z-10">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="pl-9 pr-4 py-2 w-full rounded-lg border border-purple-200 bg-white text-sm focus:ring-purple-500 focus:border-purple-500 transition-shadow text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        {/* Bulk Actions */}
                        {selectedUserIds.size > 0 && (
                            <div className="flex items-center gap-2 animate-fadeIn bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm">
                                <span className="text-purple-700 text-sm font-medium">
                                    {selectedUserIds.size} selected
                                </span>
                                <button
                                    onClick={() => setMessageModalOpen(true)}
                                    className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition-colors text-xs font-bold shadow-sm"
                                >
                                    <Send size={14} />
                                    Send Message
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => { resetForm(); setIsCreateOpen(true); }}
                            className="flex items-center gap-2 bg-white text-purple-900 px-4 py-2 rounded-lg hover:bg-purple-100 transition-all shadow-sm hover:shadow-md text-sm font-bold border border-purple-100"
                        >
                            <Plus size={18} />
                            Add User
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300"
                                        checked={selectedUserIds.size > 0 && selectedUserIds.size === filteredUsers.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role/Position</th>
                                <th className="px-6 py-4">Employee #</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        {loading ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                                Loading users...
                                            </div>
                                        ) : (
                                            <>
                                                <p className="font-medium text-slate-600">No users found.</p>
                                                <p className="text-xs text-slate-400 mt-1">Try adjusting your search or check permissions.</p>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className={`hover:bg-slate-50 ${selectedUserIds.has(user.id) ? 'bg-blue-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300"
                                                checked={selectedUserIds.has(user.id)}
                                                onChange={() => toggleSelectUser(user.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{user.full_name}</div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                            {user.department && <div className="text-xs text-slate-400">{user.department}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                                {user.role}
                                            </span>
                                            {user.position && <div className="text-xs text-slate-500 mt-1">{user.position}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-mono">
                                            {user.employee_number || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_active !== false ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold">
                                                    <CheckCircle size={12} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold">
                                                    <StopCircle size={12} /> Suspended
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openImpersonateModal(user)}
                                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                title="Login As (Impersonate)"
                                            >
                                                <LogIn size={16} />
                                            </button>
                                            <button
                                                onClick={() => openEdit(user)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleSuspend(user)}
                                                className={`p-1.5 rounded ${user.is_active !== false ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                                                title={user.is_active !== false ? "Suspend" : "Activate"}
                                            >
                                                <StopCircle size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Message Modal */}
            {messageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-purple-800 flex items-center justify-between bg-purple-900">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <Send size={20} className="text-purple-300" /> Send Message
                            </h3>
                            <button onClick={() => setMessageModalOpen(false)} className="text-purple-300 hover:text-white transition-colors bg-purple-800/50 hover:bg-purple-800 p-1 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form className="p-6 space-y-4" onSubmit={async (e) => {
                            e.preventDefault();
                            setIsSending(true);
                            const { data: { session } } = await supabase.auth.getSession();
                            const token = session?.access_token;

                            const promises = Array.from(selectedUserIds).map(userId =>
                                fetch(`${import.meta.env.VITE_API_BASE_URL}/messages/`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({
                                        recipient_id: userId,
                                        subject: messageSubject,
                                        body: messageBody,
                                        type: 'announcement'
                                    })
                                })
                            );

                            await Promise.all(promises);

                            setMessageModalOpen(false);
                            setSelectedUserIds(new Set());
                            setMessageSubject('');
                            setMessageBody('');
                            setIsSending(false);
                            alert('Messages sent!');
                        }}>
                            <div>
                                <label className="block text-xs font-bold text-purple-800/70 uppercase tracking-wider mb-1">Recipients</label>
                                <div className="text-sm font-bold text-purple-700 bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-center gap-2">
                                    <span className="bg-purple-200 text-purple-800 px-2 py-0.5 rounded text-xs">{selectedUserIds.size}</span>
                                    <span>selected users</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-slate-300 focus:ring-purple-500 focus:border-purple-500"
                                    value={messageSubject}
                                    onChange={e => setMessageSubject(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Message</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full rounded-lg border-slate-300 focus:ring-purple-500 focus:border-purple-500"
                                    value={messageBody}
                                    onChange={e => setMessageBody(e.target.value)}
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setMessageModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 text-sm transform hover:-translate-y-0.5"
                                >
                                    {isSending ? 'Sending...' : <><Send size={16} /> Send Message</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Impersonation Modal */}
            {impersonateModalOpen && userToImpersonate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-2 border-amber-400">
                        <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-amber-800 flex items-center gap-2">
                                <AlertTriangle size={24} className="text-amber-600" /> Security Warning
                            </h3>
                            <button onClick={() => setImpersonateModalOpen(false)} className="text-amber-400 hover:text-amber-700 transition-colors p-1 rounded-full hover:bg-amber-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-4">
                                You are about to sign out of your Administrator account and sign in as:
                            </p>
                            <div className="bg-amber-50/50 p-4 rounded-lg flex items-center gap-3 border border-amber-100 mb-6">
                                <div className="bg-white p-2 rounded-full shadow-sm">
                                    <UsersIcon className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800">{userToImpersonate.full_name}</div>
                                    <div className="text-sm text-slate-500">{userToImpersonate.email}</div>
                                </div>
                            </div>
                            <p className="text-xs text-amber-700 font-medium bg-amber-50 p-3 rounded mb-4">
                                <span className="font-bold">NOTE:</span> To return to your Admin account, you will need to sign out of this user's account and sign back in with your Admin credentials.
                            </p>

                            <div className="flex justify-end gap-3 mt-2">
                                <button
                                    onClick={() => setImpersonateModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmImpersonate}
                                    disabled={impersonateLoading}
                                    className="px-5 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 shadow-lg shadow-amber-200 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
                                >
                                    {impersonateLoading ? (
                                        'Switching...'
                                    ) : (
                                        <>
                                            <LogIn size={16} /> Confirm & Switch User
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {(isCreateOpen || isEditOpen) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-purple-800 flex items-center justify-between bg-purple-900">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                {isEditOpen ? <Edit size={20} className="text-purple-300" /> : <Plus size={20} className="text-purple-300" />}
                                {isEditOpen ? 'Edit User' : 'Create New User'}
                            </h3>
                            <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="text-purple-300 hover:text-white transition-colors bg-purple-800/50 hover:bg-purple-800 p-1 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={isEditOpen ? handleUpdate : handleCreate} className="p-6 space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold text-purple-800/70 uppercase tracking-wider">Email</label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                                            checked={formData.isSystemEmail || false}
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                let newEmail = formData.email;

                                                if (checked && formData.full_name) {
                                                    // Auto-generate on check if name exists
                                                    const cleanName = formData.full_name.toLowerCase().trim()
                                                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
                                                        .replace(/\s+/g, '.'); // Replace spaces with dots
                                                    newEmail = `${cleanName}@toolcrib.internal`;
                                                } else if (!checked && formData.email?.endsWith('@toolcrib.internal')) {
                                                    newEmail = '';
                                                }

                                                setFormData({
                                                    ...formData,
                                                    isSystemEmail: checked,
                                                    email: newEmail
                                                });
                                            }}
                                        />
                                        <span className="text-xs font-medium text-slate-500">Sin correo corporativo</span>
                                    </label>
                                </div>
                                <input
                                    type="email"
                                    required
                                    className={`w-full rounded-lg border-purple-200 focus:ring-purple-500 focus:border-purple-500 ${formData.isSystemEmail ? 'bg-purple-50/50' : 'bg-purple-50/30'}`}
                                    value={formData.email}
                                    placeholder={formData.isSystemEmail ? "Generado automáticamente..." : "usuario@wasion.cn"}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            {/* Password: required for Create, optional for Edit */}
                            <div>
                                <label className="block text-xs font-bold text-purple-800/70 uppercase tracking-wider mb-1">
                                    {isEditOpen ? 'New Password (Leave blank to keep)' : 'Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required={!isEditOpen}
                                        className="w-full rounded-lg border-purple-200 focus:ring-purple-500 focus:border-purple-500 bg-purple-50/30 pr-10"
                                        value={formData.password}
                                        placeholder={isEditOpen ? '(Unchanged)' : ''}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-slate-300 focus:ring-purple-500 focus:border-purple-500"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Employee #</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-slate-300 focus:ring-purple-500 focus:border-purple-500"
                                        value={formData.employee_number}
                                        maxLength={5}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setFormData({ ...formData, employee_number: val });
                                        }}
                                        onBlur={e => {
                                            if (formData.employee_number) {
                                                const padded = formData.employee_number.padStart(5, '0');
                                                setFormData({ ...formData, employee_number: padded });
                                            }
                                        }}
                                        placeholder="00000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
                                    <select
                                        className="w-full rounded-lg border-slate-300 focus:ring-purple-500 focus:border-purple-500"
                                        value={formData.role_name}
                                        onChange={e => setFormData({ ...formData, role_name: e.target.value })}
                                    >
                                        <option value="user">User</option>
                                        <option value="staff_level_1">Staff Level 1</option>
                                        <option value="staff_level_2">Staff Level 2</option>
                                        <option value="toolroom_staff">Auxiliar Tool Room</option>
                                        <option value="supervisor">Supervisor Tool Room</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-slate-300 focus:ring-purple-500 focus:border-purple-500"
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Position</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-slate-300 focus:ring-purple-500 focus:border-purple-500"
                                    value={formData.position}
                                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                                <button
                                    type="button"
                                    onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}
                                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 hover:shadow-xl transition-all flex items-center gap-2 text-sm transform hover:-translate-y-0.5"
                                >
                                    <Save size={18} />
                                    {isEditOpen ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
