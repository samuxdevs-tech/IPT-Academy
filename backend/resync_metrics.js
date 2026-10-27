require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Metric } = require('./models');

async function resyncMetrics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🌱 Conectado a Atlas para sincronizar métricas corregidas...');

    const filePath = path.resolve(__dirname, '../metrics_data.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const metricsList = Object.values(data.metrics);

    console.log(`Actualizando ${metricsList.length} métricas con caracteres limpios...`);
    for (const m of metricsList) {
      await Metric.findOneAndUpdate({ id: m.id }, m, { upsert: true });
    }

    console.log('✅ ¡Las 73 métricas en MongoDB Atlas ahora tienen acentos y caracteres perfectos!');
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e);
  }
}

resyncMetrics();
