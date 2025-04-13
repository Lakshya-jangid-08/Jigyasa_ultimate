import React, { useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';

const SurveyAnalyzer = () => {
  const [columns, setColumns] = useState([]);
  const [plots, setPlots] = useState([]);
  const [groupByOutput, setGroupByOutput] = useState(null);
  const [csvUploadId, setCsvUploadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [description, setDescription] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/survey-analyzer/csv-uploads/`, formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setColumns(response.data.columns);
      setCsvUploadId(response.data.id);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addPlot = () => {
    setPlots([...plots, { title: '', description: '', type: '', xAxis: '', yAxes: [], data: null }]);
  };

  const updatePlot = (index, field, value) => {
    const updatedPlots = [...plots];
    updatedPlots[index][field] = value;
    setPlots(updatedPlots);
  };

  const validatePlot = (plot) => {
    if (!plot.type) {
      setError('Please select a plot type.');
      return false;
    }

    if (plot.type === 'pie') {
      if (!plot.xAxis) {
        setError('x_axis is required for pie charts.');
        return false;
      }
      return true;
    }

    if (plot.type === 'heatmap') {
      if (!plot.xAxis || plot.yAxes.length === 0) {
        setError('x_axis and y_axes are required for heatmaps.');
        return false;
      }
      if (plot.yAxes.length > 2) {
        setError('Heatmap supports maximum 2 y_axes variables.');
        return false;
      }
      return true;
    }

    if (plot.type === 'box') {
      if (plot.yAxes.length === 0) {
        setError('At least one y_axis is required for box plots.');
        return false;
      }
      return true;
    }

    if (!plot.xAxis || plot.yAxes.length === 0) {
      setError('x_axis and y_axes are required for this plot type.');
      return false;
    }

    return true;
  };

  const generatePlot = async (index) => {
    const plot = plots[index];
    if (!plot.type || !csvUploadId) {
      setError('Please select a plot type and upload a file.');
      return;
    }

    if (!validatePlot(plot)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/survey-analyzer/plot-data/`, {
        plot_type: plot.type,
        x_axis: plot.xAxis,
        y_axes: plot.yAxes,
        csv_upload_id: csvUploadId,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      const updatedPlots = [...plots];
      updatedPlots[index].data = response.data;
      setPlots(updatedPlots);
    } catch (err) {
      console.error('Error generating plot:', err);
      setError(err.response?.data?.error || 'Failed to generate plot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateGroupBy = async (columns) => {
    if (!columns.length || !csvUploadId) {
      setError('Please select at least one column and upload a file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/survey-analyzer/groupby/`, {
        columns,
        csv_upload_id: csvUploadId,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      setGroupByOutput(response.data);
    } catch (err) {
      console.error('Error generating groupby output:', err);
      setError('Failed to generate groupby output. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysis = async () => {
    if (!analysisTitle || !authorName) {
      setError('Please provide a title and author name for the analysis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.post(`${import.meta.env.VITE_BASE_URL}/survey-analyzer/analyses/`, {
        title: analysisTitle,
        author_name: authorName,
        description,
        plots,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      alert('Analysis saved successfully!');
    } catch (err) {
      console.error('Error saving analysis:', err);
      setError('Failed to save analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const publishAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/survey-analyzer/publish-analysis/`, {
        analysis_id: csvUploadId,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${analysisTitle}.pdf`;
      link.click();
    } catch (err) {
      console.error('Error publishing analysis:', err);
      setError('Failed to publish analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900">1. Upload CSV File</h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="mt-4 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {loading && <p className="mt-2 text-sm text-gray-500">Loading...</p>}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900">2. Analysis Details</h2>
        <input
          type="text"
          placeholder="Analysis Title"
          value={analysisTitle}
          onChange={(e) => setAnalysisTitle(e.target.value)}
          className="mt-4 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <input
          type="text"
          placeholder="Author Name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="mt-4 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-4 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {columns.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">3. GroupBy Function</h2>
          <label className="block text-sm font-medium text-gray-700 mt-4">Select Columns (Multiple)</label>
          <select
            multiple
            onChange={(e) => generateGroupBy(Array.from(e.target.selectedOptions, option => option.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {columns.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
          {groupByOutput && (
            <div className="mt-4 space-y-4">
              {Object.entries(groupByOutput).map(([column, data]) => (
                <div key={column} className="bg-gray-100 p-4 rounded-md">
                  <h3 className="text-md font-medium text-gray-900">GroupBy: {column}</h3>
                  <table className="min-w-full mt-2 border border-gray-300">
                    <thead>
                      <tr>
                        {Object.keys(data[0]).map((key) => (
                          <th key={key} className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {Object.values(row).map((value, colIndex) => (
                            <td key={colIndex} className="px-4 py-2 border border-gray-300 text-sm text-gray-700">{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {columns.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">3. Create Plots</h2>
          <button
            onClick={addPlot}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Plot
          </button>

          {plots.map((plot, index) => (
            <div key={index} className="mt-6 p-4 border rounded-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plot Type</label>
                  <select
                    value={plot.type}
                    onChange={(e) => updatePlot(index, 'type', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select Plot Type</option>
                    <option value="scatter">Scatter Plot</option>
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="area">Area Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="heatmap">Heatmap</option>
                    <option value="box">Box Plot</option>
                  </select>
                </div>

                {plot.type && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {plot.type === 'heatmap' ? 'Row Variable (X-Axis)' : 'X-Axis'}
                      </label>
                      <select
                        value={plot.xAxis}
                        onChange={(e) => updatePlot(index, 'xAxis', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Select {plot.type === 'heatmap' ? 'Row Variable' : 'X-Axis'}</option>
                        {columns.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    {plot.type !== 'pie' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {plot.type === 'heatmap' ? 'Column Variable(s) (Y-Axis)' : 'Y-Axes (Multiple)'}
                        </label>
                        <select
                          multiple
                          value={plot.yAxes}
                          onChange={(e) => updatePlot(index, 'yAxes', Array.from(e.target.selectedOptions, option => option.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          {columns.map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                        {plot.type === 'heatmap' && (
                          <p className="mt-1 text-sm text-gray-500">
                            Select 1-2 variables for the heatmap. First variable will be used for values.
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => generatePlot(index)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Generate Plot
                    </button>

                    {plot.data && (
                      <div className="mt-4">
                        <Plot
                          data={plot.data.data}
                          layout={{
                            ...plot.data.layout,
                            autosize: true,
                            margin: { l: 50, r: 50, t: 50, b: 50 }
                          }}
                          style={{ width: '100%', height: '500px' }}
                          config={{ responsive: true }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <button
          onClick={saveAnalysis}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Save Analysis
        </button>
        <button
          onClick={publishAnalysis}
          className="mt-4 ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Publish Analysis
        </button>
      </div>
    </div>
  );
};

export default SurveyAnalyzer;