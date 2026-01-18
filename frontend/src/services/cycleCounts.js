import { supabase } from '../lib/supabase'

const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
    }
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1'

console.log('API_URL:', API_URL)

export const cycleCounts = {
    getSessions: async (status = null) => {
        const headers = await getAuthHeaders()
        const url = new URL(`${API_URL}/cycle-counts/`)
        if (status) url.searchParams.append('status', status)

        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error('Failed to fetch sessions')
        return res.json()
    },

    createSession: async (data) => {
        const headers = await getAuthHeaders()
        let res;
        try {
            console.log(`Fetching ${API_URL}/cycle-counts/ with data:`, data)
            res = await fetch(`${API_URL}/cycle-counts/`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            })
        } catch (networkError) {
            console.error("Network Error in createSession:", networkError)
            throw new Error(`Network Error: ${networkError.message}`)
        }

        if (!res.ok) {
            const errorText = await res.text()
            console.error("API Error:", res.status, errorText)
            throw new Error(`Failed to create session (${res.status}): ${errorText}`)
        }
        return res.json()
    },

    getSessionById: async (id) => {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_URL}/cycle-counts/${id}`, { headers })
        if (!res.ok) throw new Error('Failed to fetch session details')
        return res.json()
    },

    addLine: async (sessionId, data) => {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_URL}/cycle-counts/${sessionId}/lines`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error('Failed to add line')
        return res.json()
    },

    deleteLine: async (sessionId, lineId) => {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_URL}/cycle-counts/${sessionId}/lines/${lineId}`, {
            method: 'DELETE',
            headers
        })
        if (!res.ok) throw new Error('Failed to delete line')
        return true
    },

    submitSession: async (sessionId) => {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_URL}/cycle-counts/${sessionId}/submit`, {
            method: 'POST',
            headers
        })
        if (!res.ok) throw new Error('Failed to submit session')
        return res.json()
    },

    approveSession: async (sessionId) => {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_URL}/cycle-counts/${sessionId}/approve`, {
            method: 'POST',
            headers
        })
        if (!res.ok) throw new Error('Failed to approve session')
        return res.json()
    },

    rejectSession: async (sessionId) => {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_URL}/cycle-counts/${sessionId}/reject`, {
            method: 'POST',
            headers
        })
        if (!res.ok) throw new Error('Failed to reject session')
        return res.json()
    }
}
