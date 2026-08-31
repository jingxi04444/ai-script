import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, MinusOutlined, RobotOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { isPolishWorking, useScriptPolishStore, type PolishSession } from '../../stores/scriptPolishStore';
import { getApiErrorMessage } from '../../utils/apiError';
import './polish-task-list.css';

interface PolishTaskListProps {
  sessions: PolishSession[];
  onOpen: (session: PolishSession) => void;
}

const statusLabels: Record<PolishSession['status'], string> = {
  idle: '已最小化', running: 'AI 润色中', stopping: '正在停止',
  success: '润色完成', failed: '润色失败', canceled: '已停止',
};

const PolishTaskList = ({ sessions, onOpen }: PolishTaskListProps) => {
  const stop = async (id: string) => {
    try {
      await useScriptPolishStore.getState().stop(id);
      const status = useScriptPolishStore.getState().sessions[id]?.status;
      message.info(status === 'success' ? '润色已完成，可以查看结果' : '已停止当前 AI 润色，其他任务不受影响');
    } catch (error) {
      message.error(getApiErrorMessage(error, '停止失败，AI 可能仍在工作，请重试'));
    }
  };

  return (
    <div className="task-center-pane">
      <section className="task-center-download-note">
        <RobotOutlined />
        <div><strong>最小化的脚本在这里</strong><span>AI 会继续润色，你可以处理其他脚本，点击「返回润色」恢复。</span></div>
      </section>
      <p className="polish-task-session-note">以下为本次页面会话。请勿刷新或关闭标签页；已保存的结果仍可在脚本库查看。</p>
      <div className="task-center-list">
        {sessions.map((session) => (
          <article key={session.draft.script.id} className={`task-center-card polish-task-card is-${session.status}`}>
            <span className="task-center-card-icon">
              {isPolishWorking(session) ? <LoadingOutlined spin /> : session.status === 'success' ? <CheckCircleOutlined /> : session.status === 'failed' ? <CloseCircleOutlined /> : <MinusOutlined />}
            </span>
            <div className="task-center-card-copy">
              <strong title={session.draft.script.name}>{session.draft.script.name}</strong>
              <span title={session.error}>{session.error || (isPolishWorking(session) ? '后台处理中，无需留在润色窗口' : '点击返回润色工作台')}</span>
            </div>
            <div className="task-center-card-actions">
              <small>{statusLabels[session.status]}</small>
              <button type="button" onClick={() => onOpen(session)} aria-label={`返回润色：${session.draft.script.name}`}>返回润色</button>
              {isPolishWorking(session) ? (
                <button type="button" disabled={session.status === 'stopping'} onClick={() => void stop(session.draft.script.id)} aria-label={`停止润色：${session.draft.script.name}`}>
                  {session.status === 'stopping' ? '停止中…' : '停止润色'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!sessions.length ? (
          <div className="task-center-empty"><RobotOutlined /><strong>暂无润色会话</strong><span>在润色窗口点击「➖ 最小化」，脚本会保留在这里。</span></div>
        ) : null}
      </div>
    </div>
  );
};

export default PolishTaskList;
