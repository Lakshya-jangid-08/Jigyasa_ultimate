import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Profile = () => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    if (user) {
      axios
        .get(`/api/organization/${user.id}`)
        .then((response) => {
          console.log('Organization API Response:', response.data);
          setOrganization(response.data);
        })
        .catch((error) => console.error('Error fetching organization:', error));
    }
  }, [user]);

  if (!user) {
    return <div className="p-4">No user is logged in.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="bg-white shadow rounded-lg p-4 mb-4">
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>First Name:</strong> {user.first_name || 'N/A'}</p>
        <p><strong>Last Name:</strong> {user.last_name || 'N/A'}</p>
      </div>
      {organization ? (
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">Organization</h2>
          <p><strong>Name:</strong> {organization.name}</p>
          <p><strong>Created At:</strong> {new Date(organization.created_at).toLocaleDateString()}</p>
        </div>
      ) : (
        <p>Loading organization details...</p>
      )}
    </div>
  );
};

export default Profile;