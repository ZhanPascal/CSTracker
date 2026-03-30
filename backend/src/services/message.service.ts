import { MessageResponse } from '../types';

export const getMessage = (): MessageResponse => {
  return { message: 'Salut depuis le backend Express !' };
};
