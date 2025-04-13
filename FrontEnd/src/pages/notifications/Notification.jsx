import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Notification = () => {
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

        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/api/organization-surveys/`, {
          headers: {
            'Authorization': `Bearer ${token}`, // Include the Bearer token
            'Content-Type': 'application/json',
          },
        });

        setSurveys(response.data);
      } catch (err) {
        console.error('Error fetching surveys:', err);
        setError(err.response?.data?.detail || 'Failed to load surveys');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading surveys...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Organization Surveys</h1>
      {surveys.length === 0 ? (
        <p className="text-gray-500">No surveys available from your organization.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {surveys.map((survey) => (
            <li key={survey.id} className="py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{survey.title}</h3>
                  <p className="text-sm text-gray-500">{survey.description}</p>
                </div>
                <Link
                  to={`/survey-response/${survey.creator}/${survey.id}/`}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notification;
