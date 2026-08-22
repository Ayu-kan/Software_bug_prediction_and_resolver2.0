import React from 'react';
import Hero from '../components/landing/Hero';
import Overview from '../components/landing/Overview';
import Capabilities from '../components/landing/Capabilities';
import DashboardPreview from '../components/landing/DashboardPreview';
import WorkflowTimeline from '../components/landing/WorkflowTimeline';
import Comparison from '../components/landing/Comparison';
import Contact from '../components/landing/Contact';
import Footer from '../components/landing/Footer';

export const LandingPage: React.FC = () => {
  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen selection:bg-[#c6f135] selection:text-[#0a0a0a]">
      <Hero />
      <Overview />
      <Capabilities />
      <DashboardPreview />
      <WorkflowTimeline />
      <Comparison />
      <Contact />
      <Footer />
    </div>
  );
};

export default LandingPage;
