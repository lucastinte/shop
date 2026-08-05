# 🛍️ Lucas Shop - Tienda Online Standalone

Este proyecto es la **Tienda Pública** independiente extraída de `dashboardlucas`. Está construida con Vite, React 19, Tailwind CSS y Supabase.

## 🚀 Pasos para Subir a GitHub y Vercel

### 1. Probar localmente
```bash
npm install
npm run dev
```

### 2. Inicializar Git y subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit - Standalone Store"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tienda-lucas.git
git push -u origin main
```

### 3. Desplegar en Vercel
1. Ve a [Vercel](https://vercel.com/new).
2. Importa el repositorio `tienda-lucas`.
3. En **Environment Variables**, agrega las variables de tu archivo `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Haz clic en **Deploy**.
5. Ve a **Settings > Domains** en Vercel y asigna el subdominio o dominio que quieras para la tienda (ej: `mitienda.vercel.app` o `tienda.tudominio.com`).
