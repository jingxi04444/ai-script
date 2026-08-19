import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { ClockCircleOutlined, ReloadOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons';
import HomeRail from '../../components/Layout/HomeRail';
import { membershipApi } from '../../api/membership';
import type { PointTransaction } from '../../types/membership';
import { formatDateTime } from '../../utils/format';
import './payment-orders-page.css';

const transactionTypeOptions = [
  { label: '全部', value: '' },
  { label: '消耗', value: 'consume' },
  { label: '购买', value: 'purchase' },
  { label: '奖励', value: 'reward' },
  { label: '退款', value: 'refund' },
];

const pageSizeOptions = [10, 20, 50];

const transactionTypeLabel = (value?: string) => {
  if (!value) return '—';
  const labels: Record<string, string> = {
    purchase: '购买',
    reward: '奖励',
    consume: '消耗',
    refund: '退款',
  };
  return labels[value] || value;
};

const bizTypeLabel = (value?: string) => {
  if (!value) return '';
  const labels: Record<string, string> = {
    daily_login: '每日登录',
    brief_detect: 'Brief检测',
    BRIEF_DETECT_POINT_COST: 'Brief检测',
    viral_simple: '爆款解析（轻量）',
    VIRAL_SIMPLE_POINT_COST: '爆款解析（轻量）',
    viral_deep: '爆款解析（深度）',
    VIRAL_DEEP_POINT_COST: '爆款解析（深度）',
    admin_adjust: '管理员调整',
  };
  return labels[value] || value;
};

const formatPointChange = (value: number) => {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
};

const PaymentOrdersPage = () => {
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [transactionType, setTransactionType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await membershipApi.pointTransactions({
        page,
        pageSize,
        keyword: keyword || undefined,
      } as Parameters<typeof membershipApi.pointTransactions>[0] & { keyword?: string });
      setTransactions(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setTransactions([]);
      setTotal(0);
      message.error('水滴记录加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, keyword]);

  const applySearch = () => {
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  const refresh = () => {
    load();
  };

  const filteredTransactions = useMemo(
    () => (transactionType ? transactions.filter((item) => item.transactionType === transactionType) : transactions),
    [transactions, transactionType],
  );

  const summary = useMemo(() => {
    const consume = filteredTransactions.filter((item) => item.transactionType === 'consume').length;
    const income = filteredTransactions.filter((item) => item.changePoints > 0).length;
    const expense = filteredTransactions.filter((item) => item.changePoints < 0).length;
    return { consume, income, expense };
  }, [filteredTransactions]);

  const displayTotal = transactionType ? filteredTransactions.length : total;
  const pages = Math.max(1, Math.ceil(displayTotal / pageSize));

  return (
    <main className="prototype-home payment-orders-shell">
      <HomeRail activeLabel="" />

      <section className="payment-orders-page">
        <header className="payment-orders-hero">
          <div>
            <h1>水滴消耗记录</h1>
            <p>查看铼河水滴的获取与消耗明细，包括登录奖励、购买、功能消耗等。</p>
          </div>
          <button className="payment-orders-refresh" type="button" onClick={refresh}><ReloadOutlined />刷新</button>
        </header>

        <section className="payment-orders-summary" aria-label="水滴记录概览">
          <span><WalletOutlined /> 共 {displayTotal} 条</span>
          <span><ClockCircleOutlined /> 消耗 {summary.consume}</span>
          <span><ClockCircleOutlined /> 获取 {summary.income}</span>
          <span><ClockCircleOutlined /> 扣减 {summary.expense}</span>
        </section>

        <section className="payment-orders-toolbar" aria-label="水滴记录筛选">
          <label className="payment-orders-search">
            <SearchOutlined />
            <input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="备注 / 单号"
              onKeyDown={(event) => event.key === 'Enter' && applySearch()}
            />
          </label>

          <div className="payment-orders-select">类型：
            <select value={transactionType} onChange={(event) => { setPage(1); setTransactionType(event.target.value); }}>
              {transactionTypeOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <button className="payment-orders-filter" type="button" onClick={applySearch}>筛选</button>
        </section>

        <section className="payment-orders-panel">
          {filteredTransactions.length ? (
            <div className="payment-orders-table-wrap">
              <table className="payment-orders-table">
                <colgroup>
                  <col className="col-time" />
                  <col className="col-description" />
                  <col className="col-transaction-type" />
                  <col className="col-biz-type" />
                  <col className="col-change" />
                  <col className="col-balance" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">时间</th>
                    <th scope="col">描述</th>
                    <th scope="col">类型</th>
                    <th scope="col">业务类型</th>
                    <th scope="col" className="is-centered">💧变动</th>
                    <th scope="col" className="is-centered">余额</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const bizLabel = bizTypeLabel(transaction.bizType);
                    const changeTone = transaction.changePoints > 0 ? 'success' : transaction.changePoints < 0 ? 'danger' : 'muted';
                    const referenceNo = transaction.sourceOrderNo || transaction.requestNo;
                    const description = transaction.remark || bizLabel || transactionTypeLabel(transaction.transactionType);

                    return (
                      <tr key={transaction.id}>
                        <td className="payment-orders-time">{formatDateTime(transaction.createdAt)}</td>
                        <td className="payment-orders-description" title={description}>
                          <div>{description}</div>
                          {referenceNo ? <small>单号 {referenceNo}</small> : null}
                        </td>
                        <td>{transactionTypeLabel(transaction.transactionType)}</td>
                        <td>{bizLabel || '—'}</td>
                        <td className={`payment-orders-change ${changeTone} is-centered`}>{formatPointChange(transaction.changePoints)}</td>
                        <td className="is-centered">{transaction.balanceAfter}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="payment-orders-empty">
              <div className={loading ? 'spin' : ''} aria-hidden="true">{loading ? '↻' : '·'}</div>
              <strong>{loading ? '加载中…' : '暂无水滴记录'}</strong>
              <p>没有符合条件的记录。</p>
            </div>
          )}
        </section>

        <footer className="payment-orders-footer">
          <span>第 {page} 页，共 {pages} 页</span>
          <div>
            <label className="payment-orders-page-size">
              <span>每页</span>
              <select value={pageSize} onChange={(event) => { setPage(1); setPageSize(Number(event.target.value)); }}>
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size} 条</option>)}
              </select>
            </label>
            <button type="button" className="payment-orders-page-btn" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>上一页</button>
            <button type="button" className="payment-orders-page-btn" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>下一页</button>
          </div>
        </footer>
      </section>
    </main>
  );
};

export default PaymentOrdersPage;
