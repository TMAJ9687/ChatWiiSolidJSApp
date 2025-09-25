import { createSignal } from "solid-js";

// Global maintenance mode state
const [isMaintenanceMode, setMaintenanceMode] = createSignal(true);

export const maintenanceStore = {
  isMaintenanceMode,
  setMaintenanceMode,
  enableMaintenance: () => setMaintenanceMode(true),
  disableMaintenance: () => setMaintenanceMode(false),
};