import React from 'react';
import AdminSidebar from '../components/AdminSidebar';
import Sidebar from '../components/Sidebar';

/**
 * Renders the correct sidebar based on the user's role.
 * @param {object} props
 * @param {object} props.admin - The current admin object (from authService.getCurrentUser()).
 * @param {string} props.theme - The current theme ('dark' or 'light').
 */
const RoleBasedSidebar = ({ admin, theme }) => {
  if (!admin) return null;
  if (admin.role === 'superadmin' || admin.role === 'super_admin') {
    return <Sidebar theme={theme} />;
  }
  if (admin.role === 'admin') {
    return <AdminSidebar theme={theme} />;
  }
  // Default fallback
  return <Sidebar theme={theme} />;
};

export default RoleBasedSidebar;
