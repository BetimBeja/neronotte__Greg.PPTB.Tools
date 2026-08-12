import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useThemeModel } from './ThemeContext';
import { useConnection } from '../hooks/useToolboxAPI';
import { listWritableSolutions, type SolutionSummary } from '../services/solutions';
import { findWebResourceByName, type WebResourceSummary } from '../services/webResources';
import { logoSizeWarning, measureImage, readLogoDataUri } from '../services/logo';
import { discoverScopeCapabilities, type ScopeCapabilities } from '../services/themeScope';

/**
 * Everything the tool needs to talk to Dataverse: the active connection, the
 * mandatory target solution, the theme web resource currently open, the
 * resolved logo image and what this environment supports for scope assignment
 * (docs/IMPLEMENTATION_PLAN.md §3, Phase 4).
 *
 * The theme itself stays in `ThemeContext` — this context never edits it.
 */

/** Key used to remember the last chosen solution across sessions (§2.12). */
const LAST_SOLUTION_KEY = 'last.solutionUniqueName';

export interface OpenThemeResource {
    resource: WebResourceSummary;
    /** The XML exactly as it was loaded, for the pre-save diff (§2.6). */
    originalXml: string;
}

interface ConfigContextValue {
    connection: ToolBoxAPI.Connection | null;
    connectionLoading: boolean;
    refreshConnection: () => Promise<void>;

    solutions: SolutionSummary[];
    solutionsLoading: boolean;
    solutionsError?: string;
    reloadSolutions: () => Promise<void>;
    selectedSolution?: SolutionSummary;
    selectSolution: (solution: SolutionSummary | undefined) => void;

    openTheme?: OpenThemeResource;
    setOpenTheme: (open: OpenThemeResource | undefined) => void;

    /** The logo image the preview renders, when one could be resolved. */
    logoDataUri?: string;
    logoWarning?: string;
    logoLoading: boolean;
    /** Shows a locally picked image in the preview before it is uploaded. */
    setPendingLogo: (dataUri: string | undefined, warning?: string) => void;

    scope?: ScopeCapabilities;
    scopeLoading: boolean;
    refreshScope: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function ConfigProvider({ children }: { children: ReactNode }) {
    const { connection, isLoading: connectionLoading, refreshConnection } = useConnection();
    const { model } = useThemeModel();

    const [solutions, setSolutions] = useState<SolutionSummary[]>([]);
    const [solutionsLoading, setSolutionsLoading] = useState(false);
    const [solutionsError, setSolutionsError] = useState<string | undefined>();
    const [selectedSolution, setSelectedSolution] = useState<SolutionSummary | undefined>();

    const [openTheme, setOpenTheme] = useState<OpenThemeResource | undefined>();

    const [logoDataUri, setLogoDataUri] = useState<string | undefined>();
    const [logoWarning, setLogoWarning] = useState<string | undefined>();
    const [logoLoading, setLogoLoading] = useState(false);
    const [pendingLogo, setPendingLogoState] = useState<{ dataUri?: string; warning?: string } | undefined>();

    const [scope, setScope] = useState<ScopeCapabilities | undefined>();
    const [scopeLoading, setScopeLoading] = useState(false);

    const reloadSolutions = useCallback(async () => {
        if (!connection) {
            return;
        }
        setSolutionsLoading(true);
        setSolutionsError(undefined);
        try {
            const loaded = await listWritableSolutions();
            setSolutions(loaded);

            const remembered = await window.toolboxAPI.settings.get(LAST_SOLUTION_KEY).catch(() => undefined);
            setSelectedSolution((current) => current ?? loaded.find((solution) => solution.uniqueName === remembered));
        } catch (error) {
            setSolutionsError(message(error));
        } finally {
            setSolutionsLoading(false);
        }
    }, [connection]);

    const refreshScope = useCallback(async () => {
        if (!connection) {
            return;
        }
        setScopeLoading(true);
        try {
            setScope(await discoverScopeCapabilities());
        } finally {
            setScopeLoading(false);
        }
    }, [connection]);

    useEffect(() => {
        void reloadSolutions();
        void refreshScope();
    }, [reloadSolutions, refreshScope]);

    const selectSolution = useCallback((solution: SolutionSummary | undefined) => {
        setSelectedSolution(solution);
        if (solution) {
            void window.toolboxAPI.settings.set(LAST_SOLUTION_KEY, solution.uniqueName).catch(() => undefined);
        }
    }, []);

    const setPendingLogo = useCallback((dataUri: string | undefined, warning?: string) => {
        setPendingLogoState(dataUri ? { dataUri, warning } : undefined);
    }, []);

    // Resolve the logo named in the theme into an image the preview can show.
    // A locally picked file always wins: it is what the user is looking at.
    useEffect(() => {
        if (pendingLogo) {
            setLogoDataUri(pendingLogo.dataUri);
            setLogoWarning(pendingLogo.warning);
            return;
        }

        const name = model.logoWebResource?.trim();
        if (!name || !connection) {
            setLogoDataUri(undefined);
            setLogoWarning(undefined);
            return;
        }

        let cancelled = false;
        setLogoLoading(true);
        (async () => {
            try {
                const found = await findWebResourceByName(name);
                if (cancelled) {
                    return;
                }
                if (!found) {
                    setLogoDataUri(undefined);
                    setLogoWarning(`No web resource named "${name}" exists in this environment yet.`);
                    return;
                }
                const dataUri = await readLogoDataUri(found.id);
                if (cancelled) {
                    return;
                }
                setLogoDataUri(dataUri);
                setLogoWarning(dataUri ? logoSizeWarning(await measureImage(dataUri)) : undefined);
            } catch (error) {
                if (!cancelled) {
                    setLogoDataUri(undefined);
                    setLogoWarning(message(error));
                }
            } finally {
                if (!cancelled) {
                    setLogoLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [model.logoWebResource, connection, pendingLogo]);

    const value = useMemo<ConfigContextValue>(
        () => ({
            connection,
            connectionLoading,
            refreshConnection,
            solutions,
            solutionsLoading,
            solutionsError,
            reloadSolutions,
            selectedSolution,
            selectSolution,
            openTheme,
            setOpenTheme,
            logoDataUri,
            logoWarning,
            logoLoading,
            setPendingLogo,
            scope,
            scopeLoading,
            refreshScope,
        }),
        [
            connection,
            connectionLoading,
            refreshConnection,
            solutions,
            solutionsLoading,
            solutionsError,
            reloadSolutions,
            selectedSolution,
            selectSolution,
            openTheme,
            logoDataUri,
            logoWarning,
            logoLoading,
            setPendingLogo,
            scope,
            scopeLoading,
            refreshScope,
        ],
    );

    return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a <ConfigProvider>.');
    }
    return context;
}
