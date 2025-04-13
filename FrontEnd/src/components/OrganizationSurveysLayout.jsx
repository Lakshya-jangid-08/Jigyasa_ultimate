import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';

const OrganizationSurveysLayout = () => {
  const [organizationSurveys, setOrganizationSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrganizationSurveys = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('No authentication token found');
          return;
        }

        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/surveys/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const filteredSurveys = response.data.filter(
          (survey) =>
            survey.organization &&
            ['IIITV', 'IITGN', 'GEC', 'NIT Surat', 'SVNIT'].includes(survey.organization.name)
        );

        setOrganizationSurveys(filteredSurveys);
      } catch (err) {
        console.error('Error fetching organization surveys:', err);
        setError('Failed to load organization surveys');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationSurveys();
  }, []);

  if (loading) {
    return <div className="p-6 flex justify-center items-center">Loading organization surveys...</div>;
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
      <h1 className="text-2xl font-semibold text-gray-900">Organization Surveys</h1>
      <div className="mt-8">
        {organizationSurveys.length === 0 ? (
          <p className="text-gray-500">No surveys available for the selected organizations.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {organizationSurveys.map((survey) => (
              <li key={survey.id} className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{survey.title}</h3>
                    <p className="text-sm text-gray-500">{survey.description}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard/surveys/${survey.id}`)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Outlet />
    </div>
  );
};

export default OrganizationSurveysLayout;
