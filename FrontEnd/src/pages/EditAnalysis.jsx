import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EditAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/survey-analyzer/analyses/${id}/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        setAnalysis(response.data);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError('Failed to fetch analysis. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAnalysis({ ...analysis, [name]: value });
  };

  const handlePlotChange = (index, field, value) => {
    const updatedPlots = [...analysis.plots];
    updatedPlots[index][field] = value;
    setAnalysis({ ...analysis, plots: updatedPlots });
  };

  const addPlot = () => {
    setAnalysis({ ...analysis, plots: [...analysis.plots, { type: '', data: '' }] });
  };

  const removePlot = (index) => {
    const updatedPlots = analysis.plots.filter((_, i) => i !== index);
    setAnalysis({ ...analysis, plots: updatedPlots });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${import.meta.env.VITE_BASE_URL}/survey-analyzer/analyses/${id}/`, analysis, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      navigate('/saved-analyses');
    } catch (err) {
      console.error('Error updating analysis:', err);
      setError('Failed to update analysis. Please try again.');
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Edit Analysis</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            name="title"
            value={analysis.title || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Author Name</label>
          <input
            type="text"
            name="author_name"
            value={analysis.author_name || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={analysis.description || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Plots</label>
          {analysis.plots.map((plot, index) => (
            <div key={index} className="space-y-2 border p-4 rounded-md">
              <input
                type="text"
                placeholder="Plot Type"
                value={plot.type}
                onChange={(e) => handlePlotChange(index, 'type', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
              <textarea
                placeholder="Plot Data"
                value={plot.data}
                onChange={(e) => handlePlotChange(index, 'data', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
              <button
                type="button"
                onClick={() => removePlot(index)}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove Plot
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPlot}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add Plot
          </button>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditAnalysis;