/**
 * Diagnostic script to verify pin display on floor plans
 * This script helps identify issues with pin positioning by checking:
 * 1. If pins have valid coordinates (non-zero, non-null)
 * 2. If pins are generating their position calculations correctly
 * 3. If the DOM is properly showing pins at the expected position
 */

import { db } from "../server/db";
import { issues } from "../shared/schema";
import { eq } from "drizzle-orm";

async function verifyPinDisplay() {
  console.log("🔍 Running Pin Display Verification Tool");
  console.log("=======================================");
  
  try {
    // Load all issues with pins
    const allIssues = await db.select().from(issues);
    console.log(`Found ${allIssues.length} issues in database`);
    
    if (allIssues.length === 0) {
      console.log("No issues to diagnose. Create some issues first.");
      return;
    }
    
    // Check for issues with invalid pin coordinates
    const issuesWithInvalidPins = allIssues.filter(issue => 
      issue.pinX === null || 
      issue.pinY === null || 
      issue.pinX === 0 || 
      issue.pinY === 0 ||
      isNaN(Number(issue.pinX)) ||
      isNaN(Number(issue.pinY))
    );
    
    if (issuesWithInvalidPins.length > 0) {
      console.log(`⚠️ Found ${issuesWithInvalidPins.length} issues with invalid pin coordinates:`);
      issuesWithInvalidPins.forEach(issue => {
        console.log(`ID ${issue.id}: "${issue.title}" - pinX: ${issue.pinX}, pinY: ${issue.pinY}`);
      });
    } else {
      console.log("✅ All issues have valid pin coordinates");
    }
    
    // Check for duplicate pin positions - issues sharing exactly the same coordinates
    const pinPositions = new Map<string, number[]>();
    allIssues.forEach(issue => {
      if (issue.pinX !== null && issue.pinY !== null) {
        const key = `${issue.pinX},${issue.pinY}`;
        const existingIssues = pinPositions.get(key) || [];
        pinPositions.set(key, [...existingIssues, issue.id]);
      }
    });
    
    const duplicatePinPositions = Array.from(pinPositions.entries())
      .filter(([_, issueIds]) => issueIds.length > 1);
      
    if (duplicatePinPositions.length > 0) {
      console.log(`⚠️ Found ${duplicatePinPositions.length} cases of duplicate pin positions:`);
      duplicatePinPositions.forEach(([coords, issueIds]) => {
        console.log(`Coordinates (${coords}) used by ${issueIds.length} issues: ${issueIds.join(', ')}`);
      });
    } else {
      console.log("✅ No duplicate pin positions found");
    }
    
    // Provide instructions for visual verification
    console.log("\n📋 Visual verification steps:");
    console.log("1. Open any issue detail page and observe if the pin appears in the correct position");
    console.log("2. Try clicking on the pin location to update its position");
    console.log("3. Check that new pin positions are saved correctly in the database");
    
    console.log("\n✅ Pin display verification complete");
    
  } catch (error) {
    console.error("❌ Error running pin verification:", error);
  }
}

// Execute the script
verifyPinDisplay().catch(console.error);