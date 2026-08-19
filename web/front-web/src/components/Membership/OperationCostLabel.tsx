import './operation-cost-label.css';

interface OperationCostLabelProps {
  cost: number;
}

const OperationCostLabel = ({ cost }: OperationCostLabelProps) => {
  const hasPrice = Number.isFinite(cost) && cost >= 0;
  const label = !hasPrice ? '费用加载中' : cost > 0 ? `消耗 ${cost} 铼河水滴` : '本次免费';

  return (
    <span className="operation-cost-label" aria-label={label}>
      {!hasPrice ? '费用加载中' : cost > 0 ? <>消耗 <span aria-hidden="true">💧</span>{cost}</> : '本次免费'}
    </span>
  );
};

export default OperationCostLabel;
