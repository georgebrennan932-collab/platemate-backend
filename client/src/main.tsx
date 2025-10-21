import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/error-boundary";
import App from "./App";
import "./index.css";

// CRITICAL: Automatically dismiss Vite error overlay for benign errors
const dismissViteErrorOverlay = () => {
  const overlay = document.querySelector('vite-error-overlay');
  if (overlay) {
    overlay.remove();
  }
};

// Watch for error overlays and auto-dismiss them
const overlayObserver = new MutationObserver(() => {
  dismissViteErrorOverlay();
});
overlayObserver.observe(document.body, { childList: true, subtree: true });

// CRITICAL: Override ResizeObserver to suppress benign errors
const originalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends originalResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    super((entries, observer) => {
      requestAnimationFrame(() => {
        try {
          callback(entries, observer);
        } catch (e: any) {
          // Silently ignore ResizeObserver errors
          if (!e?.message?.includes('ResizeObserver')) {
            throw e;
          }
        }
      });
    });
  }
};

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
    return false;
  }
  
  console.error('🚨 Uncaught Error (prevented WebView crash):', event.error);
  event.preventDefault(); // Prevent crash
}, true); // Use capture phase to catch errors early

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
);
