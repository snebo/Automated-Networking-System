const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleScripts() {
  console.log('Creating sample scripts...');
  
  try {
    // Create Appointment Booking Script
    const appointmentScript = await prisma.script.create({
      data: {
        name: 'Appointment Booking Script',
        description: 'Script for booking medical appointments',
        goal: 'I need to schedule an appointment with a specialist',
        context: 'Healthcare appointment booking',
        phases: [
          { step: 1, action: 'greet', text: 'Hello, I would like to schedule an appointment' },
          { step: 2, action: 'request', text: 'What specialties do you have available?' },
          { step: 3, action: 'booking', text: 'I need to see a cardiologist' }
        ],
        adaptationRules: [
          { trigger: 'ivr_detected', action: 'navigate_menu' },
          { trigger: 'wait_time', action: 'ask_for_callback' }
        ]
      }
    });

    // Create Service Inquiry Script
    const serviceScript = await prisma.script.create({
      data: {
        name: 'Service Inquiry Script',
        description: 'General service inquiry script',
        goal: 'I need information about your services',
        context: 'Business service inquiry',
        phases: [
          { step: 1, action: 'greet', text: 'Hi, I am looking for information about your services' },
          { step: 2, action: 'inquiry', text: 'What services do you provide?' },
          { step: 3, action: 'pricing', text: 'What are your rates?' }
        ],
        adaptationRules: [
          { trigger: 'ivr_detected', action: 'navigate_menu' },
          { trigger: 'busy_signal', action: 'retry_later' }
        ]
      }
    });

    // Create Tech Support Script
    const techSupportScript = await prisma.script.create({
      data: {
        name: 'Tech Support Script',
        description: 'Technical support inquiry script',
        goal: 'I need technical support for an issue',
        context: 'Technical support inquiry',
        phases: [
          { step: 1, action: 'greet', text: 'Hello, I need technical support' },
          { step: 2, action: 'describe_issue', text: 'I am having trouble with my service' },
          { step: 3, action: 'request_help', text: 'Can someone help me troubleshoot?' }
        ],
        adaptationRules: [
          { trigger: 'ivr_detected', action: 'navigate_menu' },
          { trigger: 'transfer_needed', action: 'request_specialist' }
        ]
      }
    });

    console.log('✅ Sample scripts created successfully:');
    console.log(`- Appointment Script ID: ${appointmentScript.id}`);
    console.log(`- Service Script ID: ${serviceScript.id}`);
    console.log(`- Tech Support Script ID: ${techSupportScript.id}`);

    return {
      appointmentScript,
      serviceScript,
      techSupportScript
    };

  } catch (error) {
    console.error('❌ Error creating sample scripts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createSampleScripts()
    .then(() => {
      console.log('🎉 Sample scripts creation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create sample scripts:', error);
      process.exit(1);
    });
}

module.exports = { createSampleScripts };