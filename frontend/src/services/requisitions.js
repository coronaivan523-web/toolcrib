import { supabase } from '../lib/supabase'

// Normalization: Ensure NO double slash, but always end in /api/v1
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'
const normalizedBase = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase
// If user put /api/v1 in env, don't duplicate it. If missing, add it.
const API_BASE_URL = normalizedBase.includes('/api/v1')
    ? normalizedBase
    : `${normalizedBase}/api/v1`

const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
        'Content-Type': 'application/json',
        'Authorization': session ? `Bearer ${session.access_token}` : '',
    }
}

const apiFetch = async (endpoint, options = {}) => {
    try {
        const headers = await getHeaders()
        const url = `${API_BASE_URL}${endpoint}`

        console.log('[apiFetch] base', API_BASE_URL)
        console.log('[apiFetch] url', url)
        console.log('[apiFetch] hasAuth', Boolean(headers.Authorization))

        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        })

        if (!response.ok) {
            // Try to parse JSON error, fallback to status text
            let errorMessage = 'Request failed'
            try {
                const errorData = await response.json()
                errorMessage = errorData.detail || errorData.message || errorMessage
            } catch (e) {
                // Response wasn't JSON
                errorMessage = response.statusText
            }

            // Handle Auth errors specifically
            if (response.status === 401 || response.status === 403) {
                throw new Error('No autenticado / sesión expirada. Por favor recarga o inicia sesión nuevamente.')
            }

            throw new Error(errorMessage)
        }
        return await response.json()
    } catch (error) {
        console.error('[apiFetch] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        })

        // Only classify as "Connection Failed" if it's a true network error (Failed to fetch)
        // AND it wasn't an auth error we just threw above.
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('No se pudo conectar al backend. Verifica que el API esté corriendo en 8001 y que CORS permita http://localhost:5173')
        }
        throw error
    }
}

export const requisitionService = {
    // GET /requisitions
    listRequisitions: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.status && params.status !== 'all') query.append('status', params.status)
        return await apiFetch(`/requisitions?${query.toString()}`)
    },

    // GET /requisitions/{id}
    getRequisitionById: async (id) => {
        return await apiFetch(`/requisitions/${id}`)
    },

    // GET /requisitions/inbox
    getInbox: async () => {
        return await apiFetch(`/requisitions/inbox`)
    },

    // GET /requisitions/{id}/usage-history
    getUsageHistory: async (id) => {
        return await apiFetch(`/requisitions/${id}/usage-history`)
    },

    // ACTIONS
    approve: async (id, comment = null) => {
        return await apiFetch(`/requisitions/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ comment })
        })
    },

    reject: async (id, comment) => {
        return await apiFetch(`/requisitions/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ comment })
        })
    },

    resubmit: async (id, data = {}) => {
        return await apiFetch(`/requisitions/${id}/resubmit`, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    cancel: async (id) => {
        return await apiFetch(`/requisitions/${id}/cancel`, {
            method: 'POST',
            body: JSON.stringify({})
        })
    },

    // --- Create & Submit Flow ---
    createDraft: async (data) => {
        return await apiFetch('/requisitions', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    submitRequisition: async (id, submitPayload) => {
        return await apiFetch(`/requisitions/${id}/submit`, {
            method: 'POST',
            body: JSON.stringify(submitPayload)
        })
    },

    // --- Helpers ---
    getUsers: async () => {
        return await apiFetch('/users/')
    }
}
