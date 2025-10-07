const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 TypeScript Interface Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup3';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix TypeScript interface syntax issues
function fixTypeScriptInterfaces(content) {
  const lines = content.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Fix interface declarations
    if (trimmedLine.startsWith('interface ')) {
      // Check if the previous line is missing a semicolon
      if (i > 0) {
        const prevLine = lines[i - 1].trim();
        if (prevLine && !prevLine.endsWith(';') && !prevLine.endsWith('{') && !prevLine.endsWith('}')) {
          // Add semicolon to previous line
          fixedLines[fixedLines.length - 1] = fixedLines[fixedLines.length - 1] + ';';
        }
      }
    }
    
    // Fix type declarations
    if (trimmedLine.includes(':') && !trimmedLine.includes('=') && !trimmedLine.includes('{') && !trimmedLine.includes('}')) {
      // This might be a type declaration that needs a semicolon
      if (!trimmedLine.endsWith(';') && !trimmedLine.endsWith(',')) {
        fixedLines.push(line + ';');
        continue;
      }
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
}

// Fix specific interface issues
function fixSpecificInterfaceIssues(content) {
  let fixed = content;
  
  // Fix missing semicolons after interface properties
  fixed = fixed.replace(/(\w+:\s*[^;,\n]+)(\n\s*interface)/g, '$1;\n$2');
  
  // Fix missing semicolons after type declarations
  fixed = fixed.replace(/(\w+:\s*[^;,\n]+)(\n\s*interface)/g, '$1;\n$2');
  
  // Fix interface declarations that are missing proper syntax
  fixed = fixed.replace(/interface\s+(\w+)\s*\{/g, 'interface $1 {');
  
  return fixed;
}

// Apply fixes
console.log('🔧 Applying TypeScript interface fixes...');

// Step 1: Fix TypeScript interfaces
let fixedContent = fixTypeScriptInterfaces(content);

// Step 2: Fix specific interface issues
fixedContent = fixSpecificInterfaceIssues(fixedContent);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied TypeScript interface fixes');
console.log('📄 Fixed file saved. Backup created at:', backupPath);

// Test the build
console.log('\n🧪 Testing the build...');
const { exec } = require('child_process');
exec('npm run build -- --no-lint', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Build still has issues:');
    console.log(stderr);
    
    // Try to fix the specific error
    console.log('\n🔧 Trying to fix specific error...');
    fixSpecificError();
  } else {
    console.log('✅ Build successful!');
  }
});

// Fix specific error function
function fixSpecificError() {
  console.log('🔧 Fixing specific error...');
  
  // Read the current content
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the specific error: Expected ';', got 'Section'
  // This usually means there's a missing semicolon before an interface declaration
  
  // Find the line with the error and fix it
  const lines = content.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this is the problematic interface declaration
    if (trimmedLine === 'interface Section {' && i > 0) {
      const prevLine = lines[i - 1].trim();
      
      // If the previous line doesn't end with a semicolon, add one
      if (prevLine && !prevLine.endsWith(';') && !prevLine.endsWith('{') && !prevLine.endsWith('}')) {
        fixedLines[fixedLines.length - 1] = fixedLines[fixedLines.length - 1] + ';';
      }
    }
    
    fixedLines.push(line);
  }
  
  const fixedContent = fixedLines.join('\n');
  
  // Write the fixed content
  fs.writeFileSync(filePath, fixedContent);
  
  console.log('✅ Applied specific error fix');
  
  // Test again
  exec('npm run build -- --no-lint', (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Still failing. Need to examine the file structure.');
      console.log('Error:', stderr);
      
      // Show the problematic area
      console.log('\n📄 Showing problematic area:');
      const lines = content.split('\n');
      for (let i = 45; i <= 60; i++) {
        if (lines[i]) {
          console.log(`${i + 1}: ${lines[i]}`);
        }
      }
    } else {
      console.log('✅ Build successful after specific fix!');
    }
  });
}
