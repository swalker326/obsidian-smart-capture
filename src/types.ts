export const providers = ["openrouter", "openai", "anthropic", "gemini"] as const;

export type Provider = (typeof providers)[number];

export interface ProviderConfig {
  provider: Provider;
  model: string;
  apiKey: string;
}

export interface ExtensionPreferences {
  openAfterCreate: boolean;
}

export interface ObsidianVault {
  name: string;
  path: string;
}

export interface VaultProfile {
  candidateFolders: string[];
  context: string;
}

export interface Classification {
  title: string;
  folder: string;
  confidence: number;
}

export interface CreatedNote {
  absolutePath: string;
  relativePath: string;
}

export interface RecentCapture extends CreatedNote {
  title: string;
  vaultPath: string;
  createdAt: string;
}

export const defaultModels: Record<Provider, string> = {
  openrouter: "moonshotai/kimi-k2.6",
  openai: "gpt-5-mini",
  anthropic: "claude-haiku-4-5",
  gemini: "gemini-3-flash-preview",
};

export const providerNames: Record<Provider, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
};
