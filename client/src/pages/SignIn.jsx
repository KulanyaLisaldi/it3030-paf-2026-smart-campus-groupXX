import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn } from '../api/auth';
import { getAuthToken, setAuthToken } from '../api/http';
import { persistCampusUser, readCampusUser } from '../utils/campusUserStorage';
import { ADMIN_DASHBOARD_PATH, navigateAfterLogin } from '../utils/authRedirect';

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) return;
    const user = readCampusUser();
    if (user?.role === 'ADMIN') {
      navigate(ADMIN_DASHBOARD_PATH, { replace: true });
    }
  }, [navigate]);

  const pageStyle = {
    minHeight: '100vh',
    backgroundColor: '#FAF3E1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  };

  const logoBoxStyle = {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #FA8112, #F5E7C6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '24px',
    margin: '0 auto 16px',
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: '8px',
  };

  const subtitleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#222222',
    marginBottom: '12px',
  };

  const hintStyle = {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: 1.45,
    textAlign: 'left',
  };

  const inputContainerStyle = {
    marginBottom: '20px',
    textAlign: 'left',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#222222',
    marginBottom: '8px',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #F5E7C6',
    borderRadius: '8px',
    fontSize: '16px',
    color: '#222222',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px',
    backgroundColor: '#FA8112',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginBottom: '24px',
  };

  const orDividerStyle = {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
  };

  const dividerLineStyle = {
    flex: 1,
    height: '1px',
    backgroundColor: '#F5E7C6',
  };

  const orTextStyle = {
    padding: '0 16px',
    color: '#222222',
    fontSize: '14px',
    fontWeight: '500',
  };

  const googleButtonStyle = {
    width: '100%',
    padding: '14px',
    backgroundColor: '#FFFFFF',
    color: '#222222',
    border: '2px solid #F5E7C6',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '16px',
  };

  const errorTextStyle = {
    color: '#d32f2f',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'left',
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = '#FA8112';
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = '#F5E7C6';
  };

  const handleButtonHover = (e, isHover) => {
    if (isHover) {
      e.target.style.backgroundColor = '#E66A0A';
    } else {
      e.target.style.backgroundColor = '#FA8112';
    }
  };

  const handleGoogleHover = (e, isHover) => {
    if (isHover) {
      e.target.style.backgroundColor = '#FAF3E1';
      e.target.style.borderColor = '#FA8112';
    } else {
      e.target.style.backgroundColor = '#FFFFFF';
      e.target.style.borderColor = '#F5E7C6';
    }
  };

  const handleStaffSignIn = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);
    try {
      const response = await signIn({ email, password });
      if (response?.user) {
        persistCampusUser(response.user);
      }
      if (response?.token) {
        setAuthToken(response.token);
      } else {
        setAuthToken(null);
      }
      navigateAfterLogin(response?.user, navigate, location.state);
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError('');
    const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:8081';
    window.location.assign(`${apiOrigin.replace(/\/$/, '')}/oauth2/authorization/google`);
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={logoBoxStyle}>SC</div>

        <h1 style={titleStyle}>Smart Operations Platform</h1>
        <h2 style={subtitleStyle}>Sign In</h2>

        <p style={hintStyle}>
          <strong>Campus users</strong> sign in with Google (no separate registration).
          <br />
          <strong>Admin and technicians</strong> use email and password below.
        </p>

        <form onSubmit={handleStaffSignIn}>
          {error && <p style={errorTextStyle}>{error}</p>}

          <div style={inputContainerStyle}>
            <label style={labelStyle}>Email (staff)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Admin or technician email"
              autoComplete="username"
              required
            />
          </div>

          <div style={inputContainerStyle}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            style={{ ...buttonStyle, opacity: loading ? 0.8 : 1 }}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
            disabled={loading}
          >
            {loading ? 'Signing In…' : 'Staff sign in'}
          </button>
        </form>

        <div style={orDividerStyle}>
          <div style={dividerLineStyle} />
          <span style={orTextStyle}>OR</span>
          <div style={dividerLineStyle} />
        </div>

        <button
          type="button"
          style={googleButtonStyle}
          onMouseEnter={(e) => handleGoogleHover(e, true)}
          onMouseLeave={(e) => handleGoogleHover(e, false)}
          onClick={handleGoogleSignIn}
        >
          <span aria-hidden>🌐</span>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default SignIn;
