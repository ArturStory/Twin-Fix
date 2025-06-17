/**
 * Diagnostic script to check issue coordinates in the database
 * This helps debug why pins might be showing at the same location
 */

import { db } from "../server/db";
import { issues } from "../shared/schema";

async function checkIssueCoordinates() {
  console.log("🔍 ISSUE COORDINATE DEBUGGING TOOL");
  console.log("-------------------------------");
  
  try {
    // Fetch all issues ordered by id
    const allIssues = await db.select({
      id: issues.id,
      title: issues.title,
      pinX: issues.pinX,
      pinY: issues.pinY,
      isInteriorPin: issues.isInteriorPin,
      status: issues.status,
      createdAt: issues.createdAt
    }).from(issues).orderBy(issues.id);
    
    if (allIssues.length === 0) {
      console.log("No issues found in the database.");
      return;
    }
    
    console.log(`Found ${allIssues.length} issues in the database:`);
    console.log("-------------------------------");
    
    // Check for duplicate coordinates
    const coordinateMap = new Map<string, number[]>();
    
    // Display all issues with their coordinates
    allIssues.forEach(issue => {
      console.log(`Issue #${issue.id}: "${issue.title}"`);
      console.log(`  - Coordinates: (${issue.pinX}, ${issue.pinY})`);
      console.log(`  - Interior Pin: ${issue.isInteriorPin}`);
      console.log(`  - Created: ${issue.createdAt}`);
      console.log(`  - Status: ${issue.status}`);
      console.log("-------------------------------");
      
      // Track issues with the same coordinates
      const coordKey = `${issue.pinX},${issue.pinY}`;
      if (!coordinateMap.has(coordKey)) {
        coordinateMap.set(coordKey, []);
      }
      coordinateMap.get(coordKey)!.push(issue.id);
    });
    
    // Report any duplicate coordinates
    console.log("\n🔍 DUPLICATE COORDINATE ANALYSIS");
    console.log("-------------------------------");
    
    let hasDuplicates = false;
    
    for (const [coords, issueIds] of coordinateMap.entries()) {
      if (issueIds.length > 1) {
        hasDuplicates = true;
        console.log(`⚠️ DUPLICATE FOUND: Coordinates ${coords} are used by ${issueIds.length} issues:`);
        issueIds.forEach(id => {
          const issue = allIssues.find(i => i.id === id);
          console.log(`  - Issue #${id}: "${issue?.title}"`);
        });
        console.log("-------------------------------");
      }
    }
    
    if (!hasDuplicates) {
      console.log("✅ No duplicate coordinates found! All issues have unique pin positions.");
    }
    
    // Report zero coordinates
    const zeroCoords = coordinateMap.get("0,0");
    if (zeroCoords && zeroCoords.length > 0) {
      console.log("\n⚠️ ISSUES WITH 0,0 COORDINATES:");
      zeroCoords.forEach(id => {
        const issue = allIssues.find(i => i.id === id);
        console.log(`  - Issue #${id}: "${issue?.title}"`);
      });
    }
    
  } catch (error) {
    console.error("Error checking issue coordinates:", error);
  }
}

// Run the function
checkIssueCoordinates().then(() => {
  console.log("\nDiagnostic complete! You can add a fix-issues.ts script if needed.");
  process.exit(0);
}).catch(error => {
  console.error("Fatal error running diagnostic:", error);
  process.exit(1);
});