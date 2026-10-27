const fs = require('fs');

function updateBannerLink(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/href="\/course\?id=datagan-master-pro"/g, 'href="https://datagan-course.web.app/"');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Updated link in:", filePath);
}

updateBannerLink('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox.html');
updateBannerLink('D:\\My Apps\\Datagan Course\\frontend\\public\\sandbox\\nacimientos.html');
updateBannerLink('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan.html');
updateBannerLink('D:\\My Apps\\Datagan Course\\frontend\\public\\tecnogan-nacimientos.html');

// Also update the out folder directly so we don't have to wait for next build!
if (fs.existsSync('D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox.html')) {
  updateBannerLink('D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox.html');
}
if (fs.existsSync('D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox\\nacimientos.html')) {
  updateBannerLink('D:\\My Apps\\Datagan Course\\frontend\\out\\sandbox\\nacimientos.html');
}
if (fs.existsSync('D:\\My Apps\\Datagan Course\\frontend\\out\\tecnogan.html')) {
  updateBannerLink('D:\\My Apps\\Datagan Course\\frontend\\out\\tecnogan.html');
}
if (fs.existsSync('D:\\My Apps\\Datagan Course\\frontend\\out\\tecnogan-nacimientos.html')) {
  updateBannerLink('D:\\My Apps\\Datagan Course\\frontend\\out\\tecnogan-nacimientos.html');
}
