import { createContext, ReactNode, useContext, useState } from 'react';
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

    return;
}

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    return getCart() || [];
  });

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
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
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
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
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
      const stock: Stock = await api.get(`/stock/${productId}`) 
      .then(response => {
        return response.data;
      })
      .catch(error => {
        throw new Error('Erro na alteração de quantidade do produto');
      })

      if(stock.amount <= amount) throw new Error('Quantidade solicitada fora de estoque');
      if(amount <= 0) throw new Error('Erro na alteração de quantidade do produto');
        

      const newCart = cart.map((product) => {
        if(product.id !== productId) return product;
        product.amount = amount;
        return product;
      })

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
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
