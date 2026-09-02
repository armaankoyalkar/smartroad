/**
 * Application entry: global styles, then the provider stack and the router.
 * Provider order matters: AuthProvider needs the QueryClient; RequireRole and the layouts
 * need the ToastProvider; everything under the router may read auth, meta and toasts.
 */
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { queryClient } from "@/api/queryClient";
import { AuthProvider } from "@/auth/AuthContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import { MetaProvider } from "@/meta/MetaContext";
import App from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root was not found in index.html");

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MetaProvider>
            <ToastProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ToastProvider>
          </MetaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
