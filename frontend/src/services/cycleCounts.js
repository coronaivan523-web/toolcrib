
import api from '../lib/api'

export const cycleCountService = {
    getAllSessions: async () => {
        const response = await api.get('/cycle-counts')
        return response
    },

    getSessionById: async (id) => {
        const response = await api.get(`/cycle-counts/${id}`)
        return response
    },

    createSession: async (data) => {
        const response = await api.post('/cycle-counts', data)
        return response
    },

    addLine: async (sessionId, lineData) => {
        const response = await api.post(`/cycle-counts/${sessionId}/lines`, lineData)
        return response
    },

    updateSession: async (id, data) => {
        const response = await api.patch(`/cycle-counts/${id}`, data)
        return response
    },

    updateLine: async (lineId, data) => {
        const response = await api.patch(`/cycle-counts/lines/${lineId}`, data)
        return response
    }
}
