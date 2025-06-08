#!/usr/bin/env node
// scripts/seeder_clear-db.js
// !! DANGEROUS !! This script wipes all data from specified Firestore collections.

const admin = require('firebase-admin');
const readline = require('readline');

// --- Firebase Admin SDK Initialization ---
let serviceAccount;
try {
  serviceAccount = require('../firebase-service-account.json');
} catch (error) {
  console.error('❌ Firebase service account key not found!');
  console.error('📋 Please download your service account key from the Firebase Console and save it as:');
  console.error('   firebase-service-account.json');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const COLLECTIONS_TO_DELETE = ['products', 'inventory', 'sales'];

// --- Readline Interface for User Input ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// --- Firestore Deletion Logic ---

/**
 * Deletes all documents in a specified Firestore collection in batches.
 * @param {string} collectionPath The path of the collection to delete.
 * @param {number} batchSize The number of documents to delete per batch.
 */
async function deleteCollection(collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    return resolve();
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}


/**
 * Main function to run the database clearing process.
 */
async function clearDatabase() {
  const projectId = serviceAccount.project_id;
  try {
    console.error('\n🛑 DANGER ZONE! THIS IS A DESTRUCTIVE OPERATION! 🛑');
    console.error('====================================================');
    console.error(`You are about to permanently delete all data from the following collections in the "${projectId}" project:`);
    COLLECTIONS_TO_DELETE.forEach(col => console.error(`  - ${col}`));
    console.error('\nThis action cannot be undone.');

    const confirmation = await askQuestion(`To confirm, please type your Firebase project ID ("${projectId}"): `);

    if (confirmation.trim() !== projectId) {
      console.log('\n❌ Project ID mismatch. Database clearing aborted.');
      return;
    }

    console.log('\n✅ Confirmation received. Proceeding with database clearing...');

    await Promise.all(
      COLLECTIONS_TO_DELETE.map(col => {
        console.log(`  - Deleting collection: ${col}...`);
        return deleteCollection(col, 200);
      })
    );
    console.log('\n✅ All specified collections have been successfully cleared.');

  } catch (error) {
    console.error('\n💥 An error occurred while clearing the database:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// --- Run the Script ---
clearDatabase();