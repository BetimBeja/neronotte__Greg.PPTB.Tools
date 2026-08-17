import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Title3, Text, Button, makeStyles, tokens } from '@fluentui/react-components';
import { ErrorCircle24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.spacingVerticalM,
        height: '100vh',
        padding: tokens.spacingHorizontalXXL,
        textAlign: 'center',
    },
    message: {
        color: tokens.colorNeutralForeground3,
        maxWidth: '480px',
    },
});

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
}

/**
 * Top-level error boundary so an unexpected rendering error surfaces as a
 * readable message instead of a blank PPTB tool tab.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Theme Studio crashed:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ error: null });
    };

    render() {
        if (this.state.error) {
            return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
        }

        return this.props.children;
    }
}

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
    const styles = useStyles();

    return (
        <div className={styles.root}>
            <ErrorCircle24Regular fontSize={40} color={tokens.colorPaletteRedForeground1} />
            <Title3>Something went wrong</Title3>
            <Text className={styles.message}>{error.message || 'An unexpected error occurred while rendering Theme Studio.'}</Text>
            <Button appearance="primary" onClick={onReset}>
                Try again
            </Button>
        </div>
    );
}
