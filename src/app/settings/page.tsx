"use client"

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { SettingsForm } from '@/components/settings-form'

export default function SettingsPage() {
  const [isParsing, setIsParsing] = useState(false)

  return (
    <AppShell isParsing={isParsing}>
      <SettingsForm isParsing={isParsing} setIsParsing={setIsParsing} />
    </AppShell>
  )
}