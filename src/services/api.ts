import axios from "axios";

const host = import.meta.env.VITE_API_HOST || window.location.hostname;
const port = import.meta.env.VITE_API_PORT || "3001";

export const api = axios.create({
  baseURL: `http://${host}:${port}`,
});
