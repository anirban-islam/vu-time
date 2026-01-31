import axios from 'axios';

// Use physical IP for device testing
const BASE_URL = 'https://vutime-backend.vercel.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a response interceptor to log errors
api.interceptors.response.use(
  response => response,
  error => {
    return Promise.reject(error);
  }
);

export const auth = {
    login: (data: any) => api.post('/auth/login', data),
    register: (data: any) => api.post('/auth/register', data),
    verifyOtp: (data: { email: string, code: string }) => api.post('/auth/verify-otp', data),
    forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data: any) => api.post('/auth/reset-password-otp', data),
    socialLogin: (data: { provider: 'google' | 'apple', email: string, name?: string, googleId?: string, appleId?: string }) => api.post('/auth/social-login', data),
    getProfile: (token: string) => api.get('/auth/profile', { headers: { Authorization: `Bearer ${token}` } }),
    updateProfile: (token: string, data: any) => api.put('/auth/profile', data, { headers: { Authorization: `Bearer ${token}` } }),
    requestCRAccess: (token: string) => api.post('/user/cr-request', {}, { headers: { Authorization: `Bearer ${token}` } }),
    createNotice: (token: string, data: any) => api.post('/notices', data, { headers: { Authorization: `Bearer ${token}` } }),
    getMyNotices: (token: string, userId: string, filters?: any) => {
        let url = `/notices?postedBy=${userId}`;
        if (filters) {
            const { department, batch, semester, section } = filters;
            if (department) url += `&department=${department}`;
            if (batch) url += `&batch=${batch}`;
            if (semester) url += `&semester=${semester}`;
            if (section) url += `&section=${section}`;
        }
        return api.get(url, { headers: { Authorization: `Bearer ${token}` } });
    },
    getAllNotices: (token: string) => {
        return api.get(`/notices?_t=${new Date().getTime()}`, { headers: { Authorization: `Bearer ${token}` } });
    },
    getUsers: (token: string, filters?: any) => {
        let url = `/users?a=1`;
        if (filters) {
            const { role, department, semester, section } = filters;
            if (role) url += `&role=${encodeURIComponent(role)}`;
            if (department) url += `&department=${encodeURIComponent(department)}`;
            if (semester) url += `&semester=${encodeURIComponent(semester)}`;
            if (section) url += `&section=${encodeURIComponent(section)}`;

        }
        return api.get(url, { headers: { Authorization: `Bearer ${token}` } });
    },
    getAllCRs: (token: string, config: any = {}) => {
        const url = `/users/all-crs?_t=${new Date().getTime()}`;
        return api.get(url, { 
            headers: { Authorization: `Bearer ${token}` },
            ...config 
        });
    },
    deleteNotice: (token: string, id: string) => api.delete(`/notices/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    updateNotice: (token: string, id: string, data: any) => api.put(`/notices/${id}`, data, { headers: { Authorization: `Bearer ${token}` } }),
    
    // Messaging
    getMessages: (token: string) => api.get('/messages', { headers: { Authorization: `Bearer ${token}` } }),
    sendMessage: (token: string, content: string) => api.post('/messages', { content }, { headers: { Authorization: `Bearer ${token}` } }),

    // Banners
    getBanners: () => api.get('/banners'),
    createBanner: (token: string, formData: FormData) => api.post('/banners', formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
        },
    }),
    deleteBanner: (token: string, id: string) => api.delete(`/banners/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    updateBanner: (token: string, id: string, formData: FormData) => api.put(`/banners/${id}`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
        },
    }),
    getRoutine: () => api.get('/routine'),
    getAttendance: (token: string) => api.get('/attendance', { headers: { Authorization: `Bearer ${token}` } }),
    getTeachers: () => api.get('/teachers'),
    
    // Resources
    getResources: () => api.get('/resources'),
    addResource: (token: string, data: any) => api.post('/resources', data, { headers: { Authorization: `Bearer ${token}` } }),
    deleteResource: (token: string, id: string) => api.delete(`/resources?id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),

    // Bus Shuttle
    getBusSchedules: () => api.get('/bus/schedules'),
    createBusSchedule: (token: string, data: any) => api.post('/bus/schedules', data, { headers: { Authorization: `Bearer ${token}` } }),
    deleteBusSchedule: (token: string, id: string) => api.delete(`/bus/schedules?id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    getBusRoutes: () => api.get('/bus/routes'),
    createBusRoute: (token: string, data: any) => api.post('/bus/routes', data, { headers: { Authorization: `Bearer ${token}` } }),
    deleteBusRoute: (token: string, id: string) => api.delete(`/bus/routes?id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),

    // Developer Info
    getDeveloperProfile: () => api.get('/developer'),
    updateDeveloperProfile: (token: string, data: any) => api.put('/developer', data, { 
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
        }
    }),
};

export default api;
