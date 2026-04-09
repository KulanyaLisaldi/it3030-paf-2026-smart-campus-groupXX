import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTopUsedResources } from '../api/resources';

const FEATURE_CARDS = [
  {
    title: 'Facility Booking',
    description: 'Reserve rooms, labs, lecture halls and equipment with ease',
    to: '/resources',
    image: '/facility.jpg',
  },
  {
    title: 'Maintenance Tracking',
    description: 'Report issues and monitor resolution progress',
    to: '/tickets/create',
    image: '/maintain.jpg',
  },
  {
    title: 'Real-time Updates',
    description: 'Stay informed with instant notifications',
    to: '/account/notifications',
    image: '/notification.jpg',
  },
];

/** Served from `client/public/` — add slide1.jpg and slide2.jpg (or change paths below). */
const HERO_SLIDES = [
  { src: '/slide1.jpg', alt: 'CampusSync' },
  { src: '/slide2.jpg', alt: 'CampusSync' },
];

const AUTO_ADVANCE_MS = 6000;

/** Inter (tailwind `font-sans`) — shared by Explore + Top Resources headings */
const HOME_SECTION_TITLE_CLASS =
  'font-sans text-2xl font-bold tracking-tight text-[#14213D] antialiased md:text-3xl';

const arrowBtnClass =
  'absolute top-1/2 z-[5] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/35 text-xl font-bold text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:h-12 md:w-12';

const Hero = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [topResources, setTopResources] = useState([]);

  const goNext = useCallback(() => {
    setActive((i) => (i + 1) % HERO_SLIDES.length);
  }, []);

  const goPrev = useCallback(() => {
    setActive((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  const goTo = (i) => {
    setActive(i);
  };

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setInterval(goNext, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [paused, goNext]);

  useEffect(() => {
    let mounted = true;
    getTopUsedResources(4)
      .then((data) => {
        if (!mounted) return;
        setTopResources(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setTopResources([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const getStartedButtonStyle = {
    backgroundColor: '#FA8112',
    color: '#FFFFFF',
    padding: '12px 32px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15)',
    transition: 'opacity 0.2s ease',
  };

  const viewResourcesButtonStyle = {
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    border: '2px solid #FFFFFF',
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
      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      e.target.style.borderColor = '#F5E7C6';
    } else {
      e.target.style.backgroundColor = 'transparent';
      e.target.style.borderColor = '#FFFFFF';
    }
  };

  const heroMinHeight = 'min(72vh, 720px)';

  return (
    <>
      <section
        className="relative w-full overflow-hidden bg-[#14213D] shadow-none"
        style={{ minHeight: heroMinHeight }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {HERO_SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out"
            style={{ opacity: i === active ? 1 : 0 }}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
        <div
          className="absolute inset-0 z-[2] bg-gradient-to-t from-[#14213D]/85 via-[#14213D]/45 to-[#14213D]/25 pointer-events-none"
          aria-hidden
        />

        <div
          className="relative z-[3] flex w-full flex-col items-center justify-center px-5 py-16 text-center text-white md:px-8"
          style={{ minHeight: heroMinHeight }}
        >
          <h1 className="mb-5 max-w-3xl text-3xl font-bold drop-shadow-sm md:text-5xl">
            CampusSync Operations Hub
          </h1>
          <p className="mb-9 max-w-2xl text-base text-white/95 drop-shadow-sm md:text-lg">
            Streamline your university experience with our comprehensive platform for facility bookings and maintenance
            tracking.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              style={getStartedButtonStyle}
              onMouseEnter={(e) => handleGetStartedHover(e, true)}
              onMouseLeave={(e) => handleGetStartedHover(e, false)}
              onClick={() => navigate('/signin')}
            >
              Get Started
            </button>
            <button
              type="button"
              style={viewResourcesButtonStyle}
              onMouseEnter={(e) => handleViewResourcesHover(e, true)}
              onMouseLeave={(e) => handleViewResourcesHover(e, false)}
              onClick={() => navigate('/resources')}
            >
              View Resources
            </button>
          </div>
        </div>

        <button
          type="button"
          className={`${arrowBtnClass} left-3 md:left-6`}
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous slide"
        >
          {'<'}
        </button>
        <button
          type="button"
          className={`${arrowBtnClass} right-3 md:right-6`}
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next slide"
        >
          {'>'}
        </button>

        <div
          className="absolute bottom-5 left-0 right-0 z-[5] flex justify-center gap-2"
          role="tablist"
          aria-label="Hero slides"
        >
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show slide ${i + 1}`}
              onClick={() => goTo(i)}
              className="h-2.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              style={{
                width: i === active ? 28 : 10,
                backgroundColor: i === active ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
              }}
            />
          ))}
        </div>
      </section>

      <section className="bg-bg-primary px-4 py-12 md:py-16">
        <div className="mx-auto mb-16 max-w-[1400px]">
          <header className="mb-8 text-center md:mb-10">
            <h2 id="explore-feature-types-heading" className={HOME_SECTION_TITLE_CLASS}>
              Explore Feature Types
            </h2>
          </header>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch">
            {FEATURE_CARDS.map((card) => (
              <Link
                key={card.to}
                to={card.to}
                className="group relative flex min-h-[280px] overflow-hidden rounded-xl shadow-lg outline-none ring-offset-2 ring-offset-[#FAF3E1] transition-shadow hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#FA8112] md:min-h-[300px]"
              >
                <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                  <span
                    className="absolute inset-[-4px] bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    style={{
                      backgroundImage: `url(${card.image})`,
                      filter: 'blur(1.5px)',
                    }}
                  />
                </span>
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/78 via-[#0f172a]/12 to-transparent"
                  aria-hidden
                />
                <div className="relative z-[1] mt-auto flex w-full flex-col justify-end p-6 text-left text-white">
                  <h3 className="mb-2 text-xl font-bold drop-shadow-sm">{card.title}</h3>
                  <p className="text-sm font-medium leading-snug text-white/95 drop-shadow-sm md:text-[15px]">
                    {card.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto mb-16 max-w-[1400px]">
          <div className="mb-16">
            <div className="relative mb-8 flex items-center justify-end md:mb-10">
              <h2 className={`absolute left-1/2 -translate-x-1/2 ${HOME_SECTION_TITLE_CLASS}`}>Top Resources</h2>
              <button
                type="button"
                onClick={() => navigate('/resources')}
                className="rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-semibold text-[#14213D] hover:bg-slate-50"
              >
                View all
              </button>
            </div>
            {topResources.length === 0 ? (
              <div className="rounded-lg border border-[#e2e8f0] bg-white p-5 text-sm font-semibold text-slate-500">
                Top resources will appear once bookings are available.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {topResources.map((item, index) => (
                  <div key={item.resourceId || `${item.code}-${index}`} className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
                    <div className="h-44 w-full bg-slate-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name || 'Resource'} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">No image</div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="text-lg font-bold text-[#0f172a]">{item.name || 'Unnamed Resource'}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">{item.code || '—'}</div>
                      <div className="mt-4 grid gap-2 text-sm text-slate-700">
                        <div><span className="font-semibold">Type:</span> {item.type || '—'}</div>
                        <div><span className="font-semibold">Location:</span> {item.location || '—'}</div>
                        <div><span className="font-semibold">Bookings:</span> {item.usageCount ?? 0}</div>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/resources/${encodeURIComponent(item.resourceId || '')}`)}
                          disabled={!item.resourceId}
                          className="h-11 rounded-xl border border-[#e2e8f0] bg-white text-base font-bold text-[#0f172a] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/resources')}
                          className="h-11 rounded-xl border-none bg-[#FA8112] text-base font-bold text-white shadow-[0_8px_20px_rgba(250,129,18,0.28)]"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 text-center">
              <div className="mb-2 text-3xl font-bold text-accent">500+</div>
              <p className="font-semibold text-dark-text">Active Users</p>
            </div>

            <div className="rounded-lg bg-white p-6 text-center">
              <div className="mb-2 text-3xl font-bold text-accent">1000+</div>
              <p className="font-semibold text-dark-text">Bookings Completed</p>
            </div>

            <div className="rounded-lg bg-white p-6 text-center">
              <div className="mb-2 text-3xl font-bold text-accent">99%</div>
              <p className="font-semibold text-dark-text">Uptime</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
