// System API validation schemas

export const performanceQuerySchema = {
  metric_type: { type: 'string', required: false },
  service_name: { type: 'string', required: false },
  period_start: { type: 'string', required: false },
  period_end: { type: 'string', required: false },
  limit: { type: 'number', required: false, min: 1, max: 1000 }
};

export const recordMetricSchema = {
  metric_type: { type: 'string', required: true },
  metric_name: { type: 'string', required: true },
  metric_value: { type: 'number', required: true },
  metric_unit: { type: 'string', required: false },
  service_name: { type: 'string', required: false },
  endpoint: { type: 'string', required: false },
  status_code: { type: 'number', required: false },
  error_message: { type: 'string', required: false }
};

export const jobQuerySchema = {
  job_name: { type: 'string', required: false },
  job_type: { type: 'string', required: false },
  status: { type: 'string', required: false, enum: ['running', 'completed', 'failed', 'cancelled'] },
  limit: { type: 'number', required: false, min: 1, max: 100 }
};

export const executeJobSchema = {
  job_name: { type: 'string', required: true },
  parameters: { type: 'object', required: false }
};