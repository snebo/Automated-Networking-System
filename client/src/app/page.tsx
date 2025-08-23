import AnimatedSection from '@/components/AnimatedSection';
import FloatingElements from '@/components/FloatingElements';
import {
  ArrowRight,
  Bot,
  Building2,
  Cpu,
  Database,
  Github,
  Layers,
  Linkedin,
  Mail,
  Network,
  Phone,
  Search,
  Shield,
  Twitter,
  Workflow,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden custom-scrollbar">
      <FloatingElements />

      {/* Hero Section with Gradient Background */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-gradient-shift">
        <div className="absolute inset-0 bg-pattern-dots opacity-20"></div>

        <div className="container mx-auto px-4 py-12 relative z-10">
          <AnimatedSection className="text-center mb-16" animation="fadeInUp">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-3 glass-morphism">
              <Cpu className="h-4 w-4 text-blue-400 mr-2" />
              <span className="text-white text-sm font-medium">Next-Gen IVR Automation</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 leading-tight">
              <span className="block mb-2">AI-Powered</span>
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-shift pb-2">
                IVR Navigation
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mt-2 mb-10 max-w-4xl mx-auto leading-relaxed">
              Transform your business communications with intelligent AI agents that autonomously
              navigate complex IVR systems, extract critical information, and streamline operations
              at scale.
            </p>

            <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
              <Link
                href="/scraping"
                className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 animate-pulse-glow font-semibold text-lg"
              >
                <Search className="mr-3 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                Start Building
                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>

              <Link
                href="/workflow"
                className="group inline-flex items-center px-8 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20 font-semibold text-lg"
              >
                <Workflow className="mr-3 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                View Workflows
              </Link>
            </div>
          </AnimatedSection>

          {/* Stats Section */}
          <AnimatedSection
            className="grid md:grid-cols-3 gap-8 mt-20"
            animation="fadeInUp"
            delay={200}
          >
            <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-8 perspective-card border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="text-5xl font-bold text-white mb-2 animate-text-glow">99.7%</div>
              <div className="text-blue-200 font-semibold text-lg">Success Rate</div>
              <div className="text-blue-300/80 text-sm mt-1">Enterprise Grade</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-8 perspective-card border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="text-5xl font-bold text-white mb-2 animate-text-glow">&lt;500ms</div>
              <div className="text-purple-200 font-semibold text-lg">Response Time</div>
              <div className="text-purple-300/80 text-sm mt-1">Lightning Fast</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-8 perspective-card border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="text-5xl font-bold text-white mb-2 animate-text-glow">24/7</div>
              <div className="text-pink-200 font-semibold text-lg">Availability</div>
              <div className="text-pink-300/80 text-sm mt-1">Always Online</div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50 relative">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-16" animation="fadeInUp">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full mb-6">
              <Layers className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-blue-800 text-sm font-medium">Core Capabilities</span>
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-4">Engineering Excellence</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built with cutting-edge technology for enterprise-grade performance and reliability
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <AnimatedSection className="group" animation="fadeInLeft" delay={100}>
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 perspective-card gradient-border">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 inline-block mb-6 animate-bounce-in">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Intelligent AI Agent</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Advanced LLM-powered decision engine with context-aware processing, adaptive
                  learning, and real-time optimization capabilities.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Neural network-based IVR mapping
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Dynamic script adaptation
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Predictive conversation flow
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection className="group" animation="fadeInUp" delay={200}>
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 perspective-card gradient-border">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 inline-block mb-6 animate-bounce-in">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Enterprise Security</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Bank-grade encryption, TCPA compliance, and comprehensive audit trails ensure
                  maximum data protection and regulatory adherence.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    AES-256 encryption at rest
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    SOC 2 Type II compliant
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Real-time threat detection
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection className="group" animation="fadeInRight" delay={300}>
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 perspective-card gradient-border">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 inline-block mb-6 animate-bounce-in">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">High Performance</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Distributed architecture with edge computing, real-time streaming, and
                  auto-scaling for consistent sub-500ms response times.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    Edge-distributed processing
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    Auto-scaling infrastructure
                  </li>
                  <li className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    99.99% uptime SLA
                  </li>
                </ul>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <AnimatedSection animation="fadeInUp">
        <section className="py-24 bg-gradient-to-r from-slate-900 to-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern-grid opacity-20"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-6">
                <Network className="h-4 w-4 text-blue-400 mr-2" />
                <span className="text-white text-sm font-medium">System Architecture</span>
              </div>
              <h2 className="text-5xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                A sophisticated pipeline that transforms raw business data into actionable
                intelligence
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  icon: Search,
                  title: 'Data Acquisition',
                  desc: 'Intelligent scraping with ML-powered filtering and validation',
                  color: 'from-blue-500 to-blue-600',
                  delay: 0,
                },
                {
                  icon: Phone,
                  title: 'Call Orchestration',
                  desc: 'Distributed calling infrastructure with load balancing',
                  color: 'from-green-500 to-green-600',
                  delay: 100,
                },
                {
                  icon: Bot,
                  title: 'AI Navigation',
                  desc: 'Neural network processes IVR trees and optimizes pathfinding',
                  color: 'from-purple-500 to-purple-600',
                  delay: 200,
                },
                {
                  icon: Workflow,
                  title: 'Data Synthesis',
                  desc: 'Real-time extraction and structured data transformation',
                  color: 'from-pink-500 to-pink-600',
                  delay: 300,
                },
              ].map((step, index) => (
                <AnimatedSection
                  key={index}
                  className="text-center relative"
                  animation="fadeInUp"
                  delay={step.delay}
                >
                  <div className="relative">
                    <div
                      className={`bg-gradient-to-br ${step.color} rounded-3xl p-6 inline-block mb-6 animate-bounce-in shadow-2xl`}
                    >
                      <step.icon className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-white text-gray-900 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">{step.title}</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{step.desc}</p>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Enhanced Key Features */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-16" animation="fadeInUp">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-6">
              <Database className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-purple-800 text-sm font-medium">Platform Features</span>
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-4">Advanced Capabilities</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Enterprise-grade features designed for scale, security, and performance
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Database,
                title: 'Intelligent Scraping',
                desc: 'ML-powered data extraction with advanced filtering and validation',
                features: [
                  'Phone verification required',
                  'Content quality filtering',
                  'Real-time deduplication',
                  'Export automation',
                ],
                color: 'from-purple-500 to-purple-600',
                delay: 0,
              },
              {
                icon: Building2,
                title: 'IVR Mapping Engine',
                desc: 'Neural network-based IVR tree analysis and optimization',
                features: [
                  'Pattern recognition',
                  'Adaptive learning',
                  'Performance analytics',
                  'Visual tree mapping',
                ],
                color: 'from-blue-500 to-blue-600',
                delay: 100,
              },
              {
                icon: Bot,
                title: 'Adaptive AI Scripts',
                desc: 'Context-aware conversation management with dynamic adaptation',
                features: [
                  'Goal-oriented responses',
                  'Sentiment analysis',
                  'Fallback handling',
                  'Success optimization',
                ],
                color: 'from-green-500 to-green-600',
                delay: 200,
              },
            ].map((feature, index) => (
              <AnimatedSection key={index} animation="scaleIn" delay={feature.delay}>
                <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden perspective-card border border-gray-100">
                  <div
                    className={`bg-gradient-to-br ${feature.color} p-6 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <feature.icon className="h-12 w-12 text-white mb-4 relative z-10 animate-bounce-in" />
                    <h3 className="text-2xl font-bold text-white mb-2 relative z-10">
                      {feature.title}
                    </h3>
                    <p className="text-white/90 text-sm relative z-10">{feature.desc}</p>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {feature.features.map((item, idx) => (
                        <li key={idx} className="flex items-center text-gray-700 text-sm">
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3 animate-pulse-glow"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern-squares opacity-20"></div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <AnimatedSection animation="fadeInUp">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div className="md:col-span-2">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-3 mr-4">
                    <Cpu className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">IVR Automation Platform</h3>
                    <p className="text-blue-300 text-sm">Next-Generation AI Technology</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-8 max-w-md leading-relaxed">
                  Revolutionizing business communications through intelligent AI-powered IVR
                  navigation, advanced data processing, and automated workflow orchestration.
                </p>
                <div className="flex space-x-4">
                  {[
                    { Icon: Github, href: '#', color: 'hover:text-gray-300' },
                    { Icon: Twitter, href: '#', color: 'hover:text-blue-400' },
                    { Icon: Linkedin, href: '#', color: 'hover:text-blue-400' },
                    { Icon: Mail, href: '#', color: 'hover:text-green-400' },
                  ].map(({ Icon, href, color }, index) => (
                    <a
                      key={index}
                      href={href}
                      className={`text-gray-400 ${color} transition-all duration-300 transform hover:scale-110`}
                    >
                      <Icon className="h-6 w-6" />
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-6 text-blue-300">Platform</h4>
                <ul className="space-y-3">
                  {[
                    { href: '/scraping', label: 'Business Scraping' },
                    { href: '/calling', label: 'Call Management' },
                    { href: '/workflow', label: 'Workflow Results' },
                    { href: '/api-docs', label: 'API Documentation' },
                  ].map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="text-gray-300 hover:text-white transition-colors duration-300 hover:translate-x-1 transform inline-block"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-6 text-purple-300">Resources</h4>
                <ul className="space-y-3">
                  {[
                    { href: '/best-practices', label: 'Best Practices' },
                    { href: '/support', label: 'Support Center' },
                    { href: '/privacy', label: 'Privacy Policy' },
                    { href: '#', label: 'System Status' },
                  ].map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="text-gray-300 hover:text-white transition-colors duration-300 hover:translate-x-1 transform inline-block"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400 text-sm mb-4 md:mb-0">
                  © 2025 IVR Automation Platform. All rights reserved. Built with Next.js and
                  powered by AI.
                </p>
                <div className="flex items-center space-x-6 text-sm text-gray-400">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    All systems operational
                  </span>
                  <span>Version 2.1.0</span>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </footer>
    </div>
  );
}
