const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Comprehensive Generic Syntax Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup9';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix all generic syntax issues
function fixAllGenericSyntax(content) {
  let fixed = content;
  
  // Fix all corrupted generic syntax patterns
  const patterns = [
    // useState patterns
    /useState<Set<string>><\/Set>/g,
    /useState<Date \| null><\/Date>/g,
    /useState<Project\[\]><\/Project>/g,
    /useState<Section\[\]><\/Section>/g,
    /useState<Task\[\]><\/Task>/g,
    /useState<Organization\[\]><\/Organization>/g,
    
    // Generic patterns
    /<Set<string>><\/Set>/g,
    /<Date \| null><\/Date>/g,
    /<Project\[\]><\/Project>/g,
    /<Section\[\]><\/Section>/g,
    /<Task\[\]><\/Task>/g,
    /<Organization\[\]><\/Organization>/g,
    
    // More generic patterns
    /<([A-Z][a-zA-Z0-9]*\[\])><\/\1>/g,
    /<([A-Z][a-zA-Z0-9]* \| null)><\/\1>/g,
    /<Set<([^>]+)>><\/Set>/g,
  ];
  
  const replacements = [
    'useState<Set<string>>',
    'useState<Date | null>',
    'useState<Project[]>',
    'useState<Section[]>',
    'useState<Task[]>',
    'useState<Organization[]>',
    
    '<Set<string>>',
    '<Date | null>',
    '<Project[]>',
    '<Section[]>',
    '<Task[]>',
    '<Organization[]>',
    
    '<$1>',
    '<$1>',
    '<Set<$1>>',
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    fixed = fixed.replace(patterns[i], replacements[i]);
  }
  
  return fixed;
}

// Apply the fix
console.log('🔧 Fixing all generic syntax issues...');
let fixedContent = fixAllGenericSyntax(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied comprehensive generic syntax fix');
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
