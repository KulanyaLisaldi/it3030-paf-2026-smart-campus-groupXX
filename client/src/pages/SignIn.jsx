import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn } from '../api/auth';
import { getAuthToken, setAuthToken } from '../api/http';
import { persistCampusUser, readCampusUser } from '../utils/campusUserStorage';
import { navigateAfterAuth, navigateAfterLogin } from '../utils/authRedirect';
import PasswordInput from '../components/PasswordInput';

const ACCENT = '#FA8112';
const ACCENT_SOFT = '#FCA311';
const CREAM = '#F5E7C6';
const NAVY = '#14213D';
const NAVY_DEEP = '#0b1220';

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
    if (!user?.role) return;
    navigateAfterAuth(user, navigate);
  }, [navigate]);

  const shellStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexWrap: 'wrap',
    background: `linear-gradient(145deg, ${NAVY_DEEP} 0%, ${NAVY} 45%, #1a2744 100%)`,
    color: '#f8fafc',
    position: 'relative',
  };

  const backToHomeStyle = {
    position: 'fixed',
    top: 20,
    left: 20,
    zIndex: 50,
    padding: '10px 14px',
    border: 'none',
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.08)',
    color: CREAM,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  const leftPanelStyle = {
    flex: '1 1 420px',
    position: 'relative',
    minHeight: 'min(520px, 100vh)',
    padding: 'clamp(28px, 5vw, 56px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  const decorLayerStyle = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  };

  const barStyle = (top, rotate, opacity) => ({
    position: 'absolute',
    width: '140%',
    height: 72,
    left: '-20%',
    top,
    transform: `rotate(${rotate}deg)`,
    borderRadius: 999,
    background: `linear-gradient(90deg, rgba(250, 129, 18, ${opacity}) 0%, rgba(252, 163, 17, ${opacity * 0.35}) 45%, transparent 100%)`,
  });

  const leftInnerStyle = {
    position: 'relative',
    zIndex: 1,
    maxWidth: 520,
  };

  const welcomeHeadingStyle = {
    fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
    fontWeight: 800,
    margin: '0 0 16px 0',
    lineHeight: 1.1,
    color: '#ffffff',
  };

  const welcomeRuleStyle = {
    width: 56,
    height: 4,
    borderRadius: 999,
    background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_SOFT})`,
    marginBottom: 22,
  };

  const welcomeTextStyle = {
    fontSize: 'clamp(15px, 1.6vw, 17px)',
    lineHeight: 1.65,
    color: 'rgba(245, 231, 198, 0.88)',
    maxWidth: 440,
    margin: '0 0 28px 0',
  };

  const learnMoreBtnStyle = {
    alignSelf: 'flex-start',
    padding: '12px 26px',
    borderRadius: 999,
    border: `2px solid rgba(245, 231, 198, 0.45)`,
    background: 'rgba(250, 129, 18, 0.12)',
    color: CREAM,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
  };

  const rightPanelStyle = {
    flex: '1 1 380px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(24px, 4vw, 48px)',
    boxSizing: 'border-box',
    position: 'relative',
  };

  const glassCardStyle = {
    width: '100%',
    maxWidth: 420,
    padding: 'clamp(28px, 4vw, 40px)',
    borderRadius: 24,
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(245, 231, 198, 0.22)',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    textAlign: 'center',
    boxSizing: 'border-box',
  };

  const cardTitleStyle = {
    fontSize: 26,
    fontWeight: 800,
    color: '#ffffff',
    margin: '0 0 28px 0',
    letterSpacing: '-0.02em',
  };

  const inputContainerStyle = {
    marginBottom: 18,
    textAlign: 'left',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: 'rgba(245, 231, 198, 0.95)',
    marginBottom: 8,
    marginLeft: 4,
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 18px',
    border: '2px solid rgba(245, 231, 198, 0.35)',
    borderRadius: 999,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    width: '100%',
    padding: '15px 18px',
    backgroundColor: ACCENT,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 999,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginTop: 8,
    marginBottom: 8,
    boxShadow: 'none',
  };

  const orDividerStyle = {
    display: 'flex',
    alignItems: 'center',
    margin: '22px 0',
  };

  const dividerLineStyle = {
    flex: 1,
    height: 1,
    background: 'rgba(245, 231, 198, 0.22)',
  };

  const orTextStyle = {
    padding: '0 14px',
    color: 'rgba(245, 231, 198, 0.75)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.06em',
  };

  const googleButtonStyle = {
    width: '100%',
    padding: '14px 18px',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    color: '#14213D',
    border: '2px solid rgba(245, 231, 198, 0.4)',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  };

  const errorTextStyle = {
    color: '#fecaca',
    fontSize: 14,
    marginBottom: 14,
    textAlign: 'left',
    fontWeight: 600,
    lineHeight: 1.45,
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = ACCENT;
    e.target.style.boxShadow = `0 0 0 3px rgba(250, 129, 18, 0.25)`;
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = 'rgba(245, 231, 198, 0.35)';
    e.target.style.boxShadow = 'none';
  };

  const handleButtonHover = (e, isHover) => {
    if (isHover) {
      e.target.style.backgroundColor = '#E66A0A';
    } else {
      e.target.style.backgroundColor = ACCENT;
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
    <>
      <style>{`
        .signin-google-btn:hover {
          background-color: rgba(255, 255, 255, 0.92) !important;
          border-color: rgba(245, 231, 198, 0.4) !important;
          color: #14213D !important;
        }
      `}</style>
      <div style={shellStyle}>
      <button type="button" style={backToHomeStyle} onClick={() => navigate('/')} aria-label="Back to home">
        ← Back to home
      </button>
      <div style={leftPanelStyle}>
        <div style={decorLayerStyle} aria-hidden>
          <div style={barStyle('14%', -14, 0.2)} />
          <div style={barStyle('38%', -8, 0.12)} />
          <div style={barStyle('62%', -18, 0.1)} />
        </div>
        <div style={leftInnerStyle}>
          <h1 style={welcomeHeadingStyle}>Welcome!</h1>
          <div style={welcomeRuleStyle} />
          <p style={welcomeTextStyle}>
            Sign in to manage campus resources, support tickets, and staff tools in one place. CampusSync keeps your
            team connected.
          </p>
          <button
            type="button"
            style={learnMoreBtnStyle}
            onClick={() => navigate('/')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(250, 129, 18, 0.22)';
              e.currentTarget.style.borderColor = 'rgba(245, 231, 198, 0.65)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(250, 129, 18, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(245, 231, 198, 0.45)';
            }}
          >
            Learn More
          </button>
        </div>
      </div>

      <div style={rightPanelStyle}>
        <div style={glassCardStyle}>
          <h2 style={cardTitleStyle}>Sign In</h2>

          <form onSubmit={handleStaffSignIn}>
            {error && <p style={errorTextStyle}>{error}</p>}

            <div style={inputContainerStyle}>
              <label style={labelStyle} htmlFor="signin-email">
                Email
              </label>
              <input
                id="signin-email"
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
              <label style={labelStyle} htmlFor="signin-password">
                Password
              </label>
              <PasswordInput
                id="signin-password"
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
              style={{ ...buttonStyle, opacity: loading ? 0.85 : 1, cursor: loading ? 'wait' : 'pointer' }}
              onMouseEnter={(e) => !loading && handleButtonHover(e, true)}
              onMouseLeave={(e) => !loading && handleButtonHover(e, false)}
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
            className="signin-google-btn"
            style={googleButtonStyle}
            onClick={handleGoogleSignIn}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{googleIcon}</span>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default SignIn;
