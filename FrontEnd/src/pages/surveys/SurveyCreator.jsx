import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, X } from 'lucide-react';

const SurveyCreator = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requires_organization: false,
    organization_id: '',
    questions: []
  });
  const [organizations, setOrganizations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/organizations/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setOrganizations(response.data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'requires_organization' && !checked ? { organization_id: '' } : {})
    }));
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          text: '',
          question_type: 'text',
          required: false,
          choices: []
        }
      ]
    }));
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === index) {
          // If changing question type to text, clear choices
          if (field === 'question_type' && value === 'text') {
            return { ...q, [field]: value, choices: [] };
          }
          return { ...q, [field]: value };
        }
        return q;
      })
    }));
  };

  const addOption = (questionIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex) {
          return {
            ...q,
            choices: [...q.choices, { text: '' }]
          };
        }
        return q;
      })
    }));
  };

  const removeOption = (questionIndex, optionIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex) {
          return {
            ...q,
            choices: q.choices.filter((_, j) => j !== optionIndex)
          };
        }
        return q;
      })
    }));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex) {
          const newChoices = [...q.choices];
          newChoices[optionIndex] = { text: value };
          return { ...q, choices: newChoices };
        }
        return q;
      })
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }
      
      // Format the data according to the backend's expectations
      const formattedData = {
        ...formData,
        is_active: true,
        ...(formData.requires_organization ? { organization_id: formData.organization_id } : {}),
        questions: formData.questions.map(question => ({
          text: question.text,
          question_type: question.question_type,
          required: question.required,
          choices: question.choices.map(choice => ({
            text: choice.text
          }))
        }))
      };

      console.log('Submitting survey data:', formattedData);

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/surveys/`,
        formattedData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Survey creation response:', response.data);

      if (response.data) {
        navigate('/dashboard/surveys');
      }
    } catch (error) {
      console.error('Error creating survey:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.detail || 'Failed to create survey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Create New Survey
            </h3>
            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Survey Title
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.title}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="requires_organization"
                  id="requires_organization"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={formData.requires_organization}
                  onChange={handleChange}
                />
                <label htmlFor="requires_organization" className="ml-2 block text-sm text-gray-900">
                  Require organization access
                </label>
              </div>

              {formData.requires_organization && (
                <div>
                  <label htmlFor="organization_id" className="block text-sm font-medium text-gray-700">
                    Organization
                  </label>
                  <select
                    name="organization_id"
                    id="organization_id"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.organization_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium text-gray-900">Questions</h4>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </button>
                </div>

                {formData.questions.map((question, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-start mb-4">
                      <h5 className="text-sm font-medium text-gray-900">Question {index + 1}</h5>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Question Text
                        </label>
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Question Type
                        </label>
                        <select
                          value={question.question_type}
                          onChange={(e) => handleQuestionChange(index, 'question_type', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="single_choice">Single Choice</option>
                        </select>
                      </div>

                      {(question.question_type === 'multiple_choice' || question.question_type === 'single_choice') && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-700">
                              Options
                            </label>
                            <button
                              type="button"
                              onClick={() => addOption(index)}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Option
                            </button>
                          </div>
                          {question.choices.map((choice, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={choice.text}
                                onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder={`Option ${optionIndex + 1}`}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => removeOption(index, optionIndex)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">
                          Required
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {loading ? 'Creating...' : 'Create Survey'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyCreator; 