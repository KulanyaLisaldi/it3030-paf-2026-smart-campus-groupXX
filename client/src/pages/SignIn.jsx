import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn } from '../api/auth';
import { getAuthToken, setAuthToken } from '../api/http';
import { persistCampusUser, readCampusUser } from '../utils/campusUserStorage';
import { ADMIN_DASHBOARD_PATH, navigateAfterLogin } from '../utils/authRedirect';
import PasswordInput from '../components/PasswordInput';

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

  const googleIcon = (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.231 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.06 0 5.842 1.153 7.959 3.041l5.657-5.657C34.023 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 13 24 13c3.06 0 5.842 1.153 7.959 3.041l5.657-5.657C34.023 6.053 29.27 4 24 4c-7.682 0-14.293 4.337-17.694 10.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.191l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.21 0-9.618-3.316-11.283-7.946l-6.522 5.025C9.56 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.79 2.237-2.231 4.166-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={logoBoxStyle}>SC</div>

        <h1 style={titleStyle}>Smart Operations Platform</h1>
        <h2 style={subtitleStyle}>Sign In</h2>

        

        <form onSubmit={handleStaffSignIn}>
          {error && <p style={errorTextStyle}>{error}</p>}

          <div style={inputContainerStyle}>
            <label style={labelStyle}>Email </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Email"
              autoComplete="username"
              required
            />
          </div>

          <div style={inputContainerStyle}>
            <label style={labelStyle}>Password</label>
            <PasswordInput
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
            {loading ? 'Signing In…' : 'Sign in'}
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
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{googleIcon}</span>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default SignIn;
