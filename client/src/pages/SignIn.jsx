import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkForgotPasswordEligibility, completeForgotPassword, requestForgotPassword, signIn } from '../api/auth';
import { getAuthToken, setAuthToken } from '../api/http';
import { persistCampusUser, readCampusUser } from '../utils/campusUserStorage';
import { navigateAfterAuth, navigateAfterLogin } from '../utils/authRedirect';
import PasswordInput from '../components/PasswordInput';
import { appSansSurfaceStyle } from '../utils/appFont';

const ACCENT = '#FA8112';
const ACCENT_SOFT = '#FCA311';
const CREAM = '#F5E7C6';
const NAVY = '#14213D';
const NAVY_DEEP = '#0b1220';

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /** 'signin' | 'forgotRequest' | 'forgotReset' */
  const [authView, setAuthView] = useState('signin');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotEligibilityLoading, setForgotEligibilityLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (!getAuthToken()) return;
    const user = readCampusUser();
    if (!user?.role) return;
    navigateAfterAuth(user, navigate);
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verificationError = params.get("verificationError");
    if (verificationError) {
      setInfoMessage("");
      setError(
        verificationError === "expired"
          ? "This verification link has expired. Ask an administrator to invite you again."
          : "This verification link is invalid or has already been used."
      );
    }
  }, [location.search]);

  const shellStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexWrap: 'wrap',
    background: `linear-gradient(145deg, ${NAVY_DEEP} 0%, ${NAVY} 45%, #1a2744 100%)`,
    color: '#f8fafc',
    position: 'relative',
    ...appSansSurfaceStyle,
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
    letterSpacing: '-0.03em',
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
    letterSpacing: '-0.03em',
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
    fontFamily: 'inherit',
    color: '#0f172a',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    outline: 'none',
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

  const secondaryBtnStyle = {
    width: '100%',
    padding: '14px 18px',
    backgroundColor: 'transparent',
    color: CREAM,
    border: '2px solid rgba(245, 231, 198, 0.45)',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxSizing: 'border-box',
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

  const INVALID_FORGOT_EMAIL_MESSAGE = 'Please enter a valid email.';

  const openForgotPassword = async () => {
    setError('');
    setInfoMessage('');
    const em = (email || '').trim();
    if (!em) {
      setError('Enter your email address first.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError(INVALID_FORGOT_EMAIL_MESSAGE);
      return;
    }
    setForgotEligibilityLoading(true);
    try {
      const res = await checkForgotPasswordEligibility({ email: em });
      if (!res?.allowed) {
        setError(INVALID_FORGOT_EMAIL_MESSAGE);
        return;
      }
      setForgotEmail(em);
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setAuthView('forgotRequest');
    } catch {
      setError(INVALID_FORGOT_EMAIL_MESSAGE);
    } finally {
      setForgotEligibilityLoading(false);
    }
  };

  const backToSignIn = () => {
    setAuthView('signin');
    setError('');
    setInfoMessage('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleSendForgotCode = async (e) => {
    e.preventDefault();
    const em = (forgotEmail || '').trim();
    if (!em) {
      setError('Enter your work email.');
      return;
    }
    setError('');
    setInfoMessage('');
    setForgotLoading(true);
    try {
      const res = await requestForgotPassword({ email: em });
      setInfoMessage(res?.message || 'Check your email for a code.');
      setAuthView('forgotReset');
    } catch (err) {
      setError(err.message || 'Could not send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const resendForgotCode = async () => {
    const em = (forgotEmail || '').trim();
    if (!em) {
      setError('Enter your email above.');
      return;
    }
    setError('');
    setForgotLoading(true);
    try {
      const res = await requestForgotPassword({ email: em });
      setInfoMessage(res?.message || 'A new code was sent.');
    } catch (err) {
      setError(err.message || 'Could not resend code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCompleteForgot = async (e) => {
    e.preventDefault();
    const em = (forgotEmail || '').trim();
    const code = (resetCode || '').trim();
    const np = newPassword;
    const cp = confirmNewPassword;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (!PASSWORD_POLICY_REGEX.test(np)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.');
      return;
    }
    if (np !== cp) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setForgotLoading(true);
    try {
      const res = await completeForgotPassword({ email: em, code, newPassword: np });
      setInfoMessage(res?.message || 'Password updated. You can sign in now.');
      setAuthView('signin');
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const forgotLinkStyle = {
    display: 'block',
    width: 'fit-content',
    background: 'none',
    border: 'none',
    color: 'rgba(245, 231, 198, 0.92)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'underline',
    padding: 0,
    margin: 0,
    textAlign: 'right',
  };

  const forgotLinkSignInRowStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 8,
    boxSizing: 'border-box',
  };

  const mutedHintStyle = {
    margin: '0 0 14px 0',
    fontSize: 13,
    lineHeight: 1.5,
    color: 'rgba(245, 231, 198, 0.78)',
    textAlign: 'left',
  };

  const infoBannerStyle = {
    marginBottom: 14,
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.35)',
    color: '#bbf7d0',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'left',
    lineHeight: 1.45,
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
        .signin-field,
        .signin-field:hover,
        .signin-field:focus,
        .signin-field:focus-visible {
          border-color: rgba(245, 231, 198, 0.35) !important;
          box-shadow: none !important;
          outline: none !important;
        }
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
          <h2 style={cardTitleStyle}>
            {authView === 'signin' && 'Sign In'}
            {authView === 'forgotRequest' && 'Reset password'}
            {authView === 'forgotReset' && 'Set new password'}
          </h2>

          {authView === 'signin' && (
            <>
              {infoMessage ? <div style={infoBannerStyle}>{infoMessage}</div> : null}
              <form onSubmit={handleStaffSignIn}>
                {error && <p style={errorTextStyle}>{error}</p>}

                <div style={inputContainerStyle}>
                  <label style={labelStyle} htmlFor="signin-email">
                    Email
                  </label>
                  <input
                    id="signin-email"
                    className="signin-field"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    className="signin-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                  />
                  <div style={forgotLinkSignInRowStyle}>
                    <button
                      type="button"
                      style={{
                        ...forgotLinkStyle,
                        cursor: forgotEligibilityLoading ? 'wait' : 'pointer',
                        opacity: forgotEligibilityLoading ? 0.75 : 1,
                      }}
                      onClick={openForgotPassword}
                      disabled={forgotEligibilityLoading}
                    >
                      {forgotEligibilityLoading ? 'Checking…' : 'Forgot password?'}
                    </button>
                  </div>
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
            </>
          )}

          {authView === 'forgotRequest' && (
            <form onSubmit={handleSendForgotCode}>
              {error && <p style={errorTextStyle}>{error}</p>}
              <div style={inputContainerStyle}>
                <label style={labelStyle} htmlFor="forgot-email">
                  Work email
                </label>
                <input
                  id="forgot-email"
                  className="signin-field"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={inputStyle}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <button
                type="submit"
                style={{ ...buttonStyle, opacity: forgotLoading ? 0.85 : 1, cursor: forgotLoading ? 'wait' : 'pointer' }}
                onMouseEnter={(e) => !forgotLoading && handleButtonHover(e, true)}
                onMouseLeave={(e) => !forgotLoading && handleButtonHover(e, false)}
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Sending…' : 'Send verification code'}
              </button>
              <button
                type="button"
                style={{ ...secondaryBtnStyle, marginTop: 12 }}
                onClick={backToSignIn}
              >
                Back to sign in
              </button>
            </form>
          )}

          {authView === 'forgotReset' && (
            <form onSubmit={handleCompleteForgot}>
              {error && <p style={errorTextStyle}>{error}</p>}
              {infoMessage ? <div style={infoBannerStyle}>{infoMessage}</div> : null}
              <p style={mutedHintStyle}>
                Enter the 6-digit code from your email and choose a new password (8+ characters with uppercase, lowercase,
                number, and symbol).
              </p>
              <div style={inputContainerStyle}>
                <label style={labelStyle} htmlFor="reset-email">
                  Email
                </label>
                <input
                  id="reset-email"
                  className="signin-field"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={inputStyle}
                  autoComplete="email"
                  required
                />
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle} htmlFor="reset-code">
                  Verification code
                </label>
                <input
                  id="reset-code"
                  className="signin-field"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={inputStyle}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle} htmlFor="reset-new-pass">
                  New password
                </label>
                <PasswordInput
                  id="reset-new-pass"
                  className="signin-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="New password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div style={inputContainerStyle}>
                <label style={labelStyle} htmlFor="reset-confirm-pass">
                  Confirm new password
                </label>
                <PasswordInput
                  id="reset-confirm-pass"
                  className="signin-field"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <button
                type="submit"
                style={{ ...buttonStyle, opacity: forgotLoading ? 0.85 : 1, cursor: forgotLoading ? 'wait' : 'pointer' }}
                onMouseEnter={(e) => !forgotLoading && handleButtonHover(e, true)}
                onMouseLeave={(e) => !forgotLoading && handleButtonHover(e, false)}
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Updating…' : 'Update password'}
              </button>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, justifyContent: 'center' }}>
                <button type="button" style={forgotLinkStyle} onClick={resendForgotCode}>
                  Resend code
                </button>
                <button type="button" style={{ ...forgotLinkStyle, marginTop: 0 }} onClick={backToSignIn}>
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default SignIn;
