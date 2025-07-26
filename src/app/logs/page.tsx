import { AppShell } from "@/components/app-shell";
import { LogView } from "@/components/log-view";

export default function LogsPage({ isParsing, setIsParsing }: { isParsing?: boolean, setIsParsing?: (isParsing: boolean) => void }) {
    return (
        <AppShell>
            <LogView />
        </AppShell>
    );
}
