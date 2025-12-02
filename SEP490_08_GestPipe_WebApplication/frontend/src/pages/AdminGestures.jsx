import React from 'react';
import Gestures from './Gestures';

// AdminGestures re-uses the main `Gestures` page so the UI matches exactly.
// Sidebar differences are controlled by role in the app layout.
const AdminGestures = (props) => {
  // Show admin-only Custom tab inside Gestures
  return <Gestures {...props} showCustomTab={true} />;
};

export default AdminGestures;