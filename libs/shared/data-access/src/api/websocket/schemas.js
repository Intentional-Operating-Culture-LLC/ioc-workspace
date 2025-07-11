// WebSocket API validation schemas

export const subscriptionSchema = {
  type: { type: 'string', required: true, enum: ['dashboard', 'metrics', 'activity', 'system', 'reports'] },
  filters: { type: 'object', required: false }
};

export const messageSchema = {
  type: { type: 'string', required: true },
  payload: { type: 'object', required: true },
  target_subscription: { type: 'string', required: false }
};