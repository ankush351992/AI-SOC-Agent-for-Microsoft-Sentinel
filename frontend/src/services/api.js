import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sentinel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('sentinel_token');
      localStorage.removeItem('sentinel_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username, password) => {
    const res = await api.post('/auth/json-login', { username, password });
    if (res.data && res.data.access_token) {
      localStorage.setItem('sentinel_token', res.data.access_token);
      localStorage.setItem('sentinel_user', JSON.stringify({
        username: res.data.username,
        role: res.data.role
      }));
    }
    return res.data;
  },
  resetPassword: async (username, currentPassword, newPassword) => {
    const res = await api.post('/auth/reset-password', {
      username,
      current_password: currentPassword,
      new_password: newPassword
    });
    if (res.data && res.data.access_token) {
      localStorage.setItem('sentinel_token', res.data.access_token);
      localStorage.setItem('sentinel_user', JSON.stringify({
        username: res.data.username,
        role: res.data.role
      }));
    }
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('sentinel_token');
    localStorage.removeItem('sentinel_user');
    window.location.href = '/login';
  }
};

export const incidentsApi = {
  getIncidents: async (status, severity, days) => {
    const params = {};
    if (status && status !== 'All') params.status = status;
    if (severity && severity !== 'All') params.severity = severity;
    if (days && days !== 'All') params.days = days;
    const res = await api.get('/incidents', { params });
    return res.data;
  },
  getIncident: async (id) => {
    const res = await api.get(`/incidents/${id}`);
    return res.data;
  },
  getStats: async (days = null) => {
    const params = {};
    if (days && days !== 'All') params.days = days;
    const res = await api.get('/incidents/stats/summary', { params });
    return res.data;
  },
  addComment: async (id, message) => {
    const res = await api.post(`/incidents/${id}/comments`, { message });
    return res.data;
  },
  updateStatus: async (id, payload) => {
    const res = await api.patch(`/incidents/${id}/status`, payload);
    return res.data;
  },
  executeRemediation: async (id, actionType, entity, parameters = {}) => {
    const res = await api.post(`/incidents/${id}/remediate`, {
      action_type: actionType,
      entity,
      parameters
    });
    return res.data;
  },
  getEntraUsers: async () => {
    const res = await api.get('/incidents/users/entra');
    return res.data;
  },
  getPlaybooks: async () => {
    const res = await api.get('/incidents/playbooks');
    return res.data;
  },
  assignIncident: async (id, payload) => {
    const res = await api.patch(`/incidents/${id}/assign`, payload);
    return res.data;
  }
};

export const triageApi = {
  runTriage: async (id) => {
    const res = await api.post(`/triage/${id}/run`);
    return res.data;
  },
  getReport: async (id) => {
    const res = await api.get(`/triage/${id}/report`);
    return res.data;
  },
  updateReport: async (id, updatedReport) => {
    const res = await api.put(`/triage/${id}/report`, updatedReport);
    return res.data;
  },
  chat: async (id, message, chatHistory = []) => {
    const res = await api.post(`/triage/${id}/chat`, {
      message,
      chat_history: chatHistory
    });
    return res.data;
  },
  runKqlQuery: async (query, timespanHours = 24) => {
    const res = await api.post('/triage/kql/run', {
      query,
      timespan_hours: timespanHours
    });
    return res.data;
  },
  downloadReport: async (id, format = 'docx', incNumber = 'Report') => {
    const res = await api.get(`/triage/${id}/download`, {
      params: { format },
      responseType: format === 'json' || format === 'markdown' ? 'text' : 'blob'
    });
    
    let mimeType = 'application/octet-stream';
    let ext = format;
    if (format === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      ext = 'docx';
    } else if (format === 'json') {
      mimeType = 'application/json';
      ext = 'json';
    } else if (format === 'markdown') {
      mimeType = 'text/markdown';
      ext = 'md';
    }

    const blob = new Blob([res.data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sentinel-Executive-Brief-Incident-${incNumber}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

export const settingsApi = {
  getStatus: async () => {
    const res = await api.get('/settings/status');
    return res.data;
  },
  updateSettings: async (payload) => {
    const res = await api.post('/settings/update', payload);
    return res.data;
  },
  testConnection: async () => {
    const res = await api.post('/settings/test-connection');
    return res.data;
  }
};

export default api;
