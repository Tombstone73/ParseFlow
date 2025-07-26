# **App Name**: ParseFlow

## Core Features:

- Email Connection & Display: Connect to an email server using IMAP and display a list of emails in a clean, filterable interface.
- Order Quote Detection: Use a local AI tool to scan incoming emails and their attachments to detect potential order quotes, estimates, or other important business opportunities.
- Data Extraction: Extract relevant data from email bodies and attachments (PDFs, images) for easy review and saving.
- Cloud Archival: Optionally upload and archive email data, along with attachments to Google Drive. Data will be structured under a well-defined directory structure for traceability
- Whitelist/Blacklist Filtering: Implement a whitelist/blacklist system to filter out unwanted emails and highlight important contacts.
- Customer Matching UI: Simple UI to create manual associations between an incoming email and existing data from a Customer source
- System Logging: Log system, fully viewable within the UI, with the ability to export raw event files

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to inspire confidence, as in corporate email, plus add a modern touch. A dark mode will make for long periods of on-screen work.
- Background color: Very dark blue-gray (#222930), nearly black, as part of a dark color scheme.
- Accent color: Yellow-orange (#FFA000) for highlights and important UI elements; provides visual pop without being distracting.
- Headline font: 'Space Grotesk' (sans-serif) for a techy, scientific feel. Body font: 'Inter' (sans-serif) for clean readability.
- Use clean, simple vector icons from a set like Remix Icon. These are used to represent mail actions (archive, delete, etc), types of attachments, and filtering actions.
- The email list view should be clean and organized, similar to modern email clients such as Superhuman or Hey. The email details should slide out from the side to show a clear, focused view.
- Use subtle, smooth animations to transition between different views, such as sliding in the email details panel or highlighting new emails.