const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Targeted Generic Syntax Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup10';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix the specific generic syntax issues
function fixTargetedGenericSyntax(content) {
  let fixed = content;
  
  // Fix the specific pattern: useState<Set<string></Set>>
  fixed = fixed.replace(/useState<Set<string><\/Set>>/g, 'useState<Set<string>>');
  
  // Fix the specific pattern: useState<Date | null></Date>
  fixed = fixed.replace(/useState<Date \| null><\/Date>/g, 'useState<Date | null>');
  
  // Fix any remaining patterns with </Set>
  fixed = fixed.replace(/<Set<string><\/Set>>/g, '<Set<string>>');
  
  // Fix any remaining patterns with </Date>
  fixed = fixed.replace(/<Date \| null><\/Date>/g, '<Date | null>');
  
  return fixed;
}

// Apply the fix
console.log('🔧 Fixing targeted generic syntax issues...');
let fixedContent = fixTargetedGenericSyntax(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied targeted generic syntax fix');
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
    const errorLine = 134; // From the error message
    for (let i = errorLine - 5; i <= errorLine + 5; i++) {
      if (lines[i]) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  } else {
    console.log('✅ Build successful!');
  }
});
