import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";

import { ProviderSetup } from "./components/ProviderSetup";
import { getProviderConfig } from "./storage";
import { ProviderConfig } from "./types";

export default function ConfigureProviderCommand() {
  const [config, setConfig] = useState<ProviderConfig>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProviderConfig()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Detail isLoading />;
  return <ProviderSetup initialConfig={config} closeAfterSave />;
}
