import https from 'https';
https.get('https://esteticaoral2l.com', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const m = data.match(/<img[^>]*src=\"([^\"]+)\"[^>]*>/gi);
    if(m) {
      for(const p of m) {
        if(p.toLowerCase().includes('logo')) {
          console.log(p.match(/src=\"([^\"]+)\"/)[1]);
          return;
        }
      }
    }
  });
});
