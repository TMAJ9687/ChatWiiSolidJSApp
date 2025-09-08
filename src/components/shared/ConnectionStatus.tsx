import { Component, Show, createSignal, onMount, onCleanup } from "solid-js";
import { FiWifi, FiWifiOff, FiRotateCcw } from "solid-icons/fi";
import { connectionService, type ConnectionStatus } from "../../services/connectionService";

const ConnectionStatusIndicator: Component = () => {
  const [connectionStatus, setConnectionStatus] = createSignal<ConnectionStatus>('connected');
  const [isOnline, setIsOnline] = createSignal<boolean>(true);

  onMount(() => {
    // Initial values
    setConnectionStatus(connectionService.getConnectionStatus());
    setIsOnline(connectionService.getIsOnline());

    // Set up polling to check connection status
    const interval = setInterval(() => {
      setConnectionStatus(connectionService.getConnectionStatus());
      setIsOnline(connectionService.getIsOnline());
    }, 1000);

    onCleanup(() => {
      clearInterval(interval);
    });
  });

  const handleReconnect = () => {
    connectionService.forceReconnect();
  };

  const getStatusColor = () => {
    if (!isOnline()) return "text-red-500";
    
    switch (connectionStatus()) {
      case 'connected':
        return "text-green-500";
      case 'reconnecting':
        return "text-yellow-500";
      case 'disconnected':
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = () => {
    if (!isOnline()) return "No Internet";
    
    switch (connectionStatus()) {
      case 'connected':
        return "Connected";
      case 'reconnecting':
        return "Reconnecting...";
      case 'disconnected':
        return "Connection Lost";
      default:
        return "Unknown";
    }
  };

  const shouldShowIndicator = () => {
    return !isOnline() || connectionStatus() !== 'connected';
  };

  return (
    <Show when={shouldShowIndicator()}>
      <div class={`fixed top-4 right-4 z-50 bg-white dark:bg-neutral-800 border-2 ${
        isOnline() 
          ? connectionStatus() === 'reconnecting' 
            ? 'border-yellow-300' 
            : 'border-red-300'
          : 'border-red-300'
      } rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 text-sm animate-pulse`}>
        <Show 
          when={isOnline()}
          fallback={<FiWifiOff class="w-4 h-4 text-red-500" />}
        >
          <Show
            when={connectionStatus() === 'reconnecting'}
            fallback={<FiWifi class={`w-4 h-4 ${getStatusColor()}`} />}
          >
            <FiRotateCcw class="w-4 h-4 text-yellow-500 animate-spin" />
          </Show>
        </Show>
        
        <span class={`font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>

        <Show when={connectionStatus() === 'disconnected' && isOnline()}>
          <button
            onClick={handleReconnect}
            class="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </Show>
      </div>
    </Show>
  );
};

export default ConnectionStatusIndicator;