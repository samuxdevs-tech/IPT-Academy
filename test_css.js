async function test() {
  const res = await fetch('https://datagan-course.web.app/');
  console.log('Status /:', res.status);
  console.log('Cache-Control for /:', res.headers.get('cache-control'));
  const html = await res.text();
  const cssMatch = html.match(/\/_next\/static\/chunks\/[^"']+\.css/);
  console.log('CSS matched:', cssMatch ? cssMatch[0] : 'None');
  if (cssMatch) {
    const cssRes = await fetch('https://datagan-course.web.app' + cssMatch[0]);
    console.log('CSS Status:', cssRes.status);
    console.log('CSS Cache-Control:', cssRes.headers.get('cache-control'));
  }
}
test().catch(console.error);
