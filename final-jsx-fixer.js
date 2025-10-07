const fs = require('fs');
const path = require('path');

// Read the file
const filePath = './src/app/project-manager/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Final JSX Fixer...\n');

// Create backup
const backupPath = './src/app/project-manager/page.tsx.backup20';
fs.writeFileSync(backupPath, content);
console.log('📄 Created backup at:', backupPath);

// Fix the JSX structure by completely rebuilding the problematic section
function fixJSXStructure(content) {
  const lines = content.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip the problematic section and rebuild it
    if (i >= 1505 && i <= 1515) {
      if (i === 1505) {
        // Start of the problematic section - replace with clean structure
        fixedLines.push('                      <Plus className="w-4 h-4" />');
        fixedLines.push('                      <span className="text-sm">Add section</span>');
        fixedLines.push('                    </div>');
        fixedLines.push('                  </button>');
        fixedLines.push('                )}');
        fixedLines.push('              </div>');
        fixedLines.push('            ) : (');
        fixedLines.push('              /* Upcoming View */');
        fixedLines.push('              <div className="upcoming-view">');
        fixedLines.push('                <div className="mb-6">');
        fixedLines.push('                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Upcoming</h2>');
        fixedLines.push('                  <div className="flex items-center space-x-4">');
        fixedLines.push('                    <div className="text-lg font-medium text-gray-700">');
        fixedLines.push('                      {new Date().toLocaleDateString(\'en-US\', { month: \'long\', year: \'numeric\' })}');
        fixedLines.push('                    </div>');
        fixedLines.push('                  </div>');
        fixedLines.push('                </div>');
        fixedLines.push('                ');
        fixedLines.push('                <div className="flex space-x-6 overflow-x-auto">');
        fixedLines.push('                  <div className="flex-shrink-0 w-80">');
        fixedLines.push('                    <div className="bg-gray-50 rounded-lg p-4 min-h-96">');
        fixedLines.push('                      <div className="flex items-center justify-between mb-4">');
        fixedLines.push('                        <h3 className="font-semibold text-gray-900">Today</h3>');
        fixedLines.push('                        <span className="text-sm text-gray-500">0</span>');
        fixedLines.push('                      </div>');
        fixedLines.push('                      <p className="text-gray-500">Upcoming view content will be implemented here.</p>');
        fixedLines.push('                    </div>');
        fixedLines.push('                  </div>');
        fixedLines.push('                </div>');
        fixedLines.push('              </div>');
        fixedLines.push('            )}');
        // Skip the rest of the problematic lines
        i = 1515;
      }
      continue;
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
}

// Apply the fix
console.log('🔧 Applying final JSX fix...');
let fixedContent = fixJSXStructure(content);

// Write the fixed content
fs.writeFileSync(filePath, fixedContent);

console.log('✅ Applied final JSX fix');
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
    console.log('🎉 The file is now fixed and ready for development!');
  }
});