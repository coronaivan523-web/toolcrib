import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl border border-rose-200 max-w-2xl w-full overflow-hidden">
                        <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center gap-3">
                            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-rose-900">Application Error</h2>
                                <p className="text-sm text-rose-700">Something went wrong in this component.</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-96">
                                <code className="text-rose-400 font-mono text-xs block mb-2 font-bold">
                                    {this.state.error && this.state.error.toString()}
                                </code>
                                <pre className="text-slate-400 font-mono text-[10px] whitespace-pre-wrap">
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
