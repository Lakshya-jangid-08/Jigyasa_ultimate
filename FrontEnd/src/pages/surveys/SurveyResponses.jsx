import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Download, BarChart2, PieChart, List } from 'lucide-react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const SurveyResponses = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'individual'
  const [tableView, setTableView] = useState(false); // New state for table view
  const [questionStats, setQuestionStats] = useState({});

  useEffect(() => {
    fetchSurveyAndResponses();
  }, [id]);

  const fetchSurveyAndResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch survey details
      const surveyResponse = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/surveys/${id}/`, { headers });
      setSurvey(surveyResponse.data);

      // Fetch survey responses
      const responsesResponse = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/survey-responses/?survey=${id}`, { headers });
      setResponses(responsesResponse.data);

      // Calculate question statistics
      calculateQuestionStats(surveyResponse.data.questions, responsesResponse.data);

      console.log('Survey Questions:', surveyResponse.data.questions);
      surveyResponse.data.questions.forEach((question) => {
        console.log(`Choices for Question ${question.id}:`, question.choices);
      });
    } catch (error) {
      console.error('Error fetching survey responses:', error);
      setError(error.response?.data?.detail || 'Failed to load survey responses');
    } finally {
      setLoading(false);
    }
  };

  const calculateQuestionStats = (questions, responses) => {
    console.log("Debugging calculateQuestionStats:");
    console.log("Questions:", questions);
    console.log("Responses:", responses);

    if (!questions || !Array.isArray(questions)) {
      console.error("Questions are undefined or not an array.");
      return;
    }

    if (!responses || !Array.isArray(responses)) {
      console.error("Responses are undefined or not an array.");
      return;
    }

    const stats = {};

    questions.forEach((question) => {
      console.log(`Processing question ID ${question.id}:`, question);

      if (question.question_type === 'text') {
        stats[question.id] = {
          type: 'text',
          total: responses.filter((r) =>
            r.answers?.some((a) => a.question === question.id && a.text_answer)
          ).length,
        };
      } else {
        const choiceCounts = {};
        question.choices?.forEach((choice) => {
          choiceCounts[choice.id] = 0;
        });

        responses.forEach((response) => {
          const answer = response.answers?.find((a) => a.question === question.id);
          if (answer && answer.selected_choices) {
            answer.selected_choices.forEach((choiceId) => {
              if (choiceCounts.hasOwnProperty(choiceId)) {
                choiceCounts[choiceId] = (choiceCounts[choiceId] || 0) + 1;
              } else {
                console.warn(`Choice ID ${choiceId} not found in question choices.`);
              }
            });
          }
        });

        stats[question.id] = {
          type: question.question_type,
          choices: question.choices?.map((choice) => ({
            id: choice.id,
            text: choice.text,
            count: choiceCounts[choice.id] || 0,
          })) || [],
          total: Object.values(choiceCounts).reduce((sum, count) => sum + count, 0),
        };

        console.log(`Stats for question ID ${question.id}:`, stats[question.id]);
      }
    });

    setQuestionStats(stats);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const exportToCSV = () => {
    if (!survey || !responses.length) return;

    // Create CSV header with Response ID and question texts
    const csvHeaders = ['Response ID', ...survey.questions.map(q => q.text)].join(',');

    // Create CSV rows with Response ID and answers
    const csvRows = responses.map(response => {
        const responseId = response.id; // Add Response ID
        const answers = survey.questions.map(question => {
            const answer = response.answers.find(a => a.question === question.id);
            if (!answer) return ''; // No answer provided

            if (answer.text_answer) {
                return `"${answer.text_answer.replace(/"/g, '""')}"`; // Escape double quotes
            } else if (answer.selected_choices && answer.selected_choices.length) {
                const choiceTexts = answer.selected_choices.map(choiceId => {
                    const choice = question.choices.find(c => c.id === choiceId);
                    return choice ? choice.text : '';
                }).filter(Boolean);
                return `"${choiceTexts.join('; ')}"`; // Join multiple choices with a semicolon
            }
            return ''; // No valid answer
        }).join(',');

        return `${responseId},${answers}`; // Include Response ID in the row
    });

    // Combine header and rows
    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${survey.title.replace(/\s+/g, '_')}_responses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

  const renderQuestionSummary = (question) => {
    const stats = questionStats[question.id];
    if (!stats) return null;

    console.log(`Rendering responses for question ID ${question.id}:`, stats);

    if (stats.type === 'text') {
      return (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900">Text Responses ({stats.total})</h4>
          <div className="mt-2 bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
            {responses.map((response) => {
              const answer = response.answers.find((a) => a.question === question.id);
              return answer?.text_answer ? (
                <div key={response.id} className="mb-2 p-2 bg-white rounded border border-gray-200">
                  <p className="text-sm">{answer.text_answer}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {response.respondent || 'Anonymous'} • {formatDate(response.submitted_at)}
                  </p>
                </div>
              ) : null;
            })}
          </div>
        </div>
      );
    }

    // For choice questions, display raw data
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-900">Raw Responses ({stats.total} responses)</h4>
        <div className="mt-2 bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
          {responses.map((response) => {
            const answer = response.answers.find((a) => a.question === question.id);
            return answer ? (
              <div key={response.id} className="mb-2 p-2 bg-white rounded border border-gray-200">
                <p className="text-sm">
                  {answer.selected_choices?.length > 0
                    ? answer.selected_choices.map((choiceId) => {
                        const choice = question.choices?.find((c) => c.id === choiceId);
                        if (!choice) {
                          console.warn(`Choice ID ${choiceId} not found in question choices.`, {
                            questionId: question.id,
                            questionText: question.text,
                            choices: question.choices,
                          });
                        }
                        return choice ? choice.text : `Choice ID ${choiceId} (not found in question choices)`;
                      }).join(', ')
                    : 'No choices selected'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {response.respondent || 'Anonymous'} • {formatDate(response.submitted_at)}
                </p>
              </div>
            ) : null;
          })}
        </div>
      </div>
    );
  };

  const renderTableView = () => {
    if (!survey || !responses.length) return null;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Response ID</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Submitted At</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Respondent</th>
              {survey.questions.map((question) => (
                <th key={question.id} className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                  {question.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {responses.map((response) => (
              <tr key={response.id}>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{response.id}</td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{formatDate(response.submitted_at)}</td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                  {response.respondent ? response.respondent.email : 'Anonymous'}
                </td>
                {survey.questions.map((question) => {
                  const answer = response.answers.find((a) => a.question === question.id);
                  return (
                    <td key={question.id} className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                      {answer
                        ? answer.text_answer ||
                          (answer.selected_choices &&
                            answer.selected_choices
                              .map((choiceId) => {
                                const choice = question.choices.find((c) => c.id === choiceId);
                                return choice ? choice.text : '';
                              })
                              .filter(Boolean)
                              .join('; '))
                        : 'No answer provided'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="text-gray-500">Loading responses...</div>
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link
            to={`/dashboard/surveys/${id}`}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Survey
          </Link>
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode('summary')}
              className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${viewMode === 'summary' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
            >
              <BarChart2 className="h-4 w-4 mr-1" />
              Summary
            </button>
            <button
              onClick={() => setViewMode('individual')}
              className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${viewMode === 'individual' ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
            >
              <List className="h-4 w-4 mr-1" />
              Individual
            </button>
            <button
              onClick={() => setTableView(!tableView)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <BarChart2 className="h-4 w-4 mr-1" />
              {tableView ? 'Hide Table' : 'View Table'}
            </button>
            {responses.length > 0 && (
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-1" />
                Export to CSV
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {survey.title} - Responses
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {responses.length} {responses.length === 1 ? 'response' : 'responses'} received
            </p>
          </div>
        </div>

        {responses.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <p className="text-gray-500 text-center">No responses yet for this survey.</p>
            </div>
          </div>
        ) : tableView ? (
          renderTableView()
        ) : viewMode === 'summary' ? (
          <div className="space-y-8">
            {survey.questions.map(question => (
              <div key={question.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">{question.text}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {question.question_type} • {questionStats[question.id]?.total || 0} responses
                  </p>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  {renderQuestionSummary(question)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {responses.map((response) => (
                <li key={response.id} className="px-4 py-5 sm:px-6">
                  <div className="mb-4">
                    <div className="flex justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Response ID: </span>
                        <span className="text-sm text-gray-900">{response.id}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Submitted: </span>
                        <span className="text-sm text-gray-900">{formatDate(response.submitted_at)}</span>
                      </div>
                    </div>
                    {response.respondent && (
                      <div className="mt-1">
                        <span className="text-sm font-medium text-gray-500">Respondent: </span>
                        <span className="text-sm text-gray-900">{response.respondent.email}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 space-y-4">
                    {survey.questions.map((question) => {
                      const answer = response.answers.find(a => a.question === question.id);
                      return (
                        <div key={question.id} className="border-t border-gray-100 pt-4">
                          <h4 className="text-sm font-medium text-gray-900">{question.text}</h4>
                          <div className="mt-1 text-sm text-gray-500">
                            {answer ? (
                              answer.text_answer ? (
                                <p>{answer.text_answer}</p>
                              ) : answer.selected_choices && answer.selected_choices.length > 0 ? (
                                <ul className="list-disc list-inside">
                                  {answer.selected_choices.map((choiceId) => {
                                    const choice = question.choices.find(c => c.id === choiceId);
                                    return choice ? <li key={choiceId}>{choice.text}</li> : null;
                                  })}
                                </ul>
                              ) : (
                                <p>No answer provided</p>
                              )
                            ) : (
                              <p>No answer provided</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyResponses;