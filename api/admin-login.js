export default async function handler(req, res) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password } = req.body;

  if (email === 'deymonmachado@gmail.com' && password === '08059900p') {
    return res.status(200).json({
      success: true,
      token: 'lucas_astro_admin',
      message: 'Autenticado com sucesso como Administrador.'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'E-mail ou senha do administrador inválidos.'
  });
}
