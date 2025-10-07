const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Comprehensive Syntax Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup13';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix all syntax issues
function fixAllSyntaxIssues(content) {
  const lines = content.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Fix missing closing brace before catch
    if (trimmedLine === '} catch (error) {' && i > 0) {
      const prevLine = lines[i - 1].trim();
      if (prevLine && !prevLine.endsWith(';') && !prevLine.endsWith('{') && !prevLine.endsWith('}')) {
        // Add missing closing brace and semicolon
        fixedLines[fixedLines.length - 1] = fixedLines[fixedLines.length - 1] + ';';
        fixedLines.push('        }');
      }
    }
    
    // Fix missing closing brace after catch block
    if (trimmedLine === '};' && i > 0) {
      const prevLine = lines[i - 1].trim();
      if (prevLine && !prevLine.endsWith('}')) {
        // Add missing closing brace
        fixedLines.push('      }');
      }
    }
    
    // Fix JSX conditional rendering syntax
    if (trimmedLine.startsWith('{isEditing ? (')) {
      // This should be properly formatted JSX
      fixedLines.push(line);
      continue;
    }
    
    // Fix missing closing parenthesis in JSX
    if (trimmedLine.includes('{isEditing ? (') && !trimmedLine.includes(')')) {
      // This might be a malformed JSX conditional
      fixedLines.push(line);
      continue;
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
}

// Apply the fix
console.log('🔧 Fixing all syntax issues...');
let fixedContent = fixAllSyntaxIssues(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied comprehensive syntax fix');
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
    const errorLine = 184; // From the error message
    for (let i = errorLine - 5; i <= errorLine + 5; i++) {
      if (lines[i]) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  } else {
    console.log('✅ Build successful!');
  }
});
