import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  List,
  open,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";

import { ProviderSetup } from "./components/ProviderSetup";
import { VaultSelection } from "./components/VaultSelection";
import { discoverObsidianVaults } from "./obsidian-vaults";
import {
  addRecentCapture,
  getProviderConfig,
  getRecentCaptures,
  getSelectedVault,
  removeSelectedVault,
  saveSelectedVault,
} from "./storage";
import { ExtensionPreferences, ObsidianVault, ProviderConfig, RecentCapture } from "./types";
import { buildVaultProfile, createNote } from "./vault";

export default function SmartCaptureCommand() {
  return <SmartCaptureApp />;
}

export function SmartCaptureApp({ startInCapture = false }: { startInCapture?: boolean }) {
  const [config, setConfig] = useState<ProviderConfig>();
  const [vaults, setVaults] = useState<ObsidianVault[]>([]);
  const [selectedVault, setSelectedVault] = useState<ObsidianVault>();
  const [recentCaptures, setRecentCaptures] = useState<RecentCapture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProviderConfig(), discoverObsidianVaults()])
      .then(async ([providerConfig, discoveredVaults]) => {
        setConfig(providerConfig);
        setVaults(discoveredVaults);
        const rememberedVault = await getSelectedVault(discoveredVaults);
        setSelectedVault(rememberedVault);
        if (rememberedVault) setRecentCaptures(await getRecentCaptures(rememberedVault.path));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Detail isLoading />;
  if (!selectedVault) {
    if (vaults.length === 0) {
      return (
        <Detail markdown="# No Obsidian vaults found\n\nOpen Obsidian once so it can register your vaults, then reload this command." />
      );
    }

    return (
      <VaultSelection
        vaults={vaults}
        onSelect={async (vault) => {
          await saveSelectedVault(vault);
          setSelectedVault(vault);
          setRecentCaptures(await getRecentCaptures(vault.path));
        }}
      />
    );
  }
  if (!config) return <ProviderSetup onSaved={setConfig} />;

  const changeVault = async () => {
    await removeSelectedVault();
    setSelectedVault(undefined);
    setRecentCaptures([]);
  };
  const captureForm = (
    <CaptureForm config={config} vault={selectedVault} onConfigChange={setConfig} onChangeVault={changeVault} />
  );

  if (startInCapture) return captureForm;

  return (
    <CaptureDashboard
      config={config}
      vault={selectedVault}
      recentCaptures={recentCaptures}
      captureForm={captureForm}
      onConfigChange={setConfig}
      onChangeVault={changeVault}
    />
  );
}

function CaptureDashboard({
  config,
  vault,
  recentCaptures,
  captureForm,
  onConfigChange,
  onChangeVault,
}: {
  config: ProviderConfig;
  vault: ObsidianVault;
  recentCaptures: RecentCapture[];
  captureForm: React.ReactNode;
  onConfigChange: (value: ProviderConfig) => void;
  onChangeVault: () => void;
}) {
  return (
    <List navigationTitle={`Smart Capture - ${vault.name}`} searchBarPlaceholder="Search recent captures...">
      <List.Section title="Capture">
        <List.Item
          icon={Icon.Plus}
          title="New Note"
          subtitle={`Capture directly into ${vault.name}`}
          actions={
            <DashboardActions
              config={config}
              captureForm={captureForm}
              onConfigChange={onConfigChange}
              onChangeVault={onChangeVault}
            />
          }
        />
      </List.Section>
      <List.Section title="Recent Captures" subtitle={`${recentCaptures.length} of 5`}>
        {recentCaptures.map((capture) => {
          const folder = path.dirname(capture.relativePath);
          return (
            <List.Item
              key={capture.absolutePath}
              icon={Icon.Document}
              title={capture.title}
              subtitle={folder === "." ? vault.name : folder}
              accessories={[{ date: new Date(capture.createdAt), tooltip: "Created" }]}
              actions={
                <DashboardActions
                  config={config}
                  captureForm={captureForm}
                  recentCapture={capture}
                  onConfigChange={onConfigChange}
                  onChangeVault={onChangeVault}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function DashboardActions({
  config,
  captureForm,
  recentCapture,
  onConfigChange,
  onChangeVault,
}: {
  config: ProviderConfig;
  captureForm: React.ReactNode;
  recentCapture?: RecentCapture;
  onConfigChange: (value: ProviderConfig) => void;
  onChangeVault: () => void;
}) {
  return (
    <ActionPanel title={recentCapture?.title}>
      <ActionPanel.Section>
        {recentCapture && (
          <Action
            title="Open in Obsidian"
            icon={Icon.ArrowNe}
            onAction={() => open(`obsidian://open?path=${encodeURIComponent(recentCapture.absolutePath)}`)}
          />
        )}
        <Action.Push
          title="New Capture"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={captureForm}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Configure AI Provider"
          icon={Icon.Gear}
          target={<ProviderSetup initialConfig={config} onSaved={onConfigChange} />}
        />
        <Action title="Change Vault" icon={Icon.Folder} onAction={onChangeVault} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function CaptureForm({
  config,
  vault,
  onConfigChange,
  onChangeVault,
}: {
  config: ProviderConfig;
  vault: ObsidianVault;
  onConfigChange: (value: ProviderConfig) => void;
  onChangeVault: () => void;
}) {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [isLoading, setIsLoading] = useState(false);

  async function submit(values: { content: string }) {
    const content = values.content.trim();
    if (!content) {
      await showToast({ style: Toast.Style.Failure, title: "Write something first" });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Reading vault patterns" });
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

    try {
      const startedAt = Date.now();
      console.info(`[Smart Capture] Profiling vault: ${vault.name}`);
      const profile = await buildVaultProfile(vault.path);
      console.info(
        `[Smart Capture] Profile ready in ${Date.now() - startedAt}ms (${profile.candidateFolders.length} folders, ${
          profile.context.length
        } characters)`
      );
      toast.title = "Choosing a destination";
      const { classifyNote } = await import("./classifier");
      const classification = await classifyNote(config, profile, content);
      console.info(`[Smart Capture] Classified in ${Date.now() - startedAt}ms: ${classification.folder}`);
      const created = await createNote(vault.path, classification, content);
      await addRecentCapture({
        ...created,
        title: classification.title,
        vaultPath: vault.path,
        createdAt: new Date().toISOString(),
      });
      const target = `obsidian://open?path=${encodeURIComponent(created.absolutePath)}`;

      toast.style = Toast.Style.Success;
      toast.title = `Created ${classification.title}`;
      toast.message = `${created.relativePath} - ${Math.round(classification.confidence * 100)}% confidence`;
      toast.primaryAction = { title: "Open in Obsidian", onAction: () => open(target) };

      if (preferences.openAfterCreate) await open(target);
    } catch (error) {
      console.error("[Smart Capture] Capture failed", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create note";
      toast.message = error instanceof Error ? error.message : String(error);
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`New Capture - ${vault.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Capture to ${vault.name}`} icon={Icon.Wand} onSubmit={submit} />
          <Action.Push
            title="Configure AI Provider"
            icon={Icon.Gear}
            target={<ProviderSetup initialConfig={config} onSaved={onConfigChange} />}
          />
          <Action title="Change Vault" icon={Icon.Folder} onAction={onChangeVault} />
        </ActionPanel>
      }
    >
      <Form.Description title={vault.name} text="Selected Obsidian vault" />
      <Form.Separator />
      <Form.TextArea
        id="content"
        title="Capture"
        placeholder={`Write or paste your note here.\n\nSmart Capture will create a title, choose the best existing folder, and send uncertain notes to 00 Inbox.\n\nPress Command + Enter to file it in the background.`}
        info={`This note will be organized inside ${vault.name}.`}
        enableMarkdown
        autoFocus
      />
    </Form>
  );
}
