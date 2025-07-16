import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { AuthProvider } from '@/features/user/auth/context/AuthContext';
import { WorkspaceProvider } from '@/features/workspace/core/context/WorkspaceContext';
import { ChatProvider } from '@/features/workspace/chat/context/ChatContext';
import Router from '@/Router';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <ChatProvider>
              <Router />
            </ChatProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
