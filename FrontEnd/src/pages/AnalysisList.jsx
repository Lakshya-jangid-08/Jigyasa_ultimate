import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const AnalysisList = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const response = await axios.get('https://jigyasa-backend.onrender.com/survey-analyzer/analyses/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        setAnalyses(response.data);
      } catch (err) {
        console.error('Error fetching analyses:', err);
        setError('Failed to fetch analyses. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Saved Analyses</h1>
      {analyses.length === 0 ? (
        <p>No saved analyses found.</p>
      ) : (
        <ul className="space-y-4">
          {analyses.map((analysis) => (
            <li key={analysis.id} className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900">{analysis.title}</h2>
              <p className="text-sm text-gray-600">Author: {analysis.author_name}</p>
              <p className="text-sm text-gray-600">Date: {analysis.date}</p>
              <p className="mt-2 text-gray-700">{analysis.description}</p>
              <Link
                to={`/edit-analysis/${analysis.id}`}
                className="text-indigo-600 hover:text-indigo-900 mt-4 inline-block"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AnalysisList;