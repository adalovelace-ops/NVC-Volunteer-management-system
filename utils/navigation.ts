export function debounce<T extends (...args: any[]) => void>(
  callback: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      callback(...args);
    }, wait);
  };
}

type NavigationLike = {
  getState?: () => {
    routeNames?: string[];
    routes?: Array<{ name?: string; state?: unknown }>;
  };
  navigate: (routeName: string, params?: object) => void;
};

type FallbackRoute = {
  routeName: string;
  params?: object;
};

function collectRouteNames(
  state: { routeNames?: string[]; routes?: Array<{ name?: string; state?: unknown }> } | undefined,
  routeNames: Set<string>
): void {
  if (!state) {
    return;
  }

  state.routeNames?.forEach(routeName => routeNames.add(routeName));
  state.routes?.forEach(route => {
    if (route.name) {
      routeNames.add(route.name);
    }

    if (route.state && typeof route.state === 'object') {
      collectRouteNames(
        route.state as {
          routeNames?: string[];
          routes?: Array<{ name?: string; state?: unknown }>;
        },
        routeNames
      );
    }
  });
}

// Checks whether the current navigator tree exposes a given route name.
export function canNavigateToRoute(
  navigation: NavigationLike,
  routeName: string
): boolean {
  const discoveredRouteNames = new Set<string>();
  collectRouteNames(navigation.getState?.(), discoveredRouteNames);
  return discoveredRouteNames.has(routeName);
}

// Navigates to the preferred route when available, otherwise falls back to a safe route.
export function navigateToAvailableRoute(
  navigation: NavigationLike,
  routeName: string,
  params?: object,
  fallback?: FallbackRoute
): boolean {
  // Directly try to navigate to core routes to bypass lazy state initialization of unvisited tabs.
  const coreRoutes = ['Projects', 'Programs', 'Dashboard', 'Messages', 'Volunteers', 'Partners', 'Profile', 'Events'];
  if (coreRoutes.includes(routeName)) {
    try {
      navigation.navigate(routeName, params);
      return true;
    } catch (e) {
      console.warn(`Failed direct navigation to core route ${routeName}:`, e);
    }
  }

  if (canNavigateToRoute(navigation, routeName)) {
    navigation.navigate(routeName, params);
    return true;
  }

  if (fallback && canNavigateToRoute(navigation, fallback.routeName)) {
    navigation.navigate(fallback.routeName, fallback.params);
    return true;
  }

  return false;
}
