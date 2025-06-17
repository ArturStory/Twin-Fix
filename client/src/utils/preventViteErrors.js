// This is a script that runs at the very beginning of the application
// to completely disable Vite's WebSocket connection for HMR

(function() {
  // The most drastic approach - completely disable WebSocket functionality in Vite
  if (typeof window !== 'undefined') {
    // Store the original error console
    const originalConsoleError = console.error;
    
    // Override console.error to catch and suppress Vite-related errors
    console.error = function(...args) {
      // Simple string check - don't display any errors containing these terms
      const errorString = JSON.stringify(args);
      if (errorString.includes('vite') || 
          errorString.includes('WebSocket') || 
          errorString.includes('DOMException') ||
          errorString.includes('localhost') ||
          errorString.includes('undefined') ||
          errorString.includes('__vite')) {
        // Suppress these errors
        return;
      }
      
      // Let all other errors through
      originalConsoleError.apply(console, args);
    };

    // Override the WebSocket constructor to prevent Vite connections
    const OriginalWebSocket = window.WebSocket;
    
    window.WebSocket = function(url, protocols) {
      // If this looks like a Vite connection, disable it
      if (typeof url === 'string' && 
         (url.includes('localhost') || 
          url.includes('vite') || 
          url.includes('__vite'))) {
        // Return a dummy WebSocket that does nothing
        return {
          send: function() {},
          close: function() {},
          addEventListener: function() {},
          removeEventListener: function() {},
          dispatchEvent: function() { return true; },
          readyState: 3, // CLOSED state
          CONNECTING: 0,
          OPEN: 1,
          CLOSING: 2,
          CLOSED: 3
        };
      }
      
      // For non-Vite connections, proceed normally
      return new OriginalWebSocket(url, protocols);
    };
    
    // Copy all static properties from OriginalWebSocket
    for (const prop in OriginalWebSocket) {
      if (OriginalWebSocket.hasOwnProperty(prop)) {
        window.WebSocket[prop] = OriginalWebSocket[prop];
      }
    }
    
    // Also for prototypes
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    
    // Completely disable any other attempts to connect
    if (window.EventSource) {
      const OriginalEventSource = window.EventSource;
      window.EventSource = function(url, config) {
        if (typeof url === 'string' && url.includes('vite')) {
          return {
            close: function() {},
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() { return true; }
          };
        }
        return new OriginalEventSource(url, config);
      };
    }
    
    console.log("🛡️ Vite WebSocket error suppression enabled");
  }
})();