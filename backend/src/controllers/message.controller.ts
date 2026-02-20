import { Request, Response } from 'express';
import { getMessage } from '../services/message.service';

export const getMessageHandler = (req: Request, res: Response): void => {
  const data = getMessage();
  res.json(data);
};
