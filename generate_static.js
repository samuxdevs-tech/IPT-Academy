const fs = require('fs');
const cheerio = require('cheerio');

// Load the 100% real HTML
const html = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html', 'utf8');
const $ = cheerio.load(html);

// Find the main content area
const main = $('main, .main-content').first();

// The form HTML we want to inject
const formHtml = `
<div style="padding: 24px; max-width: 800px; margin: 0 auto; font-family: sans-serif;">
  <h1 style="font-size: 24px; font-weight: bold; color: #002b36; margin-bottom: 8px;">Registro de Nacimientos</h1>
  <p style="color: #64748b; margin-bottom: 24px; font-size: 14px;">Ingresa los datos del nuevo ternero al hato. Base de datos local.</p>

  <form id="nacimientoForm" style="background: white; border: 1px solid #d9e4e8; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div>
        <label style="display: block; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">ID Madre</label>
        <input type="text" id="madreId" placeholder="Ej. V-402" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d9e4e8; background: #f6f8f9; outline: none; box-sizing: border-box;" required />
      </div>
      <div>
        <label style="display: block; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Peso (kg)</label>
        <input type="number" id="peso" placeholder="Ej. 35" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d9e4e8; background: #f6f8f9; outline: none; box-sizing: border-box;" required />
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
      <div>
        <label style="display: block; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Sexo</label>
        <select id="sexo" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d9e4e8; background: #f6f8f9; outline: none; box-sizing: border-box;">
          <option>Macho</option>
          <option>Hembra</option>
        </select>
      </div>
      <div>
        <label style="display: block; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Fecha</label>
        <input type="date" id="fecha" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d9e4e8; background: #f6f8f9; outline: none; box-sizing: border-box;" required />
      </div>
    </div>

    <button type="submit" style="width: 100%; background: #196e6c; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer;">Guardar Nacimiento</button>
  </form>

  <div style="background: white; border: 1px solid #d9e4e8; border-radius: 12px; padding: 24px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="font-weight: bold; color: #002b36;">Base de Datos Local</h3>
      <button id="clearBtn" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px;">Reiniciar DB</button>
    </div>
    <div id="lista" style="display: flex; flex-direction: column; gap: 12px;"></div>
  </div>
</div>

<script>
  function renderLista() {
    const data = JSON.parse(localStorage.getItem('datagan_nacimientos') || '[]');
    const lista = document.getElementById('lista');
    if (data.length === 0) {
      lista.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">Sin registros</div>';
      return;
    }
    lista.innerHTML = data.map(n => \`
      <div style="padding: 12px; border: 1px solid #d9e4e8; border-radius: 8px; background: #f6f8f9;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; color: #002b36; margin-bottom: 4px;">
          <span>Madre: \${n.madreId}</span>
          <span>\${n.peso} kg</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
          <span>\${n.sexo}</span>
          <span>\${n.fecha}</span>
        </div>
      </div>
    \`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fecha').valueAsDate = new Date();
    renderLista();
    
    document.getElementById('nacimientoForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const nuevo = {
        id: Date.now().toString(),
        madreId: document.getElementById('madreId').value,
        peso: document.getElementById('peso').value,
        sexo: document.getElementById('sexo').value,
        fecha: document.getElementById('fecha').value
      };
      const data = JSON.parse(localStorage.getItem('datagan_nacimientos') || '[]');
      data.unshift(nuevo);
      localStorage.setItem('datagan_nacimientos', JSON.stringify(data));
      renderLista();
      
      document.getElementById('madreId').value = '';
      document.getElementById('peso').value = '';
      alert('Nacimiento guardado en LocalStorage');
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      if (confirm('¿Borrar datos?')) {
        localStorage.removeItem('datagan_nacimientos');
        renderLista();
      }
    });
  });
</script>
`;

main.empty();
main.append(formHtml);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan-nacimientos.html', $.html(), 'utf8');
console.log("Generated tecnogan-nacimientos.html successfully!");
