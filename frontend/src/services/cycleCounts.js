
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
        // api.js doesn't have patch, using put or adding patch support. 
        // Let's check api.js again. Assuming I need to check it.
        // But for now, I'll use a raw apiFetch if needed or just assume I might need to add it.
        // Wait, I should verify api.js has patch.
        // For efficiency, I will use api.put if patch missing, but standard is patch.
        // Let's just USE api.patch assuming I will fix api.js next if needed.
        // Actually, viewing api.js in step 2857 showed: get, post, put, delete. NO PATCH.
        // So I must add patch to api.js first or use put.
        // Since backend uses @router.patch, I should use 'PATCH'.
        // I will add patch to api.js in the next step.
        const response = await api.patch(`/cycle-counts/${id}`, data)
        return response
    }
}
