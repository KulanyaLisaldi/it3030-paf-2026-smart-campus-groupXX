import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });

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
    marginBottom: '16px',
  };

  const googleButtonStyle = {
    width: '100%',
    padding: '14px',
    backgroundColor: '#FFFFFF',
    color: '#222222',
    border: '1px solid #d1d5db',
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

  const signInTextStyle = {
    color: '#222222',
    fontSize: '14px',
  };

  const signInLinkStyle = {
    color: '#FA8112',
    textDecoration: 'none',
    fontWeight: '600',
    cursor: 'pointer',
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      e.target.style.borderColor = '#d1d5db';
    }
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    // Handle sign up logic here
    console.log('Sign up with:', formData);
  };

  const handleGoogleSignUp = () => {
    // Handle Google sign up logic here
    console.log('Sign up with Google');
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={logoBoxStyle}>SC</div>

        {/* Title */}
        <h1 style={titleStyle}>Sign Up</h1>

        {/* Sign Up Form */}
        <form onSubmit={handleSignUp}>
          {/* First Name Input */}
          <div style={inputContainerStyle}>
            <label style={labelStyle}>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Enter your first name"
              required
            />
          </div>

          {/* Last Name Input */}
          <div style={inputContainerStyle}>
            <label style={labelStyle}>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Enter your last name"
              required
            />
          </div>

          {/* Email Input */}
          <div style={inputContainerStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Phone Number Input */}
          <div style={inputContainerStyle}>
            <label style={labelStyle}>Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Enter your phone number"
              required
            />
          </div>

          {/* Password Input */}
          <div style={inputContainerStyle}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Confirm Password Input */}
          <div style={inputContainerStyle}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              style={inputStyle}
              placeholder="Confirm your password"
              required
            />
          </div>

          {/* Create Account Button */}
          <button
            type="submit"
            style={buttonStyle}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            Create Account
          </button>
        </form>

        {/* Google Sign Up Button */}
        <button
          style={googleButtonStyle}
          onMouseEnter={(e) => handleGoogleHover(e, true)}
          onMouseLeave={(e) => handleGoogleHover(e, false)}
          onClick={handleGoogleSignUp}
        >
          <span style={{ fontSize: '18px' }}>🌐</span>
          Sign up with Google
        </button>

        {/* Sign In Link */}
        <p style={signInTextStyle}>
          Already have an account?{' '}
          <span
            style={signInLinkStyle}
            onClick={() => navigate('/signin')}
          >
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
};

export default SignUp;