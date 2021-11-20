import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

function getCart() {
  const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
}

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    return getCart();
  });

  const prevCartRef = useRef<Product[]>();
  useEffect(() => {
    prevCartRef.current = cart;
  });
  const cartPreviousValue = prevCartRef.current ?? cart;
  /*
  The three lines above are used to get the previous state value;
  */
  useEffect(() => {
    if(cartPreviousValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const stock: Stock = await api.get(`/stock/${productId}`) 
      .then(response => {
        return response.data;
      })
      .catch(error => {
        throw new Error('Erro na adição do produto');
      })

      const currentAmount = cart.find((product) => product.id === productId)?.amount || 0;

      if(stock.amount < currentAmount+1) throw new Error('Quantidade solicitada fora de estoque');

      let newCart;

      if(currentAmount > 0){
        newCart = cart.map((product) => {
          if(product.id !== productId) return product;
          product.amount += 1;
          return product;
        })
      } else {
        
        const {data: newProduct} : {data: Product} = await api.get(`/products/${productId}`)
        .catch(error => {
          throw new Error('Erro na adição do produto');
        });
        
        newCart = [
          ...cart,
          {
            ...newProduct,
            amount: 1
          }
        ]

      } 
      
      setCart(newCart)
      toast.success('Product successfully added to your cart!');
    
    } catch (err) {
      if(err instanceof Error){
        toast.error(err.message);
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId);
      if(newCart.length === cart.length) throw new Error();
      
      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) throw new Error('Erro na alteração de quantidade do produto');
      
      const stock: Stock = await api.get(`/stock/${productId}`) 
      .then(response => {
        return response.data;
      })
      .catch(error => {
        throw new Error('Erro na alteração de quantidade do produto');
      })

      if(stock.amount <= amount) throw new Error('Quantidade solicitada fora de estoque');
        

      const newCart = cart.map((product) => {
        if(product.id !== productId) return product;
        product.amount = amount;
        return product;
      })

      setCart(newCart);

    } catch (err) {
      if(err instanceof Error){
        toast.error(err.message);
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
