import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  productName: string;
  storeTitle: string;
  variantName?: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  location?: string;
  condition: string;
  storeGroup?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => boolean;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => boolean;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de un CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('lucas_shop_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('lucas_shop_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Error al guardar el carrito en localStorage', e);
    }
  }, [cart]);

  // El resultado se calcula con el carrito actual (no dentro del updater de
  // setState, que React puede ejecutar más tarde y dejaría el valor en false).
  const addToCart = (item: Omit<CartItem, 'quantity'>, quantityToAdd = 1): boolean => {
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      const wanted = existing.quantity + quantityToAdd;
      const nextQty = Math.min(wanted, item.maxQuantity);
      if (wanted > item.maxQuantity) {
        alert(`Solo quedan ${item.maxQuantity} unidades disponibles de este producto.`);
      }
      setCart((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i)));
      return true;
    }
    if (quantityToAdd > item.maxQuantity) {
      alert(`No puedes agregar más del stock disponible (${item.maxQuantity} unidades).`);
      return false;
    }
    setCart((prev) => [...prev, { ...item, quantity: quantityToAdd }]);
    return true;
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, newQty: number): boolean => {
    if (newQty <= 0) {
      removeFromCart(id);
      return true;
    }
    const current = cart.find((item) => item.id === id);
    if (!current) return false;
    if (newQty > current.maxQuantity) {
      alert(`Solo hay ${current.maxQuantity} unidades disponibles de este producto.`);
      return false;
    }
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item)));
    return true;
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
