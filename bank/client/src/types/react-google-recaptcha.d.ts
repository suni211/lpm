declare module 'react-google-recaptcha' {
  import { Component, RefObject } from 'react';

  export interface ReCAPTCHAProps {
    sitekey: string;
    onChange?: (token: string | null) => void;
    onExpired?: () => void;
    onError?: () => void;
    theme?: 'light' | 'dark';
    size?: 'normal' | 'compact' | 'invisible';
    tabindex?: number;
    hl?: string;
    badge?: 'bottomright' | 'bottomleft' | 'inline';
    type?: 'image' | 'audio';
    stoken?: string;
    grecaptcha?: any;
    isolated?: boolean;
    children?: React.ReactNode;
  }

  export default class ReCAPTCHA extends Component<ReCAPTCHAProps> {
    reset(): void;
    execute(): void;
    executeAsync(): Promise<string>;
    getValue(): string | null;
  }
}

