import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage({ isParsing, setIsParsing }: { isParsing: boolean, setIsParsing: (isParsing: boolean) => void }) {
    return (
        <AppShell>
            <SettingsForm isParsing={isParsing} setIsParsing={setIsParsing} />
        </AppShell>
    )
}
