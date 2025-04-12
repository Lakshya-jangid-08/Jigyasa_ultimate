import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart3, Users, Clock, CheckCircle } from 'lucide-react';

const Analytics = () => {
  const [plotData, setPlotData] = useState(null);

  useEffect(() => {
    const fetchPlotData = async () => {
      try {
        const response = await axios.get('https://jigyasa-backend.onrender.com/api/plot-data'); // Replace with actual backend endpoint
        setPlotData(response.data);
      } catch (error) {
        console.error('Error fetching plot data:', error);
      }
    };

    fetchPlotData();
  }, []);

  const stats = [
    {
      name: 'Total Responses',
      value: '2,345',
      change: '+12%',
      changeType: 'increase',
      icon: Users,
    },
    {
      name: 'Completion Rate',
      value: '87%',
      change: '+4%',
      changeType: 'increase',
      icon: CheckCircle,
    },
    {
      name: 'Avg. Response Time',
      value: '4m 32s',
      change: '-8%',
      changeType: 'decrease',
      icon: Clock,
    },
    {
      name: 'Active Surveys',
      value: '8',
      change: '+2',
      changeType: 'increase',
      icon: BarChart3,
    },
  ];

  const surveyData = [
    {
      name: 'Customer Satisfaction Q1',
      responses: 532,
      completionRate: 92,
      avgTime: '3m 45s',
    },
    {
      name: 'Product Feedback',
      responses: 423,
      completionRate: 88,
      avgTime: '5m 20s',
    },
    {
      name: 'Website Usability',
      responses: 289,
      completionRate: 85,
      avgTime: '4m 15s',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>

      <div className="mt-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
            >
              <dt>
                <div className="absolute bg-indigo-500 rounded-md p-3">
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                  {stat.name}
                </p>
              </dt>
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </p>
              </dd>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Survey Performance</h2>
        <div className="mt-4 flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Survey Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Responses
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Completion Rate
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Avg. Response Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {surveyData.map((survey) => (
                      <tr key={survey.name}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {survey.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {survey.responses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {survey.completionRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {survey.avgTime}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Plot Data</h2>
        {plotData ? (
          <pre className="bg-gray-100 p-4 rounded-lg">
            {JSON.stringify(plotData, null, 2)}
          </pre>
        ) : (
          <p>Loading plot data...</p>
        )}
      </div>
    </div>
  );
};

export default Analytics;