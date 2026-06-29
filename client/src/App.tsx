import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Archive from './pages/Archive';
import Brands from './pages/Brands';
import BrandDetail from './pages/BrandDetail';
import Assets from './pages/Assets';
import ColorPalette from './pages/ColorPalette';
import Timeline from './pages/Timeline';
import PresentationMode from './pages/PresentationMode';
import Moodboard from './pages/Moodboard';
import Ideate from './pages/Ideate';
import Email from './pages/Email';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/present/:id" element={<PresentationMode />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/moodboard" element={<Moodboard />} />
              <Route path="/ideate" element={<Ideate />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="brands"          element={<Brands />} />
              <Route path="brands/:id"      element={<BrandDetail />} />
              <Route path="assets"          element={<Assets />} />
              <Route path="tools/palette"   element={<ColorPalette />} />
              <Route path="clients"         element={<Clients />} />
              <Route path="email"           element={<Email />} />
              <Route path="settings"        element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
