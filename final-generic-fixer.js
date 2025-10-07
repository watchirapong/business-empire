const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Final Generic Syntax Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup11';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix all remaining generic syntax issues
function fixAllRemainingGenericSyntax(content) {
  let fixed = content;
  
  // Fix all patterns with </Task>
  fixed = fixed.replace(/useState<Task \| null><\/Task>/g, 'useState<Task | null>');
  fixed = fixed.replace(/useState<Task><\/Task>/g, 'useState<Task>');
  
  // Fix all patterns with </Section>
  fixed = fixed.replace(/useState<Section \| null><\/Section>/g, 'useState<Section | null>');
  fixed = fixed.replace(/useState<Section><\/Section>/g, 'useState<Section>');
  
  // Fix all patterns with </Project>
  fixed = fixed.replace(/useState<Project \| null><\/Project>/g, 'useState<Project | null>');
  fixed = fixed.replace(/useState<Project><\/Project>/g, 'useState<Project>');
  
  // Fix all patterns with </Organization>
  fixed = fixed.replace(/useState<Organization \| null><\/Organization>/g, 'useState<Organization | null>');
  fixed = fixed.replace(/useState<Organization><\/Organization>/g, 'useState<Organization>');
  
  // Fix all patterns with </string>
  fixed = fixed.replace(/useState<string \| null><\/string>/g, 'useState<string | null>');
  fixed = fixed.replace(/useState<string><\/string>/g, 'useState<string>');
  
  // Fix all patterns with </number>
  fixed = fixed.replace(/useState<number \| null><\/number>/g, 'useState<number | null>');
  fixed = fixed.replace(/useState<number><\/number>/g, 'useState<number>');
  
  // Fix all patterns with </boolean>
  fixed = fixed.replace(/useState<boolean \| null><\/boolean>/g, 'useState<boolean | null>');
  fixed = fixed.replace(/useState<boolean><\/boolean>/g, 'useState<boolean>');
  
  // Fix all patterns with </Date>
  fixed = fixed.replace(/useState<Date \| null><\/Date>/g, 'useState<Date | null>');
  fixed = fixed.replace(/useState<Date><\/Date>/g, 'useState<Date>');
  
  // Fix all patterns with </Set>
  fixed = fixed.replace(/useState<Set<string>><\/Set>/g, 'useState<Set<string>>');
  fixed = fixed.replace(/useState<Set<[^>]+>><\/Set>/g, 'useState<Set<$1>>');
  
  // Fix any remaining generic patterns
  fixed = fixed.replace(/useState<([^>]+)><\/\1>/g, 'useState<$1>');
  
  return fixed;
}

// Apply the fix
console.log('🔧 Fixing all remaining generic syntax issues...');
let fixedContent = fixAllRemainingGenericSyntax(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied final generic syntax fix');
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
    const errorLine = 156; // From the error message
    for (let i = errorLine - 5; i <= errorLine + 5; i++) {
      if (lines[i]) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  } else {
    console.log('✅ Build successful!');
  }
});
