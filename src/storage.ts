import { LocalStorage } from "@raycast/api";

import fs from "node:fs";

import { ObsidianVault, ProviderConfig, providers, RecentCapture } from "./types";

const providerConfigKey = "provider-config";
const selectedVaultKey = "selected-vault";
const recentCapturesKey = "recent-captures";

export async function getProviderConfig(): Promise<ProviderConfig | undefined> {
  const stored = await LocalStorage.getItem<string>(providerConfigKey);
  if (!stored) return undefined;

  try {
    const value = JSON.parse(stored) as Partial<ProviderConfig>;
    if (
      typeof value.provider === "string" &&
      providers.includes(value.provider as ProviderConfig["provider"]) &&
      typeof value.model === "string" &&
      value.model.length > 0 &&
      typeof value.apiKey === "string" &&
      value.apiKey.length > 0
    ) {
      return {
        provider: value.provider as ProviderConfig["provider"],
        model: value.model,
        apiKey: value.apiKey,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function saveProviderConfig(config: ProviderConfig): Promise<void> {
  await LocalStorage.setItem(providerConfigKey, JSON.stringify(config));
}

export async function removeProviderConfig(): Promise<void> {
  await LocalStorage.removeItem(providerConfigKey);
}

export async function getSelectedVault(vaults: ObsidianVault[]): Promise<ObsidianVault | undefined> {
  const selectedPath = await LocalStorage.getItem<string>(selectedVaultKey);
  return vaults.find((vault) => vault.path === selectedPath);
}

export async function saveSelectedVault(vault: ObsidianVault): Promise<void> {
  await LocalStorage.setItem(selectedVaultKey, vault.path);
}

export async function removeSelectedVault(): Promise<void> {
  await LocalStorage.removeItem(selectedVaultKey);
}

export async function getRecentCaptures(vaultPath: string): Promise<RecentCapture[]> {
  const stored = await LocalStorage.getItem<string>(recentCapturesKey);
  if (!stored) return [];

  try {
    const captures = JSON.parse(stored) as RecentCapture[];
    return captures
      .filter((capture) => capture.vaultPath === vaultPath && fs.existsSync(capture.absolutePath))
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function addRecentCapture(capture: RecentCapture): Promise<void> {
  const stored = await LocalStorage.getItem<string>(recentCapturesKey);
  let captures: RecentCapture[] = [];
  try {
    captures = stored ? (JSON.parse(stored) as RecentCapture[]) : [];
  } catch {
    captures = [];
  }

  const next = [capture, ...captures.filter((item) => item.absolutePath !== capture.absolutePath)].slice(0, 25);
  await LocalStorage.setItem(recentCapturesKey, JSON.stringify(next));
}
