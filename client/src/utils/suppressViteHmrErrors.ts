/**
 * This utility suppresses the DOMException errors caused by 
 * Vite's Hot Module Replacement (HMR) WebSocket connections.
 * 
 * These errors are harmless but annoying in the console.
 */

export function suppressViteHmrErrors() {
  if (typeof window !== 'undefined') {
    // Store the original console.error
    const originalConsoleError = console.error;

    // Override console.error to filter out Vite HMR WebSocket errors
    console.error = function(...args: any[]) {
      // Check if this is a DOMException from Vite
      const isViteHmrError = args.some(arg => 
        arg instanceof DOMException && 
        (
          arg.message.includes('Failed to construct \'WebSocket\'') ||
          arg.message.includes('Invalid URL') ||
          (typeof arg === 'string' && arg.includes('[vite] connecting'))
        )
      );

      // If it's not a Vite HMR error, pass it through to the original console.error
      if (!isViteHmrError) {
        originalConsoleError.apply(console, args);
      }
    };
  }
}

// Also suppress WebSocket connection errors by creating a custom WebSocket class
if (typeof window !== 'undefined') {
  // Store the original WebSocket
  const OriginalWebSocket = window.WebSocket;
  
  // Create a wrapper class that suppresses connection errors
  class SafeWebSocket extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      // Check if this is a Vite HMR WebSocket
      const urlStr = typeof url === 'string' ? url : url.toString();
      const isViteHmr = urlStr.includes('__vite') || urlStr.includes('vite-hmr') || urlStr.includes('localhost');
      
      try {
        super(url, protocols);
      } catch (error) {
        if (isViteHmr) {
          // Silently handle Vite HMR errors - create a dummy WebSocket object
          const dummy: any = Object.create(SafeWebSocket.prototype);
          dummy.readyState = 3; // CLOSED
          dummy.send = () => {}; // No-op send function
          dummy.close = () => {}; // No-op close function
          return dummy;
        } else {
          // Re-throw errors for non-Vite WebSockets
          throw error;
        }
      }
    }
  }

  // Override the global WebSocket class
  try {
    // Some browsers don't allow overriding WebSocket directly
    // This is a best-effort approach
    // @ts-ignore
    window.WebSocket = SafeWebSocket;
  } catch (e) {
    console.warn('Unable to override WebSocket class, Vite HMR errors may still appear');
  }
}