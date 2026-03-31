import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../api/http';
import { readCampusUser } from '../utils/campusUserStorage';
import { navigateAfterAuth } from '../utils/authRedirect';
import Hero from '../components/Hero.jsx';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getAuthToken()) return;
    const user = readCampusUser();
    if (!user?.role) return;
    navigateAfterAuth(user, navigate);
  }, [navigate]);

  return (
    <main className="grow bg-bg-primary">
      <Hero />
    </main>
  );
};

export default Home;