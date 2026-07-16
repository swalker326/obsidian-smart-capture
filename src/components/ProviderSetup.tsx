import { Action, ActionPanel, closeMainWindow, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";

import { saveProviderConfig } from "../storage";
import { defaultModels, Provider, ProviderConfig, providerNames, providers } from "../types";

interface ProviderSetupProps {
  initialConfig?: ProviderConfig;
  closeAfterSave?: boolean;
  onSaved?: (config: ProviderConfig) => void;
}

export function ProviderSetup({ initialConfig, closeAfterSave = false, onSaved }: ProviderSetupProps) {
  const [provider, setProvider] = useState<Provider>(initialConfig?.provider ?? "openrouter");
  const [model, setModel] = useState(initialConfig?.model ?? defaultModels.openrouter);
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey ?? "");

  function changeProvider(nextProvider: string) {
    const value = nextProvider as Provider;
    setProvider(value);
    setModel(defaultModels[value]);
  }

  async function submit() {
    if (!model.trim() || !apiKey.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Model and API key are required" });
      return;
    }

    const config = { provider, model: model.trim(), apiKey: apiKey.trim() };
    await saveProviderConfig(config);
    await showToast({ style: Toast.Style.Success, title: `${providerNames[provider]} configured` });
    onSaved?.(config);
    if (closeAfterSave) await closeMainWindow();
  }

  return (
    <Form
      navigationTitle="Configure AI Provider"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Provider" icon={Icon.CheckCircle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Credentials are stored in Raycast's extension-scoped encrypted local database and sent only to the selected provider." />
      <Form.Dropdown id="provider" title="Provider" value={provider} onChange={changeProvider}>
        {providers.map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={providerNames[value]} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="model"
        title="Model"
        placeholder={defaultModels[provider]}
        value={model}
        onChange={setModel}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder={`${providerNames[provider]} API key`}
        value={apiKey}
        onChange={setApiKey}
      />
    </Form>
  );
}
