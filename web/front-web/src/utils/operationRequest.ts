import axios from 'axios';

export const createOperationRequestNo = (operation: string) => {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${operation}:${id}`;
};

export const isAmbiguousOperationError = (error: unknown) => axios.isAxiosError(error)
  && (!error.response || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT');

export const notifyPointBalanceChanged = () => {
  window.dispatchEvent(new Event('points:changed'));
};

export const requestOperationCostRefresh = () => {
  window.dispatchEvent(new Event('operation-costs:refresh'));
};
