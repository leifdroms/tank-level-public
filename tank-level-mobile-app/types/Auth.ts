export type AuthenticationResult =
  | { status: 'success' }
  | { status: 'invalid-pin' }
  | { status: 'error'; message?: string };

export type ChangePinResult =
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string };
