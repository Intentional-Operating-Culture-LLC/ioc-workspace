-- Create function to get organization metrics
CREATE OR REPLACE FUNCTION get_organization_metrics(org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metrics JSON;
BEGIN
  WITH user_count AS (
    SELECT COUNT(DISTINCT user_id) as total_users
    FROM user_organizations
    WHERE organization_id = org_id
      AND is_active = true
  ),
  assessment_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE status = 'active') as active_assessments,
      COUNT(*) as total_assessments
    FROM assessments
    WHERE organization_id = org_id
  ),
  response_stats AS (
    SELECT 
      COUNT(*) as total_responses,
      COUNT(*) FILTER (WHERE status = 'submitted') as submitted_responses
    FROM assessment_responses ar
    JOIN assessments a ON ar.assessment_id = a.id
    WHERE a.organization_id = org_id
  )
  SELECT json_build_object(
    'total_users', COALESCE(uc.total_users, 0),
    'active_assessments', COALESCE(ast.active_assessments, 0),
    'total_assessments', COALESCE(ast.total_assessments, 0),
    'total_responses', COALESCE(rs.total_responses, 0),
    'submitted_responses', COALESCE(rs.submitted_responses, 0),
    'completion_rate', CASE 
      WHEN COALESCE(rs.total_responses, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(rs.submitted_responses, 0)::numeric / rs.total_responses::numeric * 100)::numeric, 1)
    END
  ) INTO metrics
  FROM user_count uc
  CROSS JOIN assessment_stats ast
  CROSS JOIN response_stats rs;
  
  RETURN metrics;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_metrics(UUID) TO authenticated;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_active 
  ON user_organizations(organization_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_assessments_org_status 
  ON assessments(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_analytics_events_org_created 
  ON analytics_events(organization_id, created_at DESC);