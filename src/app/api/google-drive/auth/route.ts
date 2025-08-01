import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { loadSettingsFromFile } from '@/lib/server-storage'

// Scopes needed for Google Drive
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly'
]

export async function GET() {
  try {
    // Load settings to get Google OAuth credentials
    const settings = await loadSettingsFromFile()

    if (!settings || !settings.googleClientId || !settings.googleClientSecret) {
      return NextResponse.json(
        {
          error: 'Google OAuth credentials not configured. Please configure your Google Client ID and Client Secret in the settings.'
        },
        { status: 400 }
      )
    }

    // Create OAuth2 client with settings from database
    const oauth2Client = new google.auth.OAuth2(
      settings.googleClientId,
      settings.googleClientSecret,
      settings.googleRedirectUri || 'http://localhost:3000/api/google-drive/callback'
    )

    // Generate the authentication URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    })

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Google Drive auth error:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    )
  }
}