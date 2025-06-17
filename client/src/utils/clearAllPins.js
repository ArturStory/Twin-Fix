// Utility script to clear all pins and issue data for testing
// This will be executed in the browser console

function clearAllPins() {
  // Clear saved pins from localStorage
  const keysToRemove = [
    'savedPins',
    'localIssues',
    'mcdonalds-pins', // McDonald's adapter specific pins
    'pins',           // Generic pins storage
    'floorPlanPins',  // Floor plan pins
    'mapPins'         // Any other map pins
  ];
  
  // Remove all possible keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Cleared localStorage key: ${key}`);
  });
  
  // Additional clearing for any pin-related data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('pin') || key.includes('marker') || key.includes('issue') || key.includes('map'))) {
      localStorage.removeItem(key);
      console.log(`Cleared related localStorage key: ${key}`);
    }
  }
  
  console.log('All pins and related data have been cleared from localStorage');
  
  // Force reload to ensure UI reflects cleared data
  window.location.reload();
}

// Execute the function
clearAllPins();