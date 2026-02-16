import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/context/AuthContext';
import { 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Folder, 
  Zap, 
  Shield,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    );
  }

  const features = [
    {
      icon: <CheckCircle2 size={32} />,
      title: 'Smart Task Management',
      description: 'Organize tasks with Kanban boards, priorities, and due dates. Stay on top of your work effortlessly.'
    },
    {
      icon: <Users size={32} />,
      title: 'Team Workspaces',
      description: 'Create dedicated workspaces for your teams. Collaborate seamlessly with members across projects.'
    },
    {
      icon: <Folder size={32} />,
      title: 'Project Organization',
      description: 'Group tasks into projects with color coding. Keep everything structured and easy to find.'
    },
    {
      icon: <BarChart3 size={32} />,
      title: 'Analytics Dashboard',
      description: 'Track progress with real-time statistics and visual breakdowns. Make data-driven decisions.'
    },
    {
      icon: <Zap size={32} />,
      title: 'Lightning Fast',
      description: 'Built with modern tech stack for optimal performance. React, Vite, and MySQL power your workflow.'
    },
    {
      icon: <Shield size={32} />,
      title: 'Secure & Reliable',
      description: 'JWT authentication and encrypted connections. Your data is safe and protected.'
    }
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-container">
          <div className="nav-content">
            <div className="nav-brand">
              <Sparkles className="brand-icon" />
              <span className="brand-name">Task Nexus</span>
            </div>
            <div className="nav-actions">
              <Link to="/login" className="btn-link">Login</Link>
              <Link to="/register" className="btn-primary">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="landing-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={16} />
              <span>Enterprise-Grade Task Management</span>
            </div>
            <h1 className="hero-title">
              Plan. Track. <span className="gradient-text">Succeed.</span>
            </h1>
            <p className="hero-subtitle">
              The all-in-one task management platform that helps teams organize, 
              collaborate, and achieve more. From solo projects to enterprise teams.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn-hero-primary">
                Start Free Trial
                <ArrowRight size={20} />
              </Link>
              <Link to="/login" className="btn-hero-secondary">
                Sign In
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50K+</div>
                <div className="stat-label">Tasks Completed</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Succeed</h2>
            <p className="section-subtitle">
              Powerful features designed to streamline your workflow and boost productivity
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="landing-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Workflow?</h2>
            <p className="cta-subtitle">
              Join thousands of teams already using Task Nexus to achieve their goals
            </p>
            <Link to="/register" className="btn-cta">
              Get Started for Free
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="footer-brand">
              <Sparkles size={24} />
              <span>Task Nexus</span>
            </div>
            <p className="footer-text">
              © 2024 Task Nexus. Built with React, Node.js, and MySQL.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
