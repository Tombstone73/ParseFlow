# ParseFlow - Complete Development Specification

## 1. Application Overview

**ParseFlow** is an intelligent email parsing and processing application built with Next.js that automatically processes incoming emails, extracts structured data using AI, and organizes them by type (orders, estimates, etc.).

### Core Purpose
- Automate email processing workflows for business communications
- Extract structured data from unstructured email content using AI
- Organize emails through intelligent classification and rule-based filtering
- Provide attachment handling and file organization capabilities

## 2. Current Functionality Analysis

### 2.1 Existing Features

#### Email Processing System
- **IMAP Integration**: Connects to email servers using ImapFlow library
- **Email Fetching**: Retrieves emails with configurable date ranges and polling intervals
- **Attachment Handling**: Downloads and processes email attachments up to configurable size limits
- **Real-time Processing**: Background email processing with status monitoring

#### AI-Powered Classification & Parsing
- **Google Gemini AI Integration**: Uses Google's Gemini API for intelligent email analysis
- **Ollama Support**: Alternative local AI processing option
- **Keyword-based Classification**: Fallback classification using configurable keywords
- **Structured Data Extraction**: Converts unstructured email content to JSON schemas
- **WeTransfer Detection**: Special handling for WeTransfer emails as orders

#### Email Management System
- **Whitelist/Blacklist Rules**: Pattern-based email filtering system
- **Email Classification**: Categorizes emails as inbox, whitelist, blacklist, or pending
- **Multi-select Operations**: Bulk actions for email management
- **Archive Functionality**: Move emails to archive status

#### User Interface
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui components
- **Sidebar Navigation**: Collapsible sidebar with main navigation sections
- **Real-time Status**: Live status indicators and progress monitoring
- **Console Integration**: Built-in console for real-time log viewing
- **Theme Support**: Dark/light theme toggle

#### File Management
- **Local Storage**: Organized file storage with customer-based folder structure
- **Google Drive Integration**: Optional cloud storage with OAuth2 authentication
- **Email File Export**: Saves emails as HTML, JSON, and attachments in organized folders

### 2.2 Current UI Layout & Navigation

#### Main Navigation Structure
```
Mail Section:
├── All Emails (unsorted emails)
├── Inbox (whitelisted emails)
├── Orders (AI-classified order emails)
├── Estimates (AI-classified estimate emails)
└── Logs (processing logs)

System Section:
├── Settings (configuration)
└── AI Test (testing interface)
```

#### Page Layouts
- **Email List Pages**: Unified email list component with filtering by type/classification
- **Settings Page**: Tabbed interface with 5 sections (Connection, Rules, Attachments, AI & Parsing, Cleanup)
- **Console Panel**: Resizable bottom panel for real-time log monitoring

### 2.3 What's Working Well
- ✅ IMAP email fetching and parsing
- ✅ AI-powered email classification and data extraction
- ✅ Whitelist/blacklist rule management
- ✅ File organization and storage
- ✅ Real-time status monitoring
- ✅ Responsive UI with modern design
- ✅ Google Drive integration
- ✅ Bulk email operations

### 2.4 Areas Needing Improvement
- ❌ **Attachment Download Reliability**: Timeout issues with large attachments
- ❌ **Email Provider Limitations**: IMAP-only support limits provider options
- ❌ **Performance**: Large email volumes can cause processing delays
- ❌ **Error Handling**: Some edge cases in email parsing not fully handled
- ❌ **Testing Coverage**: Limited automated testing
- ❌ **Documentation**: Incomplete API documentation

## 3. Complete Feature Requirements

### 3.1 Email Fetching and Processing Workflows

#### Primary Email Processing Flow
1. **Connection Establishment**
   - IMAP server connection with SSL/TLS support
   - Authentication using username/password or OAuth
   - Connection health monitoring and auto-reconnection

2. **Email Retrieval**
   - Configurable date range filtering
   - Incremental fetching to avoid duplicates
   - Attachment size filtering
   - Progress tracking and status updates

3. **Email Classification Pipeline**
   - Whitelist/blacklist rule evaluation
   - Keyword-based pre-classification
   - AI-powered classification (Google Gemini/Ollama)
   - Confidence scoring and manual review flagging

4. **Data Extraction Process**
   - Structured data extraction using configurable schemas
   - Order/estimate specific parsing templates
   - Attachment content analysis
   - Data validation and quality scoring

5. **File Organization**
   - Customer-based folder structure creation
   - Email content export (HTML/JSON)
   - Attachment organization and naming
   - Optional Google Drive synchronization

#### Alternative Email Processing (Recommended Enhancement)
- **Microsoft Graph API Integration**: For Outlook/Office 365 users
- **Gmail API Integration**: For Gmail users
- **Multi-provider Support**: Unified interface for different email providers

### 3.2 Whitelist/Blacklist Management System

#### Rule Management Interface
- **Unified Management Panel**: Single interface for both whitelist and blacklist rules
- **Pattern Types**: Email address, domain, subject line, sender name patterns
- **Rule Priority System**: Ordered rule evaluation with override capabilities
- **Bulk Rule Operations**: Import/export, bulk enable/disable
- **Rule Testing**: Preview functionality to test rules against existing emails

#### Email Address Management
- **Drag-and-Drop Interface**: Move addresses between whitelist/blacklist
- **Real-time Panel Updates**: Immediate UI updates when addresses are moved
- **Duplicate Prevention**: Ensure addresses appear in only one list
- **Sender Information Display**: Show name, email, subject with hover tooltips
- **Automatic Inbox Management**: Remove emails from inbox when blacklisted

### 3.3 AI-Powered Email Parsing and Data Extraction

#### AI Service Integration
- **Google Gemini API**: Primary AI service for email analysis
- **Ollama Integration**: Local AI processing option
- **Configurable Prompts**: Customizable parsing instructions
- **Schema Validation**: Ensure extracted data matches expected formats

#### Data Extraction Capabilities
- **Order Processing**: Extract order numbers, customer info, line items, totals
- **Estimate Handling**: Parse quote requests, specifications, pricing
- **Custom Schema Support**: User-defined extraction templates
- **Confidence Scoring**: AI confidence levels for manual review flagging
- **Fallback Processing**: Keyword-based extraction when AI fails

#### Classification System
- **Multi-tier Classification**: Keyword → AI → Manual review workflow
- **Configurable Keywords**: User-defined order/estimate indicators
- **Learning Capabilities**: Improve classification based on user feedback
- **Special Case Handling**: WeTransfer, automated systems, etc.

### 3.4 Attachment Handling and File Organization

#### Attachment Processing
- **Size Filtering**: Configurable maximum attachment sizes
- **Type Filtering**: Whitelist/blacklist specific file types
- **Virus Scanning**: Optional malware detection
- **Duplicate Detection**: Prevent duplicate attachment storage

#### File Organization Structure
```
Storage Root/
├── Customer_Name_YYYY-MM-DD_ORDER_VAR/
│   ├── email_content.html
│   ├── email_metadata.json
│   ├── parsed_order_data.json
│   └── attachments/
│       ├── attachment1.pdf
│       └── attachment2.jpg
```

#### Cloud Storage Integration
- **Google Drive Sync**: Automatic upload to configured Drive folders
- **Folder Structure Replication**: Maintain organization in cloud storage
- **OAuth2 Authentication**: Secure Google Drive access
- **Sync Status Tracking**: Monitor upload progress and failures

### 3.5 User Interface Components and Interactions

#### Email List Component
- **Multi-select Functionality**: Checkbox selection for bulk operations
- **Sorting and Filtering**: Date, sender, subject, classification sorting
- **Pagination**: Handle large email volumes efficiently
- **Preview Panel**: Quick email content preview
- **Status Indicators**: Visual indicators for processing status, AI confidence

#### Email Management Actions
- **Bulk Operations**: Move to whitelist/blacklist, archive, delete, force parse
- **Individual Actions**: Quick classify, view details, download attachments
- **Drag-and-Drop**: Move emails between classifications
- **Context Menus**: Right-click actions for quick operations

#### Settings Interface
- **Tabbed Configuration**: Organized settings across multiple tabs
- **Form Validation**: Real-time validation with helpful error messages
- **Connection Testing**: Test IMAP/AI connections before saving
- **Import/Export**: Backup and restore configuration settings

### 3.6 Settings and Configuration Options

#### Connection Settings
- **IMAP Configuration**: Server, port, SSL, authentication
- **Email Filters**: Date ranges, sender filters, subject filters
- **Polling Settings**: Automatic email checking intervals
- **Connection Limits**: Concurrent connection management

#### AI Configuration
- **Provider Selection**: Google Gemini vs Ollama
- **API Keys Management**: Secure storage of API credentials
- **Parsing Schemas**: JSON templates for data extraction
- **Classification Rules**: Keyword lists and AI instructions

#### Storage Configuration
- **Local Storage**: File system paths and organization
- **Google Drive**: OAuth setup and folder configuration
- **Retention Policies**: Automatic cleanup and archiving rules
- **Backup Settings**: Data backup and recovery options

### 3.7 Archive and Deletion Functionality

#### Archive System
- **Soft Delete**: Move emails to archive status without permanent deletion
- **Archive Views**: Separate interface for viewing archived emails
- **Restore Functionality**: Unarchive emails back to active status
- **Bulk Archive Operations**: Archive multiple emails simultaneously

#### Cleanup Automation
- **Retention Policies**: Automatic deletion of old emails/files
- **Storage Quotas**: Automatic cleanup when storage limits reached
- **Scheduled Cleanup**: Configurable cleanup schedules
- **Manual Cleanup Tools**: On-demand cleanup operations

## 4. Technical Specifications

### 4.1 Technology Stack

#### Frontend Framework
- **Next.js 15.3.3**: React-based full-stack framework
- **React 18.3.1**: Component library with hooks
- **TypeScript 5.x**: Type-safe JavaScript development

#### UI Framework
- **Tailwind CSS 3.4.1**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library based on Radix UI
- **Radix UI**: Headless UI components for accessibility
- **Lucide React**: Icon library

#### Backend Services
- **Node.js**: Server-side JavaScript runtime
- **Next.js API Routes**: Serverless API endpoints
- **ImapFlow 1.0.158**: IMAP client library
- **Mailparser 3.7.1**: Email parsing library

#### AI Integration
- **Google Genkit 1.14.1**: AI development framework
- **Google AI**: Gemini API integration
- **Ollama**: Local AI model support

#### Data Storage
- **File System**: JSON-based data persistence
- **In-memory Cache**: Runtime data storage
- **Google Drive API**: Cloud storage integration

#### Authentication & Security
- **OAuth2**: Google Drive authentication
- **Environment Variables**: Secure credential storage
- **Input Validation**: Zod schema validation

### 4.2 API Integrations

#### Email Providers
- **IMAP Protocol**: Universal email server access
- **Gmail API** (Recommended): Direct Gmail integration
- **Microsoft Graph API** (Recommended): Outlook/Office 365 integration

#### AI Services
- **Google Gemini API**: Primary AI processing service
- **Ollama**: Local AI model hosting
- **Custom AI Endpoints**: Extensible AI provider system

#### Cloud Storage
- **Google Drive API v3**: File storage and synchronization
- **OAuth2 Flow**: Secure authentication and authorization

### 4.3 File Structure and Data Storage

#### Project Structure
```
ParseFlow/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API route handlers
│   │   ├── emails/            # Email management pages
│   │   ├── orders/            # Orders page
│   │   ├── estimates/         # Estimates page
│   │   └── settings/          # Settings page
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   └── emails/           # Email-specific components
│   ├── lib/                  # Utility libraries
│   │   ├── types.ts          # TypeScript type definitions
│   │   ├── data-store.ts     # Data management layer
│   │   └── server-storage.ts # File system operations
│   └── services/             # Business logic services
│       ├── email-service.ts  # Email processing
│       ├── ai-parsing-service.ts # AI integration
│       └── classification-service.ts # Email classification
├── data/                     # Data storage directory
│   ├── settings.json         # Application settings
│   ├── rules.json           # Whitelist/blacklist rules
│   ├── emails.json          # Email metadata
│   └── email_files/         # Organized email files
└── public/                  # Static assets
```

#### Data Models
```typescript
interface Email {
  id: string
  subject: string
  from: string
  to: string
  date: string
  body: string
  attachments?: Attachment[]
  parsed?: ParsedData
  status: 'unprocessed' | 'processing' | 'processed' | 'error'
  classification?: 'inbox' | 'whitelist' | 'blacklist' | 'pending'
  senderEmail?: string
}

interface Rule {
  id: string
  type: 'whitelist' | 'blacklist'
  pattern: string
  description?: string
  active: boolean
}

interface Settings {
  imapServer: string
  port: number
  useSSL: boolean
  username: string
  password: string
  pollingInterval: number
  maxAttachmentSize: number
  useGoogleDrive: boolean
  storagePath: string
  aiProvider: 'google' | 'ollama'
  googleApiKey?: string
  // ... additional configuration options
}
```

### 4.4 Authentication and Security

#### Security Measures
- **Environment Variables**: Secure storage of API keys and credentials
- **Input Validation**: Zod schema validation for all user inputs
- **HTTPS Enforcement**: Secure communication protocols
- **OAuth2 Implementation**: Secure third-party service authentication

#### Data Protection
- **Credential Encryption**: Secure storage of email passwords
- **API Key Management**: Secure handling of AI service keys
- **File System Security**: Proper file permissions and access controls
- **Error Handling**: Prevent sensitive information leakage in error messages

## 5. UI/UX Design Requirements

### 5.1 Complete Layout Specification

#### Application Shell
- **Collapsible Sidebar**: Icon-only and expanded modes
- **Header Bar**: Page title, status indicators, action buttons
- **Main Content Area**: Full-width responsive content
- **Console Panel**: Resizable bottom panel for logs
- **Maximize Mode**: Full-screen content view

#### Email List Interface
- **Table Layout**: Sortable columns for email metadata
- **Selection Controls**: Individual and bulk selection checkboxes
- **Action Toolbar**: Context-sensitive action buttons
- **Status Indicators**: Visual indicators for processing status
- **Preview Panel**: Side panel for email content preview

#### Settings Interface
- **Tabbed Layout**: 5 main configuration sections
- **Form Validation**: Real-time validation with error messages
- **Connection Testing**: Live connection status indicators
- **Save Confirmation**: Clear feedback on settings changes

### 5.2 Navigation Structure and User Flow

#### Primary Navigation Flow
1. **Email Processing**: All Emails → Classification → Orders/Estimates
2. **Rule Management**: Settings → Rules → Email Testing
3. **AI Configuration**: Settings → AI & Parsing → Testing
4. **File Management**: Orders/Estimates → File Downloads → Storage

#### User Interaction Patterns
- **Progressive Disclosure**: Show advanced options on demand
- **Contextual Actions**: Actions appear based on selection state
- **Keyboard Shortcuts**: Power user keyboard navigation
- **Undo/Redo**: Reversible actions where appropriate

### 5.3 Responsive Design Requirements

#### Breakpoint Strategy
- **Mobile (< 768px)**: Single column layout, collapsed sidebar
- **Tablet (768px - 1024px)**: Adaptive two-column layout
- **Desktop (> 1024px)**: Full multi-panel layout

#### Mobile Optimizations
- **Touch-friendly Controls**: Larger tap targets for mobile
- **Swipe Gestures**: Swipe actions for email management
- **Responsive Tables**: Horizontal scrolling for data tables
- **Collapsible Panels**: Accordion-style content organization

### 5.4 Interactive Elements

#### Button System
- **Primary Actions**: Prominent styling for main actions
- **Secondary Actions**: Subtle styling for supporting actions
- **Destructive Actions**: Warning styling for delete/archive
- **Loading States**: Spinner indicators during processing

#### Form Controls
- **Input Validation**: Real-time validation with helpful messages
- **Auto-complete**: Smart suggestions for common inputs
- **File Uploads**: Drag-and-drop file upload areas
- **Toggle Controls**: Clear on/off states for boolean options

#### Data Visualization
- **Progress Indicators**: Processing progress bars
- **Status Badges**: Color-coded status indicators
- **Charts**: Email volume and processing statistics
- **Tooltips**: Contextual help and information

### 5.5 Status Indicators and Notifications

#### Status System
- **Connection Status**: Live IMAP/AI service connection indicators
- **Processing Status**: Real-time email processing progress
- **Error States**: Clear error messages with resolution steps
- **Success Confirmations**: Positive feedback for completed actions

#### Notification System
- **Toast Notifications**: Non-intrusive success/error messages
- **Console Logging**: Detailed technical logs for debugging
- **Progress Tracking**: Visual progress indicators for long operations
- **Alert Dialogs**: Important confirmations and warnings

## 6. Development Roadmap

### 6.1 Priority Order for Implementation

#### Phase 1: Core Stability (Immediate - 2 weeks)
1. **Fix Attachment Download Issues**: Resolve timeout and reliability problems
2. **Improve Error Handling**: Better error recovery and user feedback
3. **Performance Optimization**: Optimize email processing for large volumes
4. **Testing Infrastructure**: Set up automated testing framework

#### Phase 2: Enhanced Email Integration (4 weeks)
1. **Gmail API Integration**: Implement Gmail API as alternative to IMAP
2. **Microsoft Graph API**: Add Outlook/Office 365 support
3. **Multi-provider Architecture**: Unified interface for different email providers
4. **Provider Selection UI**: User interface for choosing email providers

#### Phase 3: Advanced Features (6 weeks)
1. **Enhanced AI Processing**: Improve parsing accuracy and confidence scoring
2. **Custom Schema Editor**: Visual editor for parsing templates
3. **Advanced Rule Management**: Complex rule conditions and priorities
4. **Bulk Operations Enhancement**: More sophisticated bulk actions

#### Phase 4: Enterprise Features (8 weeks)
1. **User Management**: Multi-user support with role-based access
2. **API Documentation**: Complete REST API documentation
3. **Webhook Integration**: External system integration capabilities
4. **Advanced Analytics**: Detailed processing statistics and reporting

### 6.2 Dependencies Between Components

#### Critical Path Dependencies
1. **Email Provider → Classification → AI Processing → File Storage**
2. **Settings Management → All Other Components**
3. **Authentication → Cloud Storage Integration**
4. **UI Components → All User-Facing Features**

#### Parallel Development Opportunities
- **AI Service Integration** can be developed alongside **Email Provider Integration**
- **File Storage** can be enhanced while **UI Components** are being refined
- **Testing Infrastructure** can be built in parallel with **Feature Development**

### 6.3 Testing Requirements

#### Unit Testing
- **Service Layer Testing**: Test all business logic services
- **Component Testing**: Test React components in isolation
- **API Route Testing**: Test all API endpoints
- **Utility Function Testing**: Test helper functions and utilities

#### Integration Testing
- **Email Processing Pipeline**: End-to-end email processing tests
- **AI Integration**: Test AI service integrations with mock data
- **File Storage**: Test file operations and cloud storage sync
- **Authentication Flow**: Test OAuth and credential management

#### End-to-End Testing
- **User Workflows**: Test complete user journeys
- **Cross-browser Testing**: Ensure compatibility across browsers
- **Mobile Testing**: Test responsive design and mobile interactions
- **Performance Testing**: Load testing with large email volumes

### 6.4 Deployment Considerations

#### Development Environment
- **Local Development**: Docker-based development environment
- **Environment Variables**: Secure local configuration management
- **Hot Reload**: Fast development iteration cycles
- **Debug Tools**: Comprehensive debugging and logging

#### Production Deployment
- **Firebase App Hosting**: Configured for Firebase deployment
- **Environment Configuration**: Production environment variables
- **SSL/TLS**: Secure HTTPS communication
- **Monitoring**: Application performance monitoring
- **Backup Strategy**: Data backup and recovery procedures

#### Scalability Considerations
- **Horizontal Scaling**: Support for multiple application instances
- **Database Migration**: Plan for moving from file-based to database storage
- **Caching Strategy**: Implement caching for improved performance
- **Load Balancing**: Distribute traffic across multiple instances

---

## Conclusion

This specification provides a comprehensive blueprint for continuing development of the ParseFlow application. The current implementation provides a solid foundation with working email processing, AI integration, and file management capabilities. The primary focus should be on improving reliability (especially attachment handling) and expanding email provider support to reduce dependency on IMAP protocols.

The modular architecture allows for incremental improvements while maintaining system stability. Priority should be given to Phase 1 items to ensure core functionality is robust before adding new features.

For questions or clarifications on any aspect of this specification, refer to the existing codebase structure and implementation patterns established in the current version.
