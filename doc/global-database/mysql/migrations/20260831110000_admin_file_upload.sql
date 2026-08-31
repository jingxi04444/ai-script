SET NAMES utf8mb4;

-- 后台上传独立于用户会员额度；保留原权限编码、状态及角色授权，仅更新接口路径。
UPDATE sys_permission
SET path = '/api/admin/files/upload'
WHERE permission_code = 'admin:file:upload'
  AND permission_type = 'api';
