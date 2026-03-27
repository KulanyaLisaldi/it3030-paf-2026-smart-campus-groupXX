import React from 'react';

const Hero = () => {
  const getStartedButtonStyle = {
    backgroundColor: '#FA8112',
    color: '#FFFFFF',
    padding: '12px 32px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transition: 'opacity 0.2s ease',
  };

  const viewResourcesButtonStyle = {
    color: '#FA8112',
    backgroundColor: 'transparent',
    border: '2px solid #FA8112',
    padding: '10px 30px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const handleGetStartedHover = (e, isHover) => {
    e.target.style.opacity = isHover ? '0.9' : '1';
  };

  const handleViewResourcesHover = (e, isHover) => {
    if (isHover) {
      e.target.style.backgroundColor = '#FA8112';
      e.target.style.color = '#FFFFFF';
    } else {
      e.target.style.backgroundColor = 'transparent';
      e.target.style.color = '#FA8112';
    }
  };

  return (
    <section className="bg-bg-primary py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Content */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-text mb-6">
            Smart Campus Operations Hub
          </h1>
          <p className="text-lg text-dark-text mb-8 max-w-3xl mx-auto">
            Streamline your university experience with our comprehensive platform for 
            facility bookings and maintenance tracking.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              style={getStartedButtonStyle}
              onMouseEnter={(e) => handleGetStartedHover(e, true)}
              onMouseLeave={(e) => handleGetStartedHover(e, false)}
            >
              Get Started
            </button>
            <button 
              style={viewResourcesButtonStyle}
              onMouseEnter={(e) => handleViewResourcesHover(e, true)}
              onMouseLeave={(e) => handleViewResourcesHover(e, false)}
            >
              View Resources
            </button>
          </div>
        </div>

        {/* Highlights Section - 30% space with bg-secondary */}
        <div className="bg-bg-secondary rounded-lg p-8 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6">
              <div className="text-4xl mb-4">🏛️</div>
              <h3 className="text-xl font-semibold text-dark-text mb-2">Facility Booking</h3>
              <p className="text-dark-text">Reserve rooms, labs, lecture halls and equipment with ease</p>
            </div>

            <div className="bg-white rounded-lg p-6">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold text-dark-text mb-2">Maintenance Tracking</h3>
              <p className="text-dark-text">Report issues and monitor resolution progress</p>
            </div>

            <div className="bg-white rounded-lg p-6">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-dark-text mb-2">Real-time Updates</h3>
              <p className="text-dark-text">Stay informed with instant notifications</p>
            </div>
          </div>
        </div>

        {/* Quick Info Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-2">500+</div>
            <p className="text-dark-text font-semibold">Active Users</p>
          </div>

          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-2">1000+</div>
            <p className="text-dark-text font-semibold">Bookings Completed</p>
          </div>

          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-2">99%</div>
            <p className="text-dark-text font-semibold">Uptime</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
