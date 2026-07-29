import { useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/auth/LoginPage";
import SupportDashboard from "./components/support/SupportDashboard";
import AdminWorkspace from "./admin/AdminWorkspace";

function LoadingScreen() {
  return (
    <div className="app-auth-loading">
      <div>РО</div>
      <strong>Загрузка системы</strong>
    </div>
  );
}

function AccessDenied() {
  const { logout } = useAuth();

  return (
    <div className="access-denied">
      <div className="access-denied__card">
        <span>ДОСТУП ОГРАНИЧЕН</span>
        <h1>Роль пользователя не определена</h1>
        <p>Обратитесь в техническую поддержку.</p>
        <button type="button" onClick={logout}>Выйти</button>
      </div>
    </div>
  );
}

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <LoginPage />;
  if (profile.role === "support") return <SupportDashboard />;
  if (profile.role === "administrator") return <AdminWorkspace />;

  return <AccessDenied />;
}
