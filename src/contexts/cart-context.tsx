import React, { createContext, useContext, useState } from 'react'

interface CartContextType {
  count: number
  increment: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0)
  const increment = () => setCount((prev) => prev + 1)

  return <CartContext.Provider value={{ count, increment }}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
