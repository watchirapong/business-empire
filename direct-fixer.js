const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Direct Syntax Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup8';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix the specific syntax issues directly
function fixDirectSyntax(content) {
  let fixed = content;
  
  // Fix the specific corrupted generic syntax
  fixed = fixed.replace(/useState<Project\[\]><\/Project>/g, 'useState<Project[]>');
  fixed = fixed.replace(/useState<Section\[\]><\/Section>/g, 'useState<Section[]>');
  fixed = fixed.replace(/useState<Task\[\]><\/Task>/g, 'useState<Task[]>');
  
  // Fix any other similar patterns
  fixed = fixed.replace(/useState<([A-Z][a-zA-Z0-9]*\[\])><\/\1>/g, 'useState<$1>');
  
  return fixed;
}

// Apply the fix
console.log('🔧 Fixing direct syntax issues...');
let fixedContent = fixDirectSyntax(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied direct syntax fix');
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
    const errorLine = 114; // From the error message
    for (let i = errorLine - 5; i <= errorLine + 5; i++) {
      if (lines[i]) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  } else {
    console.log('✅ Build successful!');
  }
});
