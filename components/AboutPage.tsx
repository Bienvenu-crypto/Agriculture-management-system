'use client';

import React, { useRef } from 'react';

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
    phone: '+254 712 345 678',
    region: 'East Africa'
  },
  {
    name: 'Jean-Pierre Mugabo',
    role: 'Soil & Irrigation Expert',
    email: 'jp.mugabo@agrimanage.com',
    phone: '+250 788 234 567',
    region: 'Central Africa'
  },
  {
    name: 'Fatima Diallo',
    role: 'Marketplace & Trade Advisor',
    email: 'fatima.diallo@agrimanage.com',
    phone: '+221 77 456 7890',
    region: 'West Africa'
  },
  {
    name: 'David Mwangi',
    role: 'Agricultural Technology Consultant',
    email: 'david.mwangi@agrimanage.com',
    phone: '+254 722 987 654',
    region: 'East Africa'
  },
  {
    name: 'Grace Banda',
    role: 'Livestock & Veterinary Advisor',
    email: 'grace.banda@agrimanage.com',
    phone: '+265 999 123 456',
    region: 'Southern Africa'
  },
  {
    name: 'Ibrahim Traore',
    role: 'Climate & Weather Analyst',
    email: 'ibrahim.traore@agrimanage.com',
    phone: '+226 70 345 678',
    region: 'West Africa'
  }
];

export default function AboutPage({ onGetStarted }: AboutPageProps) {
  const contactsRef = useRef<HTMLDivElement>(null);

  const handleLearnMore = () => {
    contactsRef.current?.scrollIntoView({ behavior: 'smooth' });
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

      {/* Agricultural Agents Contacts */}
      <section ref={contactsRef} className="py-12">
        <h3 className="text-xl font-bold tracking-tight text-center mb-10" style={{ color: '#4169E1' }}>
          Contact Our Agricultural Agents
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
          {AGENTS.map((agent, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-base font-bold text-slate-900 tracking-tight">{agent.name}</h4>
              <p className="text-emerald-700 text-sm font-medium">{agent.role}</p>
              <p className="text-slate-500 text-xs font-normal">{agent.region}</p>
              <div className="pt-2 space-y-1">
                <p className="text-sm text-slate-700 font-medium">
                  <a href={`mailto:${agent.email}`} className="hover:text-emerald-700 transition-colors underline underline-offset-2">
                    {agent.email}
                  </a>
                </p>
                <p className="text-sm text-slate-700 font-medium">
                  <a href={`tel:${agent.phone.replace(/\s/g, '')}`} className="hover:text-emerald-700 transition-colors underline underline-offset-2">
                    {agent.phone}
                  </a>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

