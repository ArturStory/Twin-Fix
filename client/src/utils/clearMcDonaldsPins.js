// Direct script to clear McDonald's pins
// Run this in the browser console directly

function clearMcDonaldsPins() {
  // Specifically target the McDonald's pins
  const keysToRemove = [
    'mcdonalds-pins',
    'mcdonalds-pins-interior',
    'mcdonalds-pins-exterior'
  ];
  
  // First remove the specific keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Cleared localStorage key: ${key}`);
  });
  
  // Get all localStorage keys
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      allKeys.push(key);
    }
  }
  
  // Remove any keys containing 'mcdonalds'
  allKeys.forEach(key => {
    if (key.includes('mcdonalds')) {
      localStorage.removeItem(key);
      console.log(`Cleared McDonald's related key: ${key}`);
    }
  });
  
  console.log('All McDonald\'s pins have been cleared from localStorage');
  console.log('Please refresh the page to see the changes');
}

// Execute the function
clearMcDonaldsPins();