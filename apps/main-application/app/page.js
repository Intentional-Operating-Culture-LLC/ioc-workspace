'use client';

export default function HomePage() {
  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%);
          color: #ffffff;
          line-height: 1.6;
          overflow-x: hidden;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Navigation */
        .navbar {
          position: fixed;
          top: 0;
          width: 100%;
          background: rgba(15, 20, 25, 0.95);
          backdrop-filter: blur(10px);
          z-index: 1000;
          padding: 1rem 0;
          transition: all 0.3s ease;
        }

        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.5rem;
          font-weight: 700;
          color: #4a9eff;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4a9eff, #0066cc);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
        }

        .nav-links a {
          color: #e1e5e9;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s ease;
        }

        .nav-links a:hover {
          color: #4a9eff;
        }

        .nav-cta {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .btn {
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          cursor: pointer;
          border: none;
          font-size: 1rem;
          display: inline-block;
        }

        .btn-primary {
          background: linear-gradient(135deg, #4a9eff, #0066cc);
          color: white;
          box-shadow: 0 4px 15px rgba(74, 158, 255, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(74, 158, 255, 0.4);
        }

        .btn-secondary {
          background: transparent;
          color: #e1e5e9;
          border: 2px solid #374151;
        }

        .btn-secondary:hover {
          border-color: #4a9eff;
          color: #4a9eff;
        }

        /* Hero Section */
        .hero {
          padding: 120px 0 80px;
          text-align: center;
          position: relative;
        }

        .hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at center, rgba(74, 158, 255, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .hero h1 {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #ffffff, #4a9eff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.2;
        }

        .hero-subtitle {
          font-size: 1.3rem;
          color: #9ca3af;
          margin-bottom: 2rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-cta {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 3rem;
        }

        .trust-indicators {
          display: flex;
          justify-content: center;
          gap: 2rem;
          align-items: center;
          margin-top: 3rem;
          flex-wrap: wrap;
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #9ca3af;
          font-size: 0.9rem;
        }

        /* Features Section */
        .features {
          padding: 80px 0;
          background: rgba(255, 255, 255, 0.02);
        }

        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .section-subtitle {
          font-size: 1.1rem;
          color: #9ca3af;
          max-width: 600px;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 2rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          border-color: rgba(74, 158, 255, 0.5);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .feature-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #4a9eff, #0066cc);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .feature-card h3 {
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #ffffff;
        }

        .feature-card p {
          color: #9ca3af;
          line-height: 1.6;
        }

        /* Assessment Tiers */
        .tiers {
          padding: 80px 0;
        }

        .tiers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }

        .tier-card {
          background: linear-gradient(135deg, rgba(74, 158, 255, 0.1), rgba(0, 102, 204, 0.05));
          border: 1px solid rgba(74, 158, 255, 0.2);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .tier-card:hover {
          transform: translateY(-5px);
          border-color: #4a9eff;
        }

        .tier-number {
          display: inline-block;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #4a9eff, #0066cc);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
          margin: 0 auto 1rem;
        }

        .tier-card h3 {
          font-size: 1.4rem;
          margin-bottom: 1rem;
        }

        .tier-card p {
          color: #9ca3af;
          margin-bottom: 1.5rem;
        }

        .tier-features {
          list-style: none;
          text-align: left;
        }

        .tier-features li {
          padding: 0.5rem 0;
          color: #e1e5e9;
          position: relative;
          padding-left: 1.5rem;
        }

        .tier-features li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #4a9eff;
          font-weight: bold;
        }

        /* Pricing Section */
        .pricing {
          padding: 80px 0;
          background: rgba(255, 255, 255, 0.02);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }

        .pricing-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          position: relative;
          transition: all 0.3s ease;
        }

        .pricing-card.featured {
          border-color: #4a9eff;
          background: rgba(74, 158, 255, 0.1);
          transform: scale(1.05);
        }

        .pricing-card:hover {
          transform: translateY(-5px);
          border-color: rgba(74, 158, 255, 0.5);
        }

        .pricing-card.featured:hover {
          transform: scale(1.05) translateY(-5px);
        }

        .plan-name {
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .plan-price {
          font-size: 3rem;
          font-weight: 800;
          color: #4a9eff;
          margin-bottom: 0.5rem;
        }

        .plan-period {
          color: #9ca3af;
          margin-bottom: 2rem;
        }

        .plan-features {
          list-style: none;
          text-align: left;
          margin-bottom: 2rem;
        }

        .plan-features li {
          padding: 0.75rem 0;
          position: relative;
          padding-left: 2rem;
        }

        .plan-features li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #4a9eff;
          font-weight: bold;
        }

        /* CTA Section */
        .cta-section {
          padding: 80px 0;
          text-align: center;
          background: linear-gradient(135deg, rgba(74, 158, 255, 0.1), rgba(0, 102, 204, 0.05));
        }

        .cta-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-section h2 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .cta-section p {
          font-size: 1.1rem;
          color: #9ca3af;
          margin-bottom: 2rem;
        }

        /* Footer */
        .footer {
          background: rgba(0, 0, 0, 0.3);
          padding: 3rem 0 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .footer-section h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #4a9eff;
        }

        .footer-section ul {
          list-style: none;
        }

        .footer-section ul li {
          margin-bottom: 0.5rem;
        }

        .footer-section ul li a {
          color: #9ca3af;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .footer-section ul li a:hover {
          color: #4a9eff;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 2rem;
          text-align: center;
          color: #9ca3af;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }
          
          .hero h1 {
            font-size: 2.5rem;
          }
          
          .hero-cta {
            flex-direction: column;
            align-items: center;
          }
          
          .trust-indicators {
            flex-direction: column;
            gap: 1rem;
          }
          
          .section-title {
            font-size: 2rem;
          }
          
          .features-grid {
            grid-template-columns: 1fr;
          }
          
          .pricing-card.featured {
            transform: none;
          }
        }
      `}</style>
      
      {/* Navigation */}
      <nav className="navbar">
        <div className="container">
          <div className="nav-content">
            <div className="logo">
              <div className="logo-icon">iOC</div>
              <span>IOC Assessment Platform</span>
            </div>
            <ul className="nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#assessments">Assessments</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#demo">Demo</a></li>
            </ul>
            <div className="nav-cta">
              <a href="/dashboard" className="btn btn-secondary">View Demo</a>
              <a href="/signup" className="btn btn-primary">Get Started</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Transform Your Organization's<br />Intentional Operating Culture</h1>
            <p className="hero-subtitle">Data-driven culture assessments that unlock individual, executive, and organizational potential through AI-powered insights and ethical frameworks.</p>
            <div className="hero-cta">
              <a href="/dashboard" className="btn btn-primary">View Demo</a>
              <a href="#assessments" className="btn btn-secondary">Learn More</a>
            </div>
            <div className="trust-indicators">
              <div className="trust-item">
                <span>🔒</span>
                <span>SOC2 Compliant</span>
              </div>
              <div className="trust-item">
                <span>🧠</span>
                <span>Dual-AI Powered</span>
              </div>
              <div className="trust-item">
                <span>📊</span>
                <span>Real-time Analytics</span>
              </div>
              <div className="trust-item">
                <span>⚡</span>
                <span>Instant Insights</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Teams Choose IOC</h2>
            <p className="section-subtitle">Powerful, intelligent tools that adapt to your organization's unique culture and development needs</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>Smart Assessments</h3>
              <p>AI-powered insights that adapt to your responses, providing deeper understanding with fewer questions through our proprietary archetype framework.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Insights</h3>
              <p>See trends as they emerge with live dashboards that help you make informed decisions faster and track cultural transformation in real-time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>Team Collaboration</h3>
              <p>Work together seamlessly with role-based access and collaborative workflows built specifically for teams and organizational development.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚖️</div>
              <h3>Ethical Framework</h3>
              <p>Built on universal ethical principles with bias mitigation, data privacy, and human-centric design at the core of every recommendation.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h3>Seamless Integration</h3>
              <p>Connect with your existing tools through our robust API and automation capabilities, designed for enterprise-grade interoperability.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Advanced Analytics</h3>
              <p>Deep insights through customizable reports, trend analysis, and benchmarking that reveal actionable pathways for sustainable growth.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Assessment Tiers Section */}
      <section className="tiers" id="assessments">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Three-Tier Assessment Framework</h2>
            <p className="section-subtitle">Comprehensive culture evaluation across Individual, Executive, and Organizational dimensions</p>
          </div>
          <div className="tiers-grid">
            <div className="tier-card">
              <div className="tier-number">01</div>
              <h3>Individual Assessment</h3>
              <p>Personal sustainability, performance optimization, and growth potential evaluation</p>
              <ul className="tier-features">
                <li>Personal Ethos & Brand Expression</li>
                <li>Mindset & Confidence Spectrum</li>
                <li>Adaptability Analysis</li>
                <li>Vision & Purpose Alignment</li>
                <li>Growth Trajectory Mapping</li>
              </ul>
            </div>
            <div className="tier-card">
              <div className="tier-number">02</div>
              <h3>Executive Assessment</h3>
              <p>Leadership influence, team dynamics, and executive effectiveness measurement</p>
              <ul className="tier-features">
                <li>Leadership Ethos & Integrity</li>
                <li>Executive Disciplines</li>
                <li>Team Execution Analysis</li>
                <li>Feedback Integration</li>
                <li>Leader Potential Development</li>
              </ul>
            </div>
            <div className="tier-card">
              <div className="tier-number">03</div>
              <h3>Organizational Assessment</h3>
              <p>Systems health, operational efficiency, and cultural alignment evaluation</p>
              <ul className="tier-features">
                <li>Cultural Ethos & Values</li>
                <li>Succession Planning</li>
                <li>Performance Barriers</li>
                <li>Strategic Alignment</li>
                <li>Capacity & Efficiency Metrics</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing" id="pricing">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-subtitle">Choose the perfect plan for your organization's culture development needs</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3 className="plan-name">Starter</h3>
              <div className="plan-price">$49</div>
              <div className="plan-period">per month</div>
              <ul className="plan-features">
                <li>Up to 50 assessments/month</li>
                <li>Individual tier assessments</li>
                <li>Basic analytics dashboard</li>
                <li>Email support</li>
                <li>Export to CSV</li>
                <li>Core ethical framework</li>
              </ul>
              <a href="/signup" className="btn btn-secondary">Get Started</a>
            </div>
            <div className="pricing-card featured">
              <h3 className="plan-name">Professional</h3>
              <div className="plan-price">$149</div>
              <div className="plan-period">per month</div>
              <ul className="plan-features">
                <li>Unlimited assessments</li>
                <li>All assessment tiers (01-03)</li>
                <li>Advanced analytics & insights</li>
                <li>Priority support</li>
                <li>Custom branding</li>
                <li>API access</li>
                <li>Team collaboration tools</li>
                <li>Archetype framework</li>
              </ul>
              <a href="/signup" className="btn btn-primary">Get Started</a>
            </div>
            <div className="pricing-card">
              <h3 className="plan-name">Enterprise</h3>
              <div className="plan-price">Custom</div>
              <div className="plan-period">contact us</div>
              <ul className="plan-features">
                <li>Everything in Professional</li>
                <li>Dedicated account manager</li>
                <li>Custom integrations</li>
                <li>SLA guarantee</li>
                <li>On-premise deployment</li>
                <li>Optional spiritual lens</li>
                <li>White-label options</li>
                <li>Professional services</li>
              </ul>
              <a href="mailto:sales@iocframework.com" className="btn btn-secondary">Contact Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="demo">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Culture?</h2>
            <p>Join forward-thinking organizations using IOC to unlock their full potential through intentional operating culture development.</p>
            <div className="hero-cta">
              <a href="/signup" className="btn btn-primary">Start Free Trial</a>
              <a href="/dashboard" className="btn btn-secondary">Schedule Demo</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="logo">
                <div className="logo-icon">iOC</div>
                <span>IOC Framework</span>
              </div>
              <p style={{color: '#9ca3af', marginTop: '1rem'}}>Intelligent assessments for modern organizations</p>
            </div>
            <div className="footer-section">
              <h3>Product</h3>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#assessments">Assessments</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/dashboard">Documentation</a></li>
                <li><a href="/dashboard">API</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Company</h3>
              <ul>
                <li><a href="/dashboard">About</a></li>
                <li><a href="/dashboard">Blog</a></li>
                <li><a href="/dashboard">Careers</a></li>
                <li><a href="mailto:contact@iocframework.com">Contact</a></li>
                <li><a href="/dashboard">Support</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Resources</h3>
              <ul>
                <li><a href="/dashboard">Help Center</a></li>
                <li><a href="/dashboard">Community</a></li>
                <li><a href="/dashboard">Status</a></li>
                <li><a href="/dashboard">Security</a></li>
                <li><a href="/dashboard">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 IOC Framework. All rights reserved. | 
               <a href="/dashboard" style={{color: '#9ca3af'}}>Privacy</a> | 
               <a href="/dashboard" style={{color: '#9ca3af'}}>Terms</a> | 
               <a href="/dashboard" style={{color: '#9ca3af'}}>Security</a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}