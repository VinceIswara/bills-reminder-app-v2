import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate
} from 'react-router-dom';
import styled from 'styled-components';
import './App.css';

// Import components
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AddBill from './pages/AddBill';
import BillDetails from './pages/BillDetails';
import EditBill from './pages/EditBill';
import Notifications from './pages/Notifications';
import NotificationSettings from './pages/NotificationSettings';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import AuthCallback from './components/AuthCallback';

// Import auth context
import { AuthProvider } from './contexts/AuthContext';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const ContentContainer = styled.div`
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

function App() {
  return (
    <Router 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <AuthProvider>
        <AppContainer>
          <Navbar />
          <ContentContainer>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/" element={<Home />} />
                <Route path="/add" element={<AddBill />} />
                <Route path="/bill/:id" element={<BillDetails />} />
                <Route path="/edit/:id" element={<EditBill />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/notification-settings" element={<NotificationSettings />} />
              </Route>

              {/* Auth callback routes */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/callback/*" element={<AuthCallback />} />
              
              {/* 404 route */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </ContentContainer>
        </AppContainer>
      </AuthProvider>
    </Router>
  );
}

export default App;
