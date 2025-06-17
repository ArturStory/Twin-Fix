/**
 * Fix duplicate issue pin coordinates
 * 
 * This script updates existing issues with zero or duplicate pin coordinates
 * to make sure each issue has a unique pin position on the floor plan.
 */

import { db } from "../server/db";
import { issues } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixIssuePinCoordinates() {
  console.log("🔧 ISSUE PIN COORDINATES REPAIR TOOL");
  console.log("-------------------------------");
  
  try {
    // Fetch all issues ordered by id
    const allIssues = await db.select({
      id: issues.id,
      title: issues.title,
      pinX: issues.pinX,
      pinY: issues.pinY,
      isInteriorPin: issues.isInteriorPin,
      status: issues.status
    }).from(issues).orderBy(issues.id);
    
    if (allIssues.length === 0) {
      console.log("No issues found in the database.");
      return;
    }
    
    console.log(`Found ${allIssues.length} issues in the database. Checking for coordinate issues...`);
    console.log("-------------------------------");
    
    // Track issues with the same coordinates to detect duplicates
    const coordinateMap = new Map<string, number[]>();
    const issuesNeedingRepair: { id: number, reason: string }[] = [];
    
    // First pass: identify issues with zero or duplicate coordinates
    allIssues.forEach(issue => {
      // Check for zero or null coordinates
      if (issue.pinX === 0 || issue.pinY === 0 || issue.pinX === null || issue.pinY === null) {
        issuesNeedingRepair.push({
          id: issue.id, 
          reason: "Zero or null coordinates"
        });
        return;
      }
      
      // Track issues by coordinate to detect duplicates
      const coordKey = `${issue.pinX},${issue.pinY}`;
      if (!coordinateMap.has(coordKey)) {
        coordinateMap.set(coordKey, []);
      }
      coordinateMap.get(coordKey)!.push(issue.id);
    });
    
    // Second pass: identify duplicates from the coordinate map
    for (const [coords, issueIds] of coordinateMap.entries()) {
      if (issueIds.length > 1) {
        // Only mark the 2nd and subsequent issues as duplicates
        for (let i = 1; i < issueIds.length; i++) {
          issuesNeedingRepair.push({
            id: issueIds[i],
            reason: `Duplicate coordinate ${coords} (also used by issue #${issueIds[0]})`
          });
        }
      }
    }
    
    // If no issues need repair, we're done
    if (issuesNeedingRepair.length === 0) {
      console.log("✅ All issues have valid, unique coordinates! No repairs needed.");
      return;
    }
    
    console.log(`Found ${issuesNeedingRepair.length} issues needing coordinate repairs:`);
    console.log("-------------------------------");
    
    // Report issues needing repair
    issuesNeedingRepair.forEach(issue => {
      const issueData = allIssues.find(i => i.id === issue.id);
      console.log(`Issue #${issue.id}: "${issueData?.title}"`);
      console.log(`  - Current coordinates: (${issueData?.pinX}, ${issueData?.pinY})`);
      console.log(`  - Reason for repair: ${issue.reason}`);
      console.log("-------------------------------");
    });
    
    // Ask for confirmation before proceeding
    console.log(`Ready to repair ${issuesNeedingRepair.length} issues with coordinate problems.`);
    console.log("Proceeding with automatic repairs...");
    
    // Repair the coordinates
    let repairCount = 0;
    for (const issue of issuesNeedingRepair) {
      const issueData = allIssues.find(i => i.id === issue.id);
      if (!issueData) continue;
      
      // Generate coordinates based on issue ID to ensure uniqueness
      // Use primes as multipliers to reduce chance of collisions
      const newX = (issue.id * 157 + 1000) % 3000;
      const newY = (issue.id * 127 + 800) % 1500;
      
      console.log(`Repairing issue #${issue.id}...`);
      console.log(`  - Old coordinates: (${issueData.pinX}, ${issueData.pinY})`);
      console.log(`  - New coordinates: (${newX}, ${newY})`);
      
      try {
        // Update the database
        await db.update(issues)
          .set({ 
            pinX: newX, 
            pinY: newY
          })
          .where(eq(issues.id, issue.id));
        
        console.log(`  ✅ Successfully updated coordinates for issue #${issue.id}`);
        repairCount++;
      } catch (error) {
        console.error(`  ❌ Failed to update coordinates for issue #${issue.id}:`, error);
      }
      
      console.log("-------------------------------");
    }
    
    console.log(`Repair complete! Fixed coordinates for ${repairCount} issues.`);
    
  } catch (error) {
    console.error("Error fixing issue coordinates:", error);
  }
}

// Run the function
fixIssuePinCoordinates().then(() => {
  console.log("\nPin coordinate repair complete!");
  process.exit(0);
}).catch(error => {
  console.error("Fatal error running repair:", error);
  process.exit(1);
});