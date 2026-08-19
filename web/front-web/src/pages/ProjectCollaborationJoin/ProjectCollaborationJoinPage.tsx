import { useEffect } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { projectApi } from '../../api/project';

const ProjectCollaborationJoinPage = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    projectApi.joinCollaboration(token).then(({ projectId }) => {
      message.success('已加入项目团队，可共享 Brief 并编辑项目脚本');
      navigate(`/workspace?projectId=${projectId}&step=script-generator`, { replace: true });
    }).catch((error) => {
      message.error(error instanceof Error ? error.message : '加入项目失败');
      navigate('/projects', { replace: true });
    });
  }, [navigate, token]);
  return <div className="script-review-state"><LoadingOutlined spin /> 正在加入项目团队…</div>;
};
export default ProjectCollaborationJoinPage;
