import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/error-boundary";
import App from "./App";
import "./index.css";

// CRITICAL: Global error handlers to prevent Android WebView crashes
// Android WebView crashes on uncaught promise rejections and JS errors
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection (prevented WebView crash):', event.reason);
  event.preventDefault(); // Prevent crash
});

window.addEventListener('error', (event) => {
  // Ignore benign ResizeObserver errors that are common with UI libraries
  if (event.message && (
    event.message.includes('ResizeObserver loop') ||
    event.message.includes('ResizeObserver loop completed with undelivered notifications')
  )) {
    event.stopImmediatePropagation();
    event.preventDefault();
    return;
  }
  
  console.error('🚨 Uncaught Error (prevented WebView crash):', event.error);
  event.preventDefault(); // Prevent crash
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
);
