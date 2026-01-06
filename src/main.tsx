import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import App from "./App";
import store from "./store/store";
import { ThemeContextProvider } from "./contexts/ThemeContext";
import { registerServiceWorker } from "./services/notificationService";

// Register service worker for notifications
if (import.meta.env.PROD || import.meta.env.DEV) {
  registerServiceWorker().catch((error) => {
    console.error("Failed to register service worker:", error);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeContextProvider>
      <BrowserRouter>
        <Provider store={store}>
          <App />
        </Provider>
      </BrowserRouter>
    </ThemeContextProvider>
  </React.StrictMode>
);
