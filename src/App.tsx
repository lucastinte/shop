import { CartProvider } from './contexts/CartContext';
import Store from './components/Store';
import StoreProduct from './components/StoreProduct';

function App() {
  const path = window.location.pathname;

  if (path.startsWith('/producto/')) {
    const id = path.replace('/producto/', '').replace(/\/$/, '');
    return (
      <CartProvider>
        <StoreProduct id={id} />
      </CartProvider>
    );
  }

  return (
    <CartProvider>
      <Store />
    </CartProvider>
  );
}

export default App;
