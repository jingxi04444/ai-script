export type User = {
  id: string;
  name: string;
  tenantName: string;
  role: string;
  points?: number;
};

export type AuthPayload = {
  name?: FormDataEntryValue | null;
  account: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
};

export type AuthResult = {
  token: string;
  user: User;
};
