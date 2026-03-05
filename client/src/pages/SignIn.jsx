import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    marginBottom: '32px',
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
    marginBottom: '24px',
  };

  const signUpTextStyle = {
    color: '#222222',
    fontSize: '14px',
  };

  const signUpLinkStyle = {
    color: '#FA8112',
    textDecoration: 'none',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = '#FA8112';
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = '#F5E7C6';
  };

  const handleButtonHover = (e, isHover) => {
    if (isHover) {
      e.target.style.backgroundColor = '#E66A0A'; // darker orange
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

  const handleSignIn = (e) => {
    e.preventDefault();
    // Handle sign in logic here
    console.log('Sign in with:', email, password);
  };

  const handleGoogleSignIn = () => {
    // Handle Google sign in logic here
    console.log('Sign in with Google');
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={logoBoxStyle}>SC</div>

        {/* Title */}
        <h1 style={titleStyle}>Smart Operations Platform</h1>
        <h2 style={subtitleStyle}>Sign In</h2>

        {/* Sign In Form */}
        <form onSubmit={handleSignIn}>
          {/* Email Input */}
          <div style={inputContainerStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Password Input */}
          <div style={inputContainerStyle}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            style={buttonStyle}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            Sign In
          </button>
        </form>

        {/* OR Divider */}
        <div style={orDividerStyle}>
          <div style={dividerLineStyle}></div>
          <span style={orTextStyle}>OR</span>
          <div style={dividerLineStyle}></div>
        </div>

        {/* Google Sign In Button */}
        <button
          style={googleButtonStyle}
          onMouseEnter={(e) => handleGoogleHover(e, true)}
          onMouseLeave={(e) => handleGoogleHover(e, false)}
          onClick={handleGoogleSignIn}
        >
          <span>🌐</span>
          Sign in with Google
        </button>

        {/* Sign Up Link */}
        <p style={signUpTextStyle}>
          Don't have an account?{' '}
          <span
            style={signUpLinkStyle}
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
};

export default SignIn;