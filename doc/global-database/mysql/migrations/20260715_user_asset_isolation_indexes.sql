ALTER TABLE ai_brief
  ADD INDEX idx_ai_brief_tenant_creator (tenant_id, create_by, update_time);

ALTER TABLE ai_storyboard_script
  ADD INDEX idx_ai_storyboard_script_creator (tenant_id, create_by, update_time);

ALTER TABLE ai_asset
  ADD INDEX idx_ai_asset_owner (tenant_id, owner_id, create_time);

ALTER TABLE ai_selling_point_asset
  ADD INDEX idx_ai_selling_asset_creator (tenant_id, create_by, update_time);

ALTER TABLE ai_viral_asset
  ADD INDEX idx_ai_viral_asset_creator (tenant_id, create_by, update_time);
