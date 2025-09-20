import React from 'react';
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import App from "./App";
import "./index.css";

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
  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
} catch (error) {
  console.error('🚨 Render Error:', error);
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace; background: white;">
    <h2>React Render Error:</h2>
    <p>${error.message}</p>
    <p>Stack: ${error.stack}</p>
  </div>`;
}
