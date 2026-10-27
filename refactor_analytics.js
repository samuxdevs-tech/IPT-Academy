const fs = require('fs');

let content = fs.readFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\analytics\\page.tsx', 'utf8');

const newFetchLogic = `
  useEffect(() => {
    // Analytics is not fully migrated to Serverless yet.
    // In a real Serverless environment, we'd fetch all users' progress
    // from RTDB /progress and aggregate the heatmaps on the client side.
    setTimeout(() => {
      setErrorRanking([]);
      setHeatmap({});
      setLoading(false);
    }, 500);
  }, []);
`;

content = content.replace(
  /useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/,
  newFetchLogic.trim()
);

fs.writeFileSync('D:\\My Apps\\Datagan Course\\frontend\\src\\app\\admin\\analytics\\page.tsx', content, 'utf8');
console.log("admin/analytics/page.tsx refactored to Firebase dummy data!");
