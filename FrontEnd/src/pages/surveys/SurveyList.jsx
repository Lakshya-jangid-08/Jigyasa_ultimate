import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, Calendar, PlusCircle, Search, Filter } from 'lucide-react';
import axios from 'axios';

const SurveyList = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSurveys = async () => {
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

        setSurveys(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching surveys:', error);
        setError('Failed to load surveys');
        setLoading(false);
      }
    };

    fetchSurveys();
  }, []);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="text-gray-500">Loading surveys...</div>
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
        <h1 className="text-2xl font-semibold text-gray-900">Surveys</h1>
        <Link
          to="/dashboard/surveys/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Survey
        </Link>
      </div>

      {surveys.length === 0 ? (
        <div className="mt-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              <li className="px-6 py-4">
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
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {surveys.map((survey) => (
                <li key={survey.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{survey.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{survey.description}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        survey.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {survey.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Link
                        to={`/dashboard/surveys/${survey.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
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
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyList;