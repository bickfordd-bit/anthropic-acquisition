import AuthorityStream from "@/app/components/AuthorityStream";
import CanonDiff from "@/app/components/CanonDiff";
import BickfordKernel from "@/app/components/BickfordKernel";
import AutonomousEnvironmentCreator from "@/app/components/AutonomousEnvironmentCreator";
import FilingInput from "@/app/components/FilingInput";
import UnifiedChatbox from "@/app/components/UnifiedChatbox";
import BickfordConsole from "@/app/components/BickfordConsole";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Bickford Live Filing</h1>
        <p className="text-sm text-zinc-600">
          Ledger-first authority surface · OPTR-gated · Canon-promoted
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <BickfordConsole />
          <BickfordKernel />
          <AutonomousEnvironmentCreator />
          <FilingInput />
          <UnifiedChatbox />
        </div>
        <div className="space-y-6">
          <CanonDiff />
        </div>
      </section>

      <AuthorityStream />
    </main>
  );
}
