import React, { createContext, useContext, useState, useCallback } from "react";

const RequestCartContext = createContext(null);

export function RequestCartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((catalogItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.catalog_item_id === catalogItem.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          catalog_item_id: catalogItem.id,
          title: catalogItem.title,
          price: catalogItem.price,
          quantity: 1
        }
      ];
    });
  }, []);

  const removeItem = useCallback((catalogItemId) => {
    setItems((prev) => prev.filter((i) => i.catalog_item_id !== catalogItemId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <RequestCartContext.Provider value={{ items, addItem, removeItem, clearCart, total, count }}>
      {children}
    </RequestCartContext.Provider>
  );
}

export function useRequestCart() {
  return useContext(RequestCartContext);
}
