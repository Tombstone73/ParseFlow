// Test script to verify AI parsing functionality
// Run with: node test-ai-parsing.js

const testEmail = {
  id: 'test-123',
  subject: 'Order Confirmation - Business Cards',
  from: 'John Smith <john@example.com>',
  to: 'orders@printshop.com',
  body: `Hi there,

I'd like to place an order for business cards:

- 1000 business cards
- Full color, both sides
- Premium cardstock
- Size: 3.5" x 2"
- Rush delivery needed by Friday

My contact info:
John Smith
ABC Company
123 Main St
Anytown, ST 12345
Phone: (555) 123-4567

Total quoted: $150

Please confirm receipt and processing time.

Thanks!
John`,
  date: new Date().toISOString(),
  status: 'processed',
  classification: 'inbox',
  parsed: {
    type: 'order',
    confidence: 0.8
  },
  attachments: []
}

const testSettings = {
  useAiProcessing: true,
  aiProvider: 'google',
  googleApiKey: 'test-key',
  storagePath: './test-attachments'
}

console.log('Test Email for AI Parsing:')
console.log('Subject:', testEmail.subject)
console.log('From:', testEmail.from)
console.log('Body preview:', testEmail.body.substring(0, 200) + '...')
console.log('\nExpected parsed data should include:')
console.log('- Customer: John Smith')
console.log('- Email: john@example.com')
console.log('- Phone: (555) 123-4567')
console.log('- Items: 1000 business cards, full color, premium cardstock')
console.log('- Total: $150')
console.log('- Rush order: true')
console.log('- Address: 123 Main St, Anytown, ST 12345')

console.log('\nTo test the AI parsing:')
console.log('1. Configure AI settings in the Settings tab')
console.log('2. Go to Orders tab')
console.log('3. Select emails and click "Force Parse"')
console.log('4. Check the parsed data in email details')