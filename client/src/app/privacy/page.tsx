import { Shield, Eye, Lock, FileText, Users, Settings } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600">
            Last updated: January 15, 2025
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <Shield className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Our Commitment to Privacy</h2>
              <p className="text-blue-800">
                We are committed to protecting your privacy and the privacy of the businesses you interact with through our platform. 
                This policy explains how we collect, use, and safeguard information in our IVR automation system.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* Information We Collect */}
          <section>
            <div className="flex items-center mb-6">
              <Eye className="h-8 w-8 text-purple-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Name and contact details</li>
                  <li>• Company information</li>
                  <li>• Billing and payment information</li>
                  <li>• Account preferences and settings</li>
                  <li>• Usage statistics and logs</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Data</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Business names and addresses</li>
                  <li>• Phone numbers and contact information</li>
                  <li>• Industry classifications</li>
                  <li>• Call recordings and transcripts</li>
                  <li>• IVR interaction patterns</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <div className="flex items-center mb-6">
              <Settings className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3">Service Delivery</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Execute IVR automation workflows</li>
                    <li>• Process and analyze call data</li>
                    <li>• Generate reports and insights</li>
                    <li>• Provide customer support</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3">Platform Improvement</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Enhance AI model performance</li>
                    <li>• Improve IVR navigation accuracy</li>
                    <li>• Develop new features</li>
                    <li>• Optimize system performance</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3">Compliance & Security</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li>• Maintain audit trails</li>
                    <li>• Ensure TCPA compliance</li>
                    <li>• Prevent fraud and abuse</li>
                    <li>• Monitor system security</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Data Protection */}
          <section>
            <div className="flex items-center mb-6">
              <Lock className="h-8 w-8 text-red-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Data Protection & Security</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-red-700 mb-4">Technical Safeguards</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">🔒</span>
                    <span className="text-sm">End-to-end encryption for all data transmission</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">🔒</span>
                    <span className="text-sm">AES-256 encryption for data at rest</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">🔒</span>
                    <span className="text-sm">Multi-factor authentication required</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">🔒</span>
                    <span className="text-sm">Regular security audits and penetration testing</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-red-700 mb-4">Operational Safeguards</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">👥</span>
                    <span className="text-sm">Role-based access controls</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">📝</span>
                    <span className="text-sm">Comprehensive activity logging</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">🗑️</span>
                    <span className="text-sm">Automatic data purging policies</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">🏢</span>
                    <span className="text-sm">SOC 2 Type II compliance</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <div className="flex items-center mb-6">
              <Users className="h-8 w-8 text-orange-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Data Sharing & Third Parties</h2>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <Shield className="h-6 w-6 text-amber-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">No Sale of Personal Data</h3>
                  <p className="text-amber-700">
                    We do not sell, rent, or trade personal information or business data to third parties for marketing purposes.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Limited Data Sharing</h3>
              <p className="text-gray-700 mb-4">We may share data only in these specific circumstances:</p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>• <strong>Service Providers:</strong> Trusted partners who help operate our platform (cloud hosting, payment processing)</li>
                <li>• <strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights</li>
                <li>• <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
                <li>• <strong>Consent:</strong> When you explicitly authorize us to share specific information</li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center mb-6">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Your Rights & Choices</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Data Access & Control</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span className="text-sm">Access your personal data and account information</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span className="text-sm">Correct inaccurate or incomplete data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span className="text-sm">Delete your account and associated data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span className="text-sm">Export your data in machine-readable format</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Communication Preferences</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span className="text-sm">Opt out of marketing communications</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span className="text-sm">Control notification settings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span className="text-sm">Manage cookie preferences</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span className="text-sm">Request limitation of processing</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Account Data</h3>
                <p className="text-gray-600 text-sm">Retained while your account is active, plus 30 days after closure</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Call Records</h3>
                <p className="text-gray-600 text-sm">Stored for 12 months for compliance and quality purposes</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Analytics Data</h3>
                <p className="text-gray-600 text-sm">Aggregated, anonymized data retained for 24 months</p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-gray-50 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions About Privacy?</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this privacy policy or how we handle your information, please contact us:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> privacy@ivr-automation.com<br />
                  <strong>Phone:</strong> +1 (555) 487-4357<br />
                  <strong>Mail:</strong> Privacy Officer, 1234 Tech Drive, Suite 100, Innovation City, CA 94105
                </p>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Response Time:</strong> We respond to privacy inquiries within 30 days</p>
                <p><strong>Data Protection Officer:</strong> Available for EU/GDPR related questions</p>
              </div>
            </div>
          </section>

          {/* Updates */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-3">Policy Updates</h2>
            <p className="text-blue-800">
              We may update this privacy policy periodically to reflect changes in our practices or applicable law. 
              We will notify you of significant changes via email or through our platform. The &quot;Last updated&quot; date 
              at the top indicates when the policy was most recently revised.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}