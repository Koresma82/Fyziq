import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { theme } from "./config/theme";
import LoginPage      from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import UserDetailPage from "./pages/UserDetailPage";
import MyProfilePage  from "./pages/MyProfilePage";
import NavBar         from "./components/NavBar";

function AppRoutes() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <SplashLoader />;
  if (!user)   return <LoginPage />;

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text }}>
      <NavBar />
      <Routes>
        {isAdmin ? (
          <>
            <Route path="/"          element={<AdminDashboard />} />
            <Route path="/user/:uid" element={<UserDetailPage />} />
            <Route path="*"          element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/" element={<MyProfilePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </div>
  );
}

function SplashLoader() {
  return (
    <div style={{
      minHeight: "100vh", background: theme.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 18,
    }}>
      <img src="/favicon.svg" alt="" width="56" height="56"
        style={{ borderRadius: 14, boxShadow: theme.shadowMd }} />
      <div style={{
        width: 36, height: 36,
        border: `3px solid ${theme.border}`,
        borderTopColor: theme.teal,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
