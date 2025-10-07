const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Comprehensive Interface Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup5';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix all interface declarations
function fixAllInterfaces(content) {
  const lines = content.split('\n');
  const fixedLines = [];
  
  let currentInterface = null;
  let braceCount = 0;
  let inInterface = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if we're starting a new interface
    if (trimmedLine.startsWith('interface ')) {
      // If we're already in an interface, close it first
      if (inInterface && braceCount > 0) {
        fixedLines.push('}');
        inInterface = false;
        braceCount = 0;
      }
      
      // Start new interface
      currentInterface = trimmedLine.match(/interface\s+(\w+)/)[1];
      inInterface = true;
      braceCount = 1;
      fixedLines.push(line);
      continue;
    }
    
    // If we're in an interface, count braces
    if (inInterface) {
      // Count opening and closing braces
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      // If we hit the next interface declaration or end of file
      if (trimmedLine.startsWith('interface ') || i === lines.length - 1) {
        // Close the current interface
        if (braceCount > 0) {
          fixedLines.push('}');
        }
        inInterface = false;
        braceCount = 0;
        
        // If this is a new interface, start it
        if (trimmedLine.startsWith('interface ')) {
          currentInterface = trimmedLine.match(/interface\s+(\w+)/)[1];
          inInterface = true;
          braceCount = 1;
        }
      }
    }
    
    fixedLines.push(line);
  }
  
  // Close any remaining interface
  if (inInterface && braceCount > 0) {
    fixedLines.push('}');
  }
  
  return fixedLines.join('\n');
}

// Apply the fix
console.log('🔧 Fixing all interfaces...');
let fixedContent = fixAllInterfaces(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied comprehensive interface fix');
console.log('📄 Fixed file saved. Backup created at:', backupPath);

// Test the build
console.log('\n🧪 Testing the build...');
const { exec } = require('child_process');
exec('npm run build -- --no-lint', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Build still has issues:');
    console.log(stderr);
    
    // Show the current state around the problematic area
    console.log('\n📄 Current state around the error:');
    const lines = fixedContent.split('\n');
    const errorLine = 66; // From the error message
    for (let i = errorLine - 10; i <= errorLine + 10; i++) {
      if (lines[i]) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  } else {
    console.log('✅ Build successful!');
  }
});
