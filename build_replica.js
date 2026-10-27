const fs = require('fs');

let html = fs.readFileSync('D:/My Apps/Datagan Course/datagan_dashboard_raw.html', 'utf8');

// Replace stylesheet links to point locally to ./assets/
html = html.replace(/https:\/\/datagan360\.com\/assets\//g, './assets/');

// Embed auth cookie simulation and session storage initialization
const authInjection = `
<script>
  // Auth cookie replication
  function setCookie(name, value, days) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax';
  }

  function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Set auth cookies for session replication (Usuario: Ivan)
  setCookie('datagan_auth_user', 'Ivan', 30);
  setCookie('datagan_session_role', 'Enterprise IA Admin', 30);
  setCookie('datagan_farm_id', '36', 30);
  setCookie('datagan_authenticated', 'true', 30);

  // Sync with localStorage
  localStorage.setItem('selectedFarmId', '36');
  localStorage.setItem('user', JSON.stringify({
    id: 83,
    username: 'Ivan',
    email: 'samuxdevs@gmail.com',
    first_name: 'Ivan',
    last_name: 'Samuel',
    effective_plan: 'enterprise_ia',
    role: 'Enterprise IA'
  }));

  console.log('✅ Datagan session restored via cookies & local storage:', {
    user: getCookie('datagan_auth_user'),
    authenticated: getCookie('datagan_authenticated'),
    role: getCookie('datagan_session_role')
  });
</script>
`;

// Insert the auth script right before </head>
html = html.replace('</head>', authInjection + '</head>');

fs.writeFileSync('D:/My Apps/Datagan Course/replica_dashboard.html', html, 'utf8');
console.log('Created replica_dashboard.html successfully!');
