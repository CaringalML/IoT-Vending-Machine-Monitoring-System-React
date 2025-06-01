#!/usr/bin/env node
// scripts/seed-quick.js
// Quick seeding script for development

const { CLISeeder } = require('./seed');

async function quickSeed() {
  console.log('🚀 Quick Development Seed');
  console.log('========================');
  console.log('📊 This will create:');
  console.log('   • 10 products');
  console.log('   • 7 days of sales history');
  console.log('   • ~100-200 sales records');
  console.log('   • Realistic inventory levels');
  console.log('   • Perfect for daily development\n');

  try {
    const seeder = new CLISeeder();
    await seeder.seedDatabase({
      includeProducts: true,
      includeSales: true,
      daysBack: 7,
      salesPerDay: { min: 10, max: 25 }
    });
    
    console.log('\n🎉 Quick seed completed successfully!');
    console.log('💡 Check your React app to see the seeded data');
    
  } catch (error) {
    console.error('❌ Quick seed failed:', error.message);
    process.exit(1);
  }
}

// Run the quick seed
quickSeed();