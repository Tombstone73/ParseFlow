# Email File Management Implementation

## Overview
This implementation provides comprehensive email file management with automatic parsing when emails are moved to orders/estimates, special handling for WeTransfer emails, and structured file storage.

## Key Features Implemented

### 1. Folder Structure: `CustomerName_YYYY-MM-DD_OrderNumber`
- **Location**: Configurable via settings.storagePath (default: `./data/email_files`)
- **Naming**: Automatically extracts customer name from email sender
- **Order Number**: Uses parsed order/estimate number, or "ORDER_VAR" placeholder
- **Date Format**: YYYY-MM-DD from email date

### 2. File Types Generated
- **HTML File**: `email_content.html` - Formatted email display with styling
- **JSON File**: `email_metadata.json` - Structured email data including headers
- **Parsed JSON**: `parsed_order_data.json` or `parsed_estimate_data.json` - AI-parsed structured data
- **Attachments**: Saved in `attachments/` subfolder with original filenames

### 3. Automatic Parsing Triggers
- **Manual Parsing**: Via `/api/emails/parse` endpoint
- **Auto-Parsing**: Triggered when emails are moved to orders/estimates
- **WeTransfer Auto-Detection**: All emails from wetransfer.com automatically treated as orders

### 4. WeTransfer Special Handling
- **Auto-Detection**: Checks sender domain for wetransfer.com, we.tl, or "wetransfer" in sender name
- **Classification**: Automatically classified as "order" with 95% confidence
- **File Download**: All WeTransfer attachments downloaded and saved

## Implementation Files

### Core Services
1. **`email-file-service.ts`** - Main file management service
   - `saveEmailWithFiles()` - Creates folder structure and saves all files
   - `refetchEmailWithAttachments()` - Re-fetches email with full attachments from IMAP
   - `isWeTransferEmail()` - Detects WeTransfer emails
   - `saveParsedDataJson()` - Saves AI-parsed data

2. **`ai-parsing-service.ts`** - Enhanced with file management
   - Updated `parseEmailWithAI()` to include file saving
   - Automatic WeTransfer detection and handling
   - Integration with email file service

3. **`classification-service.ts`** - Enhanced WeTransfer detection
   - Automatic classification of WeTransfer emails as orders

### API Endpoints
1. **`/api/emails/parse`** - Enhanced manual parsing with file saving
2. **`/api/emails/auto-parse`** - New endpoint for automatic parsing triggers
3. **`/api/emails/files`** - New endpoint for file access and downloads
4. **`/api/emails` (PATCH)** - Enhanced to trigger auto-parsing on email moves

### UI Components
1. **`email-list.tsx`** - Enhanced with file viewing capabilities
   - Live vs Saved view modes
   - File download buttons
   - HTML email viewer in new tab
   - Attachment download links

## File Structure Example

```
./data/email_files/
├── John_Doe_2024-01-15_ORD-123/
│   ├── email_content.html
│   ├── email_metadata.json
│   ├── parsed_order_data.json
│   └── attachments/
│       ├── invoice.pdf
│       └── specifications.docx
└── WeTransfer_User_2024-01-16_ORDER_VAR/
    ├── email_content.html
    ├── email_metadata.json
    ├── parsed_order_data.json
    └── attachments/
        └── design_files.zip
```

## API Usage Examples

### 1. Manual Parsing with File Saving
```javascript
POST /api/emails/parse
{
  "emailIds": ["email-123"],
  "type": "order"
}
```

### 2. Access Saved Email Files
```javascript
// Get HTML version
GET /api/emails/files?emailId=email-123&type=html

// Get JSON metadata
GET /api/emails/files?emailId=email-123&type=json

// Get parsed data
GET /api/emails/files?emailId=email-123&type=parsed

// Download attachment
GET /api/emails/files?emailId=email-123&type=attachment&filename=invoice.pdf

// List all files
GET /api/emails/files?emailId=email-123&type=list
```

### 3. Automatic Parsing Trigger
```javascript
POST /api/emails/auto-parse
{
  "emailId": "email-123",
  "type": "order"
}
```

## Configuration

### Settings Required
- `storagePath`: Base directory for email files
- `maxAttachmentSize`: Maximum attachment size in MB
- `useAiProcessing`: Enable AI parsing
- `aiProvider`: AI service provider (google/ollama)

### IMAP Re-fetching
The system can re-fetch emails from the IMAP server to get full attachments if they weren't initially downloaded. This handles cases where:
- Email was initially processed without attachments
- Attachments were truncated due to size limits
- Full email content is needed for parsing

## Error Handling
- Graceful fallback if file saving fails
- Continues parsing even if file operations fail
- Logs all file operations for debugging
- Handles missing directories by creating them automatically

## Security Considerations
- File names are sanitized to prevent directory traversal
- Attachment size limits enforced
- Content type detection for safe file serving
- Path validation for file access endpoints

## Performance Notes
- File operations are asynchronous and non-blocking
- Large attachments are streamed rather than loaded into memory
- Background processing for auto-parsing to avoid UI blocking
- Efficient folder structure for easy file location

## Future Enhancements
- File compression for large email archives
- Automatic cleanup of old email files
- Integration with cloud storage services
- Email thread linking and organization
- Advanced search capabilities across saved files