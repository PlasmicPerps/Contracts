const fs = require('fs');
const path = require('path');

// Get deployment name from command line args (default: arbitrumSepolia)
// const deploymentName = process.argv[2] || 'arbitrumSepolia';
const deploymentName = process.argv[2] || 'plasma';
const deploymentsDir = path.join(__dirname, 'deployments', deploymentName);

// Check if deployment directory exists
if (!fs.existsSync(deploymentsDir)) {
  console.error(`Error: Deployment directory not found: ${deploymentsDir}`);
  process.exit(1);
}

// Read all files in the deployment directory
const files = fs.readdirSync(deploymentsDir);

// Filter for JSON files (excluding .migrations.json and solcInputs)
const contractFiles = files.filter(file =>
  file.endsWith('.json') &&
  file !== '.migrations.json' &&
  !file.startsWith('solcInputs')
);

console.log(`\n📋 Deployed Addresses for ${deploymentName}:\n`);
console.log('='.repeat(80));

const addresses = {};

contractFiles.forEach(file => {
  try {
    const filePath = path.join(deploymentsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const deployment = JSON.parse(content);

    if (deployment.address) {
      const contractName = path.basename(file, '.json');
      addresses[contractName] = deployment.address;
      console.log(`${contractName.padEnd(40)} ${deployment.address}`);
    }
  } catch (error) {
    console.error(`Error reading ${file}: ${error.message}`);
  }
});

console.log('='.repeat(80));
console.log(`\nTotal contracts: ${Object.keys(addresses).length}\n`);

// Optionally export to a JSON file
const outputFile = path.join(__dirname, `${deploymentName}-addresses.json`);
fs.writeFileSync(outputFile, JSON.stringify(addresses, null, 2));
console.log(`✅ Addresses exported to: ${outputFile}\n`);
