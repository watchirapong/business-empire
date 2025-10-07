const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Targeted Fixer for Missing Interface Brace...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup4';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix the specific issue: Missing closing brace for Project interface
function fixMissingInterfaceBrace(content) {
  const lines = content.split('\n');
  const fixedLines = [];
  
  let inProjectInterface = false;
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if we're starting the Project interface
    if (trimmedLine.startsWith('interface Project {')) {
      inProjectInterface = true;
      braceCount = 1;
      fixedLines.push(line);
      continue;
    }
    
    // If we're in the Project interface, count braces
    if (inProjectInterface) {
      // Count opening and closing braces
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      // If we hit the next interface declaration and we're still in Project interface
      if (trimmedLine.startsWith('interface ') && trimmedLine !== 'interface Project {') {
        // We need to close the Project interface first
        fixedLines.push('}');
        inProjectInterface = false;
        braceCount = 0;
      }
    }
    
    fixedLines.push(line);
  }
  
  // If we're still in the Project interface at the end, close it
  if (inProjectInterface && braceCount > 0) {
    fixedLines.push('}');
  }
  
  return fixedLines.join('\n');
}

// Apply the fix
console.log('🔧 Fixing missing interface brace...');
let fixedContent = fixMissingInterfaceBrace(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied missing interface brace fix');
console.log('📄 Fixed file saved. Backup created at:', backupPath);

// Test the build
console.log('\n🧪 Testing the build...');
const { exec } = require('child_process');
exec('npm run build -- --no-lint', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Build still has issues:');
    console.log(stderr);
    
    // Show the current state around the problematic area
    console.log('\n📄 Current state around line 53:');
    const lines = fixedContent.split('\n');
    for (let i = 45; i <= 65; i++) {
      if (lines[i]) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  } else {
    console.log('✅ Build successful!');
  }
});
