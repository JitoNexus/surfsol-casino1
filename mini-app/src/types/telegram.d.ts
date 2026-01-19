interface Window {
  Telegram?: {
    WebApp: {
      initData: string;
      initDataUnsafe: {
        query_id: string;
        user: {
          id: number;
          first_name: string;
          last_name?: string;
          username?: string;
          language_code?: string;
          is_premium?: boolean;
          photo_url?: string;
        };
        receiver?: {
          id: number;
          first_name: string;
          last_name?: string;
          username?: string;
        };
        chat?: {
          id: number;
          type: string;
          title: string;
          username?: string;
          first_name?: string;
          last_name?: string;
          photo_url?: string;
        };
        chat_type?: string;
        chat_instance?: string;
        start_param?: string;
        auth_date: number;
        hash: string;
      };
      ready: () => void;
      expand: () => void;
      close: () => void;
      enableClosingConfirmation: () => void;
      disableClosingConfirmation: () => void;
      isVerticalSwipesEnabled: boolean;
      enableVerticalSwipes: () => void;
      disableVerticalSwipes: () => void;
      isVersionAtLeast: (version: string) => boolean;
      setHeaderColor: (color: string) => void;
      setBackgroundColor: (color: string) => void;
      onEvent: (eventType: string, eventHandler: () => void) => void;
      offEvent: (eventType: string, eventHandler: () => void) => void;
      sendData: (data: string) => void;
      openLink: (url: string) => void;
      openTelegramLink: (url: string) => void;
      openInvoice: (url: string, callback?: (status: string) => void) => void;
      showPopup: (popup: any, callback?: (button_id: string) => void) => void;
      showAlert: (message: string, callback?: () => void) => void;
      showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
      requestWriteAccess: (callback?: (requested: boolean) => void) => void;
      requestContact: (callback?: (shared: boolean) => void) => void;
      downloadFile: (params: any) => void;
      shareToStory: (params: any) => void;
      shareMessage: (text: string, callback?: (shared: boolean) => void) => void;
      shareScore: (score: string, callback?: (shared: boolean) => void) => void;
      requestPremium: (callback?: (status: string) => void) => void;
      requestAccess: (params: any, callback?: (status: string) => void) => void;
      requestPhone: (callback?: (phone: string) => void) => void;
      textChanged: (event: any) => void;
      viewportChanged: (event: any) => void;
      theme: {
        bg_color: string;
        text_color: string;
        hint_color: string;
        link_color: string;
        button_color: string;
        button_text_color: string;
        secondary_bg_color: string;
      };
      colorScheme: 'light' | 'dark';
      isExpanded: boolean;
      viewport: {
        height: number;
        width: number;
        stable_height: number;
        isStateStable: boolean;
      };
    };
  };
}

declare global {
  interface Window {
    Telegram: Window['Telegram'];
  }
}

export {};
