import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './components/ui/ToastContainer.jsx';
import Layout from './components/layout/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import DashboardUser from './pages/DashboardUser.jsx';
import DashboardAdmin from './pages/DashboardAdmin.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';
import UserManagement from './pages/UserManagement.jsx';
import AllDocuments from './pages/AllDocuments.jsx';
import ErrorPage from './pages/ErrorPage.jsx';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user?.role?.toUpperCase() !== 'ADMIN') {
    return <ErrorPage type="access-denied" />;
  }
  
  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<DashboardUser />} />
        <Route path="profile" element={<ProfileSettings />} />
        <Route path="admin" element={
          <ProtectedRoute adminOnly={true}>
            <DashboardAdmin />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute adminOnly={true}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="documents" element={
          <ProtectedRoute adminOnly={true}>
            <AllDocuments />
          </ProtectedRoute>
        } />
        <Route path="audit-logs" element={
          <ProtectedRoute adminOnly={true}>
            <AuditLogs />
          </ProtectedRoute>
        } />
        <Route path="error" element={<ErrorPage />} />
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<ErrorPage type="not-found" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <AppRoutes />
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;