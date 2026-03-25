import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken } from '../api/http';
import { readCampusUser } from '../utils/campusUserStorage';
import { ADMIN_DASHBOARD_PATH } from '../utils/authRedirect';
import Hero from '../components/Hero.jsx';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getAuthToken()) return;
    const user = readCampusUser();
    if (user?.role === 'ADMIN') {
      navigate(ADMIN_DASHBOARD_PATH, { replace: true });
    }
  }, [navigate]);

  return (
    <main className="grow bg-bg-primary">
      <Hero />
    </main>
  );
};

export default Home;