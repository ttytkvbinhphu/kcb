const { execSync } = require('child_process');
try {
  const result = execSync('find / -name "CatalogManagement.tsx" 2>/dev/null').toString();
  console.log("Found CatalogManagement.tsx files:\n", result);
} catch (e) {
  console.error("Error finding files:", e.message);
}
