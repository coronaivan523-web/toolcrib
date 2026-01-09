import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Check, User } from 'lucide-react'
import clsx from 'clsx'

export default function UserAutocomplete({ users, selectedUserId, onSelect, error, placeholder }) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [filteredUsers, setFilteredUsers] = useState([])
    const wrapperRef = useRef(null)

    // Memoize the list
    const usersList = React.useMemo(() => {
        return Array.isArray(users) ? users : Object.values(users || {})
    }, [users])

    // Sync query with selection
    useEffect(() => {
        if (selectedUserId) {
            const user = usersList.find(u => u.id === selectedUserId)
            if (user) {
                setQuery(user.full_name || user.email)
            }
        } else {
            // Do not auto-clear query while typing (see MaterialAutocomplete logic)
        }
    }, [selectedUserId, usersList])

    // Filter logic
    useEffect(() => {
        if (!isOpen && !query && !selectedUserId) return

        const lowerQuery = query.toLowerCase()
        const filtered = usersList.filter(u => {
            const name = (u.full_name || '').toLowerCase()
            const email = (u.email || '').toLowerCase()
            return name.includes(lowerQuery) || email.includes(lowerQuery)
        }).slice(0, 50)
        setFilteredUsers(filtered)
    }, [query, isOpen, usersList, selectedUserId])

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
                // Revert or clear
                if (selectedUserId) {
                    const user = usersList.find(u => u.id === selectedUserId)
                    const label = user ? (user.full_name || user.email) : ''
                    if (label !== query) setQuery(label)
                } else {
                    if (query) {
                        setQuery('')
                        onSelect(null)
                    }
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [wrapperRef, selectedUserId, usersList, query, onSelect])

    const handleSelect = (user) => {
        setQuery(user.full_name || user.email)
        onSelect(user.id)
        setIsOpen(false)
    }

    const handleClear = (e) => {
        e.stopPropagation()
        setQuery('')
        onSelect(null)
        setIsOpen(true)
        if (wrapperRef.current) {
            const input = wrapperRef.current.querySelector('input')
            if (input) input.focus()
        }
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                    type="text"
                    autoComplete="off"
                    name={`user-search-${Math.random()}`}
                    className={clsx(
                        "pl-9 pr-9 py-2 w-full rounded border text-sm transition-colors",
                        error ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-primary-500 focus:ring-primary-200"
                    )}
                    placeholder={placeholder || "Search User..."}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                        if (selectedUserId && e.target.value !== query) {
                            onSelect(null)
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {(query || selectedUserId) && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                    {usersList.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-red-500 text-center italic">
                            No users loaded (0)
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center italic">
                            No users found
                        </div>
                    ) : (
                        <ul className="py-1">
                            {filteredUsers.map(u => (
                                <li
                                    key={u.id}
                                    onClick={() => handleSelect(u)}
                                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="bg-slate-100 p-1 rounded-full">
                                            <User size={12} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-slate-700 block">{u.full_name || 'Unknown'}</span>
                                            <span className="text-xs text-slate-400 block">{u.email}</span>
                                        </div>
                                    </div>
                                    {u.role && (
                                        <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{u.role}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
