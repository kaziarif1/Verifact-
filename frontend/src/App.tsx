import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

const Home           = lazy(()=>import('./pages/Home'));
const ClaimDetail    = lazy(()=>import('./pages/ClaimDetail'));
const Submit         = lazy(()=>import('./pages/Submit'));
const Trending       = lazy(()=>import('./pages/Trending'));
const Search         = lazy(()=>import('./pages/Search'));
const Profile        = lazy(()=>import('./pages/Profile'));
const Settings       = lazy(()=>import('./pages/Settings'));
const Notifications  = lazy(()=>import('./pages/Notifications'));
const Login          = lazy(()=>import('./pages/Login'));
const Register       = lazy(()=>import('./pages/Register'));
const ForgotPassword = lazy(()=>import('./pages/ForgotPassword'));
const ResetPassword  = lazy(()=>import('./pages/ResetPassword'));
const AdminDashboard = lazy(()=>import('./pages/admin/AdminDashboard'));
const NotFound       = lazy(()=>import('./pages/NotFound'));
const MessagesPage   = lazy(()=>import('./pages/messages/MessagesPage'));

const Loader = () => (
  <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'160px',
    fontFamily:'"UnifrakturMaguntia",cursive', color:'var(--ink-faint)', fontSize:'22px' }}>
    Verifact
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<Loader/>}>
      <Routes>
        <Route path="/login"           element={<Login/>}/>
        <Route path="/register"        element={<Register/>}/>
        <Route path="/forgot-password" element={<ForgotPassword/>}/>
        <Route path="/reset-password"  element={<ResetPassword/>}/>

        <Route element={<AppShell/>}>
          <Route index                     element={<Home/>}/>
          <Route path="/trending"          element={<Trending/>}/>
          <Route path="/search"            element={<Search/>}/>
          <Route path="/claims/:id"        element={<ClaimDetail/>}/>
          <Route path="/profile/:username" element={<Profile/>}/>
          <Route path="/submit"  element={<ProtectedRoute><Submit/></ProtectedRoute>}/>
          <Route path="/settings" element={<ProtectedRoute><Settings/></ProtectedRoute>}/>
          <Route path="/notifications" element={<ProtectedRoute><Notifications/></ProtectedRoute>}/>
          <Route path="/messages" element={<ProtectedRoute><MessagesPage/></ProtectedRoute>}/>
          <Route path="/admin"   element={<ProtectedRoute requiredRole="admin"><AdminDashboard/></ProtectedRoute>}/>
          <Route path="/admin/*" element={<ProtectedRoute requiredRole="admin"><AdminDashboard/></ProtectedRoute>}/>
        </Route>
        <Route path="/404" element={<NotFound/>}/>
        <Route path="*"    element={<Navigate to="/404" replace/>}/>
      </Routes>
    </Suspense>
  );
}
