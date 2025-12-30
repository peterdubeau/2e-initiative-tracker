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

// Create initial API client (will be updated after fetching server config)
let apiHost = getInitialHost();
let apiPort = getInitialPort();

export const api = axios.create({
  baseURL: `http://${apiHost}:${apiPort}`,
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
    const configUrl = `http://${tempHost}:${tempPort}/api-config`;
    
    const response = await axios.get(configUrl, { timeout: 5000 });
    const { host, port } = response.data;
    
    if (host && port) {
      apiHost = host;
      apiPort = port.toString();
      api.defaults.baseURL = `http://${apiHost}:${apiPort}`;
    }
  } catch (error) {
    // Fall back to initial values
  }
}

// Fetch config on module load (non-blocking)
fetchServerConfig();
