ALTER TABLE ai_storyboard_script
  ADD INDEX idx_ai_storyboard_script_project_creator_updated
    (tenant_id, create_by, project_id, update_time);
