import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { id } = req.query;

  // 1. Determine the base URL to fetch the static index.html
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  
  // To avoid recursive fetch loops on Vercel, we can try to fetch a static file explicitly, 
  // but since we override /producto/:id in vercel.json, fetching / will correctly hit the static index.html or the rewrite to index.html.
  const baseUrl = `${protocol}://${host}`;

  let html = '';
  try {
    const response = await fetch(`${baseUrl}/index.html`);
    html = await response.text();
  } catch (error) {
    console.error('Error fetching index.html:', error);
    return res.status(500).send('Internal Server Error');
  }

  if (!id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  // 2. Fetch product data from Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
      const { data: item } = await supabase
        .from('items')
        .select('product_name, store_title, image_url, description')
        .eq('id', id)
        .single();

      if (item) {
        const title = item.store_title || item.product_name;
        // Truncate description to a reasonable length for social media
        let description = item.description || 'Consulta los detalles de este producto en nuestra tienda.';
        if (description.length > 160) {
          description = description.substring(0, 157) + '...';
        }
        const imageUrl = item.image_url || '';

        // 3. Construct Open Graph tags
        const ogTags = `
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${baseUrl}/producto/${id}" />
    <meta property="og:type" content="product" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${imageUrl}" />
  `;

        // Insert before </head>
        html = html.replace('</head>', `${ogTags}</head>`);
        // Also replace the document <title>
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      }
    } catch (error) {
      console.error('Error fetching from Supabase:', error);
    }
  }

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
