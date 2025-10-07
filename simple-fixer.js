const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Simple Targeted Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup14';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix only the specific issues we identified
function fixSpecificIssues(content) {
  let fixed = content;
  
  // Fix 1: Add missing closing brace for Project interface
  // Look for the pattern where Project interface is not closed before Section interface
  fixed = fixed.replace(
    /(sections\?\: Section\[\];\s*unassignedTasks\?\: Task\[\];\s*)\n\s*interface Section/g,
    '$1\n}\n\ninterface Section'
  );
  
  // Fix 2: Add missing closing brace for Section interface
  // Look for the pattern where Section interface is not closed before Task interface
  fixed = fixed.replace(
    /(tasks\?\: Task\[\];\s*)\n\s*interface Task/g,
    '$1\n}\n\ninterface Task'
  );
  
  // Fix 3: Add missing closing brace for Task interface
  // Look for the pattern where Task interface is not closed before Organization interface
  fixed = fixed.replace(
    /(updatedAt\: string;\s*)\n\s*interface Organization/g,
    '$1\n}\n\ninterface Organization'
  );
  
  // Fix 4: Add missing closing brace for Organization interface
  // Look for the pattern where Organization interface is not closed before the function
  fixed = fixed.replace(
    /(updatedAt\: string;\s*)\n\s*export default function/g,
    '$1\n}\n\nexport default function'
  );
  
  return fixed;
}

// Apply the fix
console.log('🔧 Fixing specific issues...');
let fixedContent = fixSpecificIssues(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied specific fixes');
console.log('📄 Fixed file saved. Backup created at:', backupPath);

// Test the build
console.log('\n🧪 Testing the build...');
const { exec } = require('child_process');
exec('npm run build -- --no-lint', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Build still has issues:');
    console.log(stderr);
  } else {
    console.log('✅ Build successful!');
  }
});
