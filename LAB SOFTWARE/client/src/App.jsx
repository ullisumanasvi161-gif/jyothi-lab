import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Billing from './pages/Billing';
import Payments from './pages/Payments';
import Tests from './pages/Tests';
import Reports from './pages/Reports';
import Doctors from './pages/Doctors';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import Export from './pages/Export';
import Claims from './pages/Claims';
import Signatures from './pages/Signatures';
import WhatsApp from './pages/WhatsApp';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Portal Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard available to all staff */}
              <Route index element={<Dashboard />} />
              
              {/* Patients list available to all staff */}
              <Route path="patients" element={<Patients />} />
              
              {/* Billing restricted to admin and receptionist */}
              <Route 
                path="billing" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Receptionist']}>
                    <Billing />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="payments" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Receptionist']}>
                    <Payments />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="claims" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Receptionist']}>
                    <Claims />
                  </ProtectedRoute>
                } 
              />
              
              {/* Test Catalog restricted to clinical staff and admin */}
              <Route 
                path="tests" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Pathologist', 'Lab Technician']}>
                    <Tests />
                  </ProtectedRoute>
                } 
              />
              
              {/* Reports Queue restricted to clinical staff, doctor, and admin */}
              <Route 
                path="reports" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Pathologist', 'Lab Technician', 'Doctor']}>
                    <Reports />
                  </ProtectedRoute>
                } 
              />
              
              {/* Referral Doctors restricted to admin and receptionist */}
              <Route 
                path="doctors" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Receptionist']}>
                    <Doctors />
                  </ProtectedRoute>
                } 
              />
              
              {/* Staff settings restricted to Admin */}
              <Route 
                path="employees" 
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Employees />
                  </ProtectedRoute>
                } 
              />
              
              {/* Data exports restricted to Admin and Pathologist */}
              <Route 
                path="exports" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Pathologist']}>
                    <Export />
                  </ProtectedRoute>
                } 
              />
              
              {/* Signatures restricted to Admin, Pathologist, Doctor */}
              <Route 
                path="signatures" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Pathologist', 'Doctor']}>
                    <Signatures />
                  </ProtectedRoute>
                } 
              />

              {/* WhatsApp Report Delivery restricted to Admin and Receptionist */}
              <Route 
                path="whatsapp" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Receptionist', 'Pathologist']}>
                    <WhatsApp />
                  </ProtectedRoute>
                } 
              />

              {/* Settings restricted to Admin */}
              <Route 
                path="settings" 
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
