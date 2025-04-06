import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SurveyList from './pages/surveys/SurveyList';
import SurveyResponse from './pages/surveys/SurveyResponse';
import SurveyDetail from './pages/surveys/SurveyDetail';
import SurveyEdit from './pages/surveys/SurveyEdit';
import SurveyCreator from './pages/surveys/SurveyCreator';
import SurveyResponses from './pages/surveys/SurveyResponses';
import ThankYou from './pages/surveys/ThankYou';
import Analytics from './pages/Analytics';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import SurveyAnalyzer from './pages/SurveyAnalyzer';
import AnalysisList from './pages/AnalysisList';
import EditAnalysis from './pages/EditAnalysis';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Root Route component
const RootRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/survey-response/:id" element={<SurveyResponse />} />
          <Route path="/thank-you" element={<ThankYou />} />
          
          {/* Root route */}
          <Route path="/" element={<RootRoute />} />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="surveys" element={<SurveyList />} />
            <Route path="surveys/create" element={<SurveyCreator />} />
            <Route path="surveys/:id" element={<SurveyDetail />} />
            <Route path="surveys/:id/edit" element={<SurveyEdit />} />
            <Route path="surveys/:id/responses" element={<SurveyResponses />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
          <Route path="/survey-analyzer" element={<SurveyAnalyzer />} />
          <Route path="/analysis-list" element={<AnalysisList />} />
          <Route path="/saved-analyses" element={<AnalysisList />} />
          <Route path="/edit-analysis/:id" element={<EditAnalysis />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;