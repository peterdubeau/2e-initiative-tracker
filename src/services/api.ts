import axios from "axios";

// Determine initial API host/port
// If on localhost, use localhost; otherwise use current hostname (where frontend is accessed from)
const getInitialHost = (): string => {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "localhost";
  }
  // Always use window.location.hostname when on network IP (backend should be on same machine)
  return window.location.hostname;
};

const getInitialPort = (): string => {
  return import.meta.env.VITE_API_PORT || "3001";
};

// Get protocol from current page (https or http)
const getProtocol = (): string => {
  return window.location.protocol === 'https:' ? 'https' : 'http';
};

// Create initial API client (will be updated after fetching server config)
let apiHost = getInitialHost();
let apiPort = getInitialPort();
let apiProtocol = getProtocol();

export const api = axios.create({
  baseURL: `${apiProtocol}://${apiHost}:${apiPort}`,
});

// Fetch server configuration and update API client
async function fetchServerConfig() {
  // If on localhost, skip fetching (use localhost)
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return;
  }

  try {
    // Always use window.location.hostname to fetch config (where frontend is being accessed from)
    // This ensures we connect to the backend on the same machine as the frontend
    const tempHost = window.location.hostname;
    const tempPort = import.meta.env.VITE_API_PORT || "3001";
    const tempProtocol = getProtocol();
    const configUrl = `${tempProtocol}://${tempHost}:${tempPort}/api-config`;
    
    const response = await axios.get(configUrl, { timeout: 5000 });
    const { host, port, protocol } = response.data;
    
    if (host && port) {
      apiHost = host;
      apiPort = port.toString();
      // Use protocol from server response if provided, otherwise use current page protocol
      apiProtocol = protocol || tempProtocol;
      api.defaults.baseURL = `${apiProtocol}://${apiHost}:${apiPort}`;
    }
  } catch (error) {
    // Fall back to initial values
  }
}

// Fetch config on module load (non-blocking)
fetchServerConfig();
