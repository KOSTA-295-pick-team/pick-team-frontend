import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { AuthProvider } from '@/features/user/auth/context/AuthContext';
import { WorkspaceProvider } from '@/features/workspace/core/context/WorkspaceContext';
import Router from '@/Router';

function App() {
  return (
    <Provider store={store}>
      <HashRouter>
      <AuthProvider>
          <WorkspaceProvider>
            <Router />
          </WorkspaceProvider>
        </AuthProvider>
        </HashRouter>
    </Provider>
  );
}

export default App;
