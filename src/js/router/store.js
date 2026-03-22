import { StateStore } from "../store.js";

/**
 * A state store for managing the application's routing state.
 * An instance of this is created by <router-container>.
 */
export class RouterStore extends StateStore {
    /**
     * @param {string} basePath The application's base path (e.g., "/my-app/").
     */
    constructor(basePath = '/') {
        // Ensure basePath is clean, e.g., /my-app/
        const cleanBasePath = ('/' + basePath.replace(/^\/|\/$/g, '') + '/').replace(/\/+/g, '/');
        
        super({
            pathname: window.location.pathname.substring(cleanBasePath.length) || '/',
            params: {},
            loading: false,
        });

        this.basePath = cleanBasePath;
        this._routes = new Set();

        window.addEventListener('popstate', this._onURLChange.bind(this));
    }

    /**
     * Called by <router-switch> components to register their available route paths.
     * @param {string[]} routes - An array of path strings.
     */
    registerRoutes(routes) {
        let hasNewRoutes = false;
        routes.forEach(route => {
            if (!this._routes.has(route)) {
                this._routes.add(route);
                hasNewRoutes = true;
            }
        });

        if (hasNewRoutes) {
            this._onURLChange();
        }
    }

    /**
     * @private
     * Handles browser back/forward navigation.
     */
    _onURLChange() {
        const currentPath = this._getRelativePath();
        let bestMatch = null;

        for (const routePath of this._routes) {
            const match = this._matchPath(routePath, currentPath);
            if (match) {
                if (!bestMatch || match.path.length > bestMatch.path.length) {
                    bestMatch = match;
                }
            }
        }
        
        const params = bestMatch ? bestMatch.params : {};
        this.setState({ pathname: currentPath, params, loading: true });
    }

    /**
     * @private
     * Gets the current URL path relative to the base path.
     * @returns {string} The relative path.
     */
    _getRelativePath() {
        const path = window.location.pathname;
        if (path.startsWith(this.basePath)) {
            return '/' + path.substring(this.basePath.length).replace(/^\/+/, '');
        }
        // Fallback for paths that don't match base, like root '/'
        return path;
    }

    /**
     * Navigates to a new relative path and updates the browser history.
     * @param {string} to - The relative path (e.g., "/users/jane").
     */
    navigate(to) {
        const fullPath = (this.basePath + to).replace(/\/\//g, '/');
        window.history.pushState({}, '', fullPath);
        this._onURLChange();
    }

    /**
     * @private
     * Matches a route path against the current URL path.
     * @param {string} routePath The path pattern.
     * @param {string} currentPath The current URL path.
     * @returns {object|null} A match object with params, or null.
     */
    _matchPath(routePath, currentPath) {
        let isPrefixMatch = false;
        let pathPattern = String(routePath || '');
        
        if (pathPattern.endsWith('/*')) {
            isPrefixMatch = true;
            pathPattern = pathPattern.slice(0, -2);
        }

        const paramNames = [];
        const regexPath = pathPattern.replace(/:(\w+)/g, (_, name) => {
            paramNames.push(name);
            return '([^\\/]+)';
        });

        const regex = new RegExp(`^${regexPath}${isPrefixMatch ? '' : '$'}`);
        const match = String(currentPath || '').match(regex);

        if (!match) return null;

        const params = paramNames.reduce((acc, name, index) => {
            acc[name] = match[index + 1];
            return acc;
        }, {});
        
        return { path: match[0], params };
    }
}