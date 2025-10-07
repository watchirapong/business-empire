const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 TypeScript Generic Syntax Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup7';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix TypeScript generic syntax issues
function fixTypeScriptGenerics(content) {
  let fixed = content;
  
  // Fix corrupted generic syntax like useState<Project[]></Project>([])
  fixed = fixed.replace(/useState<([^>]+)><\/\1>/g, 'useState<$1>');
  
  // Fix other generic syntax issues
  fixed = fixed.replace(/<([^>]+)><\/\1>/g, '<$1>');
  
  // Fix any remaining corrupted generic syntax
  fixed = fixed.replace(/<([A-Z][a-zA-Z0-9]*\[\])><\/\1>/g, '<$1>');
  
  return fixed;
}

// Apply the fix
console.log('🔧 Fixing TypeScript generic syntax...');
let fixedContent = fixTypeScriptGenerics(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied TypeScript generic syntax fix');
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
