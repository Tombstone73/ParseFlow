import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { saveSettingsToFile, loadSettingsFromFile } from '@/lib/server-storage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(new URL('/settings?error=oauth_denied', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/settings?error=no_code', request.url))
    }

    // Load settings to get Google OAuth credentials
    const settings = await loadSettingsFromFile()

    if (!settings || !settings.googleClientId || !settings.googleClientSecret) {
      return NextResponse.redirect(new URL('/settings?error=oauth_not_configured', request.url))
    }

    // Create OAuth2 client with settings from database
    const oauth2Client = new google.auth.OAuth2(
      settings.googleClientId,
      settings.googleClientSecret,
      settings.googleRedirectUri || 'http://localhost:3000/api/google-drive/callback'
    )

    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Test the connection by getting user info
    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    const userInfo = await drive.about.get({ fields: 'user' })

    console.log('Google Drive authentication successful for user:', userInfo.data.user?.emailAddress)

    // Save the tokens to settings
    const currentSettings = await loadSettingsFromFile()
    if (currentSettings) {
      const updatedSettings = {
        ...currentSettings,
        googleDriveTokens: tokens,
        googleDriveConnected: true,
        googleDriveUserEmail: userInfo.data.user?.emailAddress
      }
      await saveSettingsToFile(updatedSettings)
    }

    // Redirect back to settings with success message
    return NextResponse.redirect(new URL('/settings?success=google_drive_connected', request.url))
  } catch (error) {
    console.error('Google Drive callback error:', error)
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', request.url))
  }
}