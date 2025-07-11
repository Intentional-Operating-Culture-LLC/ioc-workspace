// Reports API validation schemas

export const reportsQuerySchema = {
  report_type: { type: 'string', required: false },
  status: { type: 'string', required: false },
  period_start: { type: 'string', required: false },
  period_end: { type: 'string', required: false },
  limit: { type: 'number', required: false, min: 1, max: 100 }
};

export const createReportSchema = {
  title: { type: 'string', required: true, minLength: 1, maxLength: 255 },
  report_type: { type: 'string', required: false },
  report_period_start: { type: 'string', required: true },
  report_period_end: { type: 'string', required: true },
  template_id: { type: 'string', required: false },
  executive_summary: { type: 'string', required: false },
  metadata: { type: 'object', required: false }
};

export const updateReportSchema = {
  title: { type: 'string', required: false, minLength: 1, maxLength: 255 },
  executive_summary: { type: 'string', required: false },
  status: { type: 'string', required: false, enum: ['draft', 'generated', 'reviewed', 'published', 'archived'] },
  metadata: { type: 'object', required: false }
};

export const templateQuerySchema = {
  template_type: { type: 'string', required: false },
  target_audience: { type: 'string', required: false },
  is_active: { type: 'boolean', required: false }
};

export const createTemplateSchema = {
  name: { type: 'string', required: true, minLength: 1, maxLength: 255 },
  description: { type: 'string', required: false },
  template_type: { type: 'string', required: true },
  target_audience: { type: 'string', required: true },
  sections_config: { type: 'object', required: true },
  styling_config: { type: 'object', required: false },
  export_formats: { type: 'string', required: false },
  is_default: { type: 'boolean', required: false }
};