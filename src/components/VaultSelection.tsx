import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { ObsidianVault } from "../types";

export function VaultSelection({
  vaults,
  onSelect,
}: {
  vaults: ObsidianVault[];
  onSelect: (vault: ObsidianVault) => void;
}) {
  return (
    <List navigationTitle="Select Obsidian Vault" searchBarPlaceholder="Search vaults...">
      {vaults.map((vault) => (
        <List.Item
          key={vault.path}
          icon={Icon.Folder}
          title={vault.name}
          subtitle={vault.path}
          actions={
            <ActionPanel>
              <Action title="Use This Vault" icon={Icon.CheckCircle} onAction={() => onSelect(vault)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
