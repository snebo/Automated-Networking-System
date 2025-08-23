import { Phone, Mail, MessageCircle, Clock, MapPin, Github, Twitter, Linkedin } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Support Center
          </h1>
          <p className="text-xl text-gray-600">
            Get the help you need, when you need it
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Get In Touch</h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <Phone className="h-6 w-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Phone Support</h3>
                  <p className="text-gray-600 mb-2">Direct line for urgent technical issues</p>
                  <a href="tel:+1-555-IVR-HELP" className="text-blue-600 hover:text-blue-700 font-semibold text-lg">
                    +1 (555) 487-4357
                  </a>
                  <p className="text-sm text-gray-500 mt-1">
                    Monday - Friday: 8 AM - 8 PM EST<br />
                    Saturday: 10 AM - 4 PM EST
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Mail className="h-6 w-6 text-green-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Email Support</h3>
                  <p className="text-gray-600 mb-2">For detailed technical questions</p>
                  <a href="mailto:support@ivr-automation.com" className="text-green-600 hover:text-green-700 font-semibold">
                    support@ivr-automation.com
                  </a>
                  <p className="text-sm text-gray-500 mt-1">
                    Response within 24 hours
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <MessageCircle className="h-6 w-6 text-purple-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Live Chat</h3>
                  <p className="text-gray-600 mb-2">Instant help for quick questions</p>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    Start Chat
                  </button>
                  <p className="text-sm text-gray-500 mt-1">
                    Available during business hours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Office Information */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Office</h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <MapPin className="h-6 w-6 text-red-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Address</h3>
                  <p className="text-gray-600">
                    1234 Tech Drive, Suite 100<br />
                    Innovation City, CA 94105<br />
                    United States
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="h-6 w-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
                  <div className="text-gray-600 space-y-1">
                    <p>Monday - Friday: 8:00 AM - 8:00 PM EST</p>
                    <p>Saturday: 10:00 AM - 4:00 PM EST</p>
                    <p>Sunday: Closed</p>
                    <p className="text-sm text-red-600 mt-2">
                      Emergency support available 24/7
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="mt-6 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-2" />
                <p>Interactive Map</p>
                <p className="text-sm">(Map integration coming soon)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media & Resources */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Connect With Us
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media</h3>
              <div className="flex space-x-4">
                <a 
                  href="https://github.com/your-org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Github className="h-6 w-6" />
                </a>
                <a 
                  href="https://twitter.com/your-handle" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Twitter className="h-6 w-6" />
                </a>
                <a 
                  href="https://linkedin.com/company/your-company" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                >
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
              <p className="text-gray-600 mt-4 text-sm">
                Follow us for updates, tips, and announcements about new features and improvements.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Resources</h3>
              <div className="space-y-3">
                <a href="/best-practices" className="block text-blue-600 hover:text-blue-700 transition-colors">
                  → Best Practices Guide
                </a>
                <a href="/api-docs" className="block text-blue-600 hover:text-blue-700 transition-colors">
                  → API Documentation
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-700 transition-colors">
                  → Video Tutorials
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-700 transition-colors">
                  → FAQ Section
                </a>
                <a href="#" className="block text-blue-600 hover:text-blue-700 transition-colors">
                  → System Status
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <Phone className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Emergency Support</h3>
              <p className="text-red-700">
                For critical system outages or security incidents, call our emergency line at{' '}
                <a href="tel:+1-555-911-IVR" className="font-bold underline">
                  +1 (555) 911-4873
                </a>
              </p>
              <p className="text-sm text-red-600 mt-1">
                Available 24/7 for enterprise customers only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}