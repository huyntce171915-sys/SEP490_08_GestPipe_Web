// src/App.jsx

import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'; // <-- THÊM OUTLET
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { LanguageProvider } from './utils/LanguageContext';
import AdminLayout from './components/AdminLayout'; // <-- IMPORT LAYOUT

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChangePassword from './pages/ChangePassword';
import CreateAdmin from './pages/CreateAdmin';
import AdminList from './pages/AdminList';
import UserList from './pages/UserList';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ForgotPassword from './pages/ForgotPassword';
import Gestures from './pages/Gestures';
// import GesturePracticeMLPage from './pages/GesturePracticeMLPage';
import VersionList from './pages/VersionList'; 
import AdminGestures from './pages/AdminGestures';

// Protected Route Component (Giữ nguyên)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');
  const token = localStorage.getItem('token');

  if (!token || !admin.role) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    if (admin.role === 'superadmin') {
      return <Navigate to="/dashboard" replace />;
    } else if (admin.role === 'admin') {
      return <Navigate to="/gestures" replace />;
    }
  }
  return children;
};

// Component Layout Trung Gian (Kiểm tra login)
const AdminLayoutRoute = () => {
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');
  const token = localStorage.getItem('token');

  if (!token || !admin.role) {
    return <Navigate to="/" replace />;
  }
  
  // Nếu đã login, render AdminLayout và các trang con (Outlet)
  return <AdminLayout />; // Outlet đã được đặt bên trong AdminLayout
};

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>}>
          <Routes>
            {/* Route không có layout */}
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Route không có layout */}
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route 
              path="/change-password" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <ChangePassword />
                </ProtectedRoute>
              } 
            />
            
            {/* ===== CÁC ROUTE CÓ LAYOUT CHUNG ===== */}
            <Route element={<AdminLayoutRoute />}>
              
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin-list" 
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <AdminList />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/gestures"
                element={
                  <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                    <Gestures />
                  </ProtectedRoute>
                }
              />
              {/* <Route
                path="/gesture-practice-ml"
                element={
                  <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                    <GesturePracticeMLPage />
                  </ProtectedRoute>
                }
              /> */}
              <Route 
                path="/create-admin" 
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <CreateAdmin />
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin & Superadmin Routes */}
              <Route 
                path="/user-list" 
                element={
                  <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                    <UserList />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                    <UserList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/version-list"
                element={
                  <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                    <VersionList />
                  </ProtectedRoute>
                }
              />
              
              {/* Các trang chung */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/edit-profile" 
                element={
                  <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                    <EditProfile />
                  </ProtectedRoute>
                } 
              />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </LanguageProvider>
    </I18nextProvider>
  );
}

export default App;