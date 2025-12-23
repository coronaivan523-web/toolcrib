import { supabase } from '../lib/supabase'

const API_BASE_URL = 'http://localhost:8001/api/v1'

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

        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.detail || 'Request failed')
        }
        return await response.json()
    } catch (error) {
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
    }
}
