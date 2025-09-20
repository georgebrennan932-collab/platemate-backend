import React from 'react';
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import App from "./App";
import "./index.css";

// React Error Boundary Component - Simplified for mobile debugging
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return children;
}

// Global error handling for mobile debugging
window.onerror = function(message, source, lineno, colno, error) {
  const errorInfo = `JS Error: ${message} at ${source}:${lineno}:${colno}`;
  console.error('🚨 Global Error:', errorInfo, error);
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace; background: white;">
    <h2>JS Error Detected:</h2>
    <p>${errorInfo}</p>
    <p>Stack: ${error?.stack || 'No stack trace'}</p>
  </div>`;
  return true;
};

window.addEventListener('unhandledrejection', function(event) {
  const errorInfo = `Promise Rejection: ${event.reason}`;
  console.error('🚨 Promise Error:', errorInfo);
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace; background: white;">
    <h2>Promise Rejection:</h2>
    <p>${errorInfo}</p>
  </div>`;
  event.preventDefault();
});

try {
  console.log('🚀 Starting React app render...');
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  );
  console.log('✅ React app render completed');
} catch (error: any) {
  console.error('🚨 Fatal Render Error:', error);
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:white;color:red;padding:20px;font-family:monospace;z-index:9999';
  errorDiv.innerHTML = `
    <h2>Fatal React Render Error:</h2>
    <p><strong>Error:</strong> ${error?.message}</p>
    <p><strong>Stack:</strong></p>
    <pre>${error?.stack}</pre>
    <button onclick="window.location.reload()" style="margin-top:20px;padding:10px 20px;font-size:16px;">Reload App</button>
  `;
  document.body.appendChild(errorDiv);
}
