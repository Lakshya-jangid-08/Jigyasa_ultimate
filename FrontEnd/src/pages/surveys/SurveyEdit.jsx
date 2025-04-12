import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';

const SurveyEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState({
    title: '',
    description: '',
    is_active: true,
    questions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    console.log('SurveyEdit component mounted');
    console.log('Initial survey state:', survey);
    fetchSurvey();
  }, [id]);

  const fetchSurvey = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      console.log('Fetching survey with ID:', id);

      const response = await axios.get(`https://jigyasa-backend.onrender.com/api/surveys/${id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Raw survey data from backend:', response.data);
      console.log('Questions from backend:', response.data.questions);

      // Make sure we're using the correct field names
      const surveyData = {
        ...response.data,
        questions: response.data.questions ? response.data.questions.map(q => ({
          id: q.id,
          text: q.text,
          question_type: q.question_type || 'text',
          required: q.required || false,
          choices: q.choices ? q.choices.map(c => ({
            id: c.id,
            text: c.text
          })) : []
        })) : []
      };

      console.log('Processed survey data:', surveyData);
      console.log('Processed questions:', surveyData.questions);
      
      setSurvey(surveyData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching survey:', error);
      console.error('Error response:', error.response?.data);
      setError('Failed to load survey');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccessMessage('');
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      console.log('Submitting survey edit for ID:', id);
      console.log('Current survey state:', survey);

      // Format the data according to the backend's expectations
      const formattedSurvey = {
        title: survey.title,
        description: survey.description,
        is_active: survey.is_active,
        requires_organization: survey.requires_organization || false,
        organization_id: survey.organization_id || null,
        questions: survey.questions.map((question, index) => ({
          id: question.id, // Include the ID if it exists
          text: question.text,
          question_type: question.question_type,
          required: question.required || false,
          choices: question.choices ? question.choices.map((choice, choiceIndex) => ({
            id: choice.id, // Include the ID if it exists
            text: choice.text
          })) : []
        }))
      };

      console.log('Formatted survey data:', formattedSurvey);

      const response = await axios.put(`https://jigyasa-backend.onrender.com/api/surveys/${id}/`, formattedSurvey, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Survey update response:', response.data);

      // Fetch the updated survey to ensure we have the latest data
      await fetchSurvey();

      setSuccessMessage('Survey updated successfully!');
      setTimeout(() => {
        navigate(`/dashboard/surveys/${id}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating survey:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.detail || 'Failed to update survey');
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...survey.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setSurvey({ ...survey, questions: updatedQuestions });
  };

  const handleChoiceChange = (questionIndex, choiceIndex, value) => {
    const updatedQuestions = [...survey.questions];
    updatedQuestions[questionIndex].choices[choiceIndex].text = value;
    setSurvey({ ...survey, questions: updatedQuestions });
  };

  const addQuestion = () => {
    console.log('Adding new question...');
    console.log('Current survey state:', survey);
    
    const newQuestion = {
      text: '',
      question_type: 'text',
      required: false,
      choices: []
    };
    
    console.log('New question object:', newQuestion);
    
    const updatedSurvey = {
      ...survey,
      questions: [...survey.questions, newQuestion]
    };
    
    console.log('Updated survey state:', updatedSurvey);
    setSurvey(updatedSurvey);
  };

  const deleteQuestion = (index) => {
    const updatedQuestions = [...survey.questions];
    updatedQuestions.splice(index, 1);
    setSurvey({
      ...survey,
      questions: updatedQuestions
    });
  };

  const addChoice = (questionIndex) => {
    const updatedQuestions = [...survey.questions];
    if (!updatedQuestions[questionIndex].choices) {
      updatedQuestions[questionIndex].choices = [];
    }
    updatedQuestions[questionIndex].choices.push({ text: '' });
    setSurvey({
      ...survey,
      questions: updatedQuestions
    });
  };

  const deleteChoice = (questionIndex, choiceIndex) => {
    const updatedQuestions = [...survey.questions];
    updatedQuestions[questionIndex].choices.splice(choiceIndex, 1);
    setSurvey({
      ...survey,
      questions: updatedQuestions
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="text-gray-500">Loading survey...</div>
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
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Edit Survey</h2>
        
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="text-green-700">{successMessage}</div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={survey.title}
              onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={survey.description}
              onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={survey.is_active}
                onChange={(e) => setSurvey({ ...survey, is_active: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Questions</h3>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </button>
            </div>
            
            {survey.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-md font-medium text-gray-900">Question {questionIndex + 1}</h4>
                  <button
                    type="button"
                    onClick={() => deleteQuestion(questionIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Question Text</label>
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => handleQuestionChange(questionIndex, 'text', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Question Type</label>
                    <select
                      value={question.question_type}
                      onChange={(e) => handleQuestionChange(questionIndex, 'question_type', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="text">Text</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="single_choice">Single Choice</option>
                    </select>
                  </div>

                  {(question.question_type === 'multiple_choice' || question.question_type === 'single_choice') && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-gray-700">Choices</label>
                        <button
                          type="button"
                          onClick={() => addChoice(questionIndex)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Choice
                        </button>
                      </div>
                      
                      {question.choices && question.choices.map((choice, choiceIndex) => (
                        <div key={choiceIndex} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={choice.text}
                            onChange={(e) => handleChoiceChange(questionIndex, choiceIndex, e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => deleteChoice(questionIndex, choiceIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => handleQuestionChange(questionIndex, 'required', e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Required</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/surveys/${id}`)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyEdit; 