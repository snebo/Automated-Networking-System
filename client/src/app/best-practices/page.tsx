import { CheckCircle, AlertTriangle, Lightbulb, Clock, Shield, Target } from 'lucide-react';

export default function BestPracticesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Best Practices for IVR Automation
          </h1>
          <p className="text-xl text-gray-600">
            Maximize your success with these proven strategies and guidelines
          </p>
        </div>

        <div className="space-y-12">
          {/* Business Scraping Best Practices */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center mb-6">
              <Target className="h-8 w-8 text-purple-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Business Scraping</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Do&apos;s
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    Use specific industry terms (e.g., &quot;pediatric dentist&quot; vs &quot;dentist&quot;)
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    Include location modifiers for better targeting
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    Enable phone number verification to ensure callable businesses
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    Export and review data before calling campaigns
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Don&apos;ts
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">•</span>
                    Avoid overly broad terms that return irrelevant results
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">•</span>
                    Don&apos;t scrape without location constraints
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">•</span>
                    Never proceed with businesses lacking verified phone numbers
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">•</span>
                    Avoid scraping during peak business hours
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Calling Strategy */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center mb-6">
              <Clock className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Call Timing & Strategy</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Optimal Times</h3>
                <ul className="space-y-2 text-blue-800 text-sm">
                  <li>• Healthcare: 9 AM - 11 AM, 2 PM - 4 PM</li>
                  <li>• Restaurants: 2 PM - 4 PM (between rushes)</li>
                  <li>• Professional Services: 10 AM - 12 PM</li>
                  <li>• Retail: 10 AM - 2 PM (weekdays)</li>
                </ul>
              </div>
              <div className="bg-yellow-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">Script Preparation</h3>
                <ul className="space-y-2 text-yellow-800 text-sm">
                  <li>• Keep initial scripts under 30 seconds</li>
                  <li>• Prepare for common IVR patterns</li>
                  <li>• Include fallback responses</li>
                  <li>• Test scripts on sample businesses first</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">Success Metrics</h3>
                <ul className="space-y-2 text-green-800 text-sm">
                  <li>• Target 60%+ connection rate</li>
                  <li>• Aim for 40%+ successful navigation</li>
                  <li>• Track information extraction rate</li>
                  <li>• Monitor compliance scores</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Compliance Guidelines */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center mb-6">
              <Shield className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Compliance & Ethics</h2>
            </div>
            
            <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
              <div className="flex">
                <AlertTriangle className="h-6 w-6 text-amber-400 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">Important Legal Notice</h3>
                  <p className="text-amber-700">
                    Always ensure compliance with TCPA, local calling regulations, and industry-specific requirements 
                    before initiating any automated calling campaigns.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">TCPA Compliance</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    Maintain opt-in records for all contacts
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    Respect Do Not Call (DNC) registry
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    Provide clear identification and purpose
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    Honor immediate opt-out requests
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Protection</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    Encrypt all stored business data
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    Implement PII redaction policies
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    Regular audit trail reviews
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    Secure data transmission protocols
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Advanced Tips */}
          <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-8">
            <div className="flex items-center mb-6">
              <Lightbulb className="h-8 w-8 text-purple-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Pro Tips for Maximum Success</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">IVR Navigation</h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Pattern Recognition</h4>
                    <p className="text-gray-600 text-sm">
                      Train your AI on common IVR patterns. Most systems follow predictable structures: 
                      main menu → department selection → queue or transfer.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Timeout Management</h4>
                    <p className="text-gray-600 text-sm">
                      Configure appropriate timeouts. Healthcare systems often have longer hold times, 
                      while retail typically responds faster.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality</h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Regular Validation</h4>
                    <p className="text-gray-600 text-sm">
                      Periodically re-validate business information. Phone numbers and business details 
                      change frequently in certain industries.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Enrichment Strategy</h4>
                    <p className="text-gray-600 text-sm">
                      Use enrichment selectively. Focus on high-value prospects or businesses 
                      where standard scraping yields incomplete information.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}