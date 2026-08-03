export type AuthErrorAction = 'sendCode' | 'smsLogin' | 'passwordLogin' | 'register' | 'bindPhone' | 'bindEmail' | 'wechat';

interface ErrorPayload {
  code?: number;
  message?: string;
  response?: {
    status?: number;
    data?: ErrorPayload;
  };
}

const readErrorPayload = (error: unknown): ErrorPayload => {
  if (!error || typeof error !== 'object') return {};
  const candidate = error as ErrorPayload;
  return candidate.response?.data || candidate;
};

const includesAny = (value: string, words: string[]) => words.some((word) => value.includes(word));

export const getAuthErrorMessage = (error: unknown, action: AuthErrorAction): string => {
  const payload = readErrorPayload(error);
  const message = String(payload.message || '').trim();
  const normalized = message.toLowerCase();
  const status = (error as ErrorPayload | undefined)?.response?.status;

  if (payload.code === 42900 || status === 429 || includesAny(message, ['过于频繁', '请求频繁'])) {
    return '验证码发送过于频繁，请稍后再试';
  }
  if (includesAny(message, ['验证码已过期', '验证码过期'])) return '验证码已过期，请重新获取';
  if (includesAny(message, ['验证码不存在', '验证码已使用'])) return '验证码无效，请重新获取';
  if (includesAny(message, ['验证码错误', '验证码不正确', '验证码不准确'])) return '验证码不正确，请重新输入';
  if (includesAny(message, ['验证码不能为空'])) return '请输入短信验证码';
  if (includesAny(message, ['手机号格式', '手机号码格式'])) return '请输入正确的 11 位手机号';
  if (includesAny(message, ['邮箱格式'])) return '请输入正确的邮箱地址';
  if (includesAny(message, ['邮箱已', '邮箱存在'])) return '该邮箱已被注册，请直接登录或更换邮箱';
  if (includesAny(message, ['手机号已', '手机号码已'])) return '该手机号已被注册，请直接登录';
  if (includesAny(message, ['账号或密码', '密码错误', '用户不存在', '登录凭证'])) return '邮箱或密码不正确，请重新输入';
  if (includesAny(message, ['微信登录未启用', '微信登录暂不可用'])) return '微信登录暂不可用，请选择其他登录方式';
  if (normalized.includes('timeout') || includesAny(message, ['请求超时', '连接超时'])) return '请求超时，请稍后重试';

  if (action === 'sendCode') return '短信验证码发送失败，请稍后重试';
  if (action === 'smsLogin') return '手机号或验证码不正确，请重新输入';
  if (action === 'passwordLogin') return '邮箱或密码不正确，请重新输入';
  if (action === 'register') return '注册失败，请检查填写内容后重试';
  if (action === 'bindPhone') return '手机号绑定失败，请检查验证码后重试';
  if (action === 'bindEmail') return '邮箱绑定失败，请检查邮箱或更换邮箱后重试';
  return '微信登录暂不可用，请稍后重试';
};
