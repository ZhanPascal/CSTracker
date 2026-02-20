import { MessageResponse } from '../types';

const BASE_URL = '/api';

export const fetchMessage = async (): Promise<MessageResponse> => {
  const response = await fetch(`${BASE_URL}/message`);
  if (!response.ok) {
    throw new Error('Erreur : impossible de joindre le backend');
  }
  return response.json() as Promise<MessageResponse>;
};
