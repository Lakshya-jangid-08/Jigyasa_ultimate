import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, Calendar, PlusCircle } from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSurveys: 0,
    totalResponses: 0,
    activeSurveys: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/surveys/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const surveyData = response.data;
      setSurveys(surveyData.slice(0, 3)); // Get only the 3 most recent surveys
      
      // Calculate stats
      setStats({
        totalSurveys: surveyData.length,
        totalResponses: surveyData.reduce((sum, survey) => sum + (survey.responses_count || 0), 0),
        activeSurveys: surveyData.filter(survey => survey.is_active).length
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <Link
          to="/dashboard/surveys/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Survey
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardList className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Surveys</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalSurveys}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Responses</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalResponses}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Surveys</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.activeSurveys}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Recent Surveys</h2>
        <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {surveys.length === 0 ? (
              <li className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">No surveys yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Create your first survey to get started</p>
                  </div>
                  <Link
                    to="/dashboard/surveys/create"
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Create Survey
                  </Link>
                </div>
              </li>
            ) : (
              surveys.map((survey) => (
                <li key={survey.id}>
                  <Link
                    to={`/dashboard/surveys/${survey.id}`}
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ClipboardList className="h-5 w-5 text-gray-400" />
                          <p className="ml-2 text-sm font-medium text-indigo-600">
                            {survey.title}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            survey.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {survey.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {survey.responses_count || 0} responses
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <p className="text-sm text-gray-500">
                            Created on {formatDate(survey.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;