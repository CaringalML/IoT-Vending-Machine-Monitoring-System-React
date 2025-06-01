#!/usr/bin/env node
// scripts/seed-full.js
// Full seeding script for comprehensive testing

const { CLISeeder } = require('./seed');

async function fullSeed() {
  console.log('🚀 Full Comprehensive Seed');
  console.log('==========================');
  console.log('📊 This will create:');
  console.log('   • 10 products');
  console.log('   • 60 days of sales history');
  console.log('   • ~2000-3000 sales records');
  console.log('   • Special events & promotions');
  console.log('   • Realistic business patterns');
  console.log('   • Perfect for demos & presentations\n');

  try {
    const seeder = new CLISeeder();
    await seeder.seedDatabase({
      includeProducts: true,
      includeSales: true,
      daysBack: 60,
      salesPerDay: { min: 20, max: 50 }
    });
    
    console.log('\n🎉 Full seed completed successfully!');
    console.log('💡 Your app now has comprehensive test data');
    console.log('📈 Perfect for demos and feature testing');
    
  } catch (error) {
    console.error('❌ Full seed failed:', error.message);
    process.exit(1);
  }
}

// Run the full seed
fullSeed();