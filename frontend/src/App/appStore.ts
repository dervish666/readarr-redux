import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import fetchJson, { ApiError } from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';

// Ported from Sonarr 878f879c4 (#8223). Readarr keeps its own medium screen
// breakpoint (1310px) and its own window.Readarr globals.

function getDimensions(width: number, height: number) {
  const dimensions = {
    width,
    height,
    isExtraSmallScreen: width <= 480,
    isSmallScreen: width <= 768,
    isMediumScreen: width <= 1310,
    isLargeScreen: width <= 1200,
  };

  return dimensions;
}

export interface Dimensions {
  width: number;
  height: number;
  isExtraSmallScreen: boolean;
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
}

export interface AppState {
  dimensions: Dimensions;
  version: string;
  prevVersion?: string;
  isUpdated: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
  isDisconnected: boolean;
  isRestarting: boolean;
  isSidebarVisible: boolean;
}

let abortPingServer: (() => void) | null = null;
let pingTimeout: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>()(() => {
  const dimensions = getDimensions(window.innerWidth, window.innerHeight);

  return {
    dimensions,
    version: window.Readarr.version,
    isUpdated: false,
    isConnected: true,
    isReconnecting: false,
    isDisconnected: false,
    isRestarting: false,
    isSidebarVisible: !dimensions.isSmallScreen,
  };
});

export const useAppValues = <K extends keyof AppState>(...keys: K[]) => {
  return useAppStore(
    useShallow((state) => {
      return keys.reduce((acc, key) => {
        acc[key] = state[key];
        return acc;
      }, {} as Pick<AppState, K>);
    })
  );
};

export const useAppValue = <K extends keyof AppState>(key: K) => {
  return useAppStore(useShallow((state) => state[key]));
};

export const useAppDimensions = () => {
  return useAppStore(useShallow((state) => state.dimensions));
};

export const useAppDimension = <K extends keyof Dimensions>(key: K) => {
  return useAppStore((state) => state.dimensions[key]);
};

export const getAppValues = <K extends keyof AppState>(...keys: K[]) => {
  const state = useAppStore.getState();

  return keys.reduce((acc, key) => {
    acc[key] = state[key];
    return acc;
  }, {} as Pick<AppState, K>);
};

export const getAppValue = <K extends keyof AppState>(key: K) => {
  return useAppStore.getState()[key];
};

export const setAppValue = (payload: Partial<AppState>) => {
  useAppStore.setState(payload);
};

function pingServerAfterTimeout() {
  if (abortPingServer) {
    abortPingServer();
    abortPingServer = null;
  }

  if (pingTimeout) {
    clearTimeout(pingTimeout);
    pingTimeout = null;
  }

  pingTimeout = setTimeout(async () => {
    const { isRestarting, isConnected } = getAppValues(
      'isRestarting',
      'isConnected'
    );

    if (!isRestarting && isConnected) {
      return;
    }

    const abortController = new AbortController();
    abortPingServer = () => abortController.abort();

    try {
      await fetchJson({
        path: getQueryPath('/system/status'),
        method: 'GET',
        signal: abortController.signal,
        headers: {
          'X-Api-Key': window.Readarr.apiKey,
        },
      });

      abortPingServer = null;
      pingTimeout = null;

      setAppValue({ isRestarting: false });
    } catch (error: unknown) {
      abortPingServer = null;
      pingTimeout = null;

      if (error instanceof ApiError && error.statusCode === 401) {
        // Unauthorized, but back online.
        setAppValue({ isRestarting: false });
      } else if (!abortController.signal.aborted) {
        // Still restarting: the server is down or refusing connections. Try again.
        console.debug('[ping] server not back yet', error);
        pingServerAfterTimeout();
      }
    }
  }, 5000);
}

export const pingServer = () => {
  pingServerAfterTimeout();
};

export const saveDimensions = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  useAppStore.setState({ dimensions: getDimensions(width, height) });
};

export const setVersion = ({ version }: { version: string }) => {
  useAppStore.setState((state) => {
    const newState: Partial<AppState> = { version };

    if (state.version !== version) {
      if (!state.prevVersion) {
        newState.prevVersion = state.version;
      }

      newState.isUpdated = true;
    }

    return newState;
  });
};

export const setIsSidebarVisible = ({
  isSidebarVisible,
}: {
  isSidebarVisible: boolean;
}) => {
  useAppStore.setState({ isSidebarVisible });
};
