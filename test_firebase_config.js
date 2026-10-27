const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');

// Read config from frontend/src/lib/firebase.ts
const fs = require('fs');
const content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\lib\\firebase.ts', 'utf8');
console.log("Firebase config snippet:\n", content.slice(0, 400));
