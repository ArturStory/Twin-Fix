import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SimpleDomPinMap from '@/components/location/SimpleDomPinMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Style for the image container
const styles = `
.image-container {
  position: relative;
  display: inline-block;
}

#floorPlan {
  width: 100%;
  height: auto;
  display: block;
}

.pin {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: red;
  border-radius: 50%;
  transform: translate(-50%, -100%);
  pointer-events: none;
}
`;

export default function PinTest() {
  // State for pin position 
  const [pinPosition, setPinPosition] = useState<{ xPercent: number, yPercent: number, x: number, y: number } | null>(null);
  const [debugData, setDebugData] = useState<any>({});
  
  // Called when the pin is moved in SimpleDomPinMap
  const handlePinMoved = (coordinates: { xPercent: number, yPercent: number, x: number, y: number }) => {
    setPinPosition(coordinates);
    
    // Add to debug data for display
    setDebugData({
      ...debugData,
      coordinates
    });
    
    console.log('Pin moved to:', coordinates);
  };
  
  // Function to manually test the movePin function
  const movePin = (xPercent: number, yPercent: number) => {
    const floorPlan = document.getElementById('floorPlan');
    const pin = document.getElementById('pin');
    
    if (floorPlan && pin) {
      const x = (xPercent / 100) * floorPlan.offsetWidth;
      const y = (yPercent / 100) * floorPlan.offsetHeight;
    
      pin.style.left = `${x}px`;
      pin.style.top = `${y}px`;
      pin.style.display = 'block';
      
      console.log(`Pin moved to: ${x}px, ${y}px (from ${xPercent}%, ${yPercent}%)`);
    } else {
      console.error('Could not find floorPlan or pin element');
    }
  };
  
  // Test cases for different pin positions
  const testCases = [
    { name: 'Top Left', xPercent: 10, yPercent: 10 },
    { name: 'Top Right', xPercent: 90, yPercent: 10 },
    { name: 'Bottom Left', xPercent: 10, yPercent: 90 },
    { name: 'Bottom Right', xPercent: 90, yPercent: 90 },
    { name: 'Center', xPercent: 50, yPercent: 50 },
    { name: 'Your Example', xPercent: 46, yPercent: 78 }
  ];
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Pin Positioning Test</h1>
      
      {/* Add the CSS styles */}
      <style>{styles}</style>
      
      <Tabs defaultValue="dom-pins">
        <TabsList className="mb-4">
          <TabsTrigger value="dom-pins">DOM Pin Map</TabsTrigger>
          <TabsTrigger value="tests">Test Cases</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dom-pins">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>DOM-Based Pin Map Test</CardTitle>
                </CardHeader>
                <CardContent>
                  <SimpleDomPinMap
                    imagePath="/static/McDonalds-interior-plan.jpg"
                    initialPinPosition={pinPosition ? pinPosition : undefined}
                    pinLabel="Test Pin"
                    showDebugInfo={true}
                    className="w-full h-auto"
                    onPinMoved={handlePinMoved}
                  />
                  
                  <div className="flex justify-center gap-4 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setPinPosition(null)}
                    >
                      Clear Pin
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Debug Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm font-mono bg-muted p-3 rounded overflow-x-auto">
                    {pinPosition ? (
                      <>
                        <div><span className="font-bold">Pin Position (0-1 scale):</span></div>
                        <div className="pl-4">X%: {pinPosition.xPercent.toFixed(3)}</div>
                        <div className="pl-4">Y%: {pinPosition.yPercent.toFixed(3)}</div>
                        
                        <div><span className="font-bold">Pin Position (Pixels):</span></div>
                        <div className="pl-4">X: {pinPosition.x}</div>
                        <div className="pl-4">Y: {pinPosition.y}</div>
                        
                        <div><span className="font-bold">Pin Position (Percentage):</span></div>
                        <div className="pl-4">X%: {(pinPosition.xPercent * 100).toFixed(2)}%</div>
                        <div className="pl-4">Y%: {(pinPosition.yPercent * 100).toFixed(2)}%</div>
                      </>
                    ) : (
                      <div>Click on the map to place a pin</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle>Test Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {testCases.map((test, index) => (
                  <Button 
                    key={index}
                    variant="outline"
                    onClick={() => {
                      // Set position in component state
                      setPinPosition({
                        xPercent: test.xPercent / 100,
                        yPercent: test.yPercent / 100,
                        x: Math.round((test.xPercent / 100) * 3544),  // Original image width
                        y: Math.round((test.yPercent / 100) * 1755),  // Original image height
                      });
                      
                      // Also call the manual movePin function
                      setTimeout(() => movePin(test.xPercent, test.yPercent), 500);
                    }}
                  >
                    {test.name} ({test.xPercent}%, {test.yPercent}%)
                  </Button>
                ))}
              </div>
              
              <div className="p-4 bg-gray-100 rounded mb-4">
                <h3 className="font-bold mb-2">Manual Test</h3>
                <p className="text-sm mb-2">Enter percentage values (0-100) to test pin positioning:</p>
                
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="X%"
                    className="p-2 border rounded w-20"
                    id="test-x-percent"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Y%"
                    className="p-2 border rounded w-20"
                    id="test-y-percent"
                  />
                  <Button
                    onClick={() => {
                      const xPercentInput = document.getElementById('test-x-percent') as HTMLInputElement;
                      const yPercentInput = document.getElementById('test-y-percent') as HTMLInputElement;
                      
                      const xPercent = parseFloat(xPercentInput.value);
                      const yPercent = parseFloat(yPercentInput.value);
                      
                      if (!isNaN(xPercent) && !isNaN(yPercent)) {
                        // Set position in component state
                        setPinPosition({
                          xPercent: xPercent / 100,
                          yPercent: yPercent / 100,
                          x: Math.round((xPercent / 100) * 3544),
                          y: Math.round((yPercent / 100) * 1755),
                        });
                        
                        // Also call the manual movePin function
                        setTimeout(() => movePin(xPercent, yPercent), 500);
                      }
                    }}
                  >
                    Test
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-gray-100 rounded">
                <h3 className="font-bold mb-2">Resize Test</h3>
                <p className="text-sm mb-2">Resize your browser window to see if pin stays in the correct position.</p>
                <p className="text-xs text-gray-600">The pin should maintain its relative position on the image when the window is resized.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}