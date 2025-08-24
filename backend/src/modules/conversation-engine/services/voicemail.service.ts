import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class VoicemailService {
  private readonly logger = new Logger(VoicemailService.name);
  private readonly callbackNumber = '+13462911536'; // Hardcoded for now, will make configurable later

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('ivr.voicemail_detected')
  async handleVoicemailDetected(event: {
    callSid: string;
    transcript: string;
    confidence: number;
    timestamp: Date;
  }) {
    const { callSid } = event;
    
    // Get call session info to craft appropriate message
    this.eventEmitter.emit('call.get_session', {
      callSid,
      callback: (session: any) => {
        this.leaveVoicemailMessage(callSid, session);
      }
    });
  }

  private async leaveVoicemailMessage(callSid: string, session: any) {
    const goal = session?.goal || 'speak with someone';
    const companyName = session?.companyName || 'your company';
    
    // Generate professional voicemail message
    const message = this.generateVoicemailMessage(goal, companyName);
    
    this.logger.log(`📬 Leaving voicemail message for ${callSid}`);
    this.logger.log(`Message: "${message}"`);

    // Send message via TTS
    this.eventEmitter.emit('ai.speak', {
      callSid,
      text: message,
      action: 'leave_voicemail_message'
    });

    // Wait for message to be delivered, then end call
    setTimeout(() => {
      this.eventEmitter.emit('ai.hangup', {
        callSid,
        reason: 'Voicemail message left successfully'
      });
    }, 15000); // Wait 15 seconds for message to be delivered
  }

  private generateVoicemailMessage(goal: string, companyName: string): string {
    // Extract company type for better personalization
    const isHospital = companyName.toLowerCase().includes('hospital') || 
                      companyName.toLowerCase().includes('medical') ||
                      companyName.toLowerCase().includes('clinic') ||
                      companyName.toLowerCase().includes('health');
    
    const isRestaurant = companyName.toLowerCase().includes('pizza') || 
                        companyName.toLowerCase().includes('restaurant') ||
                        companyName.toLowerCase().includes('cafe') ||
                        companyName.toLowerCase().includes('grill');

    const messages = [
      // General manager inquiry (Restaurant/Business)
      {
        keywords: ['general manager', 'manager', 'management', 'director', 'ceo'],
        message: isRestaurant 
          ? `Hi, this is Sarah from Restaurant Business Partners. We're reaching out to ${companyName} about a potential partnership opportunity that could help increase your revenue. I'd love to speak with your general manager about how we've helped similar restaurants in your area. Could you please have them call me back at ${this.callbackNumber}? Thank you so much.`
          : `Hello, this is Michael from Business Development Associates. I'm calling ${companyName} regarding a partnership opportunity that could benefit your operations. I'd appreciate the chance to speak with your general manager or someone in leadership. Please have them return my call at ${this.callbackNumber}. Thank you.`
      },
      // Medical/Hospital inquiries
      {
        keywords: ['doctor', 'physician', 'medical', 'chief', 'head doctor', 'cardiologist', 'surgeon'],
        message: `Good morning, this is Jennifer from Healthcare Coordination Services. I'm calling ${companyName} regarding an important matter about improving patient care coordination in your facility. We've been working with hospitals in your region to streamline processes and reduce administrative burden. Could you please have your medical director or chief physician return my call at ${this.callbackNumber}? It would be greatly appreciated. Thank you.`
      },
      // Customer service (framed as feedback/improvement)
      {
        keywords: ['customer service', 'support', 'help', 'assistance', 'feedback'],
        message: `Hi, this is David from Customer Experience Solutions. We're conducting a brief study with ${companyName} to help improve customer satisfaction in your industry. We have some valuable insights to share that could enhance your service quality. Please have someone from your customer service team call me back at ${this.callbackNumber}. Thank you for your time.`
      },
      // Billing/accounting (framed as cost savings)
      {
        keywords: ['billing', 'payment', 'account', 'invoice', 'finance'],
        message: `Hello, this is Lisa from Financial Solutions Group. I'm reaching out to ${companyName} about potential cost-saving opportunities we've identified for businesses like yours. We'd like to discuss how you could reduce processing fees and improve cash flow. Please have someone from your accounting department return my call at ${this.callbackNumber}. Thank you.`
      },
      // Appointments/scheduling (framed as efficiency improvement)
      {
        keywords: ['appointment', 'schedule', 'booking', 'reservation'],
        message: isHospital
          ? `Hi, this is Amanda from Medical Scheduling Solutions. We're calling ${companyName} to discuss how we can help reduce patient wait times and improve your appointment scheduling efficiency. Many facilities in your area have seen significant improvements. Could someone from your scheduling department please call me back at ${this.callbackNumber}? Thank you.`
          : `Hello, this is Tom from Reservation Management Partners. We're reaching out to ${companyName} about optimizing your booking system to increase capacity and reduce no-shows. Please have someone from your reservation team call me back at ${this.callbackNumber}. Thank you.`
      },
      // Sales/partnership opportunities
      {
        keywords: ['sales', 'purchase', 'buy', 'quote', 'new customer', 'partnership'],
        message: `Hi, this is Rachel from Strategic Partnership Solutions. We've identified ${companyName} as a potential partner for a mutually beneficial opportunity that's been very successful with similar organizations in your area. I'd love to discuss the details with your business development team. Please have someone call me back at ${this.callbackNumber}. Thank you.`
      },
      // Emergency/Urgent medical
      {
        keywords: ['emergency', 'urgent', 'er doctor', 'emergency room'],
        message: `Hello, this is Dr. Martinez's office from Regional Medical Coordination. We're calling ${companyName} regarding emergency department coordination improvements that could significantly reduce patient transfer times. This could greatly benefit your ER operations. Please have your emergency department director return our call at ${this.callbackNumber}. Thank you.`
      }
    ];

    // Find matching message template
    const goalLower = goal.toLowerCase();
    const matchedTemplate = messages.find(template => 
      template.keywords.some(keyword => goalLower.includes(keyword))
    );

    if (matchedTemplate) {
      return matchedTemplate.message;
    }

    // Default message based on business type
    if (isHospital) {
      return `Hello, this is Susan from Healthcare Business Solutions. I'm calling ${companyName} about an opportunity to improve operational efficiency and patient satisfaction. We've had great success with other healthcare facilities in your area. Please have the appropriate department head return my call at ${this.callbackNumber}. Thank you for your time.`;
    } else if (isRestaurant) {
      return `Hi, this is Mark from Restaurant Business Partners. We're reaching out to ${companyName} about ways to increase your revenue and streamline operations. We've helped many restaurants in your area achieve significant improvements. Could you please have your manager call me back at ${this.callbackNumber}? Thank you.`;
    } else {
      return `Hello, this is Alex from Business Development Solutions. I'm calling ${companyName} regarding opportunities that could benefit your organization's growth and efficiency. We've had excellent results with similar companies in your industry. Please have the appropriate person return my call at ${this.callbackNumber}. Thank you.`;
    }
  }

  // Get callback number (for future configuration)
  getCallbackNumber(): string {
    return this.callbackNumber;
  }

  // Update callback number (for future use)
  setCallbackNumber(number: string): void {
    // This will be configurable in the future
    // For now, it's hardcoded
  }
}