import { AppLayout } from './components/layouts';
import { LoginPage, useAuth } from './features/auth';

function App() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppLayout
      user={user ? { name: user.name } : undefined}
      onLogout={logout}
    >
      <h1>Welcome to Expensify</h1>
    </AppLayout>
  );
}

export default App;
