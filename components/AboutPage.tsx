'use client';

import React, { useRef, useState } from 'react';

interface AboutPageProps {
  onGetStarted?: () => void;
}

const FEATURES = [
  {
    title: 'AI Chatbot',
    description: 'Get instant answers to your farming questions from our intelligent agricultural assistant available 24/7.'
  },
  {
    title: 'Smart Crop Calendar',
    description: 'Plan your planting and harvest schedule with AI-powered recommendations based on local conditions.'
  },
  {
    title: 'Crop Recommendations',
    description: 'Receive personalized crop suggestions based on soil type, climate, and regional market demand.'
  },
  {
    title: 'Marketplace Listings',
    description: 'Buy and sell agricultural products directly with other farmers and buyers on our secure platform.'
  },
  {
    title: 'Weather Monitoring',
    description: 'Real-time weather data and 7-day forecasts tailored to your farm\'s specific geographic location.'
  },
  {
    title: 'Advertising Tools',
    description: 'Promote your farm products and services to a targeted audience of farmers and agribusinesses.'
  }
];

const AGENTS = [
  {
    name: 'Dr. Amina Okello',
    role: 'Crop Science Specialist',
    email: 'amina.okello@agrimanage.com',
    phone: '+256 752 345 678',
    region: 'Eastern Region'
  },
  {
    name: 'Petter Mukisa',
    role: 'Soil & Irrigation Expert',
    email: 'peter.mukisa@agrimanage.com',
    phone: '+256 788 234 567',
    region: 'Central Region'
  },
  {
    name: 'Robert Asiimwe',
    role: 'Marketplace & Trade Advisor',
    email: 'robert.asiimwe@agrimanage.com',
    phone: '+256 77 456 7890',
    region: 'Western Region Africa'
  },
  {
    name: 'David Ogenrwoth',
    role: 'Agricultural Technology Consultant',
    email: 'david.ogenrwoth@agrimanage.com',
    phone: '+256 762 987 654',
    region: 'Northern Region'
  },
  {
    name: 'Grace Brenda',
    role: 'Livestock & Veterinary Advisor',
    email: 'grace.brenda@agrimanage.com',
    phone: '+256 789 123 456',
    region: 'South West'
  },
  {
    name: 'Naturinda Prisca ',
    role: 'Climate & Weather Analyst',
    email: 'ibrahim.traore@agrimanage.com',
    phone: '+256 77 345 678',
    region: 'Western  Region'
  }
];

export default function AboutPage({ onGetStarted }: AboutPageProps) {
  const [showLearnMore, setShowLearnMore] = useState(false);
  const learnMoreRef = useRef<HTMLDivElement>(null);

  const handleLearnMore = () => {
    setShowLearnMore(true);
    setTimeout(() => {
      learnMoreRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="pb-20 bg-white min-h-full" style={{ backgroundColor: '#ffffff' }}>
      {/* Hero Section */}
      <section className="pt-2 pb-12 text-center">
        <div className="max-w-3xl mx-auto space-y-8">

          <h2 className="text-xl md:text-2xl font-bold text-slate-950 tracking-tight leading-[1.2]">
            Empowering Farmers with <br />
            <span className="text-emerald-600">Smart Technology</span>
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-2xl mx-auto font-medium">
            A comprehensive digital platform connecting farmers, buyers, and experts through AI-powered tools, real-time weather, smart crop calendars, and an intelligent marketplace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-emerald-800 text-white rounded-2xl text-sm font-black hover:bg-emerald-900 transition-all shadow-xl shadow-emerald-800/20 w-full sm:w-auto"
            >
              Get Started Free
            </button>
            <button
              onClick={handleLearnMore}
              className="px-8 py-4 bg-white text-emerald-800 border-2 border-emerald-100 rounded-2xl text-sm font-black hover:bg-emerald-50 transition-all w-full sm:w-auto"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-10 py-12">
        <h3 className="text-xl font-bold tracking-tight text-center" style={{ color: '#4169E1' }}>Our Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
          {FEATURES.map((feature, idx) => (
            <div key={idx}>
              <h4 className="text-lg font-black text-slate-900 mb-2 tracking-tight">{feature.title}</h4>
              <p className="text-slate-600 text-base leading-relaxed font-medium">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h3 className="text-emerald-700 font-bold text-xl tracking-tight">Our Mission</h3>
          <p className="text-slate-600 text-base leading-relaxed font-medium">
            To transform African agriculture by providing farmers with digital tools that improve productivity, reduce waste, and connect them to fair markets; making smart farming accessible to all.
          </p>
        </div>
      </section>

      {/* Learn More Section (Terms & Contacts) */}
      {showLearnMore && (
        <div ref={learnMoreRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Terms and Conditions Section */}
          <section className="py-16 bg-slate-50 border-y border-slate-100">
            <div className="max-w-3xl mx-auto px-6 space-y-8">
              <h3 className="text-2xl font-bold tracking-tight text-center" style={{ color: '#4169E1' }}>
                Terms and Conditions
              </h3>
              <div className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100 space-y-6">
                <p className="text-slate-600 font-medium leading-relaxed">
                  Welcome to our Agricultural Management System. By using this platform to buy, sell, or manage your farm, you agree to abide by the following rules to ensure a secure and fair marketplace for all users.
                </p>
                <div className="bg-red-50 border-2 border-red-100 p-5 rounded-2xl text-red-800 font-bold text-sm shadow-inner">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">⚠️</span>
                    <p className="leading-relaxed">
                      <span className="uppercase tracking-widest text-[10px] block mb-1 font-black">Critical Payment Policy</span>
                      Payments are made through the system on the number of the seller registered who listed the crop. Any payment outside the system is at your own risk.
                    </p>
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-3 text-slate-600 font-medium">
                  <li>Users must provide accurate information when listing crops.</li>
                  <li>Sellers must honor the quantity and price advertised at the time of order placement.</li>
                  <li>Buyers are responsible for verifying the quality of goods upon receipt before confirming delivery.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Agricultural Agents Contacts */}
          <section className="py-16 px-6">
            <h3 className="text-2xl font-bold tracking-tight text-center mb-12" style={{ color: '#4169E1' }}>
              Contact Our Agricultural Agents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12 max-w-6xl mx-auto">
              {AGENTS.map((agent, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-base font-bold text-slate-900 tracking-tight">{agent.name}</h4>
                  <p className="text-emerald-700 text-sm font-bold">{agent.role}</p>
                  <p className="text-xs font-bold" style={{ color: '#4169E1' }}>{agent.region}</p>
                  <div className="pt-2 space-y-1">
                    <p className="text-sm text-slate-700 font-medium flex items-center gap-2">
                      <span className="opacity-50 text-xs">✉</span>
                      <a href={`mailto:${agent.email}`} className="hover:text-emerald-700 transition-colors">
                        {agent.email}
                      </a>
                    </p>
                    <p className="text-sm text-slate-700 font-medium flex items-center gap-2">
                      <span className="opacity-50 text-xs">📞</span>
                      <a href={`tel:${agent.phone.replace(/\s/g, '')}`} className="hover:text-emerald-700 transition-colors">
                        {agent.phone}
                      </a>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

